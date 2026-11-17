import Phaser from 'phaser';

const ROW = { down: 0, up: 6, side: 12 } as const;

export function registerNpcAnims(scene: Phaser.Scene, key: string) {
  if (scene.anims.exists(`${key}-idle-down`)) return;
  for (const [f, r] of Object.entries(ROW)) {
    scene.anims.create({
      key: `${key}-idle-${f}`,
      frames: [{ key, frame: r, duration: 2800 }, { key, frame: r + 1, duration: 160 }],
      repeat: -1,
    });
    scene.anims.create({ key: `${key}-walk-${f}`, frames: scene.anims.generateFrameNumbers(key, { start: r + 2, end: r + 5 }), frameRate: 6, repeat: -1 });
  }
}

/** A neighbour who pottering around their spot: idles, blinks, and takes a short stroll now and then. */
export class Npc extends Phaser.GameObjects.Sprite {
  private home: Phaser.Math.Vector2;
  private target: Phaser.Math.Vector2 | null = null;
  private wait = Phaser.Math.Between(3000, 8000);
  paused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly npcId: string, private calm: () => boolean) {
    super(scene, x, y, `npc_${npcId}`, 0);
    scene.add.existing(this);
    this.home = new Phaser.Math.Vector2(x, y);
    this.setOrigin(0.5, 31 / 32);
    registerNpcAnims(scene, `npc_${npcId}`);
    this.play(`npc_${npcId}-idle-down`);
    this.setDepth(y);
    this.setInteractive({ useHandCursor: true });
    this.setData('npc', npcId);
    scene.add.ellipse(x, y - 1, 12, 4, 0x10291e, 0.32).setDepth(2).setName(`npc-shadow-${npcId}`);
  }

  get feet() {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  update(dt: number) {
    const key = `npc_${this.npcId}`;
    if (this.paused || this.calm()) {
      this.target = null;
      if (!this.anims.currentAnim?.key.includes('idle')) this.play(`${key}-idle-down`);
      return;
    }
    if (!this.target) {
      this.wait -= dt;
      if (this.wait <= 0) {
        // a little stroll near home, never far
        this.target = this.home.clone().add(new Phaser.Math.Vector2(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-8, 8)));
        this.wait = Phaser.Math.Between(5000, 12000);
      }
      return;
    }
    const d = this.target.clone().subtract(this.feet);
    if (d.length() < 1.5) {
      this.target = null;
      this.play(`${key}-idle-down`);
      return;
    }
    const step = Math.min(d.length(), (24 * dt) / 1000);
    d.normalize();
    this.x += d.x * step;
    this.y += d.y * step;
    const side = Math.abs(d.x) > Math.abs(d.y);
    this.setFlipX(side && d.x < 0);
    const anim = `${key}-walk-${side ? 'side' : d.y < 0 ? 'up' : 'down'}`;
    if (this.anims.currentAnim?.key !== anim) this.play(anim);
    this.setDepth(this.y);
    (this.scene.children.getByName(`npc-shadow-${this.npcId}`) as Phaser.GameObjects.Ellipse | null)?.setPosition(Math.round(this.x), Math.round(this.y) - 1);
  }

  /** Turn to face whoever is talking to them. */
  faceToward(p: Phaser.Math.Vector2) {
    const d = p.clone().subtract(this.feet);
    const side = Math.abs(d.x) > Math.abs(d.y);
    this.setFlipX(side && d.x < 0);
    this.play(`npc_${this.npcId}-idle-${side ? 'side' : d.y < 0 ? 'up' : 'down'}`);
  }
}
