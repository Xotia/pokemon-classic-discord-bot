import * as fs from 'fs/promises';

interface Stats {
  totalCaptures: number;
  playerTotals: Record<string, number>;
  pokemonPerPlayer: Record<string, Record<string, number>>;
  shinyCaptures: Record<string, number>;
  topPlayers: Array<{ player: string; count: number }>;
  topPokemons: Array<{ pokemon: string; count: number }>;
  pokemonsTotals: Record<string, number>;
  totalShinyCaptures: number;
}

async function computeStats(inputFile: string = 'data/filtered.txt'): Promise<Stats> {

  const content = await fs.readFile(inputFile, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  const playerTotals: Record<string, number> = {};
  const pokemonPerPlayer: Record<string, Record<string, number>> = {};
  const shinyCaptures: Record<string, number> = {};
  const pokemonsTotals: Record<string, number> = {};
  let totalShinyCaptures = 0;

  // Regex hybride (comme avant)
  const playerRegex = /^"?(.+?)(?=\s+a\s+capturé)/i;
  const pokemonRegex = /a\s+capturé\s+(?:un|une|le|la)\s+([^.!?]+)/i;

  let matched = 0;
  for (const line of lines) {
    const playerMatch = line.match(playerRegex);
    const pokemonMatch = line.match(pokemonRegex);
    
    if (!playerMatch || !pokemonMatch) continue;
    
    const playerRaw = playerMatch[1].trim().replace(/^"|"$/g, '').trim();
    const player = playerRaw.replace(/^[🎉⭐✨\s]+/, '').trim();
    const pokemon = pokemonMatch[1].trim();

    // Stats joueurs (comme avant)
    playerTotals[player] = (playerTotals[player] || 0) + 1;
    if (!pokemonPerPlayer[player]) pokemonPerPlayer[player] = {};
    pokemonPerPlayer[player][pokemon] = (pokemonPerPlayer[player][pokemon] || 0) + 1;
    
    if (line.toLowerCase().includes('shiny')) {
      totalShinyCaptures++;
      shinyCaptures[player] = (shinyCaptures[player] || 0) + 1;
    }

    // ✅ NOUVEAU : Compteur TOUS les Pokémon
    pokemonsTotals[pokemon] = (pokemonsTotals[pokemon] || 0) + 1;
    
    matched++;
  }

  // Top (inchangés)
  const topPlayers = Object.entries(playerTotals)
    .sort(([,a], [,b]) => b - a).slice(0, 10)
    .map(([player, count]) => ({ player, count }));

  const topPokemons = Object.entries(pokemonsTotals)  // ✅ Utilise pokemonsTotals
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([pokemon, count]) => ({ pokemon, count }));

  return {
    totalCaptures: matched,
    playerTotals,
    pokemonPerPlayer,
    shinyCaptures,
    topPlayers,
    topPokemons,
    pokemonsTotals,
    totalShinyCaptures
  };
}

// Console (bonus affiche top 20 pokemons)
(async () => {
  try {
    const stats = await computeStats();
    
    console.log(`🎉 STATS POKÉMON BOT`);
    console.log(`📊 ${stats.totalCaptures} captures | ${Object.keys(stats.pokemonsTotals).length} Pokémon uniques`);
    
    console.log(`\n🥇 TOP JOUEURS (inchangé)`);
    // ... (code console joueurs)

    console.log(`\n🏆 TOP 20 POKÉMONS :`);
    Object.entries(stats.pokemonsTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .forEach(([pokemon, count], i) => 
        console.log(`  ${i+1}. ${pokemon.padEnd(15)} → ${count}`)
      );

    await fs.writeFile('data/stats.json', JSON.stringify(stats, null, 2));
    console.log(`\n💾 data/stats.json (pokemonsTotals inclus) !`);

  } catch (error) {
    console.error('❌', (error as Error).message);
  }
})();
