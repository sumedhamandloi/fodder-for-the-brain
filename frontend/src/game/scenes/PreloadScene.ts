import Phaser from 'phaser';
import { ASSET_ROOT, Manifest } from '../assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    this.load.json('manifest', ASSET_ROOT + 'manifest.json');
  }

  create() {
    const manifest = this.cache.json.get('manifest') as Manifest;
    for (const [key, m] of Object.entries(manifest.sprites)) {
      this.load.spritesheet(key, ASSET_ROOT + m.file, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
      if (m.seasonal)
        for (const s of ['summer', 'autumn', 'winter'])
          this.load.spritesheet(`${key}__${s}`, `${ASSET_ROOT}${key}__${s}.png`, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
    }
    for (const n of ['mabel', 'theo', 'juniper', 'rosa', 'finn'])
      this.load.spritesheet(`npc_${n}`, `${ASSET_ROOT}npc_${n}.png`, { frameWidth: 24, frameHeight: 32 });
    this.load.image('tiles', ASSET_ROOT + 'tiles.png');
    for (const s of ['summer', 'autumn', 'winter']) this.load.image(`tiles__${s}`, `${ASSET_ROOT}tiles__${s}.png`);
    this.load.tilemapTiledJSON('main_world', ASSET_ROOT + 'main_world.json');
    this.load.tilemapTiledJSON('home_garden', ASSET_ROOT + 'home_garden.json');
    this.load.once('complete', () => this.scene.start('main-world'));
    this.load.start();
  }
}
