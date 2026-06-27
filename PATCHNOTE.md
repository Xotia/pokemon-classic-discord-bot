# Mise à jour 3.2.0 — Génération dynamique de la liste Pokémon

---

## Liste Pokémon générée automatiquement

Le fichier `pokemon-list.json` est désormais **généré à chaque build** à partir des fichiers source (`pokemon-gen1.json`, `pokemon-gen2.json`).

### Personnalisation par serveur

Les administrateurs peuvent ajouter des Pokémon custom (événements, 1er avril, etc.) en déposant un fichier JSON supplémentaire dans `data/` et en ajoutant cette variable dans le `.env` :

```env
EXTRA_POKEMON_FILES=othermons.json
```

Plusieurs fichiers sont supportés, séparés par des virgules :

```env
EXTRA_POKEMON_FILES=othermons.json,event-noel.json
```

Au prochain `npm run build`, ces Pokémon seront automatiquement ajoutés à la liste.

---

---

# Mise à jour 3.1.0 — Commande /leaderboard

---

## `/stats` devient `/leaderboard`

La commande `/stats` a été renommée `/leaderboard` et enrichie avec de nouveaux classements !

### Classements disponibles

- 🥇 **Top Joueurs** — par captures uniques et totales
- ✨ **Top Shiny** — par nombre de shinys capturés
- 📈 **Top Level** — par niveau et XP
- 📖 **Top Pokédex** — par complétion du Pokédex (avec pourcentage)
- 🌟 **Top Pokédex Saison** — par complétion du Pokédex sur la saison en cours
- ⚔️ **Top Raids** — par victoires en raid
- 🔥 **Top 3 Pokémons** — les Pokémon les plus capturés

---

## Scripts de maintenance RP

Nouveaux scripts pour envoyer des messages de maintenance immersifs dans le salon principal, dans l'univers du Centre AURORA.

| Script | Usage |
|---|---|
| `send-maintenance.ts` | Maintenance longue (embed orange) |
| `send-back-online.ts` | Reprise après maintenance longue (embed vert) |
| `send-quick-maintenance.ts` | Micro-maintenance (embed jaune) |
| `send-quick-back-online.ts` | Reprise après micro-maintenance (embed vert) |

```bash
npx ts-node src/scripts/<script>.ts
```

Nécessite la variable `MAIN_CHANNEL_ID` dans le `.env`.

---

## Horaires de raid configurables

Les heures d'ouverture et de fermeture du raid sont désormais configurables via le `.env` :

```env
RAID_START_HOUR=00 12 * * *
RAID_END_HOUR=00 20 * * *
```

Les valeurs sont des expressions cron. Par défaut : raid ouvert à 12h, fermé à 20h.

---

Bonne chasse, dresseurs.
