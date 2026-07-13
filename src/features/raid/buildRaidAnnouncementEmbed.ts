import type { EmbedField } from 'discord.js';
import type { RaidState } from '../../types/raid/RaidState.js';
import { getPokemonSpriteUrl } from '../../methods/pokemon/getPokemonSpriteUrl.js';
import { buildEmbed } from '../../methods/embed/buildEmbed.js';
import { getPokemonByName } from '../../methods/pokemon/getPokemonByName.js';

import { getTypeLabel } from '../../config/typeLabels.js';

const RAID_ALERT_COLOR = 0xff3b30;

function formatRaidCloseTime(isoDate: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

export async function buildRaidAnnouncementEmbed(state: RaidState, guildId: string) {
  const raidPokemon = state.raidPokemon;
  const pokemonName = raidPokemon?.name ?? 'Pokémon inconnu';
  const zoneLabel = raidPokemon?.zone ?? state.zone ?? 'Zone inconnue';
  const difficulty = raidPokemon?.difficulty ?? '?';
  const closeTime = state.registrationClosesAt
    ? formatRaidCloseTime(state.registrationClosesAt)
    : 'Inconnue';

  const pokemonFromRaid =
    raidPokemon?.name ? await getPokemonByName(guildId, raidPokemon.name) : null;
   const spriteUrl = pokemonFromRaid
    ? getPokemonSpriteUrl(false, pokemonFromRaid)
    : '';

  const title = `🚨 Un ${pokemonName} enragé attaque le centre de recherche !`;
  const pokemonTypes = raidPokemon?.types ?? [];
  const attackType = raidPokemon?.attackType;
  const attackTypeLabel = attackType ? getTypeLabel(attackType) : '?';

  const description = [
    `Le centre de recherche est en alerte.`,
    `Un **${pokemonName}** provenant de **${zoneLabel}** approche.`,
    `Types : ${pokemonTypes.map((t) => getTypeLabel(t)).join(' / ')}`,
    `Son type d'attaque : **${attackTypeLabel}**`,    '',
    'Pour participer : `/raid <pokemon> [typeAttaque]`',
  ].join('\n');

  const footer = `Raid ${state.raidId}`;

  const fields: EmbedField[] = [
    {
      name: 'Difficulté',
      value: `${difficulty}/5`,
      inline: true,
    },
    {
      name: 'Zone',
      value: zoneLabel,
      inline: true,
    },
    {
      name: 'Fin des inscriptions',
      value: closeTime,
      inline: true,
    },
  ];

  return buildEmbed(
    title,
    spriteUrl,
    RAID_ALERT_COLOR,
    description,
    footer,
    fields,
  );
}