import Phaser from 'phaser';

/**
 * Keep a map framed nicely whatever the window size: if the map is smaller than the view in either direction,
 * centre it (the margin shows the forest-dark background) instead of pinning it to the top-left corner.
 */
export function fitCamera(scene: Phaser.Scene, mapW: number, mapH: number) {
  const cam = scene.cameras.main;
  const apply = () => {
    const vw = cam.width, vh = cam.height;
    const padX = Math.max(0, (vw - mapW) / 2), padY = Math.max(0, (vh - mapH) / 2);
    cam.setBounds(-Math.floor(padX), -Math.floor(padY), Math.max(vw, mapW), Math.max(vh, mapH));
  };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}
