const fs = require("fs");

import { buildPokemonJson } from "./buildPokemonJson";
import { makeSpriteUrl } from "./makeSpriteUrl";
import { fetchPokemon } from "../fetch/fetchPokemon";
import { fetchSpecies } from "../fetch/fetchSpecies";

/**
 * Génère les fichiers partiels pokemon-gen4..8.json : uniquement les Pokémon
 * de l'évènement Halloween (ids nationaux officiels, zone "haunted-manor").
 * La rareté est fixée à la main (annexe de PROGRAM-HALLOWEEN.md) : computeRarity
 * ne connaît que les rencontres gen 3.
 * Les fichiers sont réécrits en entier : à relancer seulement tant qu'ils ne
 * contiennent que ces Pokémon (sinon, des retouches manuelles seraient perdues).
 */
const EVENT_ZONE = "haunted-manor";

const EVENT_POKEMON: { id: number; generation: number; rarity: string }[] = [
  { id: 607, generation: 5, rarity: "common" }, // Funécire
  { id: 710, generation: 6, rarity: "uncommon" }, // Pitrouille
  { id: 608, generation: 5, rarity: "rare" }, // Mélancolux
  { id: 854, generation: 8, rarity: "rare" }, // Théffroi
  { id: 429, generation: 4, rarity: "very_rare" }, // Magirêve
  { id: 430, generation: 4, rarity: "very_rare" }, // Corboss
  { id: 442, generation: 4, rarity: "epic" }, // Spiritomb
  { id: 477, generation: 4, rarity: "epic" }, // Noctunoir
  { id: 478, generation: 4, rarity: "epic" }, // Momartik
  { id: 609, generation: 5, rarity: "epic" }, // Lugulabre
  { id: 855, generation: 8, rarity: "epic" }, // Polthegeist
  { id: 479, generation: 4, rarity: "ultra_rare" }, // Motisma (Rotom de base)
  { id: 711, generation: 6, rarity: "ultra_rare" }, // Banshitrouye
  { id: 778, generation: 7, rarity: "ultra_rare" }, // Mimiqui
];

// Noms PokeAPI de formes par défaut absents de Showdown : nom de sprite à utiliser.
const SPRITE_NAME: Record<number, string> = {
  710: "pumpkaboo",
  711: "gourgeist",
  778: "mimikyu",
};

async function main() {
  const byGen = new Map<number, any[]>();

  for (const { id, generation, rarity } of EVENT_POKEMON) {
    console.log(`Fetching Pokémon ${id}...`);
    const pokemon = await fetchPokemon(id);
    const species = await fetchSpecies(id);
    const p = buildPokemonJson(pokemon, species, id, rarity);
    const spriteName = SPRITE_NAME[id];
    const sprites = spriteName ? makeSpriteUrl(spriteName) : {};
    const entry = {
      ...p,
      ...sprites,
      ...(spriteName ? { originalName: spriteName } : {}),
      generation,
      zones: [EVENT_ZONE],
    };
    byGen.set(generation, [...(byGen.get(generation) ?? []), entry]);
    await new Promise((r) => setTimeout(r, 200));
  }

  for (const [generation, list] of byGen) {
    list.sort((a, b) => a.id - b.id);
    const file = `data/pokemon-gen${generation}.json`;
    fs.writeFileSync(file, JSON.stringify(list, null, 2), "utf8");
    console.log(`Fichier ${file} généré (${list.length} Pokémon).`);
  }
}

main().catch(console.error);
