# Pokemon Classic Discord Bot

## 📋 Commandes NPM

### Ordre d'exécution recommandé

#### 1. **Développement en temps réel** (Pour tester pendant le développement)
```bash
npm run dev
```
- Exécute le bot directement avec `ts-node` sans compiler
- Idéal pour les tests rapides et le développement itératif
- Rechargement automatique possible avec nodemon (si configuré)
- **Prérequis**: Variables d'environnement dans `.env`

---

#### 2. **Compilation TypeScript** (Avant la production)
```bash
npm run build
```
- Compile tous les fichiers TypeScript (`.ts`) en JavaScript (`.js`)
- Génère les fichiers compilés dans le dossier `dist/`
- **À exécuter avant**: `npm run start` ou avant un déploiement
- **Nécessaire** si vous avez modifié du code TypeScript

---

#### 3. **Déploiement des commandes slash** (Une fois avant la première utilisation)
```bash
npm run deploy
```
- Enregistre toutes les commandes slash Discord auprès de Discord API
- À exécuter une fois ou quand vous ajoutez/modifiez des commandes
- **Important**: Faire ceci **avant** de lancer le bot en production
- **Prérequis**: Token Discord et ID d'application dans `.env`

---

#### 4. **Démarrage en production** (Après build et deploy)
```bash
npm run start
```
- Lance le bot compilé depuis `dist/index.js`
- Mode optimal pour la production
- **Prérequis**: 
  - Code compilé (exécuter `npm run build` avant)
  - Commandes déployées (exécuter `npm run deploy` une fois)
  - Variables d'environnement dans `.env`

---

## 🚀 Workflow complet

### Pour la première mise en place:
```bash
npm install
npm run build
npm run deploy
npm run start
```

### Pour le développement:
```bash
npm run dev
```

### Pour mettre à jour et relancer:
```bash
npm run build
npm run deploy
npm run start
```

---

## 📝 Variables d'environnement requises (.env)

```
DISCORD_TOKEN=votre_token_ici
DISCORD_CLIENT_ID=votre_client_id_ici
```

Créez un fichier `.env` à la racine du projet avec vos identifiants Discord.
