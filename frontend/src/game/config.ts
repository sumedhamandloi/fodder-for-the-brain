import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MainWorldScene } from './scenes/MainWorldScene';
import { CottageScene, GlasshouseScene, LibraryScene } from './scenes/rooms';
import { HomeScene } from './scenes/HomeScene';

export const BASE_W = 480;
export const BASE_H = 270;

/** Integer zoom that fits the 480x270 design view; the canvas then grows to fill the window. */
export function integerFit(winW: number, winH: number) {
  const zoom = Math.max(1, Math.floor(Math.min(winW / BASE_W, winH / BASE_H)));
  return { zoom, w: Math.ceil(winW / zoom), h: Math.ceil(winH / zoom) };
}

export function createGame(parent: HTMLElement) {
  const fit = integerFit(window.innerWidth, window.innerHeight);
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: fit.w,
    height: fit.h,
    backgroundColor: '#10291E',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.NONE, zoom: fit.zoom },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [PreloadScene, MainWorldScene, LibraryScene, HomeScene, CottageScene, GlasshouseScene],
  });
  document.documentElement.style.setProperty('--px', `${fit.zoom}px`);
  const onResize = () => {
    const f = integerFit(window.innerWidth, window.innerHeight);
    game.scale.setZoom(f.zoom);
    game.scale.resize(f.w, f.h);
    document.documentElement.style.setProperty('--px', `${f.zoom}px`);
  };
  window.addEventListener('resize', onResize);
  return { game, dispose: () => window.removeEventListener('resize', onResize) };
}

