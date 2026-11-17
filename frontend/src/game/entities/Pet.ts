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

  /** walking together: stays right at your side instead of trailing behind */
  walkTogether = false;
  private task: { target: Phaser.Math.Vector2; speed: number; onArrive: () => void } | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public species: string,
    private reducedMotion: () => boolean,
  ) {
    super(scene, x, y, species, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 15 / 16);
    this.shadow = scene.add.ellipse(x, y, 12, 4, 0x10291e, 0.35).setDepth(2);
    this.play(`${species}-idle-down`);
    this.setInteractive({ useHandCursor: true, pixelPerfect: false });
    this.setData('pet', true);
  }

  setSpecies(key: string) {
    if (key === this.species || !this.scene.textures.exists(key)) return;
    this.species = key;
    this.setTexture(key, 0);
    this.play(`${key}-idle-down`);
  }

  /** Little moments of affection. Nothing is tracked; they're just nice. */
  act(kind: 'pet' | 'treat' | 'ball', leader: Phaser.Math.Vector2, facingLeft: boolean) {
    this.restAt = this.restFrom = null;
    if (kind === 'pet') {
      this.play(`${this.species}-sit-down`, true);
      this.hearts();
      this.task = { target: new Phaser.Math.Vector2(this.x, this.y), speed: 0, onArrive: () => undefined };
      this.scene.time.delayedCall(1400, () => (this.task = null));
      return;
    }
    const dir = facingLeft ? -1 : 1;
    if (kind === 'treat') {
      const spot = new Phaser.Math.Vector2(leader.x + dir * 14, leader.y + 2);
      const t = this.scene.add.image(spot.x, spot.y - 2, 'fx_treat').setDepth(spot.y);
      this.task = {
        target: spot, speed: 70,
        onArrive: () => {
          t.destroy();
          this.play(`${this.species}-idle-down`, true);
          this.hearts();
          this.task = { target: spot, speed: 0, onArrive: () => undefined };
          this.scene.time.delayedCall(1200, () => (this.task = null));
        },
      };
      return;
    }
    // fetch: toss a ball, the pet runs after it and brings it home
    const land = new Phaser.Math.Vector2(leader.x + dir * 56, leader.y + Phaser.Math.Between(-10, 10));
    const ball = this.scene.add.image(leader.x, leader.y - 10, 'fx_ball').setDepth(9000);
    const reduce = this.reducedMotion();
    this.scene.tweens.add({ targets: ball, x: land.x, duration: reduce ? 1 : 520 });
    this.scene.tweens.add({ targets: ball, y: land.y - 4, duration: reduce ? 1 : 520, ease: 'Quad.easeIn' });
    this.task = {
      target: land, speed: 110,
      onArrive: () => {
        ball.setVisible(false);
        this.task = {
          target: leader.clone().add(new Phaser.Math.Vector2(dir * 10, 4)), speed: 90,
          onArrive: () => {
            ball.destroy();
            this.hearts();
            this.task = null;
          },
        };
      },
    };
  }

  private hearts() {
    if (this.reducedMotion()) {
      const h = this.scene.add.image(this.x, this.y - 18, 'fx_heart', 0).setDepth(9100);
      this.scene.time.delayedCall(1200, () => h.destroy());
      return;
    }
    for (let i = 0; i < 3; i++) {
      const h = this.scene.add.image(this.x + (i - 1) * 6, this.y - 14, 'fx_heart', i % 2).setDepth(9100);
      this.scene.tweens.add({ targets: h, y: h.y - 14, alpha: 0, delay: i * 180, duration: 1100, onComplete: () => h.destroy() });
    }
  }

  private updateTask(dt: number): boolean {
    if (!this.task) return false;
    const d = this.task.target.clone().subtract(new Phaser.Math.Vector2(this.x, this.y));
    if (this.task.speed === 0) {
      this.setDepth(this.y);
      return true;
    }
    if (d.length() < 2) {
      this.task.onArrive();
      return true;
    }
    const step = Math.min(d.length(), (this.task.speed * dt) / 1000);
    d.normalize();
    this.x += d.x * step;
    this.y += d.y * step;
    const side = Math.abs(d.x) > Math.abs(d.y);
    this.setFlipX(side && d.x < 0);
    const key = `${this.species}-walk-${side ? 'side' : d.y < 0 ? 'up' : 'down'}`;
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
    this.setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y) - 1);
    return true;
  }

  private restAt: Phaser.Math.Vector2 | null = null;
  private restFrom: Phaser.Math.Vector2 | null = null;

  /** Wander to a spot (e.g. its bed) and nap there until the player walks away. */
  rest(x: number, y: number, leader: Phaser.Math.Vector2) {
    this.restAt = new Phaser.Math.Vector2(x, y);
    this.restFrom = leader.clone();
  }

  private updateRest(dt: number, leader: Phaser.Math.Vector2): boolean {
    if (!this.restAt || !this.restFrom) return false;
    if (leader.distance(this.restFrom) > 56) {
      this.restAt = this.restFrom = null;
      this.trail = [leader.clone()];
      return false;
    }
    const d = this.restAt.clone().subtract(new Phaser.Math.Vector2(this.x, this.y));
    let key: string;
    if (d.length() > 1.5) {
      const step = Math.min(d.length(), (60 * dt) / 1000);
      d.normalize();
      this.x += d.x * step;
      this.y += d.y * step;
      this.setFlipX(d.x < 0);
      key = `${this.species}-walk-${Math.abs(d.x) > Math.abs(d.y) ? 'side' : d.y < 0 ? 'up' : 'down'}`;
    } else {
      key = `${this.species}-sleep-down`;
    }
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
    this.setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y) - 1);
    return true;
  }

  update(dt: number, leader: Phaser.Math.Vector2, leaderMoving: boolean) {
    if (this.updateTask(dt)) return;
    if (this.updateRest(dt, leader)) return;
    const last = this.trail[this.trail.length - 1];
    if (!last || last.distance(leader) > 3) this.trail.push(leader.clone());
    if (this.trail.length > 60) this.trail.shift();

    const me = new Phaser.Math.Vector2(this.x, this.y);
    const gap = me.distance(leader);
    // aim for the trail point ~22px behind the leader
    let target: Phaser.Math.Vector2 | null = null;
    const keep = this.walkTogether ? 10 : 20;
    if (gap > keep + 6) {
      for (let i = this.trail.length - 1; i >= 0; i--) {
        if (this.trail[i].distance(leader) >= keep) {
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

