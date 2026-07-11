import { statsDb } from "../../config/paths";
import { promises as fs } from "fs";
import { getLoggerForGuild } from "../../utils/logger";

export async function addPokemonInTotalCaptures(guildId: string): Promise<void> {
  const logger = getLoggerForGuild(guildId);
  const raw = await fs.readFile(statsDb(guildId), "utf-8");
  const stats = JSON.parse(raw) as { totalCaptures?: number };

  const current =
    typeof stats?.totalCaptures === "number" ? stats.totalCaptures : 0;
  logger.info(`Mise à jour des captures totales: totalCaptures = ${current}}`);
  stats.totalCaptures = current + 1;
  logger.info(`totalCaptures = -> ${current + 1}`);
  await fs.writeFile(statsDb(guildId), JSON.stringify(stats, null, 2), "utf-8");
}
