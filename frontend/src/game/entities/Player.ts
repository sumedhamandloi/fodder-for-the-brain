import Phaser from 'phaser';

export type Facing = 'down' | 'up' | 'side';
const ROW: Record<Facing, number> = { down: 0, up: 6, side: 12 };
export const WALK_SPEED = 72;

/** (Re)build the player animations from a texture: the default sheet or a composed avatar. */
export function registerPlayerAnims(scene: Phaser.Scene, tex = 'player') {
  for (const f of Object.keys(ROW) as Facing[]) {
    const r = ROW[f];
    scene.anims.remove(`player-idle-${f}`);
    scene.anims.remove(`player-walk-${f}`);
    scene.anims.create({
      key: `player-idle-${f}`,
      frames: [
        { key: tex, frame: r, duration: 2600 },
        { key: tex, frame: r + 1, duration: 140 },
      ],
      repeat: -1,
    });
    scene.anims.create({
      key: `player-walk-${f}`,
      frames: scene.anims.generateFrameNumbers(tex, { start: r + 2, end: r + 5 }),
      frameRate: 8,
      repeat: -1,
    });
  }
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Facing = 'down';
  flipSide = false;
  route: Phaser.Math.Vector2[] = [];
  onArrive: (() => void) | null = null;
  frozen = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 31 / 32);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(7, 25);
    this.play('player-idle-down');
  }

  get feet() {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  // ------------------------------------------------------------------ poses
  /** Sitting, sleeping or tending something. Any movement (keys or a click-walk) stands you back up. */
  pose: { kind: 'sit' | 'sleep' | 'tend'; from: Phaser.Math.Vector2 } | null = null;

  private beginPose(kind: 'sit' | 'sleep' | 'tend') {
    this.pose = { kind, from: this.feet };
    this.route = [];
    this.onArrive = null;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false; // don't collide with the furniture you're sitting on
  }

  /** Sit on a seat whose surface is at (x, seatY). The legs tuck out of sight, as if folded over the edge. */
  sitAt(x: number, seatY: number, facing: Facing = 'down', flipSide = false, depth?: number) {
    this.beginPose('sit');
    this.facing = facing;
    this.flipSide = flipSide;
    this.setFlipX(facing === 'side' && flipSide);
    this.setCrop(0, 0, 24, 26); // hide the feet and shins
    this.setPosition(x, seatY + 5);
    this.setDepth(depth ?? seatY + 6);
    this.play(`player-idle-${facing}`, true);
  }

  /** Tuck into a (front-facing) bed: just your head on the pillow, eyes closed; the quilt covers the rest.
   *  `chinY` is where the top edge of the quilt is. */
  sleepAt(x: number, chinY: number, depth: number) {
    this.beginPose('sleep');
    this.anims.stop();
    this.setFrame(1); // the blink frame: eyes closed
    this.setCrop(0, 0, 24, 18); // head only
    this.setPosition(x, chinY + 13); // frame row 17 (chin) lands on the quilt line
    this.setDepth(depth);
  }

  /** Stand at something and face it (the stove, a shelf…). */
  tend(facing: Facing = 'up') {
    this.beginPose('tend');
    this.facing = facing;
    this.setFlipX(false);
    this.play(`player-idle-${facing}`, true);
  }

  standUp() {
    if (!this.pose) return;
    const from = this.pose.from;
    this.pose = null;
    this.setCrop();
    this.setPosition(from.x, from.y);
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    (this.body as Phaser.Physics.Arcade.Body).reset(from.x, from.y);
    this.play(`player-idle-${this.facing}`, true);
  }

  /** dir from keyboard (may be zero); otherwise follow the route. */
  drive(dir: Phaser.Math.Vector2, speed: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.pose) {
      // stay put while posed; moving (when nothing else has your attention) gets you up
      if (!this.frozen && (dir.lengthSq() > 0 || this.route.length)) {
        const route = this.route, cb = this.onArrive;
        this.standUp();
        this.route = route;
        this.onArrive = cb;
      } else return;
    }
    if (this.frozen) {
      body.setVelocity(0, 0);
      this.animate(0, 0);
      return;
    }
    let v = dir.clone();
    if (v.lengthSq() > 0) {
      this.route = [];
      this.onArrive = null;
    } else if (this.route.length) {
      const target = this.route[0];
      const d = target.clone().subtract(this.feet);
      if (d.length() < 3) {
        this.route.shift();
        if (!this.route.length && this.onArrive) {
          const cb = this.onArrive;
          this.onArrive = null;
          cb();
        }
      } else {
        v = d;
      }
    }
    if (v.lengthSq() > 0) v.normalize().scale(speed);
    body.setVelocity(v.x, v.y);
    this.animate(v.x, v.y);
    this.setDepth(this.y);
  }

  private animate(vx: number, vy: number) {
    const moving = Math.abs(vx) > 1 || Math.abs(vy) > 1;
    if (moving) {
      if (Math.abs(vx) > Math.abs(vy) * 1.1) {
        this.facing = 'side';
        this.flipSide = vx < 0;
      } else {
        this.facing = vy < 0 ? 'up' : 'down';
      }
    }
    this.setFlipX(this.facing === 'side' && this.flipSide);
    const key = `player-${moving ? 'walk' : 'idle'}-${this.facing}`;
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }

  /** Called after the animations were rebuilt for a new avatar texture. */
  refreshLook(tex: string) {
    this.setTexture(tex, 0);
    this.play(`player-idle-${this.facing}`);
  }
}
