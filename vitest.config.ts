import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Chercher les tests dans le dossier tests/ à la racine
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    
    // Exclure les dossiers non nécessaires
    exclude: ['node_modules', 'dist', 'build'],
    
    // Configuration de la couverture de code
    coverage: {
      provider: 'v8', // ou 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/*.d.ts',
        'vitest.config.ts'
      ]
    },
    
    // Environnement de test (node pour un bot Discord)
    environment: 'node',
    
    // Afficher les tests réussis
    reporters: 'verbose',
    
    // Timeout par défaut (utile pour les tests asynchrones)
    testTimeout: 10000,
    
    // Fichier de setup global si besoin
    // setupFiles: ['./tests/setup.ts'],
  }
});