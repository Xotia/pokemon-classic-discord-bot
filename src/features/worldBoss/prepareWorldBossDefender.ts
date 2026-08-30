import { getGuildConfig } from '../../config/guilds';
import { prepareRaidDefenderFromPlayerPokemon } from '../raid/prepareRaidDefenderFromPlayerPokemon';
import { RegisterWorldBossDefenderParams } from '../../types/worldBoss/RegisterWorldBossDefenderParams';

export type PrepareWorldBossDefenderInput = {
  /** Serveur d'où vient l'inscription : c'est SON profil qui est validé et récompensé. */
  guildId: string;
  userId: string;
  /** Pseudo affiché, figé ici : il ne sera plus résoluble depuis un autre serveur. */
  displayName: string;
  pokemonId: number;
  attackTypeOverride?: string;
  /** Nom du serveur ; par défaut celui du registre. */
  guildName?: string;
  playersFilePath?: string;
};

/**
 * Prépare un défenseur world boss à partir du Pokédex du joueur sur le serveur
 * d'inscription.
 *
 * La validation (possession, capture dans la saison, type d'attaque) est celle
 * du raid, réutilisée telle quelle : les deux événements doivent accepter
 * exactement les mêmes Pokémon, une copie divergerait au premier changement de
 * règle. Les codes d'erreur restent donc les `RAID_*` d'origine.
 *
 * S'y ajoute le contexte inter-serveurs, qui n'existe pas côté raid.
 */
export async function prepareWorldBossDefender(
  input: PrepareWorldBossDefenderInput,
): Promise<RegisterWorldBossDefenderParams> {
  const prepared = await prepareRaidDefenderFromPlayerPokemon(
    input.guildId,
    input.userId,
    input.pokemonId,
    input.attackTypeOverride,
    input.playersFilePath,
  );

  const guildName =
    input.guildName ?? getGuildConfig(input.guildId)?.name ?? input.guildId;

  return {
    ...prepared,
    guildId: input.guildId,
    guildName,
    displayName: input.displayName,
  };
}
