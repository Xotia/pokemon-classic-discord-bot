import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mocks = vi.hoisted(() => ({
  openWorldBoss: vi.fn(),
  closeWorldBossAndResolve: vi.fn(),
  getWorldBossCatalog: vi.fn(),
}));

vi.mock('../../src/features/worldBoss/worldBossScheduler', () => ({
  openWorldBoss: mocks.openWorldBoss,
  closeWorldBossAndResolve: mocks.closeWorldBossAndResolve,
}));

vi.mock('../../src/features/worldBoss/worldBossCatalog', () => ({
  getWorldBossCatalog: mocks.getWorldBossCatalog,
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-admin-'));
  return {
    stateFile: path.join(dir, 'world-boss.json'),
    historyFile: path.join(dir, 'world-boss-history.json'),
  };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_DB: tmp.stateFile,
  WORLD_BOSS_HISTORY_DB: tmp.historyFile,
}));

import {
  autocompleteWorldBossId,
  forceStartWorldBossCommand,
} from '../../src/commands/forceStartWorldBossCommand';
import { forceEndWorldBossCommand } from '../../src/commands/forceEndWorldBossCommand';
import {
  createEmptyWorldBossState,
  saveWorldBossState,
} from '../../src/features/worldBoss/worldBossState.service';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

const ADMIN_ID = 'admin-1';
const STATS = { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 };

function catalogEntry(id: string, name: string) {
  return {
    id,
    name,
    portal: 'Faille',
    sprite: '',
    types: ['ghost'],
    attackType: 'ghost',
    stats: STATS,
    defenseEffectiveness: {},
    lore: '',
  };
}

function openState(): WorldBossState {
  return {
    ...createEmptyWorldBossState(),
    worldBossId: 'world-boss-1',
    status: 'registration',
    registrationClosesAt: new Date(Date.now() + 3_600_000).toISOString(),
    boss: {
      id: 'wb-a',
      name: 'Giratina',
      portal: 'Faille',
      sprite: '',
      types: ['ghost'],
      attackType: 'ghost',
      difficulty: 6,
      baseStats: STATS,
      finalStats: STATS,
      defenseEffectiveness: {},
      lore: '',
    },
  };
}

function makeInteraction(userId: string, options: { boss?: string; difficulte?: number } = {}) {
  const reply = vi.fn(async () => undefined);
  const editReply = vi.fn(async () => undefined);

  return {
    interaction: {
      guildId: 'g1',
      client: {} as never,
      user: { id: userId, username: 'Testeur', globalName: 'Testeur' },
      options: {
        getString: (name: string) => (name === 'boss' ? options.boss ?? null : null),
        getInteger: (name: string) => (name === 'difficulte' ? options.difficulte ?? null : null),
      },
      reply,
      deferReply: vi.fn(async () => undefined),
      editReply,
    } as never,
    reply,
    editReply,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_ID = ADMIN_ID;
  mocks.getWorldBossCatalog.mockReturnValue([
    catalogEntry('wb-a', 'Giratina'),
    catalogEntry('wb-b', 'Kyogre déformé'),
  ]);
  fs.rmSync(tmp.stateFile, { force: true });
  fs.rmSync(tmp.historyFile, { force: true });
});

afterEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
  fs.rmSync(tmp.historyFile, { force: true });
});

describe('/world-boss-force-start', () => {
  it('refuse un appel par un non-administrateur', async () => {
    const { interaction, reply } = makeInteraction('joueur-lambda');

    await forceStartWorldBossCommand(interaction);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("tu n'ouvriras pas de portail") }),
    );
    expect(mocks.openWorldBoss).not.toHaveBeenCalled();
  });

  it('ouvre un world boss avec le boss et la difficulté demandés', async () => {
    mocks.openWorldBoss.mockResolvedValue(openState());
    const { interaction, editReply } = makeInteraction(ADMIN_ID, { boss: 'wb-a', difficulte: 3 });

    await forceStartWorldBossCommand(interaction);

    expect(mocks.openWorldBoss).toHaveBeenCalledWith(expect.anything(), {
      bossId: 'wb-a',
      difficulty: 3,
    });
    expect(editReply).toHaveBeenCalledWith(expect.stringContaining('Portail ouvert'));
  });

  it('refuse quand un world boss est déjà ouvert', async () => {
    await saveWorldBossState(openState());
    const { interaction, editReply } = makeInteraction(ADMIN_ID);

    await forceStartWorldBossCommand(interaction);

    expect(mocks.openWorldBoss).not.toHaveBeenCalled();
    expect(editReply).toHaveBeenCalledWith(expect.stringContaining('déjà ouvert'));
  });

  it('refuse explicitement un bossId déjà vaincu', async () => {
    mocks.openWorldBoss.mockRejectedValue(
      new Error('World boss "wb-a" déjà vaincu : son portail est scellé, il ne peut plus être ouvert.'),
    );
    const { interaction, editReply } = makeInteraction(ADMIN_ID, { boss: 'wb-a' });

    await forceStartWorldBossCommand(interaction);

    expect(editReply).toHaveBeenCalledWith(expect.stringContaining('déjà vaincu'));
  });

  it('dit clairement que le vivier est épuisé plutôt que d’échouer techniquement', async () => {
    mocks.openWorldBoss.mockResolvedValue(null);
    const { interaction, editReply } = makeInteraction(ADMIN_ID);

    await forceStartWorldBossCommand(interaction);

    expect(editReply).toHaveBeenCalledWith(expect.stringContaining('Vivier épuisé'));
  });
});

describe('autocomplétion de l’option boss', () => {
  it('n’expose que les boss encore vivants', async () => {
    fs.writeFileSync(
      tmp.historyFile,
      JSON.stringify({
        lastParticipantsCount: 0,
        lastBossId: 'wb-a',
        defeatedBossIds: ['wb-a'],
        entries: [],
      }),
      'utf-8',
    );

    const suggestions = await autocompleteWorldBossId('');

    expect(suggestions.map((s) => s.value)).toEqual(['wb-b']);
  });

  it('filtre sur l’id comme sur le nom', async () => {
    expect((await autocompleteWorldBossId('kyogre')).map((s) => s.value)).toEqual(['wb-b']);
    expect((await autocompleteWorldBossId('wb-a')).map((s) => s.value)).toEqual(['wb-a']);
  });
});

describe('/world-boss-force-end', () => {
  it('refuse un appel par un non-administrateur', async () => {
    const { interaction, reply } = makeInteraction('joueur-lambda');

    await forceEndWorldBossCommand(interaction);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('ne refermeras pas') }),
    );
    expect(mocks.closeWorldBossAndResolve).not.toHaveBeenCalled();
  });

  it('refuse quand aucun world boss n’est ouvert', async () => {
    const { interaction, editReply } = makeInteraction(ADMIN_ID);

    await forceEndWorldBossCommand(interaction);

    expect(mocks.closeWorldBossAndResolve).not.toHaveBeenCalled();
    expect(editReply).toHaveBeenCalledWith(expect.stringContaining("Aucun world boss n'est ouvert"));
  });

  it('clôture et rend compte de la victoire', async () => {
    await saveWorldBossState(openState());
    mocks.closeWorldBossAndResolve.mockResolvedValue({
      ...openState(),
      status: 'reward_pending',
      result: {
        success: true,
        missingStats: [],
        participantsCount: 3,
        guildsCount: 2,
        teamStats: STATS,
        statDiffs: STATS,
      },
    });
    const { interaction, editReply } = makeInteraction(ADMIN_ID);

    await forceEndWorldBossCommand(interaction);

    expect(editReply).toHaveBeenCalledWith(
      expect.stringContaining('vaincu par 3 défenseur(s) de 2 serveur(s)'),
    );
  });

  it('rend compte de la défaite en disant que le portail reste ouvert', async () => {
    await saveWorldBossState(openState());
    mocks.closeWorldBossAndResolve.mockResolvedValue({
      ...openState(),
      status: 'reward_pending',
      result: {
        success: false,
        missingStats: ['attack'],
        participantsCount: 1,
        guildsCount: 1,
        teamStats: STATS,
        statDiffs: STATS,
      },
    });
    const { interaction, editReply } = makeInteraction(ADMIN_ID);

    await forceEndWorldBossCommand(interaction);

    expect(editReply).toHaveBeenCalledWith(expect.stringContaining('reste ouvert'));
  });
});
