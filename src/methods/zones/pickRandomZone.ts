import { loadUnlockedZones } from "../../utils/loadUnlockedZones";

type Zone = { id: string; label: string };

export function pickRandomZone(generation: string): Zone {
  const typedZones = loadUnlockedZones();

  const pool: Zone[] =
    generation === 'gen1' ? typedZones.gen1 ?? [] :
    generation === 'gen2' ? typedZones.gen2 ?? [] :
    [...(typedZones.gen1 ?? []), ...(typedZones.gen2 ?? [])];

  return pool[Math.floor(Math.random() * pool.length)];
}
