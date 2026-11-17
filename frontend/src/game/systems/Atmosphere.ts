import Phaser from 'phaser';
import type { Phase } from '../../state/world';

/** Multiply tint per phase (colours from the visual bible). */
const TINT: Record<Phase, { color: number; alpha: number; glow: number; lit: boolean }> = {
  dawn: { color: 0xf4c6ce, alpha: 0.28, glow: 0.15, lit: false },
  morning: { color: 0xffffff, alpha: 0, glow: 0, lit: false },
  afternoon: { color: 0xf6d98e, alpha: 0.1, glow: 0, lit: false },
  sunset: { color: 0xe9a05f, alpha: 0.34, glow: 0.25, lit: true },
  evening: { color: 0x5b4e86, alpha: 0.5, glow: 0.55, lit: true },
  night: { color: 0x25394e, alpha: 0.68, glow: 0.8, lit: true },
};

export interface LightSource {
  x: number;
  y: number;
  size: 's' | 'm' | 'l';
  strength?: number; // 0..1 multiplier on the phase glow
}

export interface Litable {
  setLit(lit: boolean): void;
}

/** Day/night lighting: a multiply tint over the world plus additive light sprites above it. */
export class Atmosphere {
  private overlay: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  private nightFx: Phaser.GameObjects.GameObject[] = [];
  private dayFx: Phaser.GameObjects.GameObject[] = [];
  private phase: Phase | null = null;

  constructor(
    private scene: Phaser.Scene,
    lights: LightSource[],
    private litables: Litable[],
    private nightSpawners: (() => Phaser.GameObjects.GameObject[])[],
    private daySpawners: (() => Phaser.GameObjects.GameObject[])[],
  ) {
    const cam = scene.cameras.main;
    this.overlay = scene.add
      .rectangle(0, 0, cam.width, cam.height, 0xffffff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9000)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    scene.scale.on('resize', (s: Phaser.Structs.Size) => this.overlay.setSize(s.width, s.height));
    for (const l of lights) {
      this.glows.push(
        scene.add
          .image(l.x, l.y, `fx_glow_${l.size}`)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(9001)
          .setAlpha(0)
          .setData('strength', l.strength ?? 1),
      );
    }
  }

  /** Add a light after the scene is built (e.g. a lantern placed while decorating). Destroy the image to remove it. */
  addLight(l: LightSource): Phaser.GameObjects.Image {
    const g = this.scene.add
      .image(l.x, l.y, `fx_glow_${l.size}`)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9001)
      .setData('strength', l.strength ?? 1);
    g.setAlpha(this.phase ? TINT[this.phase].glow * (l.strength ?? 1) : 0);
    this.glows.push(g);
    g.once('destroy', () => (this.glows = this.glows.filter((x) => x !== g)));
    return g;
  }

  apply(phase: Phase, reducedMotion: boolean, instant = false) {
    if (phase === this.phase && !instant) return;
    const first = this.phase === null;
    this.phase = phase;
    const t = TINT[phase];
    const duration = instant || first || reducedMotion ? 0 : 1500;
    const color = Phaser.Display.Color.IntegerToColor(t.color);
    // blend toward white by (1 - alpha) so MULTIPLY gives a gentle tint
    const mix = (c: number) => Math.round(255 - (255 - c) * t.alpha);
    const target = Phaser.Display.Color.GetColor(mix(color.red), mix(color.green), mix(color.blue));
    if (duration === 0) {
      this.overlay.setFillStyle(target, 1);
    } else {
      const from = Phaser.Display.Color.IntegerToColor(this.overlay.fillColor);
      const to = Phaser.Display.Color.IntegerToColor(target);
      this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration,
        onUpdate: (tw) => {
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() ?? 0);
          this.overlay.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
        },
      });
    }
    for (const g of this.glows) {
      this.scene.tweens.add({ targets: g, alpha: t.glow * (g.getData('strength') as number), duration: duration || 1 });
    }
    for (const l of this.litables) l.setLit(t.lit);

    const night = phase === 'night' || phase === 'evening';
    this.nightFx.forEach((o) => o.destroy());
    this.dayFx.forEach((o) => o.destroy());
    this.nightFx = [];
    this.dayFx = [];
    if (reducedMotion) return;
    if (night) this.nightSpawners.forEach((s) => this.nightFx.push(...s()));
    else this.daySpawners.forEach((s) => this.dayFx.push(...s()));
  }
}
