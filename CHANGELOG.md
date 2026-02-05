# Changelog

Tous les changements notables du **Pokémon Classic Discord Bot** sont documentés ici.  
Format basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

# [1.3.2] - 2026-02-05

## Corrections mineurs
- Correction du nombre de pokémon unique capturé par chaque joueur.
- Restructuration de la commande /random-capture afin d'optimiser le temps de réponse (on doit être en dessous de 3 sec pour éviter le timeout de Discord)

# [1.3.1] - 2026-01-25

## Corrections mineurs
- Ajout de la description de /random-stats dans la commande /help
- Correction du fonctionnement du cooldown (quand on relance le serveur le cooldown était reset, normalement c'est corrigé).

# [1.3.0] - 2026-01-20

## ✨ **Nouvelles fonctionnalités pour les joueurs**

- **Pokédex enrichi** 
  - Quantité de captures par Pokémon (`15x Bulbizarre`)
  - Indicateur shiny (`✨2` si capturé)
  - Compteur global : `42/151 Pokémon` + \"X restants à capturer\"

- **Commande `/stats`** 
  - Stats serveur
  - Classement TOP joueurs
  - **TOP 3 Pokémons** les plus capturés (🥇🥈🥉)

- **??0** **αʖ0цŧ�**

## 🎮 **Améliorations gameplay**

- **Nom bot corrigé** dans les messages
- **Tri ID** Pokédex (1, 4, 7... logique)

## 🔧 **Modifications techniques**

### Stats & Données

- 💥 BREAKING CHANGE : Format players.json modifié
- randomCaptures: { \"1\": { total: 15, shiny: 2 } }

### Nouvelles méthodes

utils/getPlayerAvatar.ts
utils/loadPokemonStats.ts
utils/logger.ts
utils/playerStats.ts

stats/random
├── addPokemonInPlayerRandomTotalCaptures
├── addPokemonInRandomTotalCaptures
├── addPokemonInRandomTotalPokemonCaptures
├── addRandomShinyCaptureForPlayer
└── addShinyInTotalRandomShinyCaptures

pokedex/addRandomCaptureToPlayer
pokedex/isPokemonInRandomPokedex

commands/randomStatsCommand

### Corrections

✅ [object Promise] → await getPokemonName()
✅ Warning \"stats vide\" → parse random.totalCaptures
✅ TypeScript strict (async/await partout)

### Docs & Logs

📝 README.md corrigé
📊 Logs détaillés Pokédex/stats

## 🚀 **Commandes disponibles**

/stats → Stats serveur + TOP 3

## [1.2.1] - 2026-01-13

### Changements pour les joueurs ✨
- **✅ Pokédex préservé** : Les données ne sont plus écrasées à chaque redémarrage du serveur
- **✅ URLs GIF corrigées** : M.Mime, Nidoran Mâle et Nidoran Femelle s'affichent correctement
- **🔧 Clean code** : Code plus propre et maintenable

### Changements techniques ⚙️
- **Fix majeur data persistence** : `data/players.json` plus écrasé par `npm run build`
- **Refactor modularité** : Méthodes séparées dans `src/methods/`
- **Nouveaux fichiers** :
  - `paths.ts` : Centralisation des chemins
  - `createProfileIfNeeded()` : Gestion nouveaux joueurs
  - `verifyIfPlayerExist()` : Vérification existence profil
- **Types globaux** : `Player` et `Pokemon` réutilisables partout
- **Utils refactoring** : `loadPlayer()` et `loadData()`
- **Git best practices** : `.gitignore` → `dist/` et `data/` exclus
- **Tests Vitest** : Tentative d'implémentation (abandonnée)
- **Changelog** : Ce fichier !

## [1.2.0] - 2026-01-13

### Ajouté 🎮
- **Renommage commandes** : `/capture` → `/random-capture`, `/pokedex` → `/random-pokedex`
- **Rareté visuelle** : Couleur embed selon rareté Pokémon + `(Rare)` dans titre
- **Indicateur première capture** : "Premier Bulbizarre capturé !"
- **Pagination Pokédex** : Navigation boutons (⏮️◀️▶️⏭️)
- **Commande `/help`** : Liste complète des commandes
- **Commande `/get-shiny-rate`** : Affichage taux shiny actuel
- **Taux shiny nerfé** : 1/256 (était 1/512)

### Amélioré 💎
- **Rareté Pokémon** : Système objectif (à valider par la communauté 😄)

### Refactor 🔄
- Clean code généralisé

## [1.1.0] - 2026-01-12

### Corrigé 🐛
- **Process Git** : `.gitignore` → `dist/` et `data/` exclus du repo
- **Clean repo** : Suppression `dist/` et `data/` du versionning

## [1.0.0] - 2026-01-01

### Ajouté 🚀
- **Création bot Discord** : Pokémon Classic premier génération
- **Commande `/capture`** : Tirage aléatoire 151 Pokémon → Stockage Pokédex
- **Commande `/pokedex`** : Affichage Pokédex joueur

---

**💡 Note** : Rareté Pokémon à valider par la communauté. Feedbacks bienvenus !  
**📊 Prochaine version** : Mode Shiny + Leaderboard ?
