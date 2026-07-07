import logger from "../../utils/logger";
import { updatePlayer } from "../../utils/jsonPlayers";
import { CATCH_COOLDOWN_MS, NO_POKEMON_COOLDOWN_MS } from "../cooldown/checkIfUserCanCatch";

const NO_POKEMON_MESSAGES = [
  "📡 Les capteurs du Centre ne détectent aucune signature Pokémon dans cette zone. Silence radio complet.",
  "😞 Aucun Pokémon trouvé. La zone semble avoir été désertée récemment — instabilité trop forte, sans doute.",
  "🌫️ Rien à l'horizon. Les rapports d'AURORA mentionnaient pourtant une activité ici il y a quelques heures à peine.",
  "📉 Les relevés de terrain restent muets. Peut-être les Pokémon ont-ils fui vers une zone plus calme.",
  "🔍 Tu fouilles la zone sans succès. Le Centre te rappelle de rester prudent : l'absence de signal n'est pas toujours bon signe.",
  "😞 Aucun Pokémon trouvé. Seul le silence occupe les lieux, comme si toute vie avait fui bien avant ton arrivée.",
  "📡 Anomalie : les capteurs de détection oscillent sans jamais se stabiliser. Aucune capture possible pour l'instant.",
  "🌑 La zone est étrangement calme. Trop calme, selon les techniciens du Centre.",
  "😞 Aucun Pokémon trouvé. Un rapport signale que le périmètre nord a été récemment réorganisé par une horde en fuite.",
  "🛰️ Les satellites d'AURORA ne relèvent aucune trace exploitable. Réessaie plus tard, la situation évolue vite.",
];

function getRandomNoPokemonMessage(): string {
  return NO_POKEMON_MESSAGES[Math.floor(Math.random() * NO_POKEMON_MESSAGES.length)];
}

export async function handleNoPokemonFound(
  interaction: any,
  guildId: string,
  rarity: string,
) {
  logger.info(`😞 Aucun Pokémon ${rarity} disponible`);

  // checkIfUserCanCatch a déjà posé lastCapture pour un cooldown complet,
  // on le recale pour ne laisser qu'un cooldown de NO_POKEMON_COOLDOWN_MS
  // (sans jamais dépasser le cooldown normal, utile si COOLDOWN est réduit en dev).
  const reducedCooldown = Math.min(CATCH_COOLDOWN_MS, NO_POKEMON_COOLDOWN_MS);
  await updatePlayer(guildId, interaction.user.id, (player) => {
    player.lastCapture = Date.now() - (CATCH_COOLDOWN_MS - reducedCooldown);
  });

  await interaction.editReply(getRandomNoPokemonMessage());
}
