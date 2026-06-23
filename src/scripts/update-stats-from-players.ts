#!/usr/bin/env ts-node
import fs from "node:fs/promises";
import { getPokemonName } from "../methods/pokemon/getPokemonName";
import { PLAYERS_DB, STATS_DB } from "../config/paths";

interface CaptureData {
  total: number;
  shiny: number;
}

interface PlayerData {
  name?: string;
  captureList?: Record<string, CaptureData> | null;
}

interface PlayersFile {
  [discordId: string]: PlayerData;
}

type StatsFile = {
  pokemonPerPlayer?: Record<string, Record<string, number>>;
  [key: string]: unknown;
};

async function updateStatsFromPlayers() {

  console.log("🔄 Mise à jour de stats.json depuis players.json...");

  const playersRaw = await fs.readFile(PLAYERS_DB, "utf-8");
  const players: PlayersFile = JSON.parse(playersRaw);

  const statsRaw = await fs.readFile(STATS_DB, "utf-8");
  const stats: StatsFile = JSON.parse(statsRaw);

  const pokemonPerPlayer: Record<string, Record<string, number>> = {};

  await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), "utf-8");
  await fs.copyFile(STATS_DB, `${STATS_DB}.bak`);

  for (const [, player] of Object.entries(players ?? {})) {
    if (!player?.name) continue;

    const captureList = player.captureList ?? {};
    const playerStats: Record<string, number> = {};

    for (const [pokemonIdStr, captureData] of Object.entries(captureList)) {
      if (!captureData || typeof captureData.total !== "number") continue;

      const pokemonId = Number.parseInt(pokemonIdStr, 10);
      if (Number.isNaN(pokemonId)) continue;

      const pokemonName = await getPokemonName(pokemonId);
      if (!pokemonName) continue;

      playerStats[pokemonName] = captureData.total;
    }

    pokemonPerPlayer[player.name] = playerStats;
  }

  stats.pokemonPerPlayer = pokemonPerPlayer;
  console.log(Object.keys(stats));
  await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), "utf-8");
  console.log("✅ stats.json mis à jour sans toucher aux autres clés !");
}

updateStatsFromPlayers().catch(console.error);