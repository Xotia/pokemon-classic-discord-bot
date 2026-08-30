import { describe, expect, it } from 'vitest';
import { buildWorldBossAnnouncementEmbed } from '../../src/features/worldBoss/buildWorldBossAnnouncementEmbed';
import { buildWorldBossTeamEmbed } from '../../src/features/worldBoss/buildWorldBossTeamEmbed';
import { buildWorldBossResultEmbed } from '../../src/features/worldBoss/buildWorldBossResultEmbed';
import { createEmptyWorldBossState } from '../../src/features/worldBoss/worldBossState.service';
import { WorldBossDefender } from '../../src/types/worldBoss/WorldBossDefender';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

const STATS = { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 };

function makeState(overrides: Partial<WorldBossState> = {}): WorldBossState {
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
      types: ['ghost', 'dragon'],
      attackType: 'ghost',
      difficulty: 6,
      baseStats: STATS,
      finalStats: {
        hp: 900, attack: 720, defense: 600, specialAttack: 720, specialDefense: 600, speed: 540,
      },
      defenseEffectiveness: { dark: 2 },
      lore: 'Une ligne de contexte.',
    },
    ...overrides,
  };
}

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

describe('buildWorldBossAnnouncementEmbed', () => {
  it('annonce la couleur du portail, le boss et l’heure limite', () => {
    const embed = buildWorldBossAnnouncementEmbed(makeState()).toJSON();

    expect(embed.title).toBe(
      "🌀 Un Portail violet s'est ouvert au-dessus du centre de recherche !",
    );
    expect(embed.description).toContain('Giratina');
    expect(embed.description).toContain('/world-boss');
    expect(embed.description).toContain("Type d'attaque :");
    expect(embed.description).toContain('20:00');
    expect(embed.image?.url).toBe('https://exemple/sprite.png');
    expect(embed.color).toBe(0x9b59b6);
  });

  it('ne laisse fuiter ni difficulté chiffrée, ni nom de brèche, ni lore de boss', () => {
    const serialized = JSON.stringify(buildWorldBossAnnouncementEmbed(makeState()).toJSON());

    expect(serialized).not.toContain('×6');
    expect(serialized).not.toContain('Difficulté');
    expect(serialized).not.toContain("Faille de l'Antimonde");
    expect(serialized).not.toContain('Une ligne de contexte.');
  });

  it('reste affichable sur un état sans boss', () => {
    const embed = buildWorldBossAnnouncementEmbed(createEmptyWorldBossState()).toJSON();

    expect(embed.description).toContain("Aucun portail n'est ouvert");
  });
});

describe('buildWorldBossTeamEmbed', () => {
  it('affiche le cas « aucun world boss actif » avec la date du prochain', () => {
    const embed = buildWorldBossTeamEmbed(createEmptyWorldBossState()).toJSON();

    expect(embed.description).toContain("Aucun world boss n'est actif");
    expect(embed.description).toContain('dimanche à 12h00');
  });

  it('affiche une équipe vide sans planter', () => {
    const embed = buildWorldBossTeamEmbed(makeState()).toJSON();

    expect(embed.fields?.find((f) => f.name === 'Inscrits')?.value).toBe('0');
    expect(embed.fields?.find((f) => f.name === 'Serveurs représentés')?.value).toBe('0');
    expect(embed.fields?.some((f) => f.value.includes('Aucun défenseur inscrit'))).toBe(true);
  });

  it('groupe les défenseurs d’un seul serveur', () => {
    const embed = buildWorldBossTeamEmbed(
      makeState({ defenders: [makeDefender('u1', 'g1', 'Alpha'), makeDefender('u2', 'g1', 'Alpha')] }),
    ).toJSON();

    expect(embed.fields?.find((f) => f.name === 'Inscrits')?.value).toBe('2');
    expect(embed.fields?.find((f) => f.name === 'Serveurs représentés')?.value).toBe('1');
    const guildField = embed.fields?.find((f) => f.name === 'Alpha (2)');
    expect(guildField?.value).toContain('Joueur u1 — Onix');
    expect(guildField?.value).toContain('Joueur u2 — Onix');
  });

  it('groupe par serveur quand l’équipe vient de plusieurs serveurs', () => {
    const embed = buildWorldBossTeamEmbed(
      makeState({
        defenders: [
          makeDefender('u1', 'g1', 'Alpha'),
          makeDefender('u2', 'g2', 'Beta'),
          makeDefender('u3', 'g2', 'Beta'),
        ],
      }),
    ).toJSON();

    expect(embed.fields?.find((f) => f.name === 'Serveurs représentés')?.value).toBe('2');
    // Le serveur le plus représenté passe devant.
    expect(embed.fields?.map((f) => f.name)).toEqual(
      expect.arrayContaining(['Beta (2)', 'Alpha (1)']),
    );
  });

  it('reste sous le plafond de 25 champs avec 30 serveurs, sans perdre personne', () => {
    const defenders = Array.from({ length: 30 }, (_, index) =>
      makeDefender(`u${index}`, `g${index}`, `Serveur ${String(index).padStart(2, '0')}`),
    );

    const embed = buildWorldBossTeamEmbed(makeState({ defenders })).toJSON();

    expect(embed.fields!.length).toBeLessThanOrEqual(25);
    const summary = embed.fields!.find((f) => f.name.includes('autre(s) serveur(s)'));
    expect(summary).toBeDefined();
    expect(summary!.value).toContain('Total :');
    expect(embed.fields?.find((f) => f.name === 'Inscrits')?.value).toBe('30');
  });

  it('signale le débordement plutôt que de tronquer en silence avec 60 défenseurs sur un serveur', () => {
    const defenders = Array.from({ length: 60 }, (_, index) =>
      makeDefender(`utilisateur-numero-${index}`, 'g1', 'Alpha'),
    );

    const embed = buildWorldBossTeamEmbed(makeState({ defenders })).toJSON();
    const guildField = embed.fields!.find((f) => f.name === 'Alpha (60)')!;

    expect(guildField.value.length).toBeLessThanOrEqual(1024);
    expect(guildField.value).toMatch(/… et \d+ autre\(s\)/);
    expect(embed.fields?.find((f) => f.name === 'Inscrits')?.value).toBe('60');
  });
});

describe('buildWorldBossResultEmbed', () => {
  const teamStats = { hp: 1000, attack: 800, defense: 700, specialAttack: 800, specialDefense: 700, speed: 600 };

  it('annonce la victoire, le portail refermé et le gain individuel', () => {
    const embed = buildWorldBossResultEmbed(
      makeState({
        status: 'resolved',
        defenders: [makeDefender('u1', 'g1', 'Alpha'), makeDefender('u2', 'g2', 'Beta')],
        result: {
          success: true,
          missingStats: [],
          participantsCount: 2,
          guildsCount: 2,
          teamStats,
          statDiffs: { hp: 100, attack: 80, defense: 100, specialAttack: 80, specialDefense: 100, speed: 60 },
        },
        reward: { rewardPerPlayer: 900, worldBossWin: true, rewardedUserIds: ['u1', 'u2'] },
      }),
    ).toJSON();

    expect(embed.title).toContain('Victoire');
    expect(embed.description).toContain('se referme');
    // Le retrait définitif du vivier reste une info interne : rien ne doit le dire aux joueurs.
    expect(embed.description).not.toContain('ne ressortira plus');
    expect(embed.description).not.toContain('plus être tiré');
    expect(embed.description).toContain('+900 XP');
    expect(embed.description).toContain('Serveurs représentés :** 2');
  });

  it('annonce la défaite, les stats manquantes et le portail toujours ouvert', () => {
    const embed = buildWorldBossResultEmbed(
      makeState({
        status: 'resolved',
        defenders: [makeDefender('u1', 'g1', 'Alpha')],
        result: {
          success: false,
          missingStats: ['attack', 'speed'],
          participantsCount: 1,
          guildsCount: 1,
          teamStats,
          statDiffs: { hp: 0, attack: -400, defense: 100, specialAttack: 80, specialDefense: 100, speed: -200 },
        },
      }),
    ).toJSON();

    expect(embed.title).toContain('Défaite');
    expect(embed.title).toContain("n'a pas été vaincu");
    expect(embed.title).not.toContain('brèche');
    expect(embed.description).toContain('Attaque et Vitesse');
    expect(embed.description).not.toContain('reste ouvert');
    expect(embed.fields ?? []).toHaveLength(0);
  });

  it('traite le cas zéro participant', () => {
    const embed = buildWorldBossResultEmbed(
      makeState({
        status: 'resolved',
        result: {
          success: false,
          missingStats: ['attack'],
          participantsCount: 0,
          guildsCount: 0,
          teamStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          statDiffs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
        },
      }),
    ).toJSON();

    expect(embed.description).toContain('Personne n’a franchi le portail');
    expect(embed.description).toContain('Participants :** 0');
  });

  it('reste affichable sans résultat', () => {
    const embed = buildWorldBossResultEmbed(makeState()).toJSON();

    expect(embed.description).toContain('indisponibles');
  });
});
