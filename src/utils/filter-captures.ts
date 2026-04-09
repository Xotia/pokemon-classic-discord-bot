// utils/filter-captures.ts
import * as fs from 'fs/promises';

interface Args {
  inputFile: string;
}

async function filterCaptures(inputFile: string, outputFile: string = 'filtered.txt'): Promise<void> {
  try {
    const content = await fs.readFile(inputFile, 'utf-8');
    const lines = content.split('\n').filter(line => 
      line.toLowerCase().includes('a capturé un')
    );

    const filteredContent = lines.join('\n');
    await fs.writeFile(outputFile, filteredContent, 'utf-8');

    console.log(`✅ Fichier filtré : ${outputFile}`);
    console.log(`📊 ${lines.length} lignes "a capturé un" trouvées sur ${content.split('\n').length} totales`);
    
    console.log('\n📝 Aperçu (5 premières) :');
    lines.slice(0, 5).forEach((line, i) => console.log(`  ${i + 1}. ${line}`));

  } catch (error) {
    console.error('❌ Erreur :', (error as Error).message);
  }
}

// Fix top-level await : wrapper IIFE
(async () => {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.log('Usage: npx tsx utils/filter-captures.ts data/history.txt');
    process.exit(1);
  }

  await filterCaptures(inputFile);
})();
