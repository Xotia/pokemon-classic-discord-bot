import { PlayersRecord } from "../../types/Player";
import { RaidState } from "../../types/raid/RaidState";
import { RaidReward } from "../../types/raid/RaidReward";
import { addXp } from "../../methods/xp/xp";
import { registerCapturedPokemon } from "../../methods/player/registerCapturedPokemon";
import { markPokemonAsCapturedInCurrentSeason } from "../../methods/player/markPokemonAsCapturedInCurrentSeason";
import { addAllStats } from "../../methods/stats/addAllStats";
import { getPokemonById } from "../../methods/pokemon/getPokemonById";
import { getLoggerForGuild } from "../../utils/logger";
import { readPlayers, updatePlayers } from "../../utils/jsonPlayers";

function pickRandomElement<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function applyRaidRewards(state: RaidState, guildId: string): Promise<RaidReward> {
  const logger = getLoggerForGuild(guildId);

  if (!state.result?.success || !state.raidPokemon) {
    logger.info("[RAID] Raid perdu, aucune récompense appliquée.");
    return { xp: 0, raidWin: false, zoneUnlocked: null, capturedByUserId: null, capturedByPlayerName: null };
  }

  const bossHp = state.raidPokemon.baseStats.hp;
  const xpReward = bossHp * 10;

  const participantIds = state.defenders.map((d) => d.userId);
  const luckyUserId = pickRandomElement(participantIds);

  // One read-only snapshot, taken outside the lock, solely to resolve the
  // lucky player's name for addAllStats (which needs to run before we know
  // the final persisted state, and must stay outside the file lock since it
  // performs unrelated I/O of its own).
  const snapshotPlayers = await readPlayers(guildId);
  const luckyPlayerSnapshot = snapshotPlayers[luckyUserId];

  if (luckyPlayerSnapshot) {
    const pokemonData = getPokemonById(guildId, state.raidPokemon.id);
    if (pokemonData) {
      await addAllStats(guildId, pokemonData, false, luckyPlayerSnapshot);
    }

    logger.info(
      `[RAID] ${luckyPlayerSnapshot.name} a capturé le Pokémon du raid: ${state.raidPokemon.name} (ID ${state.raidPokemon.id})`,
    );
  }

  let capturedByPlayerName: string | null = null;

  await updatePlayers(guildId, (players: PlayersRecord) => {
    for (const userId of participantIds) {
      const player = players[userId];
      if (!player) continue;

      const xpResult = addXp(player.xp ?? 0, xpReward);
      player.xp = xpResult.xp;
      player.level = xpResult.level;
      player.researchData = (typeof player.researchData === "number" ? player.researchData : 0) + xpReward;
      player.raidWins = (player.raidWins ?? 0) + 1;

      logger.info(
        `[RAID] Récompense appliquée à ${player.name}: +${xpReward} XP, niveau ${xpResult.level}, raidWins=${player.raidWins}`,
      );
    }

    const luckyPlayer = players[luckyUserId];
    if (luckyPlayer) {
      registerCapturedPokemon(luckyPlayer, state.raidPokemon!.id, false);
      markPokemonAsCapturedInCurrentSeason(luckyPlayer, state.raidPokemon!.id);
      capturedByPlayerName = luckyPlayer.name;
    }
  });

  return {
    xp: xpReward,
    raidWin: true,
    zoneUnlocked: null,
    capturedByUserId: luckyUserId,
    capturedByPlayerName,
  };
}
