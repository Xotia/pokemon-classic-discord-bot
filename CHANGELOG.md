# Changelog

Tous les changements notables du **Pokémon Classic Discord Bot** sont documentés ici.  
Format basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

# [3.4.2] - 2026-07-01

## Corrections
- La fin des inscriptions au raid (`registrationClosesAt`) était calculée avec une durée fixe de 8h, indépendante des variables `RAID_START_HOUR` / `RAID_END_HOUR`. Sur un serveur avec une fenêtre de raid différente de 8h (ex : 12h → 22h), les inscriptions se fermaient avant la résolution réelle du raid, provoquant une erreur `La période d'inscription au raid est terminée.` lors d'un `/raid` encore valide.
- La durée d'inscription est désormais calculée dynamiquement à partir de `RAID_END_HOUR - RAID_START_HOUR`, garantissant que la fin des inscriptions correspond à l'heure de fin de raid configurée.

## Modifications
- Numéro de version : 3.4.1 → 3.4.2.

---


# [3.4.1] - 2026-07-01

## Corrections
- Cooldown réduit à **10 minutes** (au lieu du cooldown complet) lorsqu'une capture ne trouve aucun Pokémon.
- Le message "Aucun Pokémon trouvé" est désormais tiré aléatoirement parmi une dizaine de phrases RP respectant le lore du Centre AURORA, au lieu d'un message fixe.

## Modifications
- Numéro de version : 3.4.0 → 3.4.1.

---


# [3.4.0] - 2026-07-01

## Ajouts

### ID et types affichés lors d'une capture
- L'embed de capture affiche désormais le **numéro de Pokédex** et le ou les **types** du Pokémon capturé, sous le message de capture.

## Modifications
- Numéro de version : 3.3.0 → 3.4.0.

---


# [3.3.0] - 2026-06-28

## Ajouts

### Filtrage par type dans l'autocomplete de `/raid`
- Lorsqu'un type d'attaque est sélectionné avant de choisir le Pokémon, l'autocomplete du paramètre **`pokemon_name`** ne propose désormais que les Pokémon possédant ce type (en plus du filtre saison en cours).
- Fonctionne dès la première lettre saisie dans le champ `pokemon_name`.

## Modifications
- Numéro de version : 3.2.1 → 3.3.0.

---


# [3.2.1] - 2026-06-27

## Suppressions
- Suppression de `data/rollRarityJson.json` — fichier inutilisé, les statistiques de rareté sont déjà sauvegardées dans `data/stats.json`.
- `rollRarityJson.json` ajouté au `.gitignore`.

---


# [3.2.0] - 2026-06-27

## Ajouts

### Génération dynamique de `pokemon-list.json`
- `pokemon-list.json` n'est plus versionné dans Git — il est désormais **généré automatiquement** avant chaque build via le script `scripts/generate-pokemon-list.js`.
- Par défaut, le script concatène `pokemon-gen1.json` et `pokemon-gen2.json`.
- Variable d'environnement `EXTRA_POKEMON_FILES` : permet d'ajouter des fichiers JSON supplémentaires à la liste (ex : `EXTRA_POKEMON_FILES=othermons.json`). Plusieurs fichiers séparés par des virgules sont supportés.
- `othermons.json` ajouté au `.gitignore` — fichier personnalisé uploadé manuellement par serveur (ex : faux Pokémon du 1er avril).

## Modifications
- Nouveau script npm `generate-pokemon-list` ajouté au pipeline `build`.
- `pokemon-list.json` et `othermons.json` ajoutés au `.gitignore`.
- Numéro de version : 3.1.0 → 3.2.0.

---

# [3.1.0] - 2026-06-27

## Ajouts

### Nouvelle commande `/leaderboard` (remplace `/stats`)
- **Top Joueurs** — classement par captures uniques et totales (shiny retiré de cette section)
- **Top Shiny** — classement des joueurs par nombre de shinys capturés
- **Top Level** — classement des joueurs par niveau et XP
- **Top Pokédex** — classement par complétion du Pokédex (uniques/total avec pourcentage)
- **Top Pokédex Saison** — classement par complétion du Pokédex sur la saison en cours
- **Top Raids** — inchangé
- **Top 3 Pokémons** — inchangé

### Scripts de maintenance RP
- `send-maintenance.ts` — message de maintenance longue (embed orange)
- `send-back-online.ts` — annonce de reprise après maintenance longue (embed vert)
- `send-quick-maintenance.ts` — message de micro-maintenance (embed jaune)
- `send-quick-back-online.ts` — annonce de reprise après micro-maintenance (embed vert)
- Nouvelle variable d'environnement `MAIN_CHANNEL_ID` pour configurer le salon principal.

### Horaires de raid configurables
- Les heures d'ouverture et de fermeture du raid sont désormais configurables via les variables d'environnement `RAID_START_HOUR` et `RAID_END_HOUR` (expressions cron).
- Valeurs par défaut : `00 12 * * *` (ouverture à 12h) et `00 20 * * *` (fermeture à 20h).

## Modifications
- Commande `/stats` renommée en `/leaderboard` (deploy-commands, index, help, README, FEATURES).
- Numéro de version : 3.0.2 → 3.1.0.

---

# [3.0.2] - 2026-06-25

## Ajouts

### Nouvelle commande `/raid-squad`
- Affiche les **informations du raid en cours** (Pokémon boss, zone, difficulté, type d'attaque) et la **composition de l'équipe de défense** avec les Pokémon inscrits.
- Commande enregistrée dans `deploy-commands.ts` et ajoutée dans `/help`.

### Mise à jour de `/help`
- Description de `/capture` et `/pokedex` actualisées.
- Ajout de `/raid-squad` dans la liste des commandes.

## Modifications
- Numéro de version : 3.0.1 → 3.0.2.

---

# [3.0.1] - 2026-06-23

## Ajouts

### Affichage de la zone de capture
- La **zone de capture** est désormais affichée dans l'embed d'annonce de capture (ex : `📍 Zone : Étang aigri`).
- Le nom de la zone est affiché en **français** (label) et non en ID anglais.

### Autocomplete amélioré pour `/raid`
- Le paramètre **`pokemon_name`** propose désormais en autocomplete uniquement les Pokémon que le joueur a **capturés durant la saison en cours** (`capturedInCurrentSeason`).
- Le paramètre **`type`** est passé en autocomplete dynamique : si un Pokémon est sélectionné, seuls ses types sont proposés ; sinon, la liste complète est affichée.

## Corrections

### Boucle infinie à la capture
- Correction d'une **boucle infinie** dans `getNewPokemon` lorsqu'une zone ne contenait qu'un seul Pokémon de la rareté tirée (et que ce Pokémon était le même que le dernier capturé). Le système essaie désormais 10 fois maximum avant d'accepter le doublon.

## Modifications
- Numéro de version : 3.0.0 → 3.0.1.

---

# [3.0.0] - 2026-06-22

## Ajouts

### Système de zones de capture
- **Zones de capture** : Chaque Pokémon est désormais assigné à une ou plusieurs zones géographiques.
- **Paramètre zone dans `/capture`** : Le joueur peut choisir une zone en plus de la génération, ou laisser le tirage aléatoire parmi les zones débloquées.
- **Autocomplete** sur le champ zone pour faciliter la sélection.
- **Système de déblocage progressif** : Les zones sont séparées entre `zones_unlocked.json` (accessibles) et `zones_to_unlock.json` (à débloquer via les raids).
- **Chargement dynamique des zones** : Les zones débloquées sont relues depuis le fichier JSON à chaque appel, plus besoin de redémarrer le bot après un déblocage.
- **Downgrade de rareté par zone** : Si aucun Pokémon n'existe à la rareté tirée pour la zone, le système descend automatiquement d'un cran de rareté.

### Système XP & Niveaux
- **XP à la capture** : XP gagnée basée sur les HP du Pokémon capturé (×10 si shiny).
- **Formule de niveau** style Pokémon (`4 × level³ / 5`), niveau max 100.
- **Notification de level-up** dans l'embed de capture.
- **Champs `xp` et `level`** ajoutés au profil joueur.

### Système de saisons
- **Flag `capturedInCurrentSeason`** sur chaque entrée de capture dans le Pokédex.
- **Marqueur visuel 🎯** dans le Pokédex pour les Pokémon capturés en saison.
- **Compteur de saison** dans le Pokédex : affiche le nombre de Pokémon différents capturés durant la saison en cours.
- Condition requise pour participer aux raids.

### Système de Raid
- **Nouvelle commande `/raid <pokemon> [type]`** : Inscris un de tes Pokémon pour défendre le centre de recherche contre un Pokémon enragé.
- **Raids quotidiens automatiques** : Un raid s'ouvre automatiquement chaque jour, avec une période d'inscription de 8 heures.
- **Annonce Discord automatique** : Un message est envoyé dans le salon avec le nom du Pokémon, sa zone, sa difficulté, son type d'attaque et l'heure de fermeture des inscriptions.
- **Résolution automatique** : Le combat est résolu automatiquement à l'heure configurée en comparant les stats de l'équipe de défense à celles du boss.
- **Bonus/malus de type** : Les multiplicateurs d'efficacité de type sont appliqués sur l'attaque (efficacité du défenseur contre le boss) et la défense (faiblesse du défenseur face au boss).
- **Récompenses de victoire** :
  - XP = HP de base du Pokémon du raid × 10, attribuée à chaque participant.
  - Compteur `raidWins` incrémenté pour chaque participant.
  - Le Pokémon du raid est capturé automatiquement par un participant tiré au sort (avec mise à jour des stats).
- **Déblocage de zone** : Si la zone du raid n'est pas encore débloquée, elle est ajoutée à `zones_unlocked.json` et retirée de `zones_to_unlock.json` après une victoire.
- **Message de résultat** : Message de victoire (vert) ou défaite (rouge) avec récompenses ou stats manquantes en texte naturel.
- **Mode debug** : Ouverture toutes les 2 min, résolution toutes les 3 min (configurable via `RAID_SCHEDULER_MODE`).

### Refactoring commande `/cheat`
- `/cheat` est désormais fonctionnel avec les paramètres `player`, `pokemon` et `shiny`.
- Réservé à l'admin (`ADMIN_ID`).
- Gère la recherche du joueur par nom, la recherche du Pokémon par nom, la mise à jour du Pokédex et des stats.

### Enrichissement des données Pokémon
- **Stats complètes** : HP, attaque, défense, attaque spé., défense spé., vitesse ajoutées à chaque Pokémon.
- **Types** : Chaque Pokémon a désormais ses types (eau, feu, plante, etc.).
- **Effectiveness** : Tables d'efficacité attaque/défense par type pour chaque Pokémon.
- **Génération** : Champ `generation` ajouté.
- **Données Gen 1 enrichies** : `pokemon-gen1.json` entièrement reconstruit avec stats, types, zones et effectiveness.

### Nouveaux fichiers et utilitaires
- **Types** : `Params.ts`, `Embed.ts`, `zones.ts`, types raid (`RaidBoss`, `RaidDefender`, `RaidResult`, `RaidReward`, `RaidState`, `RaidStats`, `RaidStatus`).
- **Embeds** : `buildCapturedPokemonEmbed.ts`, `buildCaptureEmbed.ts`, `buildPokedexPageEmbed.ts`, `isValidHttpUrl.ts` (extrait de `buildEmbed.ts`).
- **Joueur** : `getCapturePlayer.ts`, `getPlayerByName.ts`, `getPlayerIdByName.ts`, `markPokemonAsCapturedInCurrentSeason.ts`, `savePlayerDataById.ts`, `registerCapturedPokemon.ts`.
- **Pokémon** : `getPokemonByName.ts`, `getPokemonById.ts`, `getCapturedPokemonHp.ts`, `handleSuccessfulCapture.ts`, `handleNoPokemonFound.ts`, `tryCatchPokemon.ts`, `getRandomPokemonType.ts`.
- **Rareté** : `downgradeRarity.ts`, `getPokemonByRarity.ts`.
- **Zones** : `resolveCaptureLocation.ts`, `getAllZones.ts`, `getGenerationByZone.ts`, `getZonesByGeneration.ts`, `findZoneById.ts`, `pickRandomZone.ts`, `isZoneInGeneration.ts`, `getMaxGeneration.ts`, `logCaptureLocationSelection.ts`.
- **XP** : `xp.ts` (calcul XP, niveaux, level-up).
- **Config** : `url.ts`, `raid.config.ts`, `typeLabels.ts` (traduction française des types).
- **Stats joueur** : `addPokemonInPlayerTotalCaptures.ts`, `addRarityInPlayerStats.ts`, `addShinyCaptureForPlayer.ts`, `addPokemonInpokemonPerPlayerList.ts`.
- **Utilitaires data** : `buildPokemonJson.ts`, `createGenJson.ts`, `fetchPokemon.ts`, `fetchSpecies.ts`, `getPokemonStats.ts`, `getPokemonTypes.ts`, `injectZones.ts`, `add-captured-in-current-season.ts`, `add-generation-to-pokemon.ts`, `addXpAndLevelToPlayers.ts`.
- **Tests Vitest** : 28 tests couvrant le système de raid, XP et pity.

### Autres
- **Traduction française des types** : Tous les types d'attaque sont affichés en français (annonce raid, inscription, résultat).
- **Fichier `FEATURES.md`** : Documentation complète de toutes les fonctionnalités du bot.
- **Checklist de tests manuels** : `data/spec/RAID_TESTING_CHECKLIST.md`.
- **Classement raids dans `/stats`** : Affiche le top 5 des joueurs par nombre de raids remportés.
- **Commande `/raid`** ajoutée dans `/help`.
- **Constante `RARITY_ORDER`** ajoutée dans `rarity.ts`.

## Modifications

### Refactoring `/capture`
- Commande entièrement réécrite : découpage en fonctions dédiées (`resolveCaptureLocation`, `getCapturePlayer`, `tryCatchPokemon`, `handleSuccessfulCapture`, `handleNoPokemonFound`).
- Gestion des zones et de la génération avec inférence automatique.
- `/capture` restreint aux zones débloquées uniquement.

### Refactoring Pokédex
- **Pokédex paginé** avec boutons Discord (premier, précédent, suivant, dernier).
- Affichage enrichi : numéro, nom, nombre de captures, shinys, marqueur saison, niveau joueur, progression.
- Pokédex construit par pages avec `buildPokedexPageEmbed.ts`.

### Refactoring embeds
- `buildEmbed` accepte désormais un paramètre `fields` optionnel pour les champs additionnels.
- `editFooter` refactoré pour accepter un objet `EditFooterParams` (au lieu de `interaction`) avec XP gagnée et level-up.
- `buildDescriptionForPokemonCaptureEmbed` refactoré pour accepter un objet `BuildDescriptionParams` avec `trainerName` (au lieu de `interaction`).
- `isValidHttpUrl` extrait dans son propre fichier.

### Refactoring profil joueur
- `Player.captureList` passe de `array` à `Record<string, PokemonCaptureStats>` avec `total`, `shiny` et `capturedInCurrentSeason`.
- Initialisation du profil avec `xp: 0` et `level: 1`.

### Refactoring stats
- `addAllStats` refactoré : ne prend plus `interaction` en paramètre, prend directement le `Player`.
- Ajout de `markPokemonAsCapturedInCurrentSeason` dans le flux de stats.

### Refactoring gacha
- `getNewGatchaPokemon` accepte maintenant un paramètre `zone` et gère le downgrade de rareté par zone.
- `getRandomPokemonFromRarity` filtre par zone si fournie.

### Autres modifications
- **`/cheat` corrigé** : L'indication "possède déjà ce Pokémon" est maintenant vérifiée sur le joueur cible et non sur l'admin.
- **Correction du calcul d'efficacité de type dans les raids** : Les multiplicateurs étaient inversés.
- **`/pokedex`** : Ajout de `createProfileIfNeeded` à l'entrée de la commande.
- **`tsconfig.json`** : Migration vers `NodeNext` module resolution, ajout de `strict: true`.
- **`package.json`** : Ajout de `node-cron`, `csv-parse`, `pino`, `pino-pretty`. Ajout de `vitest` en devDependencies.
- **Numéro de version** : 2.0.4 → 3.0.0.

## Suppressions
- **Ancien format `captureList` en tableau** : Remplacé par un `Record<string, PokemonCaptureStats>`.
- **Dépendance directe à `interaction`** dans `editFooter` et `buildDescriptionForPokemonCaptureEmbed` : Remplacée par des objets de paramètres typés.
- **`isValidHttpUrl` inline** dans `buildEmbed.ts` : Extrait dans son propre fichier.
- **Import inutilisé `ActionRow`** supprimé de `buildDisabledPokedexButtons.ts`.
- **Duplication `readPlayers`/`readPokemonList`** : Nettoyée dans `RegisterRaidDefender.ts`.

---

# [2.0.4] - 2026-04-09

# Ajouts
- Vous avez maintenant la possibilité de préciser la génération du pokemon que vous souhaitez capturer avec /capture.
- Vous devez pour cela préciser /capture 1 pour la génération 1 ou /capture 2 pour la génération 2 (il y a une aide normalement).
- C'est facultatif, si vous ne le précisez pas, la capture se fera dans une génération aléatoire.

## Modifications
- Modification du numéro de version

# [2.0.3] - 2026-04-09

# Ajouts
- Nouvelle commande **/get-rarity** pour connaitre  les chances actuelles d’apparition par rareté.

## Modifications
- Ajout de /get-rarity dans /help

## Corrections
- Patchnote

# [2.0.2] - 2026-04-09

## Corrections
- Modification du numéro de version dans package.json
- Delete import inutiles dans captureCommand.ts
- Delete pokemonGen2 paths

# [2.0.1] - 2026-04-09

## Corrections
- Update README.md, .gitignore et ajout de src/types

# [2.0.0] - 2026-04-09

## Ajouts
- ✨ **Ajout de la seconde génération** ✨
- Il n'est (normalement?) plus possible que le pokémon qui vient d'être capturé soit identique au précédent.
- Ajout de la "**Pity**" : En gros si vous avez pas de chance, le jeu a pitié de vous et vous augmente vos chances pour le prochain /capture. Si lors des **10 dernières captures** vous n'avez pas eu un pokemon de rareté "**Très Rare**" ou +, la prochaine capture sera boostée.
- Vous pouvez consulter votre compteur actuel de pitié avec **la nouvelle commande /pity**

## Modifications
- **random-capture** devient "**capture**", tout simplement.
- La commande "**/capture**" repose dorénavent sur un système similaire à un **gatcha** : Chaque pokémon a une **rareté, plus il est rare, plus il sera difficile de le capturer !** La liste des rareté ainsi que les taux seront prochainement consultable.
- Toutes mentions "random" dans le code a été retiré.

## Corrections mineurs
- Clean code.

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
├── addPokemonInPlayerTotalCaptures
├── addPokemonInTotalCaptures
├── addPokemonInTotalPokemonCaptures
├── addShinyCaptureForPlayer
└── addShinyInTotalShinyCaptures

pokedex/addCaptureToPlayer
pokedex/isPokemonInPokedex

commands/getStatsCommand

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
