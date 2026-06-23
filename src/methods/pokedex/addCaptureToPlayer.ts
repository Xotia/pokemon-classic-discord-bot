import { STATS_DB } from "../../config/paths";
import { Player } from "../../types/Player";
import logger from "../../utils/logger";
import { promises as fs } from "fs";

interface StatsFile {
  pokemonPerPlayer: Record<string, Record<string, number>>;
  [key: string]: unknown;
}

function getSafePlayerName(player: Player | null | undefined): string | null {
  if (!player || typeof player.name !== "string") {
    return null;
  }

  const normalizedName = player.name.trim();
  return normalizedName.length > 0 ? normalizedName : null;
}

function normalizePokemonName(pokemonName: string): string {
  const normalized = pokemonName?.trim();
  if (!normalized) {
    throw new Error("pokemonName invalide : valeur manquante");
  }
  return normalized;
}

async function readStatsFile(): Promise<StatsFile> {
  try {
    const statsRaw = await fs.readFile(STATS_DB, "utf-8");
    const parsed = JSON.parse(statsRaw) as Partial<StatsFile>;

    return {
      ...parsed,
      pokemonPerPlayer:
        parsed.pokemonPerPlayer &&
        typeof parsed.pokemonPerPlayer === "object"
          ? parsed.pokemonPerPlayer
          : {},
    };
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT") {
      return { pokemonPerPlayer: {} };
    }

    throw new Error(
      `Impossible de lire ${STATS_DB}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function addCaptureToPlayer(
  player: Player | null | undefined,
  pokemonName: string,
): Promise<void> {
  const playerName = getSafePlayerName(player);
  const safePokemonName = normalizePokemonName(pokemonName);

  if (!playerName) {
    logger.error(
      `addCaptureToPlayer ignoré: player.name invalide, player=${JSON.stringify(player)}`,
    );
    return;
  }

  const stats = await readStatsFile();

  stats.pokemonPerPlayer[playerName] ??= {};
  stats.pokemonPerPlayer[playerName][safePokemonName] ??= 0;
  stats.pokemonPerPlayer[playerName][safePokemonName] += 1;

  await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), "utf-8");

  logger.info(
    `${playerName} : Pokémon ${safePokemonName} => total: ${stats.pokemonPerPlayer[playerName][safePokemonName]} captures`,
  );
}