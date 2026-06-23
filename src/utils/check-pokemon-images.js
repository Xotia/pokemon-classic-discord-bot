const fs = require('fs');
const https = require('https');

const pokemons = JSON.parse(fs.readFileSync('../../data/pokemon-list.json', 'utf8'));

// Stats
let ok = 0, ko = 0, total = pokemons.length * 2;

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function checkAll() {
  console.log(`🔍 Vérification ${total} URLs...\n`);
  
  for (const pokemon of pokemons) {
    console.log(`🐾 ${pokemon.name}`);
    
    // Vérif image normale
    const imgOk = await checkUrl(pokemon.image);
    console.log(`  📷 ${pokemon.image} → ${imgOk ? '✅' : '❌'}`);
    
    // Vérif shiny
    const shinyOk = await checkUrl(pokemon.shinyImage);
    console.log(`  ✨ ${pokemon.shinyImage} → ${shinyOk ? '✅' : '❌'}`);
    
    if (imgOk) ok++; else ko++;
    if (shinyOk) ok++; else ko++;
  }
  
  console.log(`\n📊 RÉSUMÉ: ${ok}/${total} OK (${(ok/total*100).toFixed(1)}%)`);
}

checkAll();
