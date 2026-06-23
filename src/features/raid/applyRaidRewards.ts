import { promises as fs } from "node:fs";
import path from "node:path";
import { Player, PlayersRecord } from "../../types/Player";
import { RaidState } from "../../types/raid/RaidState";
import { RaidReward } from "../../types/raid/RaidReward";
import { addXp } from "../../methods/xp/xp";
import { registerCapturedPokemon } from "../../methods/player/registerCapturedPokemon";
import { addAllStats } from "../../methods/stats/addAllStats";
import { getPokemonById } from "../../methods/pokemon/getPokemonById";
import logger from "../../utils/logger";

const PLAYERS_PATH = path.resolve("data/players.json");

async function readPlayers(): Promise<PlayersRecord> {
  const raw = await fs.readFile(PLAYERS_PATH, "utf-8");
  return JSON.parse(raw) as PlayersRecord;
}

async function writePlayers(players: PlayersRecord): Promise<void> {
  await fs.writeFile(PLAYERS_PATH, JSON.stringify(players, null, 2), "utf-8");
}

function pickRandomElement<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function applyRaidRewards(state: RaidState): Promise<RaidReward> {
  if (!state.result?.success || !state.raidPokemon) {
    logger.info("[RAID] Raid perdu, aucune récompense appliquée.");
    return { xp: 0, raidWin: false, zoneUnlocked: null, capturedByUserId: null, capturedByPlayerName: null };
  }

  const bossHp = state.raidPokemon.baseStats.hp;
  const xpReward = bossHp * 10;

  const players = await readPlayers();
  const participantIds = state.defenders.map((d) => d.userId);

  for (const userId of participantIds) {
    const player = players[userId];
    if (!player) continue;

    const xpResult = addXp(player.xp ?? 0, xpReward);
    player.xp = xpResult.xp;
    player.level = xpResult.level;
    player.raidWins = (player.raidWins ?? 0) + 1;

    logger.info(
      `[RAID] Récompense appliquée à ${player.name}: +${xpReward} XP, niveau ${xpResult.level}, raidWins=${player.raidWins}`,
    );
  }

  const luckyUserId = pickRandomElement(participantIds);
  const luckyPlayer = players[luckyUserId];
  let capturedByPlayerName: string | null = null;

  if (luckyPlayer) {
    registerCapturedPokemon(luckyPlayer, state.raidPokemon.id, false);
    capturedByPlayerName = luckyPlayer.name;

    const pokemonData = getPokemonById(state.raidPokemon.id);
    if (pokemonData) {
      await addAllStats(pokemonData, false, luckyPlayer);
    }

    logger.info(
      `[RAID] ${luckyPlayer.name} a capturé le Pokémon du raid: ${state.raidPokemon.name} (ID ${state.raidPokemon.id})`,
    );
  }

  await writePlayers(players);

  return {
    xp: xpReward,
    raidWin: true,
    zoneUnlocked: null,
    capturedByUserId: luckyUserId,
    capturedByPlayerName,
  };
}
