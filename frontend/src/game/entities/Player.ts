import Phaser from 'phaser';

export type Facing = 'down' | 'up' | 'side';
const ROW: Record<Facing, number> = { down: 0, up: 6, side: 12 };
export const WALK_SPEED = 72;

export function registerPlayerAnims(scene: Phaser.Scene) {
  for (const f of Object.keys(ROW) as Facing[]) {
    const r = ROW[f];
    scene.anims.create({
      key: `player-idle-${f}`,
      frames: [
        { key: 'player', frame: r, duration: 2600 },
        { key: 'player', frame: r + 1, duration: 140 },
      ],
      repeat: -1,
    });
    scene.anims.create({
      key: `player-walk-${f}`,
      frames: scene.anims.generateFrameNumbers('player', { start: r + 2, end: r + 5 }),
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

  /** dir from keyboard (may be zero); otherwise follow the route. */
  drive(dir: Phaser.Math.Vector2, speed: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
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
}
