# Refactor multi-guild — données indépendantes par serveur Discord

Document de suivi pour l'implémentation. Coche les cases au fur et à mesure.
Généré à partir d'une exploration complète du code (3 agents) + une phase de
conception dédiée. Toute décision d'architecture ci-dessous est déjà tranchée
— ce doc sert à exécuter, pas à re-décider.

## Contexte

Le bot tourne aujourd'hui en **deux process séparés** (deux dossiers sur le
VPS, deux `screen`), mais avec le **même `DISCORD_TOKEN`**. Incident survenu :
le gateway Discord envoie chaque interaction à *toutes* les connexions
ouvertes pour ce token, donc les deux process recevaient les mêmes
interactions et se battaient pour répondre en premier — le perdant plantait
avec `DiscordAPIError[10062] Unknown interaction` (exception non catchée =
crash du process).

Problème de fond, indépendant de l'incident : **rien dans le code n'est
scopé par serveur Discord**. `data/players.json`, `stats.json`,
`zones_unlocked.json`, `raid.json` sont des fichiers globaux. Un joueur
présent sur les deux serveurs a le même pokédex, le même classement, les
mêmes zones débloquées, participe au même raid — alors qu'on veut deux
mondes de jeu **complètement indépendants**.

## Objectif

Un seul bot Discord (une seule application, un seul `DISCORD_TOKEN`), un
seul process Node qui tourne en continu, capable de servir un nombre
quelconque de serveurs Discord, chacun avec :
- son propre pokédex / profils joueurs
- ses propres stats et classement
- ses propres zones débloquées
- son propre cycle de raid (annonce, inscriptions, résolution)

C'est le modèle standard des bots Discord multi-serveurs (Pokétwo, MEE6,
etc.) : un process, données scopées par `guildId` en interne.

---

## Décisions d'architecture (tranchées, ne pas rouvrir)

### 1. Layout des données : un dossier par serveur

```
data/
  guilds/
    <guildId-1>/
      players.json
      stats.json
      zones_unlocked.json
      zones_to_unlock.json
      raid.json
    <guildId-2>/
      players.json
      stats.json
      zones_unlocked.json
      zones_to_unlock.json
      raid.json
  guilds.json                        <- registre des serveurs (nouveau, voir §2)
  pokemon-list.json                  <- reste global (catalogue statique)
  pokemon-gen1.json                  <- reste global
  pokemon-gen2.json                  <- reste global
  all_types.json                     <- reste global
  othermons.json                     <- reste global
  rollRarityJson.json                <- reste global
  zones_unlocked.default.json        <- template de seed pour un nouveau serveur
  zones_to_unlock.default.json       <- template de seed pour un nouveau serveur
```

**Pourquoi pas un seul fichier `players.json` avec `{ [guildId]: {...} }` ?**
Parce que ~39 fonctions lisent/écrivent ces fichiers directement, et cette
approche obligerait à modifier la logique de parsing *dans chacune d'elles*
(ajouter un niveau d'indexation + gérer le cas "clé de guild absente").
En gardant la forme JSON strictement identique à aujourd'hui et en changeant
uniquement **quel fichier** on ouvre, chaque fonction ne change que d'une
ligne : ajouter un paramètre `guildId`, résoudre le chemin avec. Zéro
changement de logique métier → beaucoup moins de risque de régression.

Bonus opérationnel : verrouillage/écriture indépendants par serveur (pas de
risque qu'une écriture concurrente sur le serveur A écrase une clé du
serveur B dans un fichier partagé), backup/suppression triviale par serveur.

### 2. Registre des serveurs : `data/guilds.json`, maintenu à la main

```json
{
  "guilds": [
    { "guildId": "111111111111111111", "name": "Serveur A", "raidAnnounceChannelId": "222222222222222222" },
    { "guildId": "333333333333333333", "name": "Serveur B", "raidAnnounceChannelId": "444444444444444444" }
  ]
}
```

Pas d'auto-population via `Events.GuildCreate` — tu gères 2-3 serveurs à la
main, un registre édité manuellement colle à ton mode opératoire actuel et
évite d'ajouter un code path avec ses propres cas limites (quel salon
d'annonce donner à un serveur qui vient d'être rejoint et n'est pas encore
configuré ?). À reconsidérer seulement si le bot devient public un jour.

Ce registre remplace les env vars `GUILD_ID` et `RAID_ANNOUNCE_CHANNEL_ID`
(qui n'ont plus de sens en valeur unique). Restent des env vars globales
(identité du bot, pas du serveur) : `DISCORD_TOKEN`, `APPLICATION_ID`,
`PUBLIC_KEY`, `ADMIN_ID`, et les réglages de gameplay globaux
(`SHINY_RATE`, `COOLDOWN`, `PITY_THRESHOLD`, `POKEMON_PER_PAGE`,
`GENERATION_NUMBER`, `RAID_SCHEDULER_MODE`, `RAID_START_HOUR`,
`RAID_END_HOUR`, `RAID_NEXT_ZONE_CHANCE` — ces horaires/réglages de raid
restent **partagés entre tous les serveurs**, seule la *cible* — quel
`raid.json`, quel salon — devient par serveur. Pas de sur-ingénierie : tu
n'as pas demandé des horaires de raid différents par serveur).

### 3. Threading de `guildId` : paramètre simple, pas de magie

`interaction.guildId` est disponible sur l'objet `interaction` brut que
reçoivent déjà les 10 commandes. On le lit une fois en haut de chaque
commande et on le passe en paramètre explicite à travers la chaîne d'appel
— pas de context object, pas d'`AsyncLocalStorage`, pas de DI container.
Exactement comme `userId` circule déjà aujourd'hui.

---

## Inventaire complet (référence — ne pas re-explorer)

### Fichiers touchant `players.json` (13 fichiers)

| Fichier | Fonction | Sync/Async |
|---|---|---|
| `src/config/paths.ts` | constante `PLAYERS_DB` | - |
| `src/methods/player/createProfileIfNeeded.ts` | `createProfileIfNeeded(interaction)` | sync |
| `src/methods/player/savePlayerData.ts` | `savePlayerData(interaction, playerData)` | async |
| `src/methods/player/savePlayerDataById.ts` | `savePlayerDataById(playerId, playerData)` | async |
| `src/methods/player/getPlayerIdByName.ts` | `getPlayerIdByName(name)` | sync |
| `src/utils/loadPlayer.ts` | `getPlayer(userId)` — **cache en mémoire à corriger, voir §Bugs** | sync |
| `src/utils/loadData.ts` | `loadPlayers()` | sync |
| `src/utils/jsonPlayers.ts` | `readPlayers()`, `writePlayers()`, `updatePlayer()` | async |
| `src/features/raid/prepareRaidDefenderFromPlayerPokemon.ts` | `readPlayers(playersFilePath)` | async |
| `src/scripts/migrate-players.ts` | script one-off | sync |
| `src/scripts/add-captured-in-current-season.ts` | script one-off | sync |

### Fichiers touchant `stats.json` (15 fichiers)

| Fichier | Fonction |
|---|---|
| `src/config/paths.ts` | constante `STATS_DB` |
| `src/methods/stats/addRarityInStats.ts` | `addRarityInStats(rarity)` |
| `src/utils/loadPokemonStats.ts` | `loadPokemonStats()` |
| `src/methods/stats/addPokemonInTotalPokemonCaptures.ts` | `addPokemonInTotalPokemonCaptures(pokemonName)` |
| `src/methods/stats/addShinyInTotalShinyCaptures.ts` | `addShinyInTotalShinyCaptures()` |
| `src/methods/stats/addPokemonInTotalCaptures.ts` | `addPokemonInTotalCaptures()` |
| `src/methods/stats/addCaptureToLastCapture.ts` | `addCaptureToLastCapture(playerName, pokemonId)` |
| `src/methods/stats/player/addPokemonInPlayerTotalCaptures.ts` | `addPokemonInPlayerTotalCaptures(playerName)` |
| `src/methods/stats/player/addShinyCaptureForPlayer.ts` | `addShinyCaptureForPlayer(playerName)` |
| `src/methods/stats/player/addRarityInPlayerStats.ts` | `addRarityInPlayerStats(playerName, rarity)` |
| `src/methods/stats/player/addPokemonInpokemonPerPlayerList.ts` | **DOUBLON** de `addPokemonInPlayerTotalCaptures` — à supprimer, voir §Bugs |
| `src/methods/pokedex/addCaptureToPlayer.ts` | `addCaptureToPlayer(player, pokemonName)` |
| `src/methods/pokemon/isThisPokemonSameAsLastCapture.ts` | `isThisPokemonSameAsLastCapture(pokemonId)` |
| `src/methods/stats/addAllStats.ts` | orchestrateur qui appelle ~8 des fonctions ci-dessus |
| `src/scripts/sync-players-from-stats.ts`, `src/scripts/update-stats-from-players.ts` | scripts one-off |

### Fichiers touchant les zones (4 fichiers)

| Fichier | Fonction |
|---|---|
| `src/utils/loadUnlockedZones.ts` | `loadUnlockedZones()` — chemin en dur `data/zones_unlocked.json` |
| `src/features/raid/unlockRaidZone.ts` | `unlockRaidZone(zoneName, generation)` — 2 chemins en dur |
| `src/methods/zones/resolveCaptureLocation.ts` | `resolveCaptureLocation(interaction)` |
| `src/methods/zones/logCaptureLocationSelection.ts` | log de sélection |

### Fichiers touchant `raid.json` (7 fichiers)

| Fichier | Fonction |
|---|---|
| `src/features/raid/raidState.service.ts` | `ensureRaidStateFile()`, `loadRaidState()`, `saveRaidState()`, `resetRaidState()` — chemin en dur `RAID_STATE_FILE` |
| `src/features/raid/RegisterRaidDefender.ts` | `registerRaidDefender(params)` |
| `src/commands/getRaidInfo.ts` | `getRaidInfo(interaction)` |
| `src/features/raid/raidScheduler.ts` | scheduler complet — le plus gros morceau, voir §5 |

### Les 10 commandes (`src/commands/*.ts`)

Toutes reçoivent l'objet `interaction` brut → `interaction.guildId` dispo partout.

| Commande | Touche |
|---|---|
| `pingCommand.ts` | rien — **aucun changement requis** |
| `helpCommand.ts` | rien — **aucun changement requis** |
| `getRarityCommand.ts` | config seulement — **aucun changement requis** |
| `cheatCommand.ts` | players.json, stats.json + `getPlayerIdByName` à scoper |
| `pokedexCommand.ts` | players.json (via `displayPokedex`) |
| `captureCommand.ts` | players.json, zones_unlocked.json |
| `getPityCommand.ts` | players.json |
| `getStatsCommand.ts` | stats.json, players.json |
| `raidCommand.ts` | raid.json, players.json |
| `getRaidInfo.ts` | raid.json, players.json |

### Point d'entrée (`src/index.ts`)

- Handler `Events.InteractionCreate` : dispatch vers les 10 commandes — **ne
  change pas**, chaque commande lit `interaction.guildId` elle-même. Ajouter
  juste un garde-fou en tête (voir §Étape 6).
- Autocomplete `/raid` (~ligne 87) : lit `data/players.json` en dur pour
  filtrer les Pokémon possédés → doit devenir guild-scoped.
- Autocomplete `/capture` (~ligne 121) : appelle `loadUnlockedZones()` sans
  argument → doit devenir guild-scoped.

### Déploiement des commandes (`src/deploy-commands.ts`)

Utilise `Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID)` — déploiement
scopé à un seul serveur. À terme, passer à `Routes.applicationCommands(APPLICATION_ID)`
(déploiement global, propagation ~1h, mais plus besoin de redéployer à
chaque nouveau serveur ajouté).

---

## Bugs préexistants à corriger en même temps (pas bloquants, mais autant les régler pendant qu'on touche ces fichiers)

- [ ] **Fonction dupliquée** : `addPokemonInPlayerTotalCaptures` existe à
  l'identique dans `src/methods/stats/player/addPokemonInPlayerTotalCaptures.ts`
  ET `src/methods/stats/player/addPokemonInpokemonPerPlayerList.ts`. Garder
  le premier (nom plus clair), vérifier tous les imports des deux noms
  avant de supprimer le second, mettre à jour `addAllStats.ts` si besoin.
- [ ] **Forme incohérente de `stats.json`** : certaines fonctions écrivent
  `stats.rarity[rarity]++` (compteur global par rareté), d'autres
  `stats.rarity[playerName][rarity]++` (imbriqué par joueur). À normaliser
  en une seule forme cohérente pendant qu'on thread `guildId` dans ces
  fonctions (commit séparé pour rester facile à review/revert).
- [ ] **Cache de `loadPlayer.ts` non scopé** : le cache en mémoire
  (`Map`, TTL 2 min) est clé par `userId` seul. Comme les mêmes humains
  sont probablement sur plusieurs serveurs, sans fix un joueur peut lire
  les données du mauvais serveur pendant la fenêtre de cache — bug silencieux,
  pas d'erreur visible. **Fix : clé `${guildId}:${userId}`.**

---

## Plan d'implémentation — étape par étape

### Étape 1 — Fondations (pas de changement de comportement)

- [x] `src/config/paths.ts` : ajouter les fonctions paramétrées par `guildId`
  à côté des constantes existantes (ne rien supprimer encore) :
  ```ts
  export const GUILDS_ROOT = path.join(DATA_DIR, 'guilds');
  export function guildDir(guildId: string) { return path.join(GUILDS_ROOT, guildId); }
  export function playersDb(guildId: string) { return path.join(guildDir(guildId), 'players.json'); }
  export function statsDb(guildId: string) { return path.join(guildDir(guildId), 'stats.json'); }
  export function zonesUnlockedDb(guildId: string) { return path.join(guildDir(guildId), 'zones_unlocked.json'); }
  export function zonesToUnlockDb(guildId: string) { return path.join(guildDir(guildId), 'zones_to_unlock.json'); }
  export function raidStateDb(guildId: string) { return path.join(guildDir(guildId), 'raid.json'); }
  ```
  Les constantes du catalogue statique (`POKEMON_DB`, `POKEMON_GEN1_DB`,
  `POKEMON_GEN2_DB`) ne bougent pas.

- [x] Nouveau fichier `src/config/guilds.ts` :
  - `loadGuildRegistry(): GuildRegistryEntry[]` — lit `data/guilds.json`,
    erreur claire au démarrage si le fichier est absent ou si une entrée
    n'a pas de `raidAnnounceChannelId` (fail fast au boot, pas à 20h quand
    le cron se déclenche).
  - `getGuildConfig(guildId: string): GuildRegistryEntry | undefined`
  - `ensureGuildDataFiles(guildId: string): void` — crée
    `data/guilds/{guildId}/` si absent, seed `players.json`/`stats.json`
    (objets vides) et `zones_unlocked.json`/`zones_to_unlock.json` (copiés
    depuis les `.default.json`) si absents. Même pattern que
    `ensureRaidStateFile()` déjà présent dans `raidState.service.ts`,
    étendu aux 4 fichiers.

- [x] Nouveau fichier `data/guilds.json` (vide ou avec un serveur de test
  pour commencer le dev).

- [x] Nouveau script `scripts/migrate-to-guild-dirs.js` (même style que
  `scripts/init-data.js` existant) — voir détail dans §Migration.

- [x] Commit.

### Étape 2 — Dry-run de migration en local

- [x] Copier le `data/` actuel dans un dossier de test.
- [x] Lancer `scripts/migrate-to-guild-dirs.js --guildId <un-id-de-test>`
  dessus.
- [x] Vérifier que `data/guilds/{id}/players.json` etc. correspondent
  octet pour octet aux fichiers originaux (nombre de joueurs, totaux de
  captures identiques). Résultat : les 5 fichiers (`players.json`,
  `stats.json`, `zones_unlocked.json`, `zones_to_unlock.json`,
  `raid.json`) sont identiques octet pour octet (`cmp`), 11 joueurs et
  4838 captures totales / 86 shiny inchangés après migration.
- [x] Ne rien supprimer/déplacer en vrai à ce stade — c'est juste une
  vérification locale. Le dossier de test (`data/guilds/TEST_MIGRATION_DRYRUN/`)
  a été supprimé après vérification, les fichiers originaux dans `data/`
  n'ont pas été touchés.

### Étape 3 — Tranche verticale "capture" (le chemin le plus emprunté)

Threader `guildId` à travers toute la chaîne de capture :

- [x] `src/methods/player/createProfileIfNeeded.ts`
- [x] `src/utils/jsonPlayers.ts` (`readPlayers`, `writePlayers`, `updatePlayer`)
- [x] `src/utils/loadPlayer.ts` (+ fix du cache, voir §Bugs) — cache reclé sur `${guildId}:${userId}`
- [x] `src/methods/player/getCapturePlayer.ts`
- [x] `src/methods/pokemon/tryCatchPokemon.ts`
- [x] `src/methods/pokemon/handleSuccessfulCapture.ts`
- [x] Tous les fichiers `src/methods/stats/*.ts` et `src/methods/stats/player/*.ts`
  (+ dédoublonnage et normalisation de forme, voir §Bugs — fait)
- [x] `src/methods/stats/addAllStats.ts`
- [x] `src/methods/zones/resolveCaptureLocation.ts`
- [x] `src/methods/zones/logCaptureLocationSelection.ts` — aucun changement requis (pas d'accès fichier)
- [x] `src/utils/loadUnlockedZones.ts`
- [x] `src/commands/captureCommand.ts` (+ garde-fou guildId manquant + `ensureGuildDataFiles`)
- [x] Autocomplete `/capture` dans `src/index.ts`
- [ ] Commit.

Threading en cascade non prévu explicitement dans la liste ci-dessus mais
rendu obligatoire par TypeScript (les fonctions partagées `getPlayer`,
`createProfileIfNeeded`, `loadUnlockedZones`, `addAllStats`, `savePlayerData`,
`checkIfUserCanCatch`, `handleNoPokemonFound` sont aussi utilisées par
d'autres commandes/features — impossible de changer leur signature sans
mettre à jour tous les appelants) : `getGenerationByZone.ts`,
`getZonesByGeneration.ts`, `pickRandomZone.ts` (mort), `isZoneInGeneration.ts`
(mort), `buildDescriptionForRandomCaptureEmbed.ts` + `buildCapturedPokemonEmbed.ts`
+ `buildCaptureEmbed.ts` (mort) + `types/Params.ts`, `getPlayerIdByName.ts`,
`savePlayerDataById.ts`, `getPlayerByName.ts` (mort), `getUniquePokemonCaughtByPlayer.ts`.

### Étape 4 — Tranche "stats / pokédex / pity / cheat"

Réutilise ce qui a été threadé à l'étape 3 :

- [x] `src/commands/getStatsCommand.ts`
- [x] `src/commands/getPityCommand.ts`
- [x] `src/commands/pokedexCommand.ts` (+ `src/methods/pokedex/displayPokedex.ts`)
- [x] `src/commands/getRarityCommand.ts` — vérifié, aucun changement requis (pas d'accès données)
- [x] `src/commands/cheatCommand.ts` + `src/methods/player/getPlayerIdByName.ts`
  (devient `getPlayerIdByName(guildId, name)`, cherche uniquement dans ce
  serveur)
- [ ] Commit.

Fait en même temps qu'étape 3 (forcé par le compilateur, mêmes fonctions
partagées) : `src/commands/getRaidInfo.ts` et `src/commands/raidCommand.ts`
prennent désormais `guildId` pour leurs appels à `createProfileIfNeeded`/`getPlayer`
(mais le reste du raid — `raidState.service.ts`, `unlockRaidZone.ts` — reste
mono-tenant, voir étape 5).

### Étape 5 — Tranche "raid" (la plus grosse, en dernier)

**Stub temporaire déjà en place** (forcé par le fait qu'`addAllStats` — modifié
à l'étape 3 — est aussi appelé depuis `applyRaidRewards.ts`, et que
`createProfileIfNeeded`/`getPlayer` — modifiés à l'étape 3/4 — sont aussi
utilisés par `raidCommand.ts`/`getRaidInfo.ts`) :
- `applyRaidRewards(state, guildId)`, ses `readPlayers`/`writePlayers`
  internes, et `unlockRaidZone(guildId, zoneName, generation)` prennent
  maintenant un `guildId` explicite.
- `raidScheduler.ts` (`closeRaidAndResolve`) le fournit en lisant
  `loadGuildRegistry()[0]` — donc récompenses, stats de raid et zone
  débloquée sont déjà écrites dans le dossier du **premier serveur du
  registre**.
- `prepareRaidDefenderFromPlayerPokemon(guildId, ...)` et l'autocomplete
  `pokemon_name` de `/raid` dans `src/index.ts` lisent maintenant le
  `players.json` du bon serveur (sinon `/raid` aurait cassé pour tout
  nouveau joueur : son profil est créé par `createProfileIfNeeded` dans le
  dossier guild-scopé mais aurait été cherché dans l'ancien fichier global).

Le raid est désormais entièrement guild-scoped : `raidState.service.ts`,
`raidGenerator.service.ts` et le scheduler tournent en cron indépendant par
serveur (voir liste ci-dessous, tout est fait).

- [x] `src/features/raid/raidState.service.ts` : `ensureRaidStateFile`,
  `loadRaidState`, `saveRaidState`, `resetRaidState` gagnent un paramètre
  `guildId` en premier, utilisent `raidStateDb(guildId)` au lieu de la
  constante `RAID_STATE_FILE` (supprimée, plus aucun importeur externe).
- [x] `src/features/raid/raidGenerator.service.ts` : `generateRaidState(guildId)`
  lit `zonesUnlockedDb(guildId)`/`zonesToUnlockDb(guildId)` au lieu des
  chemins globaux (seul `pokemon-list.json` reste global).
- [x] `src/features/raid/unlockRaidZone.ts` : `unlockRaidZone(guildId, zoneName, generation)`.
- [x] `src/features/raid/prepareRaidDefenderFromPlayerPokemon.ts`
- [x] `src/features/raid/RegisterRaidDefender.ts` : `registerRaidDefender(guildId, params)`.
- [x] `src/commands/raidCommand.ts`
- [x] `src/commands/getRaidInfo.ts`
- [x] Autocomplete `/raid` dans `src/index.ts`
- [x] `src/features/raid/raidScheduler.ts` — rework complet :
  - Supprimer le `discordClient` module-level unique utilisé comme seul état
    global (garder une variable module-level pour le client Discord
    lui-même, c'est légitime — un seul client sert tous les serveurs — mais
    supprimer la constante unique `RAID_ANNOUNCE_CHANNEL_ID`).
  - `startRaidScheduler(client)` charge le registre via `loadGuildRegistry()`
    et enregistre **une paire de cron jobs par serveur** :
    ```ts
    for (const guild of loadGuildRegistry()) {
      cron.schedule(openExpression, () => {
        void openRaidRegistration(guild.guildId, guild.raidAnnounceChannelId);
      }, { timezone: RAID_TIMEZONE });

      cron.schedule(resolveExpression, () => {
        void closeRaidAndResolve(guild.guildId, guild.raidAnnounceChannelId);
      }, { timezone: RAID_TIMEZONE });
    }
    ```
    (`openExpression`/`resolveExpression` restent calculés une seule fois,
    partagés entre tous les serveurs — seuls les *paramètres passés aux
    callbacks* changent par serveur.)
  - `openRaidRegistration` et `closeRaidAndResolve` gagnent
    `(guildId, announceChannelId)`, threadent `guildId` dans tous leurs
    appels (`loadRaidState`, `saveRaidState`, `resetRaidState`,
    `unlockRaidZone`, `applyRaidRewards`), utilisent `announceChannelId`
    reçu en paramètre au lieu de lire `process.env.RAID_ANNOUNCE_CHANNEL_ID`.
  - `sendRaidAnnouncement(client, channelId, embed)` ne change pas (déjà
    scopé par salon).
  - Logguer un événement `raid_scheduler_started` par serveur (avec le
    `guildId`) pour pouvoir confirmer au démarrage que N paires de cron
    jobs sont bien enregistrées.
- [ ] Commit. (Étape 1, 3, 4 et 5 restent aussi à commit — le tout est
  toujours dans l'arbre de travail, rien n'a encore été committé.)

### Étape 6 — Câblage final + nettoyage des anciennes constantes

- [x] Dans `src/index.ts`, ajouté en tête du handler `InteractionCreate` :
  ```ts
  if (!interaction.guildId || !getGuildConfig(interaction.guildId)) return;
  ```
  (rejette les DM et les serveurs non enregistrés dans `data/guilds.json`.)
- [x] `ensureGuildDataFiles(guildId)` appelé pour chaque serveur du
  registre dans le handler `ClientReady`.
- [x] Supprimé les vieilles constantes devenues mortes : `PLAYERS_DB`,
  `STATS_DB` dans `paths.ts`. (`RAID_STATE_FILE` avait déjà été supprimée à
  l'étape 5, `ZONES_UNLOCKED_PATH`/`ZONES_TO_UNLOCK_PATH` n'existaient déjà
  plus dans `unlockRaidZone.ts`/`loadUnlockedZones.ts`.)
- [x] **Écart découvert par rapport au plan initial** : `PLAYERS_DB`/`STATS_DB`
  n'étaient pas mortes au moment d'attaquer cette étape — 4 scripts one-off
  (`migrate-players.ts`, `add-captured-in-current-season.ts`,
  `sync-players-from-stats.ts`, `update-stats-from-players.ts`) et
  `src/utils/loadData.ts` (`loadPlayers`) les utilisaient encore, en dehors
  du flux live du bot. Décision (validée avec l'utilisateur) : migrer ces
  scripts en guild-scoped plutôt que les supprimer, pour garder ces outils
  utilisables après la migration multi-guild. Chaque script prend
  maintenant un argument CLI `--guildId <id>` et utilise
  `playersDb(guildId)`/`statsDb(guildId)`. `loadPlayers` prend désormais un
  paramètre `guildId`.
- [x] Grep de vérification avant de commit :
  ```
  grep -rn "PLAYERS_DB\|STATS_DB\|RAID_STATE_FILE\|ZONES_UNLOCKED_PATH\|ZONES_TO_UNLOCK_PATH" src/
  ```
  → confirmé vide.
- [ ] Commit.

### Étape 7 — Nettoyage config/scripts

- [x] Supprimé `scripts/init-data.js` (remplacé par `ensureGuildDataFiles`
  appelé au démarrage) — un seul code path de seed au lieu de deux.
- [x] Mis à jour `.env.example` : retiré `GUILD_ID` et
  `RAID_ANNOUNCE_CHANNEL_ID` (déplacés dans `data/guilds.json`), ajouté un
  commentaire qui pointe vers ce fichier.
- [x] Mis à jour `package.json` (`build` ne référence plus `init-data`,
  script `init-data` retiré).
- [x] Mis à jour `README.md` en cohérence (table des commandes npm, section
  variables d'environnement) — pas listé explicitement dans le plan mais
  serait devenu incohérent sinon.
- [ ] Commit.

### Étape 8 — Déploiement global des commandes

- [x] `src/deploy-commands.ts` : remplacé
  `Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID)` par
  `Routes.applicationCommands(APPLICATION_ID)`.
- [ ] Commit séparé (changement opérationnel, facile à revert isolément si
  la propagation globale pose souci).

### Étape 9 — Migration des données de production

Voir détail complet dans la section suivante. À faire **seulement après**
que tout le reste (étapes 1 à 8) est testé en local avec le plan de
vérification ci-dessous.

---

## Plan de migration des données existantes (production)

1. [ ] **Arrêter les deux process** (les deux `screen` sur le VPS) avant de
   toucher à un seul fichier — évite qu'une écriture arrive au mauvais
   endroit pendant la migration.
2. [ ] Récupérer les `GUILD_ID` des deux `.env` existants — ce sont les noms
   des futurs dossiers `data/guilds/{id}/`.
3. [ ] `scripts/migrate-to-guild-dirs.js --guildId <id> [--source <dossier>]` :
   - Crée `data/guilds/{guildId}/`.
   - Déplace (ou copie puis vérifie puis supprime l'original, pour plus de
     sûreté) `players.json`, `stats.json`, `zones_unlocked.json`,
     `zones_to_unlock.json`, `raid.json` dans ce dossier.
   - Laisse intacts les fichiers catalogue (`pokemon-list.json` etc.) à la
     racine de `data/`.
   - Affiche un résumé avant/après (nombre de joueurs, total de captures)
     pour vérifier visuellement qu'il n'y a pas de perte.
4. [ ] Migrer le dossier principal (serveur 1) en place avec ce script.
5. [ ] Copier les fichiers de données de
   `/pokechu/pokemon-classic-discord-bot/data/` (serveur 2, actuellement
   une installation complètement séparée) vers un dossier de staging dans
   le dépôt principal, puis lancer le script dessus avec le `guildId` du
   serveur 2 → atterrit dans `data/guilds/{guildId-2}/` **à l'intérieur du
   dépôt principal**.
6. [ ] Remplir `data/guilds.json` avec les deux entrées (`guildId`,
   `name`, `raidAnnounceChannelId` récupéré des anciens `.env`).
7. [ ] **Garder l'ancien dossier `/pokechu/...`** quelques jours comme
   backup froid avant de le supprimer pour de bon — ne pas supprimer le
   jour même.
8. [ ] **Régénérer le `DISCORD_TOKEN`** dans le Developer Portal — les deux
   anciens déploiements partageaient le même token (cause racine de
   l'incident initial), c'est le bon moment pour le faire tourner, vu
   qu'un seul process va désormais s'y connecter.
9. [ ] Nettoyer au passage les fichiers cruft qui traînent dans `data/` et
   qui pourraient être confondus avec de vraies données de guild :
   `data/old/`, `*.bak`, `data/bot.log`, `data/history.txt`,
   `data/filtered.txt`, `data/raid_debug.json`.
10. [ ] Déployer les commandes globalement (étape 8 du plan
    d'implémentation) depuis le dépôt unique fusionné.
11. [ ] Démarrer **un seul** process (`npm start`, ou idéalement passer à
    pm2 à cette occasion pour éviter tout redémarrage manuel oublié —
    hors scope de ce refacto mais recommandé, vu qu'un crash aujourd'hui =
    downtime silencieux tant que quelqu'un ne s'en aperçoit pas).

---

## Plan de vérification

Pas besoin d'un vrai troisième serveur Discord de prod — utiliser un bot de
test (token séparé) ajouté à 2 serveurs Discord réels que tu contrôles (un
serveur perso + un second serveur jetable, gratuit et rapide à créer).

- [ ] Ajouter les deux `guildId` de test dans `data/guilds.json`.
- [ ] Démarrer le bot, vérifier dans les logs que `data/guilds/{id1}/` et
  `data/guilds/{id2}/` sont créés et seedés automatiquement
  (`players.json` vide, zones copiées depuis les `.default.json`).
- [ ] `/capture` avec le même compte Discord sur le serveur 1 puis le
  serveur 2 → vérifier que `data/guilds/{id1}/players.json` contient la
  capture et que `data/guilds/{id2}/players.json` ne la contient pas (ou a
  un historique totalement séparé).
- [ ] Répéter pour `/pokedex`, `/pity`, `/get-stats`, `/get-rarity`.
- [ ] **Test dédié du fix de cache** : capturer sur serveur 1, puis dans
  les 2 minutes qui suivent lancer une commande sur serveur 2 avec le même
  compte Discord → confirmer qu'on n'obtient pas les données du serveur 1
  (bug silencieux, pas d'erreur visible — à vérifier manuellement, pas
  seulement en relisant le code).
- [ ] Passer `RAID_SCHEDULER_MODE=debug` (déjà existant, cron `*/2 * * * *`
  / `*/3 * * * *`) pour observer deux cycles de raid indépendants sans
  attendre les horaires réels 12h/20h :
  - [ ] Vérifier que `data/guilds/{id1}/raid.json` et
    `data/guilds/{id2}/raid.json` passent en `status: "registration"`
    indépendamment, potentiellement avec un Pokémon/zone différent
    (puisque chaque `generateRaidState()` tourne sur les zones débloquées
    propres à son serveur).
  - [ ] Participer via `/raid` sur le serveur 1 seulement.
  - [ ] Après le tick de résolution, vérifier que le raid du serveur 1
    compte bien le défenseur et s'annonce dans son salon configuré, tandis
    que celui du serveur 2 se résout indépendamment (probablement 0
    défenseur) et s'annonce dans son propre salon distinct.
- [ ] Remettre `RAID_SCHEDULER_MODE=production` et vérifier au démarrage
  que les logs affichent bien les cron `RAID_START_HOUR`/`RAID_END_HOUR`
  réels pour les deux serveurs.

---

## Résumé — fichiers neufs à créer

- `src/config/guilds.ts`
- `data/guilds.json`
- `scripts/migrate-to-guild-dirs.js`

## Résumé — fichiers les plus impactés (à surveiller de près en review)

- `src/config/paths.ts`
- `src/index.ts`
- `src/features/raid/raidScheduler.ts`
- `src/features/raid/raidState.service.ts`
- `src/utils/loadPlayer.ts`
- `src/utils/jsonPlayers.ts`
