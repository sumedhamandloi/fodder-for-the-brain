import Phaser from 'phaser';
import type { Weather } from '../../state/world';

interface Drop {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  sway: number;
}

/** Screen-space weather: particles live on the camera, so they cover the view wherever you walk. */
export class WeatherFx {
  private drops: Drop[] = [];
  private shade: Phaser.GameObjects.Rectangle;
  private flash: Phaser.GameObjects.Rectangle;
  private fog: Phaser.GameObjects.Image[] = [];
  private flashTimer?: Phaser.Time.TimerEvent;
  private state: Weather | null = null;
  private t = 0;

  constructor(private scene: Phaser.Scene) {
    const cam = scene.cameras.main;
    this.shade = scene.add.rectangle(0, 0, cam.width, cam.height, 0xffffff, 1).setOrigin(0).setScrollFactor(0)
      .setDepth(8990).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    this.flash = scene.add.rectangle(0, 0, cam.width, cam.height, 0xeef3f6, 0).setOrigin(0).setScrollFactor(0)
      .setDepth(9050).setBlendMode(Phaser.BlendModes.ADD);
    scene.scale.on('resize', (s: Phaser.Structs.Size) => {
      this.shade.setSize(s.width, s.height);
      this.flash.setSize(s.width, s.height);
    });
    scene.events.on('update', (_t: number, dt: number) => this.update(dt));
  }

  set(state: Weather, reducedMotion: boolean) {
    if (state === this.state) return;
    this.state = state;
    this.clear();
    const cam = this.scene.cameras.main;
    const W = cam.width, H = cam.height;
    // a cooler, dimmer sky under cloud and rain
    const shadeColor: Partial<Record<Weather, number>> = {
      cloudy: 0xd8dde0, light_rain: 0xc9d1d6, heavy_rain: 0xaeb8c0, storm: 0x9aa6b2, fog: 0xe6e9ea, snow: 0xe9eef3,
    };
    const sc = shadeColor[state];
    this.shade.setVisible(!!sc);
    if (sc) this.shade.setFillStyle(sc, 1);
    if (reducedMotion) return; // calm, still sky: tint only

    const spawn = (n: number, key: string, vx: number, vy: number, sway = 0, alpha = 0.8) => {
      for (let i = 0; i < n; i++) {
        const img = this.scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), key, Phaser.Math.Between(0, 1))
          .setScrollFactor(0).setDepth(9020).setAlpha(alpha);
        this.drops.push({ img, vx: vx * Phaser.Math.FloatBetween(0.8, 1.2), vy: vy * Phaser.Math.FloatBetween(0.8, 1.2), sway });
      }
    };
    if (state === 'light_rain') spawn(70, 'fx_streak', -18, 190, 0, 0.55);
    if (state === 'heavy_rain' || state === 'storm') spawn(150, 'fx_streak', -30, 260, 0, 0.7);
    if (state === 'snow') spawn(90, 'fx_snow', 0, 26, 10, 0.95);
    if (state === 'fog')
      for (let i = 0; i < 6; i++)
        this.fog.push(this.scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(20, H - 20), 'fx_fog')
          .setScrollFactor(0).setDepth(9010).setAlpha(0.32).setScale(2));
    if (state === 'storm') {
      // a slow, dim brighten now and then: never a sharp flash
      this.flashTimer = this.scene.time.addEvent({
        delay: Phaser.Math.Between(18000, 32000), loop: true,
        callback: () => this.scene.tweens.add({ targets: this.flash, alpha: 0.16, duration: 300, yoyo: true, ease: 'Sine.inOut' }),
      });
    }
  }

  private clear() {
    this.drops.forEach((d) => d.img.destroy());
    this.drops = [];
    this.fog.forEach((f) => f.destroy());
    this.fog = [];
    this.flashTimer?.remove();
    this.flash.setAlpha(0);
  }

  private update(dt: number) {
    const cam = this.scene.cameras.main;
    const W = cam.width, H = cam.height;
    this.t += dt;
    const s = dt / 1000;
    for (const d of this.drops) {
      d.img.x += (d.vx + (d.sway ? Math.sin((this.t / 900) + d.img.y * 0.05) * d.sway : 0)) * s;
      d.img.y += d.vy * s;
      if (d.img.y > H + 8) {
        d.img.y = -8;
        d.img.x = Phaser.Math.Between(0, W + 30);
      }
      if (d.img.x < -10) d.img.x = W + 5;
      if (d.img.x > W + 40) d.img.x = -5;
    }
    for (const f of this.fog) {
      f.x += 6 * s;
      if (f.x - f.displayWidth / 2 > W) f.x = -f.displayWidth / 2;
    }
  }
}
