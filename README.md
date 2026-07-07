# Pokemon Classic Discord Bot

Bot Discord de type gacha Pokemon en TypeScript. Les joueurs capturent des Pokemon dans différentes zones, construisent leur Pokedex, gagnent de l'XP, montent en niveau et participent à des raids coopératifs quotidiens.

## Commandes disponibles

| Commande | Description |
|---|---|
| `/capture [generation] [zone]` | Capture un Pokemon aleatoire dans une zone |
| `/raid <pokemon> [type]` | Inscrit un Pokemon pour defendre le centre de recherche lors du raid |
| `/pokedex` | Affiche ton Pokedex pagine avec progression et saison |
| `/leaderboard` | Classement des joueurs, top shiny, top level, top raids et top Pokemon |
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
| `npm run deploy` | Enregistre les commandes slash aupres de Discord |
| `npm run start` | Lance le bot compile (production) |

### Workflow developpement
```bash
npm run dev
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

# Gameplay
SHINY_RATE=256
COOLDOWN=30
PITY_THRESHOLD=10
POKEMON_PER_PAGE=20
BUTTON_TIMEOUT=120000

# Raid (horaires/reglages partages entre tous les serveurs)
RAID_SCHEDULER_MODE=debug
RAID_NEXT_ZONE_CHANCE=60
MAIN_CHANNEL_ID=
RAID_START_HOUR=00 12 * * *
RAID_END_HOUR=00 20 * * *

# Pokemon list generation (optionnel)
# EXTRA_POKEMON_FILES=othermons.json
```

Le bot est multi-serveurs : chaque serveur Discord est declare dans
`data/guilds.json` (`guildId`, `name`, `raidAnnounceChannelId`), maintenu a
la main. Les fichiers de donnees (`players.json`, `stats.json`, zones,
`raid.json`) sont crees automatiquement par serveur dans
`data/guilds/{guildId}/` au demarrage du bot.

---

## Structure du projet

```
src/
  commands/        Commandes slash Discord
  config/          Configuration (paths, rarete, types, raid)
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
  types/           Types TypeScript (Player, Pokemon, Raid, Zones)
  utils/           Utilitaires runtime (logger, chargement fichiers)
  scripts/         Scripts one-shot (migration, build donnees) - exclu du build
data/
  pokemon-list.json       Base de donnees complete (genere au build)
  pokemon-gen1.json       Pokemon generation 1
  pokemon-gen2.json       Pokemon generation 2
  othermons.json          Pokemon custom par serveur (optionnel, non versionne)
  zones_unlocked.default.json   Zones accessibles (template initial, versionne)
  zones_unlocked.json           Zones accessibles (copie de travail, non versionnee)
  zones_to_unlock.default.json  Zones a debloquer via les raids (template initial, versionne)
  zones_to_unlock.json          Zones a debloquer via les raids (copie de travail, non versionnee)
  zones_all.json          Toutes les zones
  players.json            Profils joueurs (genere au runtime)
  stats.json              Statistiques globales (genere au runtime)
  raid.json               Etat du raid en cours (genere au runtime)
```

---

## Stack technique

- **Runtime** : Node.js + TypeScript
- **Discord** : discord.js v14
- **Scheduling** : node-cron (raids quotidiens)
- **Logging** : pino + pino-pretty
- **Tests** : vitest
- **Persistence** : fichiers JSON
