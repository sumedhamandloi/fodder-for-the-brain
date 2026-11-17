import Phaser from 'phaser';
import { Pet, registerPetAnims } from '../entities/Pet';
import type { Player } from '../entities/Player';
import { bus } from '../bus';
import { useSession } from '../../state/session';
import { isBusy, useWorld } from '../../state/world';

export const PET_KEYS = ['pet_frog', 'pet_cat', 'pet_dog', 'pet_rabbit', 'pet_duck', 'pet_hedgehog'];

export const petKey = () => `pet_${useSession.getState().pet?.species ?? 'frog'}`;

export function registerAllPetAnims(scene: Phaser.Scene) {
  for (const k of PET_KEYS) if (!scene.anims.exists(`${k}-idle-down`)) registerPetAnims(scene, k);
}

/** Wire a scene's pet to the player's chosen species, the pet menu, and pet actions. Returns an unsubscribe. */
export function linkPet(scene: Phaser.Scene, pet: Pet, player: Player): () => void {
  const busy = () => isBusy(useWorld.getState()) || useSession.getState().stage !== 'world';
  pet.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    if (!scene.sys.isActive() || busy()) return;
    ev.stopPropagation();
    useWorld.getState().set({ panel: 'pet' });
  });
  scene.input.keyboard!.addKey('P', false).on('down', () => {
    if (scene.sys.isActive() && !busy()) useWorld.getState().set({ panel: 'pet' });
  });
  const offSession = useSession.subscribe((s) => pet.setSpecies(`pet_${s.pet?.species ?? 'frog'}`));
  const offAct = bus.on('pet:act', ({ kind }) => {
    if (!scene.sys.isActive()) return;
    if (kind === 'walk') {
      pet.walkTogether = !pet.walkTogether;
      useWorld.getState().set({ walkingPet: pet.walkTogether });
      return;
    }
    pet.act(kind, player.feet, player.facing === 'side' && player.flipSide);
  });
  pet.walkTogether = useWorld.getState().walkingPet;
  return () => {
    offSession();
    offAct();
  };
}
