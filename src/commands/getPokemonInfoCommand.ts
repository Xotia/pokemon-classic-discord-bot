import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { getPokemonByName } from "../methods/pokemon/getPokemonByName";
import { getTypeLabel } from "../config/typeLabels";
import { rarityList } from "../config/rarity";
import { rarityEmojiMap } from "./getRarityCommand";

const DEFAULT_EMBED_COLOR = 0x9e9e9e;

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
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
    await interaction.reply(`Aucun Pokémon trouvé avec le nom "${pokemonName}".`);
    return;
  }

  const rarityData = rarityList.find((r) => r.rarity === pokemon.rarity);
  const rarityEmoji = rarityEmojiMap[pokemon.rarity] ?? "⚪";
  const rarityLabel = rarityData?.french ?? pokemon.rarity;

  const typesLabel = pokemon.types.map((t) => getTypeLabel(t)).join(", ");

  const weaknesses = Object.entries(pokemon.effectiveness.defense)
    .filter(([, multiplier]) => multiplier > 1)
    .sort(([, a], [, b]) => b - a)
    .map(([type, multiplier]) => `${getTypeLabel(type)} (x${multiplier})`);

  const resistances = Object.entries(pokemon.effectiveness.defense)
    .filter(([, multiplier]) => multiplier < 1)
    .sort(([, a], [, b]) => a - b)
    .map(([type, multiplier]) => `${getTypeLabel(type)} (x${multiplier})`);

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
