# Pokemon Classic Discord Bot - Fonctionnalités

## Vue d'ensemble

Bot Discord de type gacha Pokémon développé en TypeScript avec discord.js.
Les joueurs capturent des Pokémon aléatoires avec un système de rareté pondéré, construisent leur Pokédex, gagnent de l'XP, montent en niveau, et participent à des raids coopératifs.

---

## Commandes Discord

### `/capture [generation] [zone]`
Capture un Pokémon aléatoire selon un système gacha.

- **Système de rareté pondéré** : common, uncommon, rare, very_rare, epic, ultra_rare, mythic, legendary, unknown
- **Cooldown** configurable entre les captures (env `COOLDOWN` en minutes)
- **Zones de capture** : chaque Pokémon est assigné à une ou plusieurs zones. Le joueur peut choisir génération (gen1/gen2) et zone, ou laisser le choix aléatoire
- **Autocomplete** sur le champ zone pour faciliter la sélection
- **Anti-doublon** : empêche de capturer deux fois le même Pokémon consécutivement
- **Downgrade de rareté** : si aucun Pokémon n'existe à la rareté tirée pour la zone, descend automatiquement d'un cran
- **Shiny** : chance 1/SHINY_RATE (configurable) d'obtenir un shiny, qui rapporte 10x l'XP de base

### `/pokedex`
Affiche le Pokédex paginé du joueur.

- Navigation par boutons Discord (premier, précédent, suivant, dernier)
- Affiche : numéro, nom, nombre de captures, shinys, marqueur saison
- Résumé : niveau joueur, progression du Pokédex (X/total)
- Timeout des boutons configurable

### `/raid <pokemon_name> [type]`
Inscription à un raid coopératif avec un Pokémon possédé.

- Le Pokémon doit être possédé et capturé pendant la saison en cours
- Le type d'attaque peut être choisi parmi les types du Pokémon ou assigné aléatoirement
- Remplacement automatique si le joueur se réinscrit
- Validation : raid ouvert, Pokémon valide, type valide

### `/stats`
Classement global des joueurs.

- Top joueurs par captures uniques
- Nombre total de captures, shinys par joueur
- Top 3 des Pokémon les plus capturés

### `/pity`
Affiche le compteur de pity du joueur.

- Après N captures sans rareté >= very_rare, la prochaine utilise la table boostée
- Le seuil est configurable (env `PITY_THRESHOLD`)

### `/get-rarity`
Affiche les taux de rareté actuels (mode normal et boosté) sous forme d'embed.

### `/get-shiny-rate`
Affiche le taux d'apparition des shinys.

### `/cheat <player> <pokemon> <shiny>`
Commande admin (réservée à `ADMIN_ID`) pour attribuer un Pokémon à un joueur.

### `/ping`
Vérifie que le bot est en ligne.

### `/help`
Liste toutes les commandes disponibles.

---

## Systèmes de jeu

### Système de rareté (Gacha)
- **8 niveaux de rareté** + unknown, avec poids configurables
- **Table boostée** (pity) : retire common/uncommon, augmente les chances des raretés élevées
- Downgrade automatique si aucun Pokémon disponible dans la zone à la rareté tirée

### Système de Pity
- Compteur incrémenté à chaque capture
- Reset quand le joueur obtient very_rare ou mieux
- Quand le compteur atteint le seuil → prochaine capture utilise la table boostée

### XP et Niveaux
- XP basée sur les HP du Pokémon capturé (x10 si shiny)
- Formule de niveau : `floor(4 * level^3 / 5)` (style Pokémon)
- Niveau max : 100
- Notification de level-up dans l'embed de capture

### Saison
- Chaque Pokémon a un flag `capturedInCurrentSeason`
- Marqueur visuel dans le Pokédex
- Condition requise pour participer aux raids

---

## Système de Raid

### Cycle de vie
1. **Ouverture** (cron à 12h UTC en prod) : génère un raid aléatoire et envoie l'annonce Discord
2. **Inscriptions** (8h) : les joueurs inscrivent un Pokémon défenseur via `/raid`
3. **Résolution** (cron à 20h UTC en prod) : calcule le résultat du combat

### Génération du raid
- Génération aléatoire (1 ou 2)
- Zone choisie parmi les zones débloquées ou une nouvelle zone (60% de chance configurable)
- Pokémon boss tiré aléatoirement dans la zone
- Difficulté 2-5 (multiplicateur de stats)
- Type d'attaque du boss choisi parmi ses types

### Résolution du combat
- Somme des stats de l'équipe de défenseurs (hors PV)
- Application des multiplicateurs de type (effectiveness) sur attaque et défense
- L'équipe gagne si TOUTES ses stats (attaque, défense, attaque spé., défense spé., vitesse) dépassent celles du boss
- En cas de défaite, le message indique les stats manquantes en texte

### Récompenses de victoire
- **XP** : HP de base du Pokémon du raid × 10, attribué à chaque participant
- **raidWins** : compteur de victoires incrémenté
- **Capture automatique** : le Pokémon du raid est capturé par un participant tiré au sort
- **Déblocage de zone** : si la zone du raid n'était pas encore débloquée, elle est ajoutée aux zones disponibles

### Mode debug
- Ouverture toutes les 2 minutes, résolution toutes les 3 minutes

---

## Architecture technique

### Données (dossier `data/`)
- `pokemon-list.json` : base de données complète des Pokémon (stats, types, zones, effectiveness)
- `pokemon-gen1.json` / `pokemon-gen2.json` : Pokémon par génération
- `players.json` : profils joueurs (captures, pity, xp, level)
- `stats.json` : statistiques globales
- `raid.json` : état du raid en cours
- `zones_unlocked.json` / `zones_to_unlock.json` / `zones_all.json` : gestion des zones

### Stack
- **Runtime** : Node.js + TypeScript (ts-node)
- **Discord** : discord.js v14
- **Scheduling** : node-cron
- **Logging** : pino + pino-pretty (console + fichier)
- **Tests** : vitest (disponible mais pas encore de tests)

### Persistence
- Fichiers JSON (pas de base de données)
- Cache joueur en mémoire avec TTL de 2 minutes
- Cache Pokémon en mémoire pour les recherches par nom
