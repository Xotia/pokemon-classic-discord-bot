import { EmbedBuilder } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mocks = vi.hoisted(() => ({ loadGuildRegistry: vi.fn() }));

vi.mock('../../src/config/guilds', () => ({ loadGuildRegistry: mocks.loadGuildRegistry }));

import { broadcastWorldBossEmbed } from '../../src/features/worldBoss/broadcastWorldBossEmbed';
import logger from '../../src/utils/logger';

const embed = new EmbedBuilder().setTitle('World boss');

type FakeChannel = { isSendable: () => boolean; send: ReturnType<typeof vi.fn> };

function makeClient(channels: Record<string, FakeChannel | Error | null>) {
  return {
    channels: {
      fetch: vi.fn(async (channelId: string) => {
        const channel = channels[channelId];
        if (channel instanceof Error) throw channel;
        return channel;
      }),
    },
  } as never;
}

function registry(...channelIds: (string | undefined)[]) {
  return channelIds.map((channelId, index) => ({
    guildId: `g${index}`,
    name: `Serveur ${index}`,
    raidAnnounceChannelId: channelId,
    mainChannelId: 'main',
  }));
}

function sendableChannel(): FakeChannel {
  return { isSendable: () => true, send: vi.fn(async () => undefined) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('broadcastWorldBossEmbed', () => {
  it('envoie l’embed dans le salon de raid de chaque serveur du registre', async () => {
    const first = sendableChannel();
    const second = sendableChannel();
    mocks.loadGuildRegistry.mockReturnValue(registry('c0', 'c1'));

    const result = await broadcastWorldBossEmbed(makeClient({ c0: first, c1: second }), embed);

    expect(result).toMatchObject({ sent: 2, failed: 0, failures: [] });
    expect(first.send).toHaveBeenCalledWith({ embeds: [embed] });
    expect(second.send).toHaveBeenCalledWith({ embeds: [embed] });
  });

  it('continue la diffusion quand un salon est en erreur', async () => {
    const healthy = sendableChannel();
    mocks.loadGuildRegistry.mockReturnValue(registry('c0', 'c1'));

    const result = await broadcastWorldBossEmbed(
      makeClient({ c0: new Error('Missing Access'), c1: healthy }),
      embed,
    );

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures[0]).toMatchObject({ guildId: 'g0', channelId: 'c0' });
    expect(healthy.send).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'world_boss_announce_failed', guildId: 'g0' }),
      expect.any(String),
    );
  });

  it('compte en échec un salon introuvable, non inscriptible ou non configuré', async () => {
    const notSendable: FakeChannel = { isSendable: () => false, send: vi.fn() };
    mocks.loadGuildRegistry.mockReturnValue(registry('c0', 'c1', undefined));

    const result = await broadcastWorldBossEmbed(
      makeClient({ c0: null, c1: notSendable }),
      embed,
    );

    expect(result).toMatchObject({ sent: 0, failed: 3 });
    expect(notSendable.send).not.toHaveBeenCalled();
  });

  it('n’envoie rien et ne rejette pas quand un envoi échoue à l’écriture', async () => {
    const failing: FakeChannel = {
      isSendable: () => true,
      send: vi.fn(async () => {
        throw new Error('Missing Permissions');
      }),
    };
    mocks.loadGuildRegistry.mockReturnValue(registry('c0'));

    await expect(
      broadcastWorldBossEmbed(makeClient({ c0: failing }), embed),
    ).resolves.toMatchObject({ sent: 0, failed: 1 });
  });

  it('ne rejette pas quand le registre est illisible', async () => {
    mocks.loadGuildRegistry.mockImplementation(() => {
      throw new Error('Registre des serveurs introuvable');
    });

    await expect(broadcastWorldBossEmbed(makeClient({}), embed)).resolves.toEqual({
      sent: 0,
      failed: 0,
      failures: [],
    });
  });
});
