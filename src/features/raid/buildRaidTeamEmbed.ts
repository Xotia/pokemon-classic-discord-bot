import type { EmbedField, Guild } from "discord.js";
import type { RaidState } from "../../types/raid/RaidState";
import { getTypeLabel } from "../../config/typeLabels";
import { buildEmbed } from "../../methods/embed/buildEmbed";
import { getPokemonByName } from "../../methods/pokemon/getPokemonByName";
import { getPokemonSpriteUrl } from "../../methods/pokemon/getPokemonSpriteUrl";

export async function buildRaidTeamEmbed(state: RaidState, guild: Guild) {
  const boss = state.raidPokemon;

  if (!boss) {
    return buildEmbed(
      "Équipe de défense",
      "",
      0x999999,
      "Aucun raid en cours.",
      "Aucun raid actif",
    );
  }

  const pokemonFromRaid = await getPokemonByName(guild.id, boss.name);
  const spriteUrl = pokemonFromRaid
    ? getPokemonSpriteUrl(false, pokemonFromRaid)
    : "";

  const attackTypeLabel = getTypeLabel(boss.attackType);
  const zoneLabel = boss.zone ?? state.zone ?? "Zone inconnue";

  const description = [
    `Un **${boss.name}** attaque depuis **${zoneLabel}**`,
    `Type d'attaque : **${attackTypeLabel}**`,
  ].join("\n");

  const fields: EmbedField[] = [
    { name: "Difficulté", value: `${boss.difficulty}/5`, inline: true },
    { name: "Zone", value: zoneLabel, inline: true },
    { name: "Inscrits", value: `${state.defenders.length}`, inline: true },
  ];

  if (state.defenders.length > 0) {
    const byPlayer = new Map<string, string[]>();
    for (const d of state.defenders) {
      const entry = `${d.pokemonName} (${getTypeLabel(d.attackType)})`;
      const list = byPlayer.get(d.userId) ?? [];
      list.push(entry);
      byPlayer.set(d.userId, list);
    }

    for (const [userId, pokemons] of byPlayer) {
      let playerName = userId;
      try {
        const member = await guild.members.fetch(userId);
        playerName = member.displayName;
      } catch {}
      fields.push({
        name: playerName,
        value: pokemons.join("\n"),
        inline: false,
      });
    }
  } else {
    fields.push({
      name: "Équipe de défense",
      value: "Aucun défenseur inscrit pour le moment.",
      inline: false,
    });
  }

  return buildEmbed(
    "👊 Équipe de défense du raid",
    spriteUrl,
    0x3498db,
    description,
    `Raid ${state.raidId}`,
    fields,
  );
}
