/**
 * Test bout-en-bout du world boss sur deux serveurs simulés, avec des joueurs
 * fictifs et des fichiers `players.json` réels écrits dans un dossier temporaire.
 *
 * Rien n'est mocké côté feature : l'état, l'historique, le catalogue de boss,
 * le catalogue Pokémon et les profils joueurs sont de vrais fichiers, seuls
 * `src/config/paths` (redirigé vers le temporaire), le logger et le client
 * Discord sont remplacés. C'est ce qui distingue ce fichier des tests unitaires
 * de `tests/worldBoss/` : il valide l'enchaînement complet, pas une fonction.
 */

import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const KANTO = 'g-kanto';
const JOHTO = 'g-johto';
const KANTO_CHANNEL = 'chan-kanto';
const JOHTO_CHANNEL = 'chan-johto';

/** Pokémon fictif : neutre partout, pour que le combat ne dépende que des stats. */
const DEX_ID = 9001;

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-e2e-'));
  const guildsRoot = path.join(dir, 'guilds');
  fs.mkdirSync(path.join(guildsRoot, 'g-kanto'), { recursive: true });
  fs.mkdirSync(path.join(guildsRoot, 'g-johto'), { recursive: true });

  const paths = {
    dir,
    guildsRoot,
    stateFile: path.join(dir, 'world-boss.json'),
    historyFile: path.join(dir, 'world-boss-history.json'),
    bossListFile: path.join(dir, 'world-boss-list.json'),
    registryFile: path.join(dir, 'guilds.json'),
    dexFile: path.join(dir, 'pokemon-gen1.json'),
    missingFile: path.join(dir, 'absent.json'),
  };

  // Registre à deux serveurs : c'est lui qui définit « tous les serveurs » pour
  // la diffusion, et il est mis en cache au premier appel.
  fs.writeFileSync(
    paths.registryFile,
    JSON.stringify({
      guilds: [
        {
          guildId: 'g-kanto',
          name: 'Ligue de Kanto',
          raidAnnounceChannelId: 'chan-kanto',
          mainChannelId: 'main-kanto',
        },
        {
          guildId: 'g-johto',
          name: 'Ligue de Johto',
          raidAnnounceChannelId: 'chan-johto',
          mainChannelId: 'main-johto',
        },
      ],
    }),
    'utf-8',
  );

  // Deux boss seulement : c'est le minimum pour prouver qu'un boss vaincu sort
  // du vivier et que le vivier finit par s'épuiser.
  const bossStats = { hp: 50, attack: 20, defense: 20, specialAttack: 20, specialDefense: 20, speed: 20 };
  fs.writeFileSync(
    paths.bossListFile,
    JSON.stringify({
      bosses: [
        {
          id: 'wb-test-alpha',
          name: 'Alpha Gigamax',
          portal: 'Portail Alpha',
          sprite: 'https://example.invalid/alpha.gif',
          types: ['normal'],
          attackType: 'normal',
          stats: bossStats,
          defenseEffectiveness: {},
          lore: 'Premier portail de test.',
        },
        {
          id: 'wb-test-beta',
          name: 'Beta Gigamax',
          portal: 'Portail Beta',
          sprite: 'https://example.invalid/beta.gif',
          types: ['normal'],
          attackType: 'normal',
          stats: bossStats,
          defenseEffectiveness: {},
          lore: 'Second portail de test.',
        },
      ],
    }),
    'utf-8',
  );

  fs.writeFileSync(
    paths.dexFile,
    JSON.stringify([
      {
        id: 9001,
        name: 'Rocaillus',
        originalName: 'Rocaillus',
        rarity: 'common',
        image: '',
        shinyImage: '',
        types: ['normal'],
        stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        generation: 1,
        effectiveness: { defense: {}, attack: {} },
      },
    ]),
    'utf-8',
  );

  return paths;
});

vi.mock('../../src/config/paths', async (importOriginal) => {
  const path = require('node:path') as typeof import('node:path');
  const actual = await importOriginal<typeof import('../../src/config/paths')>();

  return {
    ...actual,
    WORLD_BOSS_DB: tmp.stateFile,
    WORLD_BOSS_HISTORY_DB: tmp.historyFile,
    WORLD_BOSS_LIST_DB: tmp.bossListFile,
    GUILDS_REGISTRY: tmp.registryFile,
    POKEMON_GEN1_DB: tmp.dexFile,
    POKEMON_GEN2_DB: tmp.missingFile,
    POKEMON_GEN3_DB: tmp.missingFile,
    guildDir: (guildId: string) => path.join(tmp.guildsRoot, guildId),
    playersDb: (guildId: string) => path.join(tmp.guildsRoot, guildId, 'players.json'),
    othermonsDb: () => tmp.missingFile,
  };
});

import { getWorldBossInfo } from '../../src/commands/getWorldBossInfo';
import { prepareWorldBossDefender } from '../../src/features/worldBoss/prepareWorldBossDefender';
import { registerWorldBossDefender } from '../../src/features/worldBoss/registerWorldBossDefender';
import {
  closeWorldBossAndResolve,
  openWorldBoss,
} from '../../src/features/worldBoss/worldBossScheduler';
import { loadWorldBossHistory } from '../../src/features/worldBoss/worldBossHistory.service';
import {
  loadWorldBossState,
  resetWorldBossState,
} from '../../src/features/worldBoss/worldBossState.service';
import { playersDb } from '../../src/config/paths';
import { PlayersRecord } from '../../src/types/Player';

// ─── joueurs fictifs ────────────────────────────────────────────────────────

function fictionalPlayer(name: string): PlayersRecord[string] {
  return {
    name,
    pityCounter: 0,
    xp: 0,
    level: 1,
    researchData: 0,
    captureList: { [String(DEX_ID)]: { total: 1, shiny: 0, capturedInCurrentSeason: true } },
  };
}

function seedPlayers(): void {
  fs.writeFileSync(
    playersDb(KANTO),
    JSON.stringify({ 'u-red': fictionalPlayer('Red') }, null, 2),
    'utf-8',
  );
  fs.writeFileSync(
    playersDb(JOHTO),
    JSON.stringify(
      {
        'u-blue': fictionalPlayer('Blue'),
        // Red joue aussi sur Johto : c'est ce profil qui rend possible la
        // double inscription inter-serveurs.
        'u-red': fictionalPlayer('Red (Johto)'),
      },
      null,
      2,
    ),
    'utf-8',
  );
}

function readPlayersFile(guildId: string): PlayersRecord {
  return JSON.parse(fs.readFileSync(playersDb(guildId), 'utf-8')) as PlayersRecord;
}

// ─── doublures Discord ──────────────────────────────────────────────────────

function makeFakeClient() {
  const sentTo: string[] = [];

  const client = {
    channels: {
      fetch: async (channelId: string) => ({
        isSendable: () => true,
        send: async () => {
          sentTo.push(channelId);
        },
      }),
    },
  } as unknown as Client;

  return { client, sentTo };
}

function makeSquadInteraction(guildId: string) {
  const editReply = vi.fn(async () => undefined);
  const interaction = {
    guildId,
    deferReply: vi.fn(async () => undefined),
    editReply,
  } as never;

  return { interaction, editReply };
}

async function readSquadEmbedText(guildId: string): Promise<string> {
  const { interaction, editReply } = makeSquadInteraction(guildId);
  await getWorldBossInfo(interaction);

  const payload = editReply.mock.calls[0][0] as unknown as { embeds: { toJSON(): unknown }[] };
  return JSON.stringify(payload.embeds[0].toJSON());
}

// ─── inscriptions ───────────────────────────────────────────────────────────

async function register(guildId: string, userId: string, displayName: string) {
  const prepared = await prepareWorldBossDefender({
    guildId,
    userId,
    displayName,
    pokemonId: DEX_ID,
    attackTypeOverride: 'normal',
  });

  return registerWorldBossDefender(prepared);
}

/** Un défenseur par serveur : suffisant pour repousser le boss de test. */
async function registerBothServers() {
  await register(KANTO, 'u-red', 'Red');
  await register(JOHTO, 'u-blue', 'Blue');
}

async function runVictoriousCycle(bossId: string) {
  const { client } = makeFakeClient();
  await openWorldBoss(client, { bossId });
  await registerBothServers();
  return closeWorldBossAndResolve(client);
}

beforeEach(async () => {
  vi.clearAllMocks();
  fs.rmSync(tmp.stateFile, { force: true });
  fs.rmSync(tmp.historyFile, { force: true });
  seedPlayers();
  await resetWorldBossState();
});

describe('world boss bout-en-bout sur deux serveurs', () => {
  it("1. l'ouverture annonce le portail dans le salon des deux serveurs", async () => {
    const { client, sentTo } = makeFakeClient();

    const state = await openWorldBoss(client);

    expect(state?.status).toBe('registration');
    expect(sentTo).toEqual([KANTO_CHANNEL, JOHTO_CHANNEL]);
  });

  it('2 et 3. un joueur par serveur s’inscrit, et /world-boss-squad affiche les deux sur les deux serveurs', async () => {
    const { client } = makeFakeClient();
    await openWorldBoss(client);

    await registerBothServers();

    const kantoView = await readSquadEmbedText(KANTO);
    const johtoView = await readSquadEmbedText(JOHTO);

    for (const view of [kantoView, johtoView]) {
      expect(view).toContain('Red');
      expect(view).toContain('Blue');
      expect(view).toContain('Ligue de Kanto');
      expect(view).toContain('Ligue de Johto');
    }
    // L'état est mondial : les deux serveurs voient rigoureusement la même chose.
    expect(kantoView).toEqual(johtoView);
  });

  it('4. deux inscriptions simultanées depuis deux serveurs, aucune perdue', async () => {
    const { client } = makeFakeClient();
    await openWorldBoss(client);

    await Promise.all([
      register(KANTO, 'u-red', 'Red'),
      register(JOHTO, 'u-blue', 'Blue'),
    ]);

    const state = await loadWorldBossState();
    expect(state.defenders.map((defender) => defender.userId).sort()).toEqual(['u-blue', 'u-red']);
  });

  it('5. le même joueur inscrit depuis les deux serveurs ne compte qu’une fois', async () => {
    const { client } = makeFakeClient();
    await openWorldBoss(client);

    await register(KANTO, 'u-red', 'Red');
    await register(JOHTO, 'u-red', 'Red (Johto)');

    const state = await loadWorldBossState();
    expect(state.defenders).toHaveLength(1);
    // L'unicité porte sur le userId Discord seul : la dernière inscription
    // remplace la précédente, serveur d'origine compris.
    expect(state.defenders[0]).toMatchObject({
      userId: 'u-red',
      guildId: JOHTO,
      guildName: 'Ligue de Johto',
      displayName: 'Red (Johto)',
    });
  });

  it('6 et 7. la clôture crédite les deux players.json et archive le bon participantsCount', async () => {
    const finalState = await runVictoriousCycle('wb-test-alpha');

    expect(finalState?.result?.success).toBe(true);
    expect(finalState?.result?.participantsCount).toBe(2);
    expect(finalState?.result?.guildsCount).toBe(2);

    // hp de base (50) × difficulté par défaut (6) × multiplicateur world boss (10).
    const expectedReward = 3000;
    expect(finalState?.reward?.rewardPerPlayer).toBe(expectedReward);

    const red = readPlayersFile(KANTO)['u-red'];
    const blue = readPlayersFile(JOHTO)['u-blue'];

    for (const player of [red, blue]) {
      expect(player.xp).toBe(expectedReward);
      expect(player.researchData).toBe(expectedReward);
      expect(player.worldBossWins).toBe(1);
    }

    // Le Red de Johto n'a pas participé : il ne touche rien.
    expect(readPlayersFile(JOHTO)['u-red'].xp).toBe(0);

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      bossId: 'wb-test-alpha',
      success: true,
      participantsCount: 2,
      guildsCount: 2,
    });
    expect(history.lastParticipantsCount).toBe(2);
    expect(history.defeatedBossIds).toEqual(['wb-test-alpha']);
  });

  it("8. l'événement suivant hérite de la difficulté du précédent", async () => {
    await runVictoriousCycle('wb-test-alpha');

    const { client } = makeFakeClient();
    const next = await openWorldBoss(client);

    // 2 participants au précédent, donc difficulté 2 (et non le repli 6).
    expect(next?.boss?.difficulty).toBe(2);
    expect(next?.boss?.finalStats.attack).toBe(40);
  });

  it('9. un boss vaincu ne ressort jamais du vivier', async () => {
    await runVictoriousCycle('wb-test-alpha');

    const drawn = new Set<string>();
    for (let attempt = 0; attempt < 25; attempt++) {
      const state = await openWorldBoss(null);
      drawn.add(state?.boss?.id ?? 'aucun');
      await resetWorldBossState();
    }

    expect([...drawn]).toEqual(['wb-test-beta']);
  });

  it("10. les deux boss vaincus, l'ouverture suivante n'ouvre rien et laisse l'état à idle", async () => {
    await runVictoriousCycle('wb-test-alpha');
    await runVictoriousCycle('wb-test-beta');

    const history = await loadWorldBossHistory();
    expect(history.defeatedBossIds.sort()).toEqual(['wb-test-alpha', 'wb-test-beta']);

    const { client, sentTo } = makeFakeClient();
    const state = await openWorldBoss(client);

    expect(state).toBeNull();
    expect(sentTo).toEqual([]);
    await expect(loadWorldBossState()).resolves.toMatchObject({ status: 'idle', boss: null });
  });
});
