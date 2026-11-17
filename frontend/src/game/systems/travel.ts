import Phaser from 'phaser';
import { bus } from '../bus';
import { useWorld } from '../../state/world';

/**
 * Map travel. Whichever scene is active handles the request:
 *  - same scene → a quick fade and you're there (`arriveAt(spot)`)
 *  - another scene → remember the destination spot and hand over; the target scene reads it on arrival.
 */
export function linkTravel(scene: Phaser.Scene, arriveAt: (spot: string | undefined) => void): () => void {
  return bus.on('travel', ({ scene: target, spot }) => {
    if (!scene.sys.isActive()) return;
    const w = useWorld.getState();
    w.set({ panel: null, nearby: null, reading: null, atPond: false, space: null, farm: null, dialogue: null, decorating: null, openPlace: null });
    const cam = scene.cameras.main;
    const go = () => {
      if (target === scene.scene.key) {
        arriveAt(spot);
        cam.fadeIn(w.reducedMotion ? 0 : 300, 16, 41, 30);
      } else {
        scene.registry.set(`travel:${target}`, spot ?? '');
        scene.scene.switch(target);
      }
    };
    if (w.reducedMotion) return go();
    cam.fadeOut(250, 16, 41, 30);
    cam.once('camerafadeoutcomplete', go);
  });
}

/** Read (and clear) a pending arrival spot for this scene. */
export function takeArrival(scene: Phaser.Scene): string | undefined {
  const key = `travel:${scene.scene.key}`;
  const v = scene.registry.get(key) as string | undefined;
  if (v !== undefined) scene.registry.remove(key);
  return v;
}
