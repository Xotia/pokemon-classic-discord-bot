// utils/debug-lines.ts
import * as fs from 'fs/promises';

(async () => {
  const content = await fs.readFile('filtered.txt', 'utf-8');
  const lines = content.split('\n').filter(l => l.trim()).slice(0, 10);
  
  console.log('📄 10 PREMIÈRES LIGNES EXACTES :');
  lines.forEach((line, i) => {
    console.log(`${i+1}. "${line}"`);
    console.log('   Regex test:', /^(.+?)\s+a\s+capturé\s+un\s+(.+?)(?:\s+!)?$/i.test(line) ? '✅ OK' : '❌ NO MATCH');
  });
})();
