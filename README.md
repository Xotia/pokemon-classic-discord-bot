# Pokemon Classic Discord Bot

Bot Discord de type gacha Pokemon en TypeScript. Les joueurs capturent des Pokemon dans différentes zones, construisent leur Pokedex, gagnent de l'XP, montent en niveau et participent à des raids coopératifs quotidiens.

## Commandes disponibles

| Commande | Description |
|---|---|
| `/capture [generation] [zone]` | Capture un Pokemon aleatoire dans une zone |
| `/raid <pokemon> [type]` | Inscrit un Pokemon pour defendre le centre de recherche lors du raid |
| `/pokedex` | Affiche ton Pokedex pagine avec progression et saison |
| `/leaderboard` | Classement des joueurs, top shiny, top level, top raids et top Pokemon |
| `/raid-squad` | Affiche l'etat du raid en cours et l'equipe de defense actuelle |
| `/pity` | Affiche le compteur de pity |
| `/get-rarity` | Affiche les taux de rarete (normal et booste) |
| `/get-shiny-rate` | Affiche le taux d'apparition des shinys |
| `/cheat <player> <pokemon> <shiny>` | Commande admin pour attribuer un Pokemon |
| `/help` | Liste des commandes |
| `/ping` | Verifie que le bot est en ligne |

---

## Installation

```bash
npm install
npm run build
npm run deploy
npm run start
```

## Commandes NPM

| Commande | Usage |
|---|---|
| `npm run dev` | Lance le bot avec `ts-node` (developpement) |
| `npm run generate-pokemon-list` | Genere `pokemon-list.json` a partir des fichiers source |
| `npm run build` | Genere la liste Pokemon + compile le TypeScript dans `dist/` |
| `npm run deploy` | Enregistre les commandes slash globalement aupres de Discord (propagation ~1h) |
| `npm run deploy:dev` | Enregistre les commandes slash en guild-scoped sur les serveurs de `data/guilds.json` (propagation instantanee, pratique en dev/test) |
| `npm run deploy:dev:clear` | Supprime les commandes guild-scoped (a faire une fois que le deploiement global a propage, pour eviter les doublons dans le picker Discord) |
| `npm run start` | Lance le bot compile (production) |

### Workflow developpement
```bash
npm run dev
npm run deploy:dev
```

### Workflow production / mise a jour
```bash
npm run build
npm run deploy
npm run start
```

---

## Variables d'environnement (.env)

```env
# Discord
DISCORD_TOKEN=
APPLICATION_ID=
PUBLIC_KEY=
ADMIN_ID=

# Gameplay - valeurs par defaut pour tous les serveurs (voir "Reglages par
# serveur" plus bas pour les surcharger individuellement)
SHINY_RATE=256
COOLDOWN=30
PITY_THRESHOLD=10
POKEMON_PER_PAGE=20
BUTTON_TIMEOUT=120000
GENERATION_NUMBER=2

# Raid - horaires/reglages par defaut (idem, surchargeables par serveur)
RAID_SCHEDULER_MODE=debug
RAID_NEXT_ZONE_CHANCE=60
RAID_START_HOUR=00 12 * * *
RAID_END_HOUR=00 20 * * *

# Pokemon list generation (optionnel)
# EXTRA_POKEMON_FILES=othermons.json
```

Le bot est multi-serveurs : chaque serveur Discord est declare dans
`data/guilds.json` (`guildId`, `name`, `raidAnnounceChannelId`), maintenu a
la main. Ce fichier n'est **pas commit** (il contient des `guildId` reels,
voir `.gitignore`) : partir de `data/guilds.json.example`, le copier en
`data/guilds.json` et le remplir avec vos propres serveurs. Les fichiers de
donnees (`players.json`, `stats.json`, zones, `raid.json`) sont crees
automatiquement par serveur dans `data/guilds/{guildId}/` au demarrage du
bot, et les logs applicatifs dans `logs/guilds/{guildId}/bot.log` (les
evenements sans contexte serveur, comme le demarrage du bot, restent dans
`logs/bot.log`).

### Reglages par serveur

Chacune des variables de gameplay/raid ci-dessus peut etre surchargee pour
un serveur precis en ajoutant le champ correspondant a son entree dans
`data/guilds.json` : `shinyRate`, `cooldownMinutes`, `pityThreshold`,
`pokemonPerPage`, `buttonTimeoutMs`, `generationNumber`,
`raidSchedulerMode`, `raidNextZoneChance`, `raidStartHour`, `raidEndHour`.
Un serveur sans surcharge utilise telles quelles les valeurs du `.env`
(resolution centralisee dans `src/config/guildSettings.ts`). Exemple :

```json
{
  "guilds": [
    {
      "guildId": "111111111111111111",
      "name": "Serveur A",
      "raidAnnounceChannelId": "222222222222222222",
      "generalChannelId": "555555555555555555",
      "cooldownMinutes": 5,
      "shinyRate": 50
    },
    {
      "guildId": "333333333333333333",
      "name": "Serveur B",
      "raidAnnounceChannelId": "444444444444444444"
    }
  ]
}
```

### Ajouter le bot sur un nouveau serveur

1. Inviter le bot avec les scopes `bot` **et** `applications.commands` (sans
   ce dernier, les commandes slash echouent avec `Missing Access`).
2. Recuperer le `guildId` du serveur, l'ID du salon d'annonce de raid
   (`raidAnnounceChannelId`) et, si le serveur a un salon Pokemon general
   distinct, son ID (`generalChannelId`).
3. Ajouter une entree dans `data/guilds.json`.
4. Redemarrer le bot — `ensureGuildDataFiles` cree et seed automatiquement
   `data/guilds/{guildId}/` au demarrage (`ClientReady`).
5. Optionnel, pour tester sans attendre la propagation globale (~1h) :
   `npm run deploy:dev`.

### Scripts d'annonce ponctuelle

`src/scripts/send-lore.ts`, `send-lore-new-adventure.ts`,
`send-maintenance.ts`, `send-back-online.ts`, `send-quick-maintenance.ts`,
`send-quick-back-online.ts` ne lisent plus un salon fixe depuis le `.env`.
Sans argument, ils diffusent sur tous les serveurs du registre
(`data/guilds.json`), tous vers le `generalChannelId` de chaque serveur
(repli sur `raidAnnounceChannelId` si absent) — aucun de ces messages
n'est lié au raid lui-même. Passer `--channelId <id>` cible un seul
salon a la place (utile pour tester) :

```bash
npx ts-node src/scripts/send-maintenance.ts --channelId <id-du-salon>
```

---

## Structure du projet

```
src/
  commands/        Commandes slash Discord
  config/          Configuration (paths, guilds, guildSettings, rarete, types)
  features/raid/   Systeme de raid (generation, inscription, resolution, recompenses)
  methods/
    console-logs/  Logs de capture en console
    cooldown/      Gestion du cooldown entre captures
    embed/         Construction des embeds Discord
    gatcha/        Systeme gacha (tirage rarete + Pokemon)
    message/       Messages Discord (cooldown)
    pity/          Systeme de pity
    player/        Gestion des profils joueurs (creation, sauvegarde, recherche)
    pokedex/       Pokedex (affichage, pagination, stats)
    pokemon/       Pokemon (recherche, capture, shiny, XP)
    rarity/        Rarete (roll, downgrade, couleur)
    stats/         Statistiques globales et par joueur
    xp/            Systeme XP et niveaux
    zones/         Zones de capture (resolution, generation, deblocage)
  types/           Types TypeScript (Player, Pokemon, Raid, Zones, GuildRegistryEntry)
  utils/           Utilitaires runtime (logger par serveur, chargement fichiers)
  scripts/         Scripts one-shot (migration, annonces) - exclu du build
  deploy-commands.ts       Deploiement global des commandes slash
  deploy-commands-dev.ts   Deploiement guild-scoped (dev/test, instantane)
  commandDefinitions.ts    Definitions des commandes slash (source commune aux deux scripts de deploiement)
data/
  guilds.json             Registre des serveurs (guildId, name, raidAnnounceChannelId, overrides de gameplay)
  guilds/{guildId}/       Donnees par serveur, creees automatiquement au demarrage
    players.json          Profils joueurs
    stats.json             Statistiques globales et par joueur
    zones_unlocked.json    Zones accessibles
    zones_to_unlock.json   Zones a debloquer via les raids
    raid.json              Etat du raid en cours
  pokemon-list.json       Base de donnees complete (genere au build)
  pokemon-gen1.json       Pokemon generation 1
  pokemon-gen2.json       Pokemon generation 2
  othermons.json          Pokemon custom (optionnel, non versionne)
  zones_unlocked.default.json   Template de seed pour un nouveau serveur (versionne)
  zones_to_unlock.default.json  Template de seed pour un nouveau serveur (versionne)
  zones_all.json          Toutes les zones
logs/
  bot.log                 Evenements sans contexte serveur (demarrage, etc.)
  guilds/{guildId}/bot.log  Logs applicatifs de ce serveur (captures, raids, stats...)
```

---

## Stack technique

- **Runtime** : Node.js + TypeScript
- **Discord** : discord.js v14
- **Scheduling** : node-cron (raids quotidiens)
- **Logging** : pino + pino-pretty
- **Tests** : vitest
- **Persistence** : fichiers JSON
