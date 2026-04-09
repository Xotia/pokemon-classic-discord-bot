import logger from '../utils/logger';

import { checkIfUserCanCatch } from '../methods/cooldown/checkIfUserCanCatch';
import { createProfileIfNeeded } from '../methods/file/createProfileIfNeeded';
import { getPlayer } from '../utils/loadPlayer';
import { rollRarity } from '../methods/rarity/rollRarity';
import { isThePokemonGonnaBeShiny } from '../methods/pokemon/isThePokemonGonnaBeShiny'
import { getPokemonSpriteUrl } from '../methods/pokemon/getPokemonSpriteUrl'
import { isPokemonInPokedex } from '../methods/pokedex/isPokemonInPokedex'
import { defineRarityColor } from '../methods/rarity/defineRarityColor';
import { buildTitleForRandomCaptureEmbed } from '../methods/embed/buildTitleForRandomCaptureEmbed';
import { buildDescriptionForPokemonCaptureEmbed } from '../methods/embed/buildDescriptionForRandomCaptureEmbed';
import { editFooter } from '../methods/embed/editFooter';
import { buildEmbed } from '../methods/embed/buildEmbed';
import { savePlayerData } from '../methods/file/savePlayerData';
import { displayLogs } from '../methods/console-logs/displayLogs';
import { addAllStats } from '../methods/stats/addAllStats';
import { getNewPokemon } from '../methods/pokemon/getNewPokemon';
import { pitySystem } from '../methods/pity/pitySystem';
import { resetPityCounterIfNeeded } from '../methods/pity/resetPityCounterIfNeeded';
import { getNewGatchaPokemon } from '../methods/gatcha/getNewGatchaPokemon';

export async function captureCommand(interaction: any) {
    await interaction.deferReply();
    createProfileIfNeeded(interaction);

    logger.info('Exécution de /capture par', interaction.user.tag);
    //vérification
    const canCatch = await checkIfUserCanCatch(interaction);
    if (!canCatch) {
        return;
    }
    
    const player = getPlayer(interaction.user.id);
    if (!player) {
        logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
        return false;
    }

    //calcul
    const { pokemonCatched, rarity } = await getNewGatchaPokemon(player);

    if (pokemonCatched) {
        const isShiny = isThePokemonGonnaBeShiny();
        const spriteUrl = getPokemonSpriteUrl(isShiny, pokemonCatched);
        const isInPokedex = isPokemonInPokedex(player, pokemonCatched.id, interaction.user.id);
        console.log(`🎉 Capturé: ${pokemonCatched.name} (${rarity})`);

        //Réponse Discord
        const color = defineRarityColor(pokemonCatched.rarity, isShiny);
        const title = buildTitleForRandomCaptureEmbed(isShiny, pokemonCatched, color);
        const description = buildDescriptionForPokemonCaptureEmbed(interaction, pokemonCatched, isShiny, !isInPokedex);
        const footer = editFooter(interaction, pokemonCatched.name, isInPokedex);
        const embed = buildEmbed(title, spriteUrl, color.color, description, footer);
        await interaction.editReply({ embeds: [embed] });

        //Logs
        displayLogs(interaction, pokemonCatched, isShiny, !isInPokedex, footer);

        //Statistiques
        await addAllStats(interaction, pokemonCatched, isShiny, player)
        savePlayerData(interaction, player);

    } else {
        console.log(`😞 Aucun Pokémon ${rarity} disponible`);
        await interaction.editReply(`😞 Aucun Pokémon ${rarity} disponible`);
    }

}