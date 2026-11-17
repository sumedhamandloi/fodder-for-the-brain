import Phaser from 'phaser';
import { Player, WALK_SPEED } from '../entities/Player';
import { Pet } from '../entities/Pet';
import { linkPet, petKey } from '../systems/petLink';
import { bus } from '../bus';
import { currentPhase, currentSeason, currentWeather, isBusy, useWorld, Phase } from '../../state/world';
import { useSession } from '../../state/session';

export interface InteriorSpot {
  id: string;
  label: string;
  x: number;
  y: number;
  open: (scene: InteriorScene) => void;
}

export interface InteriorConfig {
  key: string; // scene key
  location: 'library' | 'cottage' | 'glasshouse';
  room: string; // background texture (480x270, transparent where windows are)
  windows: { x: number; y: number; w: number; h: number }[];
  furniture: { key: string; x: number; y: number; block?: [number, number, number, number] }[];
  glows: { x: number; y: number; size: 's' | 'm' | 'l'; alpha: number; flicker?: boolean }[];
  fire?: { x: number; y: number };
  tint: number;
  floorTop: number;
  spawn: [number, number];
  exitTo: string;
  spots: InteriorSpot[];
}

const SKY: Record<Phase, number> = {
  dawn: 0xf4c6ce, morning: 0xb6e0da, afternoon: 0x77b7bd, sunset: 0xe9b45f, evening: 0x5b4e86, night: 0x1a2638,
};

function mix(a: number, b: number, t: number) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/** A front-facing room you can walk around. Windows show the live sky: time of day, season and weather. */
export class InteriorScene extends Phaser.Scene {
  player!: Player;
  pet!: Pet;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private sky: Phaser.GameObjects.Rectangle[] = [];
  private drops: { img: Phaser.GameObjects.Image; v: number; win: number }[] = [];
  private unsub: (() => void)[] = [];

  constructor(readonly cfg: InteriorConfig) {
    super(cfg.key);
  }

  create() {
    const c = this.cfg;
    this.sky = [];
    this.drops = [];
    this.unsub = [];
    const cam = this.cameras.main;
    cam.setBackgroundColor('#10291E');
    cam.centerOn(240, 135);
    this.scale.on('resize', () => cam.centerOn(240, 135));

    for (const w of c.windows) this.sky.push(this.add.rectangle(w.x, w.y, w.w, w.h, 0x77b7bd).setOrigin(0).setDepth(-2));
    this.add.image(0, 0, c.room).setOrigin(0).setDepth(0);

    const solids = this.physics.add.staticGroup();
    const block = (x: number, y: number, w: number, h: number) => solids.add(this.add.zone(x + w / 2, y + h / 2, w, h));
    for (const f of c.furniture) {
      this.add.sprite(f.x, f.y, f.key).setOrigin(0.5, 1).setDepth(f.y);
      if (f.block) block(...f.block);
    }
    block(0, 0, 480, c.floorTop);
    block(0, 0, 16, 270);
    block(464, 0, 16, 270);
    block(0, 266, 480, 4);

    const reduce = () => useWorld.getState().reducedMotion;
    if (c.fire) {
      if (!this.anims.exists('fire-loop'))
        this.anims.create({ key: 'fire-loop', frames: this.anims.generateFrameNumbers('fx_fire', {}), frameRate: 7, repeat: -1 });
      const fire = this.add.sprite(c.fire.x, c.fire.y, 'fx_fire').setOrigin(0.5, 1).setDepth(1);
      if (!reduce()) fire.play('fire-loop');
    }
    this.add.rectangle(0, 0, 480, 270, c.tint, 1).setOrigin(0).setDepth(9000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    for (const g of c.glows) {
      const img = this.add.image(g.x, g.y, `fx_glow_${g.size}`).setBlendMode(Phaser.BlendModes.ADD).setDepth(9001).setAlpha(g.alpha);
      if (g.flicker && !reduce())
        this.tweens.add({ targets: img, alpha: g.alpha * 0.7, duration: Phaser.Math.Between(260, 520), yoyo: true, repeat: -1, ease: 'Stepped' });
    }

    this.player = new Player(this, c.spawn[0], c.spawn[1]);
    this.player.refreshLook((this.registry.get('avatarTex') as string) ?? 'player');
    this.player.facing = 'up';
    this.physics.add.collider(this.player, solids);
    this.pet = new Pet(this, c.spawn[0] - 18, c.spawn[1] + 6, petKey(), reduce);
    this.unsub.push(linkPet(this, this.pet, this.player));
    const shadow = this.add.ellipse(0, 0, 12, 4, 0x10291e, 0.35).setDepth(2);
    this.events.on('update', () => shadow.setPosition(Math.round(this.player.x), Math.round(this.player.y) - 1));

    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey('W', false), down: kb.addKey('S', false), left: kb.addKey('A', false), right: kb.addKey('D', false),
      au: kb.addKey('UP', false), ad: kb.addKey('DOWN', false), al: kb.addKey('LEFT', false), ar: kb.addKey('RIGHT', false),
      jog: kb.addKey('SHIFT', false),
    };
    const interact = () => {
      if (!this.sys.isActive() || isBusy(useWorld.getState())) return;
      this.cfg.spots.find((p) => p.id === useWorld.getState().nearby?.id)?.open(this);
    };
    kb.addKey('E', false).on('down', interact);
    kb.addKey('ENTER', false).on('down', interact);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (isBusy(useWorld.getState()) || !this.sys.isActive()) return;
      const spot = this.cfg.spots.find((sp) => Phaser.Math.Distance.Between(p.worldX, p.worldY, sp.x, sp.y - 20) < 34);
      this.walkTo(spot ? spot.x : p.worldX, spot ? spot.y : Phaser.Math.Clamp(p.worldY, c.floorTop + 4, 262), spot ? () => spot.open(this) : undefined);
    });
    this.unsub.push(
      bus.on('place:goto', ({ id }) => {
        if (!this.sys.isActive()) return;
        const spot = this.cfg.spots.find((s) => s.id === id);
        if (!spot) return;
        useWorld.getState().set({ panel: null });
        this.walkTo(spot.x, spot.y, () => spot.open(this));
      }),
    );
    this.unsub.push(useWorld.subscribe(() => this.sys.isActive() && this.paintSky()));
    this.game.events.on('avatar-changed', (key: string) => this.player?.active && this.player.refreshLook(key), this);
    const onWake = () => this.arrive();
    this.events.on('wake', onWake);
    this.events.once('shutdown', () => {
      this.events.off('wake', onWake);
      this.unsub.forEach((u) => u());
    });
    this.arrive();
  }

  /** The sky through the windows follows the time of day, cooled by cloud, whitened by snow. */
  private paintSky() {
    const s = useWorld.getState();
    const weather = currentWeather(s);
    let col = SKY[currentPhase(s)];
    if (['cloudy', 'light_rain', 'heavy_rain', 'storm', 'fog'].includes(weather)) col = mix(col, 0x8a9190, weather === 'cloudy' ? 0.35 : 0.55);
    if (weather === 'snow' || currentSeason(s) === 'winter') col = mix(col, 0xc9d6e2, weather === 'snow' ? 0.6 : 0.25);
    this.sky.forEach((r) => r.setFillStyle(col));
    // window weather: rain streaks or snowflakes falling past the glass
    const want = s.reducedMotion ? 0 : weather === 'light_rain' ? 26 : weather === 'heavy_rain' || weather === 'storm' ? 54 : weather === 'snow' ? 30 : 0;
    const key = weather === 'snow' ? 'fx_snow' : 'fx_rain';
    if (this.drops.length && (this.drops.length !== want || this.drops[0].img.texture.key !== key)) {
      this.drops.forEach((d) => d.img.destroy());
      this.drops = [];
    }
    if (!this.drops.length && want) {
      for (let i = 0; i < want; i++) {
        const win = i % this.cfg.windows.length;
        const w = this.cfg.windows[win];
        const img = this.add.image(Phaser.Math.Between(w.x + 2, w.x + w.w - 2), Phaser.Math.Between(w.y, w.y + w.h), key, i % 2).setDepth(-1).setAlpha(0.75);
        this.drops.push({ img, v: weather === 'snow' ? Phaser.Math.FloatBetween(14, 24) : Phaser.Math.FloatBetween(70, 110), win });
      }
    }
  }

  private arrive() {
    const c = this.cfg;
    this.player.setPosition(c.spawn[0], c.spawn[1]);
    this.pet.setPosition(c.spawn[0] - 18, c.spawn[1] + 6);
    this.player.route = [];
    useWorld.getState().set({ location: c.location, hotspots: c.spots.map(({ id, label }) => ({ id, label })), nearby: null });
    this.paintSky();
    this.cameras.main.fadeIn(useWorld.getState().reducedMotion ? 0 : 400, 16, 41, 30);
  }

  walkTo(x: number, y: number, onArrive?: () => void) {
    this.player.route = [new Phaser.Math.Vector2(x, y)];
    this.player.onArrive = onArrive ?? null;
  }

  leave() {
    useWorld.getState().set({ reading: null, nearby: null });
    const done = () => this.scene.switch(this.cfg.exitTo);
    if (useWorld.getState().reducedMotion) done();
    else {
      this.cameras.main.fadeOut(300, 16, 41, 30);
      this.cameras.main.once('camerafadeoutcomplete', done);
    }
  }

  update(_t: number, dt: number) {
    const s = useWorld.getState();
    this.player.frozen = isBusy(s) || useSession.getState().stage !== 'world';
    const k = this.keys;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || k.ar.isDown ? 1 : 0) - (k.left.isDown || k.al.isDown ? 1 : 0),
      (k.down.isDown || k.ad.isDown ? 1 : 0) - (k.up.isDown || k.au.isDown ? 1 : 0),
    );
    this.player.drive(dir, k.jog.isDown ? 110 : WALK_SPEED);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moving = body.velocity.lengthSq() > 4;
    // a click-walk that bumps into furniture just arrives where it stopped
    if (this.player.route.length && (body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right)) {
      const t = this.player.route[0];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) < 24) {
        this.player.route = [];
        const cb = this.player.onArrive;
        this.player.onArrive = null;
        cb?.();
      }
    }
    this.pet.update(dt, this.player.feet, moving);

    for (const d of this.drops) {
      const w = this.cfg.windows[d.win];
      d.img.y += (d.v * dt) / 1000;
      if (d.img.y > w.y + w.h) {
        d.img.y = w.y - 4;
        d.img.x = Phaser.Math.Between(w.x + 2, w.x + w.w - 2);
      }
    }

    let near: InteriorSpot | null = null;
    let best = 28;
    for (const sp of this.cfg.spots) {
      const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y);
      if (dd < best) {
        best = dd;
        near = sp;
      }
    }
    if ((near?.id ?? null) !== (s.nearby?.id ?? null)) s.set({ nearby: near ? { id: near.id, label: near.label } : null });
  }
}
