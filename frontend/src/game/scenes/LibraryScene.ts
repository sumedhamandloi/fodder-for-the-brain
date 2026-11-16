import Phaser from 'phaser';
import { Player, WALK_SPEED } from '../entities/Player';
import { Pet } from '../entities/Pet';
import { bus } from '../bus';
import { useWorld, LibraryView } from '../../state/world';
import { useSession } from '../../state/session';
import { readOfTheDay } from '../../features/library/content';

interface Spot {
  id: string;
  label: string;
  x: number;
  y: number;
  open: () => void;
}

/** The Little Library interior: a single front-facing room (480x270 art px). */
export class LibraryScene extends Phaser.Scene {
  private player!: Player;
  private pet!: Pet;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private spots: Spot[] = [];
  private rain: Phaser.GameObjects.Image[] = [];
  private unsub: (() => void)[] = [];

  constructor() {
    super('library');
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#10291E');
    cam.centerOn(240, 135);
    this.scale.on('resize', () => cam.centerOn(240, 135));
    this.add.image(0, 0, 'room_library').setOrigin(0).setDepth(0);

    // furniture (y-sorted with the player)
    const solids = this.physics.add.staticGroup();
    const block = (x: number, y: number, w: number, h: number) => solids.add(this.add.zone(x + w / 2, y + h / 2, w, h));
    this.add.sprite(98, 220, 'lib_desk').setOrigin(0.5, 1).setDepth(220);
    block(54, 206, 88, 14);
    this.add.sprite(388, 218, 'lib_chair').setOrigin(0.5, 1).setDepth(218);
    block(362, 204, 52, 14);
    this.add.sprite(432, 216, 'lib_lamp').setOrigin(0.5, 1).setDepth(216);
    block(426, 210, 12, 6);
    // walls: everything above the floor line, plus the sides
    block(0, 0, 480, 158);
    block(0, 0, 16, 270);
    block(464, 0, 16, 270);
    block(0, 266, 480, 4);

    // fire, candles, lamp light
    const reduce = () => useWorld.getState().reducedMotion;
    if (!this.anims.exists('fire-loop'))
      this.anims.create({ key: 'fire-loop', frames: this.anims.generateFrameNumbers('fx_fire', {}), frameRate: 7, repeat: -1 });
    const fire = this.add.sprite(398, 142, 'fx_fire').setOrigin(0.5, 1).setDepth(1);
    if (!reduce()) fire.play('fire-loop');
    this.add.rectangle(0, 0, 480, 270, 0xe6cfae, 1).setOrigin(0).setDepth(9000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const glow = (x: number, y: number, size: string, a: number, flicker: boolean) => {
      const g = this.add.image(x, y, `fx_glow_${size}`).setBlendMode(Phaser.BlendModes.ADD).setDepth(9001).setAlpha(a);
      if (flicker && !reduce())
        this.tweens.add({ targets: g, alpha: a * 0.7, duration: Phaser.Math.Between(260, 520), yoyo: true, repeat: -1, ease: 'Stepped' });
    };
    glow(398, 130, 'l', 0.55, true);
    glow(122, 176, 's', 0.7, true); // desk candle
    glow(432, 164, 'm', 0.5, false); // floor lamp
    glow(357, 82, 's', 0.6, true);
    glow(363, 82, 's', 0.6, true); // mantel candles

    // rain on the window
    if (!reduce()) {
      for (let i = 0; i < 34; i++) {
        const d = this.add.image(Phaser.Math.Between(186, 294), Phaser.Math.Between(30, 112), 'fx_rain', i % 4).setDepth(0.5).setAlpha(0.7);
        d.setData('v', Phaser.Math.FloatBetween(70, 110));
        this.rain.push(d);
      }
    }

    // places in the room
    const go = (v: LibraryView) => useWorld.getState().set({ reading: v });
    this.spots = [
      { id: 'shelf_world', label: 'The World Around Us shelf', x: 60, y: 166, open: () => go({ kind: 'shelf', id: 'shelf_world' }) },
      { id: 'shelf_stories', label: 'Stories & Making shelf', x: 118, y: 166, open: () => go({ kind: 'shelf', id: 'shelf_stories' }) },
      { id: 'shelf_mind', label: 'Mind & Meaning shelf', x: 340, y: 166, open: () => go({ kind: 'shelf', id: 'shelf_mind' }) },
      { id: 'desk', label: "Today's read", x: 98, y: 230, open: () => go({ kind: 'read', id: readOfTheDay().id }) },
      { id: 'chair', label: 'Your saved ideas', x: 388, y: 230, open: () => go({ kind: 'saved' }) },
      { id: 'exit', label: 'Back to the garden', x: 240, y: 258, open: () => this.leave() },
    ];

    // player + pet
    const tex = (this.registry.get('avatarTex') as string) ?? 'player';
    this.player = new Player(this, 240, 252);
    this.player.refreshLook(tex);
    this.player.facing = 'up';
    this.physics.add.collider(this.player, solids);
    this.pet = new Pet(this, 222, 258, 'pet_frog', reduce);
    const shadow = this.add.ellipse(0, 0, 12, 4, 0x10291e, 0.35).setDepth(2);
    this.events.on('update', () => shadow.setPosition(Math.round(this.player.x), Math.round(this.player.y) - 1));

    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey('W', false), down: kb.addKey('S', false), left: kb.addKey('A', false), right: kb.addKey('D', false),
      au: kb.addKey('UP', false), ad: kb.addKey('DOWN', false), al: kb.addKey('LEFT', false), ar: kb.addKey('RIGHT', false),
      jog: kb.addKey('SHIFT', false),
    };
    const interact = () => {
      if (!this.sys.isActive()) return;
      const s = useWorld.getState();
      if (s.panel || s.reading) return;
      const spot = this.spots.find((p) => p.id === s.nearby?.id);
      spot?.open();
    };
    kb.addKey('E', false).on('down', interact);
    kb.addKey('ENTER', false).on('down', interact);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const s = useWorld.getState();
      if (s.panel || s.reading || !this.sys.isActive()) return;
      // click near a spot: walk there and open it; otherwise just walk
      const spot = this.spots.find((sp) => Phaser.Math.Distance.Between(p.worldX, p.worldY, sp.x, sp.y - 20) < 34);
      this.walkTo(spot ? spot.x : p.worldX, spot ? spot.y : Phaser.Math.Clamp(p.worldY, 162, 262), spot?.open);
    });
    this.unsub.push(
      bus.on('place:goto', ({ id }) => {
        if (!this.sys.isActive()) return;
        const spot = this.spots.find((s) => s.id === id);
        if (spot) {
          useWorld.getState().set({ panel: null });
          this.walkTo(spot.x, spot.y, spot.open);
        }
      }),
    );
    this.game.events.on('avatar-changed', (key: string) => this.player?.active && this.player.refreshLook(key), this);

    this.events.on('wake', () => this.arrive());
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    this.arrive();
    (window as unknown as { __fodderLibrary: unknown }).__fodderLibrary = { scene: this };
  }

  private arrive() {
    this.player.setPosition(240, 252);
    this.pet.setPosition(222, 258);
    this.player.route = [];
    useWorld.getState().set({
      location: 'library',
      hotspots: this.spots.map(({ id, label }) => ({ id, label })),
      nearby: null,
    });
    this.cameras.main.fadeIn(useWorld.getState().reducedMotion ? 0 : 400, 16, 41, 30);
  }

  private walkTo(x: number, y: number, onArrive?: () => void) {
    // the room is open floor: walk straight, sliding around furniture via physics
    this.player.route = [new Phaser.Math.Vector2(x, y)];
    this.player.onArrive = onArrive ?? null;
  }

  private leave() {
    useWorld.getState().set({ reading: null, nearby: null });
    const done = () => this.scene.switch('main-world');
    if (useWorld.getState().reducedMotion) done();
    else {
      this.cameras.main.fadeOut(300, 16, 41, 30);
      this.cameras.main.once('camerafadeoutcomplete', done);
    }
  }

  update(_t: number, dt: number) {
    const s = useWorld.getState();
    this.player.frozen = !!(s.panel || s.reading) || useSession.getState().stage !== 'world';
    const k = this.keys;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || k.ar.isDown ? 1 : 0) - (k.left.isDown || k.al.isDown ? 1 : 0),
      (k.down.isDown || k.ad.isDown ? 1 : 0) - (k.up.isDown || k.au.isDown ? 1 : 0),
    );
    this.player.drive(dir, k.jog.isDown ? 110 : WALK_SPEED);
    // stuck against furniture on a click-walk: give up quietly
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moving = body.velocity.lengthSq() > 4;
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

    for (const d of this.rain) {
      d.y += (d.getData('v') * dt) / 1000;
      if (d.y > 114) {
        d.y = Phaser.Math.Between(26, 40);
        d.x = Phaser.Math.Between(186, 294);
      }
    }

    let near: Spot | null = null;
    let best = 28;
    for (const sp of this.spots) {
      const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y);
      if (dd < best) {
        best = dd;
        near = sp;
      }
    }
    if ((near?.id ?? null) !== (s.nearby?.id ?? null)) s.set({ nearby: near ? { id: near.id, label: near.label } : null });
  }
}
