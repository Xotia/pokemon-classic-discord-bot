import type { RaidState } from '../../types/raid/RaidState';

export function createEmptyRaidState(): RaidState {
  return {
    raidId: '',
    status: 'idle',
    createdAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    resolvedAt: null,
    generation: null,
    zone: null,
    raidPokemon: null,
    defenders: [],
    result: null,
    reward: null,
  };
}
