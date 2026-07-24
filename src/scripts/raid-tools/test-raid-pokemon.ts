import fs from "fs";
import { getRaidPokemon } from "../../features/raid/getRaidPokemon";
import { POKEMON_DB } from "../../config/paths";
import zonesJson from "../../../data/zones_all.json";
import logger from "./logger";
import { rarityBoostedList, rarityList } from "../../config/rarity";

type ZoneEntry = {
  id: string;
  label: string;
};

type ZonesByGeneration = Record<string, ZoneEntry[]>;

type RaidErrorEntry = {
  iteration: number;
  generation: number;
  zone: string;
  message: string;
  stack?: string;
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function main(): Promise<void> {
  console.log('=== test-raid-pokemon démarré ===');
  const rarityConfigToTest = rarityBoostedList;
  const pokemonDb = JSON.parse(
    fs.readFileSync(POKEMON_DB, "utf-8"),
  ) as Parameters<typeof getRaidPokemon>[0];
  const availableRarityStats: Record<string, number> = {};

  const raidablePool = (pokemonDb as any[]).filter(
    (pokemon) =>
      typeof pokemon.generation === "number" &&
      Array.isArray(pokemon.zones) &&
      pokemon.zones.length > 0,
  );

  const poolByRarity = raidablePool.reduce<Record<string, number>>(
    (acc, pokemon) => {
      acc[pokemon.rarity] = (acc[pokemon.rarity] ?? 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    { poolByRarity },
    "Répartition réelle du pool raidable par rareté",
  );

  const totalRuns = 1000;
  const zonesByGeneration = zonesJson as ZonesByGeneration;

  const generationKeys = Object.keys(zonesByGeneration).filter(
    (key) =>
      Array.isArray(zonesByGeneration[key]) &&
      zonesByGeneration[key].length > 0,
  );

  if (generationKeys.length === 0) {
    throw new Error("Aucune génération disponible dans zones.json");
  }

  let successCount = 0;
  let errorCount = 0;

  const rarityStats: Record<string, number> = {};
  const pokemonStats: Record<string, number> = {};
  const zoneStats: Record<string, number> = {};
  const generationStats: Record<string, number> = {};
  const errors: RaidErrorEntry[] = [];

  console.log('=== avant la boucle ===');

  for (let i = 1; i <= totalRuns; i++) {
    
    const generationKey = pickRandom(generationKeys);
    const generation = Number(generationKey.replace("gen", ""));
    const zone = pickRandom(zonesByGeneration[generationKey]);

    const poolForDebug = (pokemonDb as any[]).filter((pokemon) => {
      return (
        pokemon.generation === generation &&
        Array.isArray(pokemon.zones) &&
        pokemon.zones.includes(zone.id)
      );
    });

    const availableRarities = [
      ...new Set(poolForDebug.map((pokemon) => pokemon.rarity)),
    ];
    for (const rarity of availableRarities) {
      availableRarityStats[rarity] = (availableRarityStats[rarity] ?? 0) + 1;
    }

    generationStats[generationKey] = (generationStats[generationKey] ?? 0) + 1;
    zoneStats[zone.id] = (zoneStats[zone.id] ?? 0) + 1;

    try {
      const result = getRaidPokemon(
        pokemonDb as any[],
        generation,
        zone.id,
        rarityConfigToTest,
      );

      successCount++;

      rarityStats[result.finalRarity] =
        (rarityStats[result.finalRarity] ?? 0) + 1;
      pokemonStats[result.pokemon.name] =
        (pokemonStats[result.pokemon.name] ?? 0) + 1;
    } catch (error) {
      errorCount++;

      const err = error instanceof Error ? error : new Error(String(error));

      errors.push({
        iteration: i,
        generation,
        zone: zone.id,
        message: err.message,
        stack: err.stack,
      });

      console.error(
        `❌ Erreur au tirage #${i} | generation=${generation} | zone=${zone.id} | message=${err.message}`,
      );
    }
  }

  logger.info("\n================ RÉSUMÉ RAID TEST ================");
  logger.info(
    {
      rarityConfigName: "rarityList",
      rarityWeights: rarityConfigToTest.map((entry) => ({
        rarity: entry.rarity,
        weight: entry.weight,
      })),
    },
    "Configuration de rareté utilisée pour le test raid",
  );
  logger.info(`Total de tirages : ${totalRuns}`);
  logger.info(`Succès           : ${successCount}`);
  logger.info(`Erreurs          : ${errorCount}`);

  logger.info("\n---- Répartition des générations testées ----");
  logger.info(generationStats);

  logger.info("\n---- Top zones testées ----");
  const sortedZoneStats = Object.entries(zoneStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  logger.info(
    sortedZoneStats.map(([zoneId, count]) => ({
      zone: zoneId,
      count,
    })),
  );

  logger.info("\n---- Répartition des raretés obtenues ----");
  logger.info(rarityStats);

  logger.info(
    { availableRarityStats },
    "Nombre de fois où chaque rareté était disponible",
  );
  logger.info({ rarityStats }, "Nombre de fois où chaque rareté a été tirée");

  logger.info("\n---- Top Pokémon tirés ----");
  const sortedPokemonStats = Object.entries(pokemonStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  logger.info(
    sortedPokemonStats.map(([name, count]) => ({
      pokemon: name,
      count,
    })),
  );

  if (errors.length > 0) {
    logger.info("\n---- Détail des erreurs ----");
    logger.info(
      errors.map((error) => ({
        iteration: error.iteration,
        generation: error.generation,
        zone: error.zone,
        message: error.message,
      })),
    );

    logger.info("\n---- Première stack trace ----");
    console.error(errors[0].stack ?? "Aucune stack disponible");

    process.exit(1);
  }

  logger.info("\n✅ Aucun crash détecté sur 1000 tirages aléatoires.");
}

main().catch((error) => {
  console.error("❌ Erreur fatale pendant le test des raids");
  console.error(error);
  process.exit(1);
});
