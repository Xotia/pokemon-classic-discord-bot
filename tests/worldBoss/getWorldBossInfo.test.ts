import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-squad-'));
  return { stateFile: path.join(dir, 'world-boss.json') };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_DB: tmp.stateFile,
}));

import { getWorldBossInfo } from '../../src/commands/getWorldBossInfo';
import {
  createEmptyWorldBossState,
  saveWorldBossState,
} from '../../src/features/worldBoss/worldBossState.service';
import { WorldBossDefender } from '../../src/types/worldBoss/WorldBossDefender';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

const STATS = { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 };

function makeDefender(userId: string, guildId: string, guildName: string): WorldBossDefender {
  return {
    userId,
    guildId,
    guildName,
    displayName: `Joueur ${userId}`,
    pokemonId: 95,
    pokemonName: 'Onix',
    attackType: 'ground',
    registeredAt: '2026-08-30T11:00:00.000Z',
    snapshot: { types: ['rock', 'ground'], defenseEffectiveness: {}, stats: STATS },
  };
}

function registrationState(): WorldBossState {
  return {
    ...createEmptyWorldBossState(),
    worldBossId: 'world-boss-1',
    status: 'registration',
    registrationOpensAt: '2026-08-30T10:00:00.000Z',
    registrationClosesAt: '2026-08-30T18:00:00.000Z',
    boss: {
      id: 'wb-a',
      name: 'Giratina',
      portal: "Faille de l'Antimonde",
      sprite: 'https://exemple/sprite.png',
      types: ['ghost'],
      attackType: 'ghost',
      difficulty: 6,
      baseStats: STATS,
      finalStats: { hp: 900, attack: 720, defense: 600, specialAttack: 720, specialDefense: 600, speed: 540 },
      defenseEffectiveness: {},
      lore: 'Contexte.',
    },
    defenders: [makeDefender('u1', 'g1', 'Alpha'), makeDefender('u2', 'g2', 'Beta')],
  };
}

function makeInteraction(guildId: string | null) {
  const editReply = vi.fn(async () => undefined);
  return {
    interaction: {
      guildId,
      deferReply: vi.fn(async () => undefined),
      editReply,
    } as never,
    editReply,
  };
}

beforeEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
});

afterEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
});

describe('getWorldBossInfo', () => {
  it('traite explicitement l’absence de world boss actif', async () => {
    const { interaction, editReply } = makeInteraction('g1');

    await getWorldBossInfo(interaction);

    const embed = editReply.mock.calls[0][0].embeds[0].toJSON();
    expect(embed.description).toContain("Aucun world boss n'est actif");
    expect(embed.description).toContain('dimanche à 12h00');
  });

  it('affiche l’équipe des deux serveurs, quel que soit le serveur qui demande', async () => {
    await saveWorldBossState(registrationState());

    for (const guildId of ['g1', 'g2']) {
      const { interaction, editReply } = makeInteraction(guildId);

      await getWorldBossInfo(interaction);

      const embed = editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(embed.fields?.find((f) => f.name === 'Inscrits')?.value).toBe('2');
      expect(embed.fields?.find((f) => f.name === 'Serveurs représentés')?.value).toBe('2');
      expect(embed.fields?.map((f) => f.name)).toEqual(
        expect.arrayContaining(['Alpha (1)', 'Beta (1)']),
      );
    }
  });

  it('refuse hors serveur', async () => {
    const { interaction, editReply } = makeInteraction(null);

    await getWorldBossInfo(interaction);

    expect(editReply).toHaveBeenCalledWith("Cette commande n'est disponible que sur un serveur.");
  });
});
