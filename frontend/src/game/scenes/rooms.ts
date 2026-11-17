import { InteriorScene } from './InteriorScene';
import { currentPhase, currentSeason, currentWeather, useWorld } from '../../state/world';
import { useSession } from '../../state/session';

const set = (p: Parameters<ReturnType<typeof useWorld.getState>['set']>[0]) => useWorld.getState().set(p);

export class LibraryScene extends InteriorScene {
  constructor() {
    super({
      key: 'library',
      location: 'library',
      room: 'room_library',
      windows: [{ x: 180, y: 18, w: 120, h: 98 }],
      furniture: [
        { key: 'lib_desk', x: 98, y: 220, block: [54, 206, 88, 14] },
        { key: 'lib_chair', x: 388, y: 218, block: [362, 204, 52, 14] },
        { key: 'lib_lamp', x: 432, y: 216, block: [426, 210, 12, 6] },
      ],
      glows: [
        { x: 398, y: 130, size: 'l', alpha: 0.55, flicker: true },
        { x: 122, y: 176, size: 's', alpha: 0.7, flicker: true },
        { x: 432, y: 164, size: 'm', alpha: 0.5 },
        { x: 357, y: 82, size: 's', alpha: 0.6, flicker: true },
        { x: 363, y: 82, size: 's', alpha: 0.6, flicker: true },
      ],
      fire: { x: 398, y: 142 },
      tint: 0xe6cfae,
      floorTop: 158,
      spawn: [240, 252],
      exitTo: 'main-world',
      spots: [
        { id: 'shelf_world', label: 'The World Around Us shelf', x: 60, y: 166, open: () => set({ reading: { kind: 'shelf', id: 'shelf_world' } }) },
        { id: 'shelf_stories', label: 'Stories & Making shelf', x: 118, y: 166, open: () => set({ reading: { kind: 'shelf', id: 'shelf_stories' } }) },
        { id: 'shelf_mind', label: 'Mind & Meaning shelf', x: 340, y: 166, open: () => set({ reading: { kind: 'shelf', id: 'shelf_mind' } }) },
        { id: 'desk', label: "Today's read", x: 98, y: 230, open: () => set({ reading: { kind: 'desk' } }) },
        { id: 'chair', label: 'Your saved ideas', x: 388, y: 230, open: () => set({ reading: { kind: 'saved' } }) },
        { id: 'exit', label: 'Back to the garden', x: 240, y: 258, open: (s) => s.leave() },
      ],
    });
  }
}

function windowView() {
  const s = useWorld.getState();
  const season = currentSeason(s), weather = currentWeather(s), phase = currentPhase(s);
  const sky: Record<string, string> = {
    clear: 'The sky is clear', cloudy: 'Soft clouds drift over', light_rain: 'A light rain is ticking on the glass',
    heavy_rain: 'Rain is drumming on the glass', snow: 'Snow is falling quietly', fog: 'The garden has vanished into fog',
    storm: 'A storm is rumbling somewhere far off',
  };
  const garden: Record<string, string> = {
    spring: 'the cherry trees are full of blossom', summer: 'everything is deep and green',
    autumn: 'the trees have turned amber and gold', winter: 'the garden is tucked under snow',
  };
  return `${sky[weather]}, and ${garden[season]}. It’s ${phase === 'afternoon' || phase === 'morning' ? 'the' : 'nearly'} ${phase}.`;
}

export class CottageScene extends InteriorScene {
  constructor() {
    super({
      key: 'cottage',
      location: 'cottage',
      room: 'room_cottage',
      windows: [{ x: 204, y: 28, w: 72, h: 64 }],
      furniture: [
        { key: 'cottage_table', x: 330, y: 215, block: [296, 201, 68, 12] },
        { key: 'pet_bed', x: 70, y: 228 },
      ],
      glows: [
        { x: 352, y: 124, size: 'm', alpha: 0.5, flicker: true },
        { x: 349, y: 172, size: 's', alpha: 0.6, flicker: true },
      ],
      tint: 0xeedcc0,
      floorTop: 158,
      spawn: [240, 252],
      exitTo: 'home',
      spots: [
        { id: 'c_bed', label: 'Your bed', x: 80, y: 168, open: () => set({ toast: 'You stretch out under the patchwork quilt for a moment. No alarms here, ever.' }) },
        { id: 'c_window', label: 'The window', x: 240, y: 166, open: () => set({ toast: windowView() }) },
        { id: 'c_stove', label: 'The stove', x: 352, y: 166, open: () => set({ toast: 'The kettle hums. Tea will be ready whenever you are.' }) },
        { id: 'c_shelf', label: 'Your shelves of saved ideas', x: 430, y: 166, open: () => set({ reading: { kind: 'saved' } }) },
        { id: 'c_table', label: 'The harvest basket', x: 330, y: 230, open: () => set({ farm: { plot: null } }) },
        {
          id: 'c_pet', label: 'The pet bed', x: 92, y: 236,
          open: (s) => {
            s.pet.rest(70, 222, s.player.feet);
            set({ toast: `${useSession.getState().pet?.name ?? 'Your companion'} curls up in their bed by the fire.` });
          },
        },
        { id: 'c_door', label: 'Out to your garden', x: 240, y: 258, open: (s) => { s.registry.set('arrive:home', 'door'); s.leave(); } },
      ],
    });
  }
}

export class GlasshouseScene extends InteriorScene {
  constructor() {
    super({
      key: 'glasshouse',
      location: 'glasshouse',
      room: 'room_glasshouse',
      windows: [{ x: 0, y: 0, w: 480, h: 150 }],
      furniture: [
        { key: 'gh_table', x: 240, y: 216, block: [198, 202, 84, 12] },
        { key: 'gh_bench', x: 400, y: 220, block: [378, 212, 44, 8] },
      ],
      glows: [],
      tint: 0xf4f1e6,
      floorTop: 158,
      spawn: [240, 252],
      exitTo: 'main-world',
      spots: [
        { id: 'g_table', label: 'The thought-experiment table', x: 240, y: 232, open: () => set({ space: 'glasshouse', spaceTab: 'experiments' }) },
        { id: 'g_bench', label: 'The quiet bench', x: 400, y: 232, open: () => set({ space: 'glasshouse', spaceTab: 'reflect' }) },
        { id: 'g_plants', label: 'Two seedlings side by side', x: 120, y: 166, open: () => set({ space: 'glasshouse', spaceTab: 'connect' }) },
        { id: 'g_door', label: 'Back to the garden', x: 240, y: 258, open: (s) => s.leave() },
      ],
    });
  }
}
