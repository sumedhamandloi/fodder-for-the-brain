import { useSession } from '../../state/session';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { bus } from '../../game/bus';
import s from './Nav.module.css';

const ROOM_W = 480, ROOM_H = 270;
const pct = (x: number, y: number, w: number, h: number) => ({
  left: `${(x / ROOM_W) * 100}%`, top: `${(y / ROOM_H) * 100}%`, width: `${(w / ROOM_W) * 100}%`, height: `${(h / ROOM_H) * 100}%`,
});

/** The cottage interior as a picture, assembled from the same pieces as the real room. */
export function CottageView({ className }: { className?: string }) {
  const pet = useSession((st) => st.pet);
  return (
    <div className={`${s.room} ${className ?? ''}`} role="img" aria-label="Inside your cottage">
      <div className={s.roomSky} style={pct(204, 28, 72, 64)} />
      <img src="assets/room_cottage.png" alt="" className={s.layer} style={pct(0, 0, ROOM_W, ROOM_H)} />
      <img src="assets/cottage_table.png" alt="" className={s.layer} style={pct(330 - 36, 215 - 44, 72, 44)} />
      <img src="assets/pet_bed.png" alt="" className={s.layer} style={pct(70 - 16, 228 - 20, 32, 20)} />
      {pet && (
        <span
          className={s.layer}
          style={{
            ...pct(70 - 8, 222 - 15, 16, 16),
            backgroundImage: `url('assets/pet_${pet.species}.png')`,
            backgroundSize: '900% 300%',
            backgroundPosition: `${(7 / 8) * 100}% 0%`, // the sleeping frame
            imageRendering: 'pixelated',
          }}
        />
      )}
    </div>
  );
}

export function PeekPanel() {
  const close = () => useWorld.getState().set({ panel: null });
  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && close()}>
      <PixelPanel className={s.mapPanel} title="Through the window" role="dialog" aria-modal="true" aria-label="Through the window">
        <CottageView />
        <p className={s.here}>Warm and just as you left it. The kettle’s on the stove whenever you want it.</p>
        <div className={s.row}>
          <PixelButton onClick={() => bus.emit('travel', { scene: 'cottage' })}>Go inside</PixelButton>
          <PixelButton variant="quiet" onClick={close}>Stay in the garden</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
