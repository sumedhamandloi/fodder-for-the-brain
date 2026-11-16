import { useEffect, useRef } from 'react';
import { createGame } from './config';

/** Mounts the single Phaser instance. Phaser owns only the world canvas; React owns everything else. */
export function GameHost() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const { game, dispose } = createGame(ref.current);
    return () => {
      dispose();
      game.destroy(true);
    };
  }, []);
  return <div ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0 }} />;
}
