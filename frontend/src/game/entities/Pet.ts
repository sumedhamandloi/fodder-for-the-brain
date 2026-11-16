import Phaser from 'phaser';
import type { Facing } from './Player';

const ROW: Record<Facing, number> = { down: 0, up: 9, side: 18 };

export function registerPetAnims(scene: Phaser.Scene, key: string) {
  for (const f of Object.keys(ROW) as Facing[]) {
    const r = ROW[f];
    scene.anims.create({
      key: `${key}-idle-${f}`,
      frames: [
        { key, frame: r, duration: 900 },
        { key, frame: r + 1, duration: 700 },
      ],
      repeat: -1,
    });
    scene.anims.create({
      key: `${key}-walk-${f}`,
      frames: scene.anims.generateFrameNumbers(key, { start: r + 2, end: r + 5 }),
      frameRate: 9,
      repeat: -1,
    });
    scene.anims.create({ key: `${key}-sit-${f}`, frames: [{ key, frame: r + 6 }], repeat: -1 });
    scene.anims.create({
      key: `${key}-sleep-${f}`,
      frames: [
        { key, frame: r + 7, duration: 1400 },
        { key, frame: r + 8, duration: 1400 },
      ],
      repeat: -1,
    });
  }
}

type PetState = 'follow' | 'idle' | 'sit' | 'sleep';

/** A companion that follows the player's breadcrumb trail. It never blocks the player and never "needs" anything. */
export class Pet extends Phaser.GameObjects.Sprite {
  private trail: Phaser.Math.Vector2[] = [];
  private facing: Facing = 'down';
  private still = 0;
  private mood: PetState = 'idle';
  private zzz?: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly species: string,
    private reducedMotion: () => boolean,
  ) {
    super(scene, x, y, species, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 15 / 16);
    this.shadow = scene.add.ellipse(x, y, 12, 4, 0x10291e, 0.35).setDepth(2);
    this.play(`${species}-idle-down`);
  }

  update(dt: number, leader: Phaser.Math.Vector2, leaderMoving: boolean) {
    const last = this.trail[this.trail.length - 1];
    if (!last || last.distance(leader) > 3) this.trail.push(leader.clone());
    if (this.trail.length > 60) this.trail.shift();

    const me = new Phaser.Math.Vector2(this.x, this.y);
    const gap = me.distance(leader);
    // aim for the trail point ~22px behind the leader
    let target: Phaser.Math.Vector2 | null = null;
    if (gap > 26) {
      for (let i = this.trail.length - 1; i >= 0; i--) {
        if (this.trail[i].distance(leader) >= 20) {
          target = this.trail[i];
          break;
        }
      }
    }
    if (gap > 160) {
      // teleport quietly if we got far behind (e.g. click-travel across the map)
      const t = this.trail[Math.max(0, this.trail.length - 8)];
      this.setPosition(t.x, t.y);
    } else if (target) {
      const d = target.clone().subtract(me);
      const speed = gap > 60 ? 110 : 76;
      const step = Math.min(d.length(), (speed * dt) / 1000);
      d.normalize();
      this.x += d.x * step;
      this.y += d.y * step;
      if (Math.abs(d.x) > Math.abs(d.y)) {
        this.facing = 'side';
        this.setFlipX(d.x < 0);
      } else {
        this.facing = d.y < 0 ? 'up' : 'down';
        this.setFlipX(false);
      }
      this.mood = 'follow';
      this.still = 0;
    } else {
      this.still += leaderMoving ? 0 : dt;
      if (leaderMoving) this.still = Math.min(this.still, 3000);
      this.mood = this.still > 45000 ? 'sleep' : this.still > 10000 ? 'sit' : 'idle';
    }

    const anim = this.mood === 'follow' ? 'walk' : this.mood;
    const key = `${this.species}-${anim}-${this.mood === 'sleep' ? 'down' : this.facing}`;
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
    this.setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y) - 1);

    if (this.mood === 'sleep' && !this.reducedMotion()) {
      if (!this.zzz) {
        this.zzz = this.scene.add.sprite(this.x + 6, this.y - 16, 'fx_zzz').setDepth(9100);
        this.scene.tweens.add({ targets: this.zzz, y: '-=6', alpha: { from: 1, to: 0 }, duration: 2200, repeat: -1 });
      }
      this.zzz.x = this.x + 6;
    } else if (this.zzz) {
      this.zzz.destroy();
      this.zzz = undefined;
    }
  }
}

