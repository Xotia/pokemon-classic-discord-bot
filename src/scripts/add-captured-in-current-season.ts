import fs from "fs";
import { playersDb } from "../config/paths";

function parseGuildId(argv: string[]): string {
  const index = argv.indexOf("--guildId");
  const guildId = index !== -1 ? argv[index + 1] : undefined;

  if (!guildId) {
    console.error("Usage: ts-node src/scripts/add-captured-in-current-season.ts --guildId <id>");
    process.exit(1);
  }

  return guildId;
}

type PlayerPokemonEntry = {
  total: number;
  shiny: number;
  capturedInCurrentSeason?: boolean;
};

type Player = {
  name: string;
  captureList?: Record<string, PlayerPokemonEntry>;
};

type PlayersDb = Record<string, Player>;

function addCapturedInCurrentSeasonToPlayers(guildId: string) {
  try {
    const raw = fs.readFileSync(playersDb(guildId), "utf8");
    const players: PlayersDb = JSON.parse(raw);

    let updatedPlayersCount = 0;
    let updatedPokemonCount = 0;

    for (const player of Object.values(players)) {
      if (!player.captureList) {
        continue;
      }

      let playerUpdated = false;

      for (const pokemonEntry of Object.values(player.captureList)) {
        if (pokemonEntry.capturedInCurrentSeason === undefined) {
          pokemonEntry.capturedInCurrentSeason = false;
          updatedPokemonCount += 1;
          playerUpdated = true;
        }
      }

      if (playerUpdated) {
        updatedPlayersCount += 1;
      }
    }

    fs.writeFileSync(playersDb(guildId), JSON.stringify(players, null, 2), "utf-8");

    console.log(
      `✅ Migration terminée : ${updatedPokemonCount} Pokémon mis à jour pour ${updatedPlayersCount} joueurs.`,
    );
  } catch (error) {
    console.error("❌ Erreur lors de la migration de players.json :", error);
    process.exit(1);
  }
}

addCapturedInCurrentSeasonToPlayers(parseGuildId(process.argv.slice(2)));