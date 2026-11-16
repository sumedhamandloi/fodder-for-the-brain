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
    }
    this.load.image('tiles', ASSET_ROOT + 'tiles.png');
    this.load.tilemapTiledJSON('main_world', ASSET_ROOT + 'main_world.json');
    this.load.tilemapTiledJSON('home_garden', ASSET_ROOT + 'home_garden.json');
    this.load.once('complete', () => this.scene.start('main-world'));
    this.load.start();
  }
}
