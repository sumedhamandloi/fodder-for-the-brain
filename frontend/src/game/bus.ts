/** Typed command channel between React (UI) and Phaser (world). State lives in state/world.ts. */
type Events = {
  'place:goto': { id: string };
  'place:opened': { id: string };
  'player:freeze': { frozen: boolean };
};

type Handler<K extends keyof Events> = (payload: Events[K]) => void;

const handlers: { [K in keyof Events]?: Set<Handler<K>> } = {};

export const bus = {
  on<K extends keyof Events>(k: K, h: Handler<K>) {
    (handlers[k] ??= new Set() as never).add(h as never);
    return () => handlers[k]!.delete(h as never);
  },
  emit<K extends keyof Events>(k: K, payload: Events[K]) {
    handlers[k]?.forEach((h) => (h as Handler<K>)(payload));
  },
};
