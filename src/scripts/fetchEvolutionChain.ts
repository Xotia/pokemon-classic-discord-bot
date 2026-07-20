const fetch = require("node-fetch");

export async function fetchEvolutionChain(url: string) {
  const evolutionChainRes = await fetch(url);
  if (!evolutionChainRes.ok)
    throw new Error(`Erreur evolution-chain ${url}: ${evolutionChainRes.status}`);
  const evolutionChain = await evolutionChainRes.json();
  return evolutionChain;
}
