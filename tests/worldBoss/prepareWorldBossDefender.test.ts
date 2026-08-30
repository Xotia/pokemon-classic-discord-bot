import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const POKEMON = {
  id: 95,
  name: 'Onix',
  types: ['rock', 'ground'],
  effectiveness: { defense: { water: 4, grass: 4 }, attack: {} },
  stats: { hp: 35, attack: 45, defense: 160, specialAttack: 30, specialDefense: 45, speed: 70 },
};

vi.mock('../../src/utils/pokemonCatalog', () => ({
  getPokemonCatalog: vi.fn(() => [POKEMON]),
}));

vi.mock('../../src/config/guilds', () => ({
  getGuildConfig: vi.fn((guildId: string) =>
    guildId === 'g1' ? { guildId: 'g1', name: 'Centre de recherche Alpha' } : undefined,
  ),
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-prepare-'));
  return { playersFile: path.join(dir, 'players.json') };
});

import { prepareWorldBossDefender } from '../../src/features/worldBoss/prepareWorldBossDefender';

function writePlayers(captureList: Record<string, { capturedInCurrentSeason: boolean }> | null) {
  fs.writeFileSync(
    tmp.playersFile,
    JSON.stringify(captureList === null ? {} : { u1: { captureList } }),
    'utf-8',
  );
}

const input = {
  guildId: 'g1',
  userId: 'u1',
  displayName: 'Sacha',
  pokemonId: 95,
  playersFilePath: tmp.playersFile,
};

beforeEach(() => {
  writePlayers({ '95': { capturedInCurrentSeason: true } });
});

afterEach(() => {
  fs.rmSync(tmp.playersFile, { force: true });
});

describe('prepareWorldBossDefender', () => {
  it('prépare un défenseur avec le contexte inter-serveurs', async () => {
    const prepared = await prepareWorldBossDefender({ ...input, attackTypeOverride: 'ground' });

    expect(prepared).toMatchObject({
      userId: 'u1',
      guildId: 'g1',
      guildName: 'Centre de recherche Alpha',
      displayName: 'Sacha',
      pokemonId: 95,
      pokemonName: 'Onix',
      attackType: 'ground',
    });
    expect(prepared.snapshot.stats).toEqual(POKEMON.stats);
    expect(prepared.snapshot.defenseEffectiveness).toEqual(POKEMON.effectiveness.defense);
  });

  it('tire un type d’attaque parmi ceux du Pokémon quand aucun n’est fourni', async () => {
    const prepared = await prepareWorldBossDefender(input);

    expect(POKEMON.types).toContain(prepared.attackType);
  });

  it('préfère le nom de serveur fourni par l’interaction au registre', async () => {
    const prepared = await prepareWorldBossDefender({ ...input, guildName: 'Nom en direct' });

    expect(prepared.guildName).toBe('Nom en direct');
  });

  it('retombe sur le guildId quand le serveur est absent du registre', async () => {
    const prepared = await prepareWorldBossDefender({ ...input, guildId: 'g-inconnu' });

    expect(prepared.guildName).toBe('g-inconnu');
  });

  it('refuse un Pokémon non capturé pendant la saison en cours', async () => {
    writePlayers({ '95': { capturedInCurrentSeason: false } });

    await expect(prepareWorldBossDefender(input)).rejects.toThrow(
      'RAID_POKEMON_NOT_CAPTURED_THIS_SEASON',
    );
  });

  it('refuse un Pokémon non possédé sur le serveur d’inscription', async () => {
    writePlayers({ '25': { capturedInCurrentSeason: true } });

    await expect(prepareWorldBossDefender(input)).rejects.toThrow('RAID_POKEMON_NOT_OWNED');
  });

  it('refuse un joueur sans profil sur le serveur d’inscription', async () => {
    writePlayers(null);

    await expect(prepareWorldBossDefender(input)).rejects.toThrow('RAID_PLAYER_NOT_FOUND');
  });

  it('refuse un type d’attaque étranger au Pokémon', async () => {
    await expect(
      prepareWorldBossDefender({ ...input, attackTypeOverride: 'fire' }),
    ).rejects.toThrow('RAID_INVALID_ATTACK_TYPE');
  });
});
