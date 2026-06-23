const fs = require("fs");

const pokemonGen1List = JSON.parse(fs.readFileSync("../../data/pokemon-gen1.json"));

export function getRarity(id: number) {
  return pokemonGen1List[id - 1].rarity;
}
