import Phaser from 'phaser';
import type { Manifest, SpriteMeta } from '../assets';
import { Player, registerPlayerAnims, WALK_SPEED } from '../entities/Player';
import { Pet, registerPetAnims } from '../entities/Pet';
import { Atmosphere, LightSource, Litable } from '../systems/Atmosphere';
import { Pathfinder } from '../systems/Pathfinder';
import { bus } from '../bus';
import { currentPhase, useWorld, Hotspot } from '../../state/world';
import { useSession } from '../../state/session';
import { composeAvatar } from '../../features/avatar/compose';
import type { AvatarConfig } from '../../features/avatar/types';

const TS = 16;
const WATER_FULL = 1 * 16 + 15 + 1; // gid of the all-water tile
const FLOWER_GIDS = new Set([113, 114, 115, 116, 117, 118, 119, 120, 129, 130, 131, 132, 133, 134, 135, 136]);

/** Window/lamp light positions relative to each building's bottom-centre anchor. */
const BUILDING_LIGHTS: Record<string, LightSource[]> = {
  bld_cottage: [
    { x: -29, y: -37, size: 'm' }, { x: 29, y: -37, size: 'm' }, { x: 0, y: -66, size: 's' },
    { x: 0, y: -36, size: 's' }, { x: 10, y: -32, size: 's' },
  ],
  bld_library: [
    { x: -22, y: -33, size: 'l', strength: 0.55 }, { x: -10, y: -72, size: 's' }, { x: 33, y: -48, size: 's' }, { x: 10, y: -34, size: 's' },
  ],
  bld_glasshouse: [{ x: 0, y: -40, size: 'l', strength: 0.6 }],
  bld_pavilion: [{ x: -23, y: -45, size: 's' }, { x: 25, y: -45, size: 's' }],
};

const MARKERS: Record<string, { icon: string; lift: number }> = {
  cottage: { icon: 'house', lift: 110 },
  library: { icon: 'book', lift: 110 },
  glasshouse: { icon: 'leaf', lift: 98 },
  playground: { icon: 'puzzle', lift: 86 },
  pond: { icon: 'pond', lift: 30 },
  curiosity: { icon: 'sprout', lift: 36 },
};

type Prop = { name: string; type?: string; value: unknown };
const prop = (o: Phaser.Types.Tilemaps.TiledObject, k: string) =>
  (o.properties as Prop[] | undefined)?.find((p) => p.name === k)?.value;

interface HotspotPoint extends Hotspot {
  x: number;
  y: number;
}

export class MainWorldScene extends Phaser.Scene {
  private player!: Player;
  private pet!: Pet;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hotspots: HotspotPoint[] = [];
  private finder!: Pathfinder;
  private atmosphere!: Atmosphere;
  private manifest!: Manifest;
  private waterTiles: [number, number][] = [];
  private flowerTiles: [number, number][] = [];
  private cherries: Phaser.Math.Vector2[] = [];
  private chimney?: Phaser.Math.Vector2;
  private unsub: (() => void)[] = [];

  constructor() {
    super('main-world');
  }

  create() {
    this.manifest = this.cache.json.get('manifest') as Manifest;
    registerPlayerAnims(this);
    registerPetAnims(this, 'pet_frog');

    // ---------------------------------------------------------------- terrain
    const map = this.make.tilemap({ key: 'main_world' });
    const ts = map.addTilesetImage('world', 'tiles')!;
    map.createLayer('ground', ts, 0, 0)!.setDepth(0);
    map.createLayer('deco', ts, 0, 0)!.setDepth(1);
    const colLayer = map.createLayer('collision', ts, 0, 0)!.setVisible(false);
    colLayer.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    map.getLayer('ground')!.data.forEach((row) =>
      row.forEach((t) => t.index === WATER_FULL && this.waterTiles.push([t.x, t.y])),
    );
    map.getLayer('deco')!.data.forEach((row) =>
      row.forEach((t) => FLOWER_GIDS.has(t.index) && this.flowerTiles.push([t.x, t.y])),
    );

    // ---------------------------------------------------------------- props + buildings
    const solids = this.physics.add.staticGroup();
    const lights: LightSource[] = [];
    const litables: Litable[] = [];
    const bodyRects: Phaser.Geom.Rectangle[] = [];
    for (const o of map.getObjectLayer('objects')!.objects) {
      const key = o.name;
      const meta: SpriteMeta | undefined = this.manifest.sprites[key];
      if (!meta) continue;
      const x = o.x!, y = o.y!;
      const s = this.add.sprite(x, y, key, (prop(o, 'frame') as number) ?? 0).setOrigin(0.5, 1);
      if (prop(o, 'flip')) s.setFlipX(true);
      s.setDepth(meta.flat ? 1.5 : y);
      if (meta.shadow) this.add.ellipse(x, y - 1, meta.shadow[0], meta.shadow[1], 0x10291e, 0.32).setDepth(2);
      if (meta.anim && meta.frames > 1) {
        const ak = `${key}-loop`;
        if (!this.anims.exists(ak))
          this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, {}), frameRate: meta.anim, repeat: -1 });
        s.play(ak);
      }
      const rects = [...(meta.body ? [meta.body] : []), ...(meta.bodies ?? [])];
      for (const [bx, by, bw, bh] of rects) {
        const dx = s.flipX ? -bx - bw : bx;
        const r = new Phaser.Geom.Rectangle(x + dx, y + by, bw, bh);
        bodyRects.push(r);
        const z = this.add.zone(r.centerX, r.centerY, bw, bh);
        solids.add(z);
      }
      if (key.startsWith('bld_')) {
        litables.push({ setLit: (lit) => s.setFrame(lit ? 1 : 0) });
        for (const l of BUILDING_LIGHTS[key] ?? []) lights.push({ x: x + l.x, y: y + l.y, size: l.size });
        if (key === 'bld_cottage') this.chimney = new Phaser.Math.Vector2(x + 23, y - 99);
      }
      if (key === 'lantern') {
        litables.push({ setLit: (lit) => s.setFrame(lit ? 1 : 0) });
        lights.push({ x, y: y - 24, size: 's', strength: 0.8 }, { x, y: y - 4, size: 'm', strength: 0.4 });
      }
      if (key === 'tree_cherry' || key === 'tree_cherry_s') this.cherries.push(new Phaser.Math.Vector2(x, y - 40));
    }
    solids.refresh();

    // pathfinding grid = collision tiles + prop bodies
    const blocked = new Uint8Array(map.width * map.height);
    colLayer.forEachTile((t) => {
      if (t.index > 0) blocked[t.y * map.width + t.x] = 1;
    });
    for (const r of bodyRects) {
      for (let ty = Math.floor((r.y + 2) / TS); ty <= Math.floor((r.bottom - 2) / TS); ty++)
        for (let tx = Math.floor((r.x + 2) / TS); tx <= Math.floor((r.right - 2) / TS); tx++)
          if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height) blocked[ty * map.width + tx] = 1;
    }
    this.finder = new Pathfinder(map.width, map.height, blocked);

    // ---------------------------------------------------------------- hotspots + markers
    let spawn = new Phaser.Math.Vector2(30 * TS, 36 * TS);
    for (const o of map.getObjectLayer('hotspots')!.objects) {
      if (o.type === 'spawn' || o.name === 'spawn') {
        spawn = new Phaser.Math.Vector2(o.x!, o.y!);
        continue;
      }
      const h: HotspotPoint = { id: o.name, label: String(prop(o, 'label') ?? o.name), x: o.x!, y: o.y! };
      this.hotspots.push(h);
      const m = MARKERS[h.id];
      if (m) {
        const mk = this.add
          .sprite(h.x, h.y - m.lift, `marker_${m.icon}`)
          .setOrigin(0.5, 1)
          .setDepth(8500)
          .setInteractive({ useHandCursor: true, pixelPerfect: true });
        mk.setData('hotspot', h.id);
        if (!useWorld.getState().reducedMotion)
          this.tweens.add({ targets: mk, y: mk.y - 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    }
    useWorld.getState().set({ hotspots: this.hotspots.map(({ id, label }) => ({ id, label })), ready: true });

    // ---------------------------------------------------------------- player + pet
    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, colLayer);
    this.physics.add.collider(this.player, solids);
    this.player.setCollideWorldBounds(true);
    this.pet = new Pet(this, spawn.x - 18, spawn.y + 4, 'pet_frog', () => useWorld.getState().reducedMotion);
    this.add.ellipse(0, 0, 12, 4, 0x10291e, 0.35).setDepth(2).setName('player-shadow');

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(true);

    // ---------------------------------------------------------------- input
    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey('W', false), down: kb.addKey('S', false), left: kb.addKey('A', false), right: kb.addKey('D', false),
      au: kb.addKey('UP', false), ad: kb.addKey('DOWN', false), al: kb.addKey('LEFT', false), ar: kb.addKey('RIGHT', false),
      jog: kb.addKey('SHIFT', false),
    };
    const inWorld = () => useSession.getState().stage === 'world';
    const interact = () => {
      const s = useWorld.getState();
      if (this.sys.isActive() && inWorld() && s.nearby && !s.openPlace && !s.panel && !s.reading && !s.atPond) this.openPlace(s.nearby.id);
    };
    kb.addKey('E', false).on('down', interact);
    kb.addKey('ENTER', false).on('down', interact);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      const s = useWorld.getState();
      if (s.openPlace || s.panel || s.reading || s.atPond || !inWorld() || !this.sys.isActive()) return;
      const hs = objs.map((o) => o.getData('hotspot') as string | undefined).find(Boolean);
      if (hs) this.goTo(hs, true);
      else this.walkTo(p.worldX, p.worldY);
    });

    this.unsub.push(bus.on('place:goto', ({ id }) => this.sys.isActive() && this.goTo(id, true)));
    this.events.on('wake', () => {
      useWorld.getState().set({ location: 'garden', hotspots: this.hotspots.map(({ id, label }) => ({ id, label })), nearby: null });
      // step out onto the path in front of the door you came through
      this.player.setPosition(this.player.x, this.player.y + 10);
      this.player.facing = 'down';
      this.cameras.main.fadeIn(useWorld.getState().reducedMotion ? 0 : 400, 16, 41, 30);
    });

    // ---------------------------------------------------------------- atmosphere
    this.atmosphere = new Atmosphere(this, lights, litables, [() => this.spawnNight()], [() => this.spawnDay()]);
    const applyAtmo = (instant = false) => {
      const s = useWorld.getState();
      this.atmosphere.apply(currentPhase(s), s.reducedMotion, instant);
      cam.setLerp(s.reducedMotion ? 1 : 0.12, s.reducedMotion ? 1 : 0.12);
    };
    applyAtmo(true);
    let lastRM = useWorld.getState().reducedMotion;
    const syncFreeze = () => {
      const s = useWorld.getState();
      this.player.frozen = !!(s.openPlace || s.panel || s.reading || s.atPond) || !inWorld();
    };
    syncFreeze();
    let lastAvatar: AvatarConfig | null = null;
    const syncAvatar = (a: AvatarConfig | null) => {
      if (!a || a === lastAvatar) return;
      lastAvatar = a;
      composeAvatar(a).then((canvas) => {
        if (lastAvatar !== a || !this.sys.isActive()) return;
        const key = `avatar-${Date.now()}`;
        this.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, { frameWidth: 24, frameHeight: 32 });
        const old = this.player.texture.key;
        registerPlayerAnims(this, key);
        this.player.refreshLook(key);
        this.registry.set('avatarTex', key);
        this.game.events.emit('avatar-changed', key);
        if (old.startsWith('avatar-')) this.textures.remove(old);
      });
    };
    syncAvatar(useSession.getState().avatar);
    this.unsub.push(
      useSession.subscribe((st) => {
        syncFreeze();
        syncAvatar(st.avatar);
      }),
    );
    this.unsub.push(
      useWorld.subscribe((s) => {
        syncFreeze();
        const rmChanged = s.reducedMotion !== lastRM;
        lastRM = s.reducedMotion;
        applyAtmo(rmChanged);
      }),
    );

    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (!this.chimney || useWorld.getState().reducedMotion) return;
        const p = this.add.sprite(this.chimney.x, this.chimney.y, 'fx_smoke', 0).setDepth(8400);
        this.tweens.add({
          targets: p, y: p.y - 22, x: p.x + Phaser.Math.Between(2, 7), duration: 3200,
          onUpdate: (tw) => p.setFrame(Math.min(3, Math.floor(tw.progress * 4))),
          onComplete: () => p.destroy(),
        });
        this.tweens.add({ targets: p, alpha: 0, delay: 2000, duration: 1200 });
      },
    });

    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    (window as unknown as { __fodder: unknown }).__fodder = { scene: this };
  }

  // ------------------------------------------------------------------ navigation
  private walkTo(x: number, y: number, onArrive?: () => void) {
    const f = this.player.feet;
    const path = this.finder.find(Math.floor(f.x / TS), Math.floor(f.y / TS), Math.floor(x / TS), Math.floor(y / TS));
    if (!path) return;
    const pts = path.slice(1).map(([tx, ty]) => new Phaser.Math.Vector2(tx * TS + 8, ty * TS + 8));
    const end = path[path.length - 1];
    if (!this.finder.isBlocked(Math.floor(x / TS), Math.floor(y / TS)) && end[0] === Math.floor(x / TS) && end[1] === Math.floor(y / TS))
      pts.push(new Phaser.Math.Vector2(x, y));
    this.player.route = pts;
    this.player.onArrive = onArrive ?? null;
  }

  private goTo(id: string, open: boolean) {
    const h = this.hotspots.find((p) => p.id === id);
    if (!h) return;
    useWorld.getState().set({ panel: null });
    if (this.player.feet.distance(new Phaser.Math.Vector2(h.x, h.y)) < 20) {
      if (open) this.openPlace(id);
      return;
    }
    this.walkTo(h.x, h.y + 6, open ? () => this.openPlace(id) : undefined);
  }

  private openPlace(id: string) {
    if (id === 'library') return this.enterInterior('library');
    if (id === 'cottage') return this.enterInterior('home');
    if (id === 'pond') {
      useWorld.getState().set({ atPond: true });
      return;
    }
    useWorld.getState().set({ openPlace: id });
    bus.emit('place:opened', { id });
  }

  private enterInterior(key: string) {
    useWorld.getState().set({ nearby: null });
    this.player.route = [];
    const go = () => this.scene.switch(key);
    if (useWorld.getState().reducedMotion) go();
    else {
      this.cameras.main.fadeOut(300, 16, 41, 30);
      this.cameras.main.once('camerafadeoutcomplete', go);
    }
  }

  // ------------------------------------------------------------------ ambient life
  private spawnDay(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    // butterflies over flower tiles
    for (let i = 0; i < 7 && this.flowerTiles.length; i++) {
      const [tx, ty] = Phaser.Utils.Array.GetRandom(this.flowerTiles);
      const b = this.add.sprite(tx * TS + 8, ty * TS, 'fx_butterfly').setDepth(8000);
      b.anims.create({ key: 'flap', frames: this.anims.generateFrameNumbers('fx_butterfly', {}), frameRate: 5, repeat: -1 });
      b.play('flap');
      const wander = () =>
        this.tweens.add({
          targets: b, x: b.x + Phaser.Math.Between(-30, 30), y: b.y + Phaser.Math.Between(-18, 18),
          duration: Phaser.Math.Between(2600, 4200), ease: 'Sine.inOut', onComplete: () => b.active && wander(),
        });
      wander();
      out.push(b);
    }
    // koi
    if (this.waterTiles.length) {
      for (let i = 0; i < 3; i++) {
        const [tx, ty] = Phaser.Utils.Array.GetRandom(this.waterTiles);
        const k = this.add.sprite(tx * TS + 8, ty * TS + 8, 'fx_koi').setDepth(0.5);
        k.anims.create({ key: 'swim', frames: this.anims.generateFrameNumbers('fx_koi', {}), frameRate: 4, repeat: -1 });
        k.play('swim');
        const swim = () => {
          const [nx, ny] = Phaser.Utils.Array.GetRandom(this.waterTiles);
          k.setFlipX(nx * TS + 8 < k.x);
          this.tweens.add({
            targets: k, x: nx * TS + 8, y: ny * TS + 8, ease: 'Sine.inOut',
            duration: Phaser.Math.Distance.Between(k.x, k.y, nx * TS, ny * TS) * 70 + 800,
            onComplete: () => k.active && this.time.delayedCall(Phaser.Math.Between(500, 2500), swim),
          });
        };
        swim();
        out.push(k);
      }
      // sparkles
      for (let i = 0; i < 10; i++) {
        const [tx, ty] = Phaser.Utils.Array.GetRandom(this.waterTiles);
        const s = this.add.sprite(tx * TS + Phaser.Math.Between(2, 14), ty * TS + Phaser.Math.Between(2, 14), 'fx_sparkle', 3).setDepth(1.2);
        s.anims.create({
          key: 'tw', frames: this.anims.generateFrameNumbers('fx_sparkle', { frames: [0, 1, 2, 3, 3, 3, 3, 3] }),
          frameRate: 5, repeat: -1, delay: Phaser.Math.Between(0, 3000), repeatDelay: Phaser.Math.Between(1000, 4000),
        });
        s.play('tw');
        out.push(s);
      }
    }
    // drifting cherry petals
    const petals = this.time.addEvent({
      delay: 700, loop: true,
      callback: () => {
        if (!this.cherries.length) return;
        const c = Phaser.Utils.Array.GetRandom(this.cherries);
        const p = this.add.sprite(c.x + Phaser.Math.Between(-22, 22), c.y + Phaser.Math.Between(-16, 10), 'fx_petal', 0).setDepth(8000);
        this.tweens.add({
          targets: p, x: p.x + Phaser.Math.Between(14, 34), y: p.y + Phaser.Math.Between(30, 46), duration: 4200,
          onUpdate: (tw) => p.setFrame(Math.floor(tw.progress * 12) % 4), onComplete: () => p.destroy(),
        });
        this.tweens.add({ targets: p, alpha: 0, delay: 3200, duration: 1000 });
      },
    });
    out.push({ destroy: () => petals.remove() } as unknown as Phaser.GameObjects.GameObject);
    return out;
  }

  private spawnNight(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    // fireflies drifting over the meadow and pond edge
    for (let i = 0; i < 26; i++) {
      const pool = i % 2 && this.waterTiles.length ? this.waterTiles : this.flowerTiles;
      if (!pool.length) break;
      const [tx, ty] = Phaser.Utils.Array.GetRandom(pool);
      const f = this.add.sprite(tx * TS + 8, ty * TS - 6, 'fx_firefly', 0).setDepth(9002).setBlendMode(Phaser.BlendModes.ADD);
      const drift = () =>
        this.tweens.add({
          targets: f, x: f.x + Phaser.Math.Between(-20, 20), y: f.y + Phaser.Math.Between(-14, 14),
          duration: Phaser.Math.Between(3000, 5200), ease: 'Sine.inOut', onComplete: () => f.active && drift(),
        });
      drift();
      this.tweens.add({ targets: f, alpha: { from: 1, to: 0.25 }, duration: Phaser.Math.Between(900, 1800), yoyo: true, repeat: -1 });
      out.push(f);
    }
    // stars and the moon reflected in the pond
    if (this.waterTiles.length) {
      const xs = this.waterTiles.map((t) => t[0]), ys = this.waterTiles.map((t) => t[1]);
      const cx = ((Math.min(...xs) + Math.max(...xs)) / 2) * TS + 8, cy = ((Math.min(...ys) + Math.max(...ys)) / 2) * TS;
      const moon = this.add.image(cx + 20, cy - 4, 'fx_moon').setBlendMode(Phaser.BlendModes.ADD).setDepth(9001).setAlpha(0.55);
      this.tweens.add({ targets: moon, x: moon.x + 1, duration: 1800, yoyo: true, repeat: -1, ease: 'Stepped' });
      out.push(moon);
      for (let i = 0; i < 16; i++) {
        const [tx, ty] = Phaser.Utils.Array.GetRandom(this.waterTiles);
        const s = this.add.sprite(tx * TS + Phaser.Math.Between(1, 15), ty * TS + Phaser.Math.Between(1, 15), 'fx_star', i % 2)
          .setDepth(9002).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
        this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(1600, 3000), yoyo: true, repeat: -1, delay: i * 180 });
        out.push(s);
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ loop
  update(_t: number, dt: number) {
    const k = this.keys;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || k.ar.isDown ? 1 : 0) - (k.left.isDown || k.al.isDown ? 1 : 0),
      (k.down.isDown || k.ad.isDown ? 1 : 0) - (k.up.isDown || k.au.isDown ? 1 : 0),
    );
    this.player.drive(dir, k.jog.isDown ? 110 : WALK_SPEED);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moving = body.velocity.lengthSq() > 4;
    this.pet.update(dt, this.player.feet, moving);
    (this.children.getByName('player-shadow') as Phaser.GameObjects.Ellipse)?.setPosition(
      Math.round(this.player.x), Math.round(this.player.y) - 1,
    );

    // nearest hotspot within reach
    const f = this.player.feet;
    let near: HotspotPoint | null = null;
    let best = 26;
    for (const h of this.hotspots) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, h.x, h.y);
      if (d < best) {
        best = d;
        near = h;
      }
    }
    const s = useWorld.getState();
    if ((near?.id ?? null) !== (s.nearby?.id ?? null)) s.set({ nearby: near ? { id: near.id, label: near.label } : null });
  }
}


