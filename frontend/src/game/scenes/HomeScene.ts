import Phaser from 'phaser';
import type { Manifest, SpriteMeta } from '../assets';
import { Player, WALK_SPEED } from '../entities/Player';
import { Pet } from '../entities/Pet';
import { linkPet, petKey } from '../systems/petLink';
import { Atmosphere, LightSource, Litable } from '../systems/Atmosphere';
import { Pathfinder } from '../systems/Pathfinder';
import { bus } from '../bus';
import { currentPhase, currentSeason, currentWeather, useWorld, Season } from '../../state/world';
import { seasonKey, tilesKey } from '../assets';
import { WeatherFx } from '../systems/WeatherFx';
import { useSession } from '../../state/session';
import { available, FOOTPRINT, loadGarden, PlacedDecor, saveGarden } from '../../features/home/decor';
import { isWet, loadFarm, stageOf, useFarm } from '../../features/farm/farm';

const TS = 16;
type Prop = { name: string; value: unknown };
const prop = (o: Phaser.Types.Tilemaps.TiledObject, k: string) => (o.properties as Prop[] | undefined)?.find((p) => p.name === k)?.value;

interface Spot { id: string; label: string; x: number; y: number }
interface Placed { data: PlacedDecor; sprite: Phaser.GameObjects.Sprite; extras: Phaser.GameObjects.GameObject[] }

/** My Little Garden: your private garden behind the cottage. */
export class HomeScene extends Phaser.Scene {
  private player!: Player;
  private pet!: Pet;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private manifest!: Manifest;
  private map!: Phaser.Tilemaps.Tilemap;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private spots: Spot[] = [];
  private zone = new Phaser.Geom.Rectangle();
  private staticBlocked!: Uint8Array;
  private finder!: Pathfinder;
  private placed: Placed[] = [];
  private ghost?: Phaser.GameObjects.Sprite;
  private zoneGfx?: Phaser.GameObjects.Graphics;
  private cursor = { tx: 0, ty: 0 };
  private atmosphere!: Atmosphere;
  private lightSources: LightSource[] = [];
  private litables: Litable[] = [];
  private unsub: (() => void)[] = [];
  private petBed = new Phaser.Math.Vector2();
  private plotRects: Phaser.Geom.Rectangle[] = [];
  private cropObjs: Phaser.GameObjects.GameObject[] = [];

  /** Draw each bed from the farm state: 4 plants per 2x2 bed, darker soil while freshly watered. */
  private renderCrops() {
    this.cropObjs.forEach((o) => o.destroy());
    this.cropObjs = [];
    const now = Date.now();
    useFarm.getState().plots.forEach((p, i) => {
      const r = this.plotRects[i];
      if (!r || !p.crop) return;
      if (isWet(p, now)) this.cropObjs.push(this.add.image(r.x, r.y, 'soil_wet').setOrigin(0).setDepth(1.2));
      const st = stageOf(p, now);
      for (const [dx, dy] of [[8, 14], [24, 14], [8, 30], [24, 30]])
        this.cropObjs.push(this.add.sprite(r.x + dx, r.y + dy + 1, `crop_${p.crop}`, st).setOrigin(0.5, 1).setDepth(r.y + dy));
    });
  }

  constructor() {
    super('home');
  }

  private season: Season = 'spring';

  create() {
    // fresh state on every (re)start: the scene restarts when the season changes
    this.spots = [];
    this.placed = [];
    this.cropObjs = [];
    this.plotRects = [];
    this.lightSources = [];
    this.litables = [];
    this.unsub = [];
    this.atmosphere = undefined as unknown as Atmosphere; // rebuilt below; placed lanterns check for it
    this.ghost = undefined;
    this.zoneGfx = undefined;
    this.season = currentSeason(useWorld.getState());
    this.manifest = this.cache.json.get('manifest') as Manifest;
    const map = (this.map = this.make.tilemap({ key: 'home_garden' }));
    const ts = map.addTilesetImage('world', tilesKey(this.season))!;
    map.createLayer('ground', ts, 0, 0)!.setDepth(0);
    map.createLayer('deco', ts, 0, 0)!.setDepth(1);
    const col = map.createLayer('collision', ts, 0, 0)!.setVisible(false);
    col.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.solids = this.physics.add.staticGroup();

    this.staticBlocked = new Uint8Array(map.width * map.height);
    col.forEachTile((t) => t.index > 0 && (this.staticBlocked[t.y * map.width + t.x] = 1));
    for (const o of map.getObjectLayer('objects')!.objects) {
      const { sprite, rects } = this.spawnProp(o.name, o.x!, o.y!, !!prop(o, 'flip'));
      rects.forEach((r) => this.markBlocked(this.staticBlocked, r));
      if (o.name === 'pet_bed') this.petBed.set(o.x!, o.y! - 6);
      void sprite;
    }

    let spawn = new Phaser.Math.Vector2(16 * TS, 19 * TS);
    for (const o of map.getObjectLayer('hotspots')!.objects) {
      if (o.name === 'spawn') spawn = new Phaser.Math.Vector2(o.x!, o.y!);
      else if (o.name === 'decor_zone') this.zone.setTo(o.x!, o.y!, o.width!, o.height!);
      else if (o.type === 'plot') this.plotRects[Number(o.name.split('_')[1])] = new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!);
      else if (o.type === 'hotspot') this.spots.push({ id: o.name, label: String(prop(o, 'label')), x: o.x!, y: o.y! });
    }

    this.player = new Player(this, spawn.x, spawn.y);
    this.player.refreshLook((this.registry.get('avatarTex') as string) ?? 'player');
    this.physics.add.collider(this.player, col);
    this.physics.add.collider(this.player, this.solids);
    this.player.setCollideWorldBounds(true);
    this.pet = new Pet(this, spawn.x - 18, spawn.y + 4, petKey(), () => useWorld.getState().reducedMotion);
    this.unsub.push(linkPet(this, this.pet, this.player));
    const shadow = this.add.ellipse(0, 0, 12, 4, 0x10291e, 0.35).setDepth(2);
    this.events.on('update', () => shadow.setPosition(Math.round(this.player.x), Math.round(this.player.y) - 1));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(true);

    this.setupInput();
    this.game.events.on('avatar-changed', (key: string) => this.player?.active && this.player.refreshLook(key), this);

    // decorations from your save
    this.rebuildFinder();
    loadGarden().then((list) => {
      list.forEach((d) => this.addPlaced(d));
      useWorld.getState().set({ homeDecor: list });
      this.rebuildFinder();
      this.atmosphere?.apply(currentPhase(useWorld.getState()), useWorld.getState().reducedMotion, true);
    });

    loadFarm().then(() => this.renderCrops());
    this.unsub.push(bus.on('farm:changed', () => this.renderCrops()));
    this.time.addEvent({ delay: 20_000, loop: true, callback: () => this.renderCrops() });

    this.atmosphere = new Atmosphere(this, this.lightSources, this.litables, [() => this.fireflies()], []);
    const apply = (instant = false) => {
      const s = useWorld.getState();
      this.atmosphere.apply(currentPhase(s), s.reducedMotion, instant);
    };
    apply(true);
    const weather = new WeatherFx(this);
    weather.set(currentWeather(useWorld.getState()), useWorld.getState().reducedMotion);
    this.unsub.push(
      useWorld.subscribe((s, prev) => {
        if (!this.sys.isActive()) return;
        if (currentSeason(s) !== this.season) return this.restartForSeason();
        weather.set(currentWeather(s), s.reducedMotion);
        if (s.timeMode !== prev.timeMode || s.manualPhase !== prev.manualPhase || s.autoPhase !== prev.autoPhase) apply();
        if (s.decorating !== prev.decorating) this.syncDecorMode();
      }),
    );
    const onWake = () => (currentSeason(useWorld.getState()) !== this.season ? this.restartForSeason(true) : this.arrive());
    this.events.on('wake', onWake);
    this.events.once('shutdown', () => this.events.off('wake', onWake));
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    (window as unknown as { __fodderHome: unknown }).__fodderHome = { scene: this };
    this.arrive();
  }

  // ------------------------------------------------------------------ props
  private spawnProp(key: string, x: number, y: number, flip = false) {
    const meta: SpriteMeta | undefined = this.manifest.sprites[key];
    const extras: Phaser.GameObjects.GameObject[] = [];
    const rects: Phaser.Geom.Rectangle[] = [];
    const sprite = this.add.sprite(x, y, seasonKey(key, this.season, this.manifest), 0).setOrigin(0.5, 1).setFlipX(flip);
    sprite.setDepth(meta?.flat ? 1.5 : y);
    if (meta?.shadow) extras.push(this.add.ellipse(x, y - 1, meta.shadow[0], meta.shadow[1], 0x10291e, 0.32).setDepth(2));
    for (const [bx, by, bw, bh] of [...(meta?.body ? [meta.body] : []), ...(meta?.bodies ?? [])]) {
      const r = new Phaser.Geom.Rectangle(x + (flip ? -bx - bw : bx), y + by, bw, bh);
      rects.push(r);
      const z = this.add.zone(r.centerX, r.centerY, bw, bh);
      this.solids.add(z);
      extras.push(z);
    }
    if (key.startsWith('bld_') || key === 'lantern') {
      this.litables.push({ setLit: (lit) => sprite.active && sprite.setFrame(lit ? 1 : 0) });
      if (key === 'lantern') {
        const ls: LightSource[] = [{ x, y: y - 24, size: 's', strength: 0.8 }, { x, y: y - 4, size: 'm', strength: 0.4 }];
        // before the atmosphere exists, lights are collected; afterwards (placed while decorating) they're added live
        if (this.atmosphere) ls.forEach((l) => extras.push(this.atmosphere.addLight(l)));
        else this.lightSources.push(...ls);
      }
      else this.lightSources.push({ x: x - 29, y: y - 37, size: 'm' }, { x: x + 29, y: y - 37, size: 'm' }, { x, y: y - 66, size: 's' });
    }
    this.solids.refresh();
    return { sprite, rects, extras };
  }

  private markBlocked(grid: Uint8Array, r: Phaser.Geom.Rectangle) {
    const w = this.map.width;
    for (let ty = Math.floor((r.y + 2) / TS); ty <= Math.floor((r.bottom - 2) / TS); ty++)
      for (let tx = Math.floor((r.x + 2) / TS); tx <= Math.floor((r.right - 2) / TS); tx++)
        if (tx >= 0 && ty >= 0 && tx < w && ty < this.map.height) grid[ty * w + tx] = 1;
  }

  private rebuildFinder() {
    const g = this.staticBlocked.slice();
    for (const p of this.placed) this.footprintTiles(p.data.key, p.data.x, p.data.y).forEach(([tx, ty]) => (g[ty * this.map.width + tx] = 1));
    this.finder = new Pathfinder(this.map.width, this.map.height, g);
  }

  // ------------------------------------------------------------------ decorating
  private footprintTiles(key: string, x: number, y: number): [number, number][] {
    const [fw, fh] = FOOTPRINT[key] ?? [1, 1];
    const tx0 = Math.round(x / TS - fw / 2), ty1 = Math.round(y / TS) - 1;
    const out: [number, number][] = [];
    for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) out.push([tx0 + dx, ty1 - dy]);
    return out;
  }

  private anchorFor(key: string, tx: number, ty: number) {
    const [fw] = FOOTPRINT[key] ?? [1, 1];
    return { x: (tx + fw / 2) * TS, y: (ty + 1) * TS };
  }

  private canPlace(key: string, tx: number, ty: number) {
    const { x, y } = this.anchorFor(key, tx, ty);
    const zx0 = this.zone.x / TS, zy0 = this.zone.y / TS, zx1 = this.zone.right / TS, zy1 = this.zone.bottom / TS;
    const taken = new Set(this.placed.flatMap((p) => this.footprintTiles(p.data.key, p.data.x, p.data.y).map(([a, b]) => `${a},${b}`)));
    const me = this.player.feet;
    const meTile = `${Math.floor(me.x / TS)},${Math.floor(me.y / TS)}`;
    return this.footprintTiles(key, x, y).every(
      ([a, b]) => a >= zx0 && a < zx1 && b >= zy0 && b < zy1 && !taken.has(`${a},${b}`) && `${a},${b}` !== meTile,
    );
  }

  private addPlaced(d: PlacedDecor) {
    const { sprite, extras } = this.spawnProp(d.key, d.x, d.y);
    this.placed.push({ data: d, sprite, extras });
  }

  private commit(prev: PlacedDecor[]) {
    const next = this.placed.map((p) => p.data);
    useWorld.getState().set({ homeDecor: next });
    saveGarden(next, prev).catch(() => undefined);
    this.rebuildFinder();
    this.atmosphere.apply(currentPhase(useWorld.getState()), useWorld.getState().reducedMotion, true);
  }

  private placeAtCursor() {
    const d = useWorld.getState().decorating;
    if (!d) return;
    const prev = this.placed.map((p) => p.data);
    const hit = this.placed.find((p) => this.footprintTiles(p.data.key, p.data.x, p.data.y).some(([a, b]) => a === this.cursor.tx && b === this.cursor.ty));
    if (hit) {
      // pick it back up
      hit.sprite.destroy();
      hit.extras.forEach((e) => e.destroy());
      this.placed = this.placed.filter((p) => p !== hit);
      this.solids.refresh();
      this.commit(prev);
      return;
    }
    if (!d.item || (available(prev)[d.item] ?? 0) <= 0) return;
    if (!this.canPlace(d.item, this.cursor.tx, this.cursor.ty)) return;
    const { x, y } = this.anchorFor(d.item, this.cursor.tx, this.cursor.ty);
    this.addPlaced({ id: crypto.randomUUID(), key: d.item, x, y });
    this.commit(prev);
    if ((available(this.placed.map((p) => p.data))[d.item] ?? 0) <= 0) useWorld.getState().set({ decorating: { item: null } });
  }

  private syncDecorMode() {
    const d = useWorld.getState().decorating;
    if (!d) {
      this.ghost?.destroy();
      this.ghost = undefined;
      this.zoneGfx?.destroy();
      this.zoneGfx = undefined;
      return;
    }
    if (!this.zoneGfx) {
      this.zoneGfx = this.add.graphics().setDepth(1.4);
      this.zoneGfx.lineStyle(1, 0xfff8e6, 0.55);
      for (let x = this.zone.x; x <= this.zone.right; x += TS) this.zoneGfx.lineBetween(x, this.zone.y, x, this.zone.bottom);
      for (let y = this.zone.y; y <= this.zone.bottom; y += TS) this.zoneGfx.lineBetween(this.zone.x, y, this.zone.right, y);
      const f = this.player.feet;
      this.cursor = {
        tx: Phaser.Math.Clamp(Math.floor(f.x / TS), this.zone.x / TS, this.zone.right / TS - 1),
        ty: Phaser.Math.Clamp(Math.floor(f.y / TS) - 2, this.zone.y / TS, this.zone.bottom / TS - 1),
      };
    }
    this.ghost?.destroy();
    this.ghost = d.item ? this.add.sprite(0, 0, d.item, 0).setOrigin(0.5, 1).setAlpha(0.75).setDepth(8600) : undefined;
    this.updateGhost();
  }

  private updateGhost() {
    const d = useWorld.getState().decorating;
    if (!d) return;
    const cursorBox = this.zoneGfx;
    if (cursorBox) {
      cursorBox.clear();
      cursorBox.lineStyle(1, 0xfff8e6, 0.4);
      for (let x = this.zone.x; x <= this.zone.right; x += TS) cursorBox.lineBetween(x, this.zone.y, x, this.zone.bottom);
      for (let y = this.zone.y; y <= this.zone.bottom; y += TS) cursorBox.lineBetween(this.zone.x, y, this.zone.right, y);
      cursorBox.lineStyle(1, 0xe9b45f, 1).strokeRect(this.cursor.tx * TS, this.cursor.ty * TS, TS, TS);
    }
    if (this.ghost && d.item) {
      const { x, y } = this.anchorFor(d.item, this.cursor.tx, this.cursor.ty);
      this.ghost.setPosition(x, y);
      this.ghost.setTint(this.canPlace(d.item, this.cursor.tx, this.cursor.ty) ? 0xffffff : 0xe08a5a);
    }
  }

  // ------------------------------------------------------------------ input
  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey('W', false), down: kb.addKey('S', false), left: kb.addKey('A', false), right: kb.addKey('D', false),
      au: kb.addKey('UP', false), ad: kb.addKey('DOWN', false), al: kb.addKey('LEFT', false), ar: kb.addKey('RIGHT', false),
      jog: kb.addKey('SHIFT', false),
    };
    const busy = () => {
      const s = useWorld.getState();
      return !!(s.panel || s.openPlace || s.reading || s.atPond || s.farm) || useSession.getState().stage !== 'world';
    };
    const interact = () => {
      if (!this.sys.isActive() || busy()) return;
      if (useWorld.getState().decorating) return this.placeAtCursor();
      const n = useWorld.getState().nearby;
      if (n) this.open(n.id);
    };
    kb.addKey('E', false).on('down', interact);
    kb.addKey('ENTER', false).on('down', interact);
    // arrow keys move the placement cursor while decorating
    const nudge = (dx: number, dy: number) => () => {
      if (!this.sys.isActive() || !useWorld.getState().decorating || busy()) return;
      this.cursor.tx = Phaser.Math.Clamp(this.cursor.tx + dx, this.zone.x / TS, this.zone.right / TS - 1);
      this.cursor.ty = Phaser.Math.Clamp(this.cursor.ty + dy, this.zone.y / TS, this.zone.bottom / TS - 1);
      this.updateGhost();
    };
    for (const [k, dx, dy] of [['UP', 0, -1], ['W', 0, -1], ['DOWN', 0, 1], ['S', 0, 1], ['LEFT', -1, 0], ['A', -1, 0], ['RIGHT', 1, 0], ['D', 1, 0]] as const)
      kb.addKey(k, false).on('down', nudge(dx, dy));

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!useWorld.getState().decorating || !this.sys.isActive()) return;
      const tx = Math.floor(p.worldX / TS), ty = Math.floor(p.worldY / TS);
      if (this.zone.contains(tx * TS + 1, ty * TS + 1)) {
        this.cursor = { tx, ty };
        this.updateGhost();
      }
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.sys.isActive() || busy()) return;
      if (useWorld.getState().decorating) {
        const tx = Math.floor(p.worldX / TS), ty = Math.floor(p.worldY / TS);
        if (!this.zone.contains(tx * TS + 1, ty * TS + 1)) return;
        this.cursor = { tx, ty };
        return this.placeAtCursor();
      }
      const bed = this.plotRects.findIndex((r) => r?.contains(p.worldX, p.worldY));
      if (bed >= 0) {
        const beds = this.spots.find((s) => s.id === 'home_beds')!;
        return this.walkTo(beds.x, beds.y, () => useWorld.getState().set({ farm: { plot: bed } }));
      }
      const spot = this.spots.find((s) => Phaser.Math.Distance.Between(p.worldX, p.worldY, s.x, s.y - 12) < 26);
      this.walkTo(spot ? spot.x : p.worldX, spot ? spot.y : p.worldY, spot ? () => this.open(spot.id) : undefined);
    });
    this.unsub.push(
      bus.on('place:goto', ({ id }) => {
        if (!this.sys.isActive()) return;
        const spot = this.spots.find((s) => s.id === id);
        if (!spot) return;
        useWorld.getState().set({ panel: null });
        this.walkTo(spot.x, spot.y, () => this.open(spot.id));
      }),
    );
  }

  private walkTo(x: number, y: number, onArrive?: () => void) {
    const f = this.player.feet;
    const path = this.finder.find(Math.floor(f.x / TS), Math.floor(f.y / TS), Math.floor(x / TS), Math.floor(y / TS));
    if (!path) return;
    this.player.route = [...path.slice(1).map(([tx, ty]) => new Phaser.Math.Vector2(tx * TS + 8, ty * TS + 8)), new Phaser.Math.Vector2(x, y)];
    this.player.onArrive = onArrive ?? null;
  }

  private open(id: string) {
    const w = useWorld.getState();
    if (id === 'home_gate') return this.leave();
    if (id === 'home_beds') return w.set({ farm: { plot: null } });
    if (id === 'home_door') {
      w.set({ nearby: null, decorating: null });
      const go = () => this.scene.switch('cottage');
      if (w.reducedMotion) return go();
      this.cameras.main.fadeOut(300, 16, 41, 30);
      this.cameras.main.once('camerafadeoutcomplete', go);
      return;
    }
    if (id === 'home_pet') {
      this.pet.rest(this.petBed.x, this.petBed.y, this.player.feet);
      const name = useSession.getState().pet?.name ?? 'Your frog';
      w.set({ toast: `${name} hops into their bed and curls up for a nap.` });
      return;
    }
    w.set({ openPlace: id });
  }

  private restartForSeason(arriving = false) {
    if (!arriving) this.registry.set('resume:home', { x: this.player.x, y: this.player.y });
    this.time.delayedCall(0, () => this.scene.restart());
  }

  private arrive() {
    useWorld.getState().set({ location: 'home', hotspots: this.spots.map(({ id, label }) => ({ id, label })), nearby: null });
    const gate = this.spots.find((s) => s.id === 'home_gate')!;
    const resume = this.registry.get('resume:home') as { x: number; y: number } | undefined;
    this.registry.remove('resume:home');
    const fromDoor = this.registry.get('arrive:home') === 'door';
    this.registry.remove('arrive:home');
    const door = this.spots.find((s) => s.id === 'home_door')!;
    const at = resume ?? (fromDoor ? { x: door.x, y: door.y + 12 } : { x: gate.x, y: gate.y - 22 });
    this.player.setPosition(at.x, at.y);
    this.player.route = [];
    this.pet.setPosition(gate.x - 16, gate.y - 16);
    this.cameras.main.fadeIn(useWorld.getState().reducedMotion ? 0 : 400, 16, 41, 30);
    this.atmosphere?.apply(currentPhase(useWorld.getState()), useWorld.getState().reducedMotion, true);
  }

  private leave() {
    useWorld.getState().set({ nearby: null, decorating: null });
    const done = () => this.scene.switch('main-world');
    if (useWorld.getState().reducedMotion) done();
    else {
      this.cameras.main.fadeOut(300, 16, 41, 30);
      this.cameras.main.once('camerafadeoutcomplete', done);
    }
  }

  private fireflies(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < 12; i++) {
      const f = this.add
        .sprite(Phaser.Math.Between(this.zone.x, this.zone.right), Phaser.Math.Between(this.zone.y, this.zone.bottom), 'fx_firefly', 0)
        .setDepth(9002)
        .setBlendMode(Phaser.BlendModes.ADD);
      const drift = () =>
        this.tweens.add({
          targets: f, x: f.x + Phaser.Math.Between(-20, 20), y: f.y + Phaser.Math.Between(-14, 14),
          duration: Phaser.Math.Between(3000, 5200), ease: 'Sine.inOut', onComplete: () => f.active && drift(),
        });
      drift();
      this.tweens.add({ targets: f, alpha: { from: 1, to: 0.25 }, duration: Phaser.Math.Between(900, 1800), yoyo: true, repeat: -1 });
      out.push(f);
    }
    return out;
  }

  update(_t: number, dt: number) {
    const s = useWorld.getState();
    const deco = !!s.decorating;
    this.player.frozen = deco || !!(s.panel || s.openPlace || s.reading || s.atPond || s.farm) || useSession.getState().stage !== 'world';
    const k = this.keys;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || k.ar.isDown ? 1 : 0) - (k.left.isDown || k.al.isDown ? 1 : 0),
      (k.down.isDown || k.ad.isDown ? 1 : 0) - (k.up.isDown || k.au.isDown ? 1 : 0),
    );
    this.player.drive(dir, k.jog.isDown ? 110 : WALK_SPEED);
    const moving = (this.player.body as Phaser.Physics.Arcade.Body).velocity.lengthSq() > 4;
    this.pet.update(dt, this.player.feet, moving);

    let near: Spot | null = null;
    let best = 24;
    if (!deco)
      for (const sp of this.spots) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y);
        if (d < best) {
          best = d;
          near = sp;
        }
      }
    if ((near?.id ?? null) !== (s.nearby?.id ?? null)) s.set({ nearby: near ? { id: near.id, label: near.label } : null });
  }
}
