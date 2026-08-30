import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { getPokemonByName } from "../methods/pokemon/getPokemonByName";
import { getTypeLabel } from "../config/typeLabels";
import { rarityList } from "../config/rarity";
import { rarityEmojiMap } from "./getRarityCommand";
import { getWorldBossEntryByName } from "../features/worldBoss/worldBossCatalog";
import { WorldBossEntry } from "../types/worldBoss/WorldBossEntry";
import logger from "../utils/logger";

const DEFAULT_EMBED_COLOR = 0x9e9e9e;
const WORLD_BOSS_EMBED_COLOR = 0x9b59b6;

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function splitEffectiveness(defense: Record<string, number>): {
  weaknesses: string[];
  resistances: string[];
} {
  const weaknesses = Object.entries(defense)
    .filter(([, multiplier]) => multiplier > 1)
    .sort(([, a], [, b]) => b - a)
    .map(([type, multiplier]) => `${getTypeLabel(type)} (x${multiplier})`);

  const resistances = Object.entries(defense)
    .filter(([, multiplier]) => multiplier < 1)
    .sort(([, a], [, b]) => a - b)
    .map(([type, multiplier]) => `${getTypeLabel(type)} (x${multiplier})`);

  return { weaknesses, resistances };
}

/**
 * Fiche d'un Gigamax : pas de rareté ni de statistiques — elles dépendent de la
 * difficulté tirée à l'ouverture du portail et restent cachées jusqu'au combat.
 */
function buildWorldBossInfoEmbed(boss: WorldBossEntry): EmbedBuilder {
  const { weaknesses, resistances } = splitEffectiveness(boss.defenseEffectiveness);

  return new EmbedBuilder()
    .setTitle(`🌀 ${boss.name}`)
    .setColor(WORLD_BOSS_EMBED_COLOR)
    .setThumbnail(boss.sprite)
    .setDescription(boss.lore)
    .addFields(
      {
        name: "Portail",
        value: boss.portal,
        inline: true,
      },
      {
        name: "Type(s)",
        value: boss.types.map((t) => getTypeLabel(t)).join(", ") || "Inconnu",
        inline: true,
      },
      {
        name: "Type d'attaque",
        value: getTypeLabel(boss.attackType),
        inline: true,
      },
      {
        name: "Faiblesses",
        value: weaknesses.length > 0 ? weaknesses.join("\n") : "Aucune faiblesse",
      },
      {
        name: "Résistances",
        value: resistances.length > 0 ? resistances.join("\n") : "Aucune résistance",
      },
    )
    .setFooter({ text: "World boss — statistiques révélées au combat" });
}

function findWorldBoss(name: string): WorldBossEntry | null {
  try {
    return getWorldBossEntryByName(name);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
    logger.error(`getPokemonInfoCommand — liste world boss illisible : ${errorMsg}`);
    return null;
  }
}

export async function getPokemonInfoCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply("Cette commande n'est disponible que sur un serveur.");
    return;
  }

  const pokemonName = interaction.options.getString("pokemon", true);
  const pokemon = await getPokemonByName(guildId, pokemonName);

  if (!pokemon) {
    const boss = findWorldBoss(pokemonName);
    if (boss) {
      await interaction.reply({ embeds: [buildWorldBossInfoEmbed(boss)] });
      return;
    }

    await interaction.reply(`Aucun Pokémon trouvé avec le nom "${pokemonName}".`);
    return;
  }

  const rarityData = rarityList.find((r) => r.rarity === pokemon.rarity);
  const rarityEmoji = rarityEmojiMap[pokemon.rarity] ?? "⚪";
  const rarityLabel = rarityData?.french ?? pokemon.rarity;

  const typesLabel = pokemon.types.map((t) => getTypeLabel(t)).join(", ");

  const { weaknesses, resistances } = splitEffectiveness(pokemon.effectiveness.defense);

  const embed = new EmbedBuilder()
    .setTitle(`#${pokemon.id} ${pokemon.name}`)
    .setColor(rarityData?.color ?? DEFAULT_EMBED_COLOR)
    .setThumbnail(pokemon.image)
    .addFields(
      {
        name: "Nom anglais",
        value: capitalize(pokemon.originalName),
        inline: true,
      },
      {
        name: "Rareté",
        value: `${rarityEmoji} ${rarityLabel}`,
        inline: true,
      },
      {
        name: "Type(s)",
        value: typesLabel || "Inconnu",
        inline: true,
      },
      {
        name: "Faiblesses",
        value: weaknesses.length > 0 ? weaknesses.join("\n") : "Aucune faiblesse",
      },
      {
        name: "Résistances",
        value: resistances.length > 0 ? resistances.join("\n") : "Aucune résistance",
      },
      {
        name: "Statistiques",
        value: [
          `PV : ${pokemon.stats.hp}`,
          `Attaque : ${pokemon.stats.attack}`,
          `Défense : ${pokemon.stats.defense}`,
          `Attaque Spéciale : ${pokemon.stats.specialAttack}`,
          `Défense Spéciale : ${pokemon.stats.specialDefense}`,
          `Vitesse : ${pokemon.stats.speed}`,
        ].join("\n"),
      },
    );

  await interaction.reply({ embeds: [embed] });
}
