import { useEffect, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { bus } from '../../game/bus';
import s from './Nav.module.css';

interface Pin { id: string; label: string; x: number; y: number }
const MAP_W = 960, MAP_H = 640; // main world size in art px (the map image is drawn at half size)

let pinsP: Promise<Pin[]> | null = null;
const loadPins = () =>
  (pinsP ??= fetch('assets/main_world.json')
    .then((r) => r.json())
    .then((m) =>
      m.layers
        .find((l: { name: string }) => l.name === 'hotspots')
        .objects.filter((o: { type: string }) => o.type === 'hotspot')
        .map((o: { name: string; x: number; y: number; properties?: { name: string; value: string }[] }) => ({
          id: o.name, x: o.x, y: o.y, label: o.properties?.find((p) => p.name === 'label')?.value ?? o.name,
        })),
    ));

const close = () => useWorld.getState().set({ panel: null });

/** Where a pin takes you: straight inside for rooms, otherwise to the spot in the garden. */
function travelFor(id: string) {
  if (id === 'library') return bus.emit('travel', { scene: 'library' });
  if (id === 'glasshouse') return bus.emit('travel', { scene: 'glasshouse' });
  if (id === 'cottage') return bus.emit('travel', { scene: 'home' });
  bus.emit('travel', { scene: 'main-world', spot: id });
}

export function MapPanel() {
  const [pins, setPins] = useState<Pin[]>([]);
  const location = useWorld((st) => st.location);
  useEffect(() => {
    loadPins().then(setPins);
  }, []);
  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && close()}>
      <PixelPanel className={s.mapPanel} title="Map" role="dialog" aria-modal="true" aria-label="Map">
        <div className={s.mapWrap}>
          <img src="assets/world_map.png" alt="A map of the garden" className={s.map} />
          {pins.map((p) => (
            <button
              key={p.id}
              type="button"
              className={s.pin}
              style={{ left: `${(p.x / MAP_W) * 100}%`, top: `${(p.y / MAP_H) * 100}%` }}
              onClick={() => travelFor(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={s.row}>
          <PixelButton variant="quiet" onClick={() => bus.emit('travel', { scene: 'home' })}>My Garden</PixelButton>
          <PixelButton variant="quiet" onClick={() => bus.emit('travel', { scene: 'cottage' })}>My Cottage</PixelButton>
          <span className={s.here}>You’re in {
            { garden: 'the main garden', library: 'the Little Library', home: 'your garden', cottage: 'your cottage', glasshouse: 'the Glasshouse' }[location]
          }.</span>
        </div>
        <PixelButton onClick={close}>Fold the map away</PixelButton>
      </PixelPanel>
    </div>
  );
}
