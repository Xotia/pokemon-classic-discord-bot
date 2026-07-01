# Mise à jour 3.4.2 — Correction de la fin d'inscription aux raids

---

## Fin des inscriptions alignée sur la fin du raid

Sur les serveurs où l'heure de fin de raid (`RAID_END_HOUR`) a été personnalisée, les inscriptions pouvaient se fermer **avant** la fin réelle du raid, provoquant une erreur au moment de faire `/raid`. La fin des inscriptions est maintenant calculée à partir de l'écart entre `RAID_START_HOUR` et `RAID_END_HOUR`, donc elle correspond toujours à l'heure de fin de raid configurée.

---

---

# Mise à jour 3.4.1 — Correction du cooldown sans capture

---

## Cooldown réduit en cas d'échec

Quand `/capture` ne trouve aucun Pokémon, le cooldown appliqué est maintenant de **10 minutes** au lieu du cooldown complet.

## Messages RP variés

Le message "Aucun Pokémon trouvé" est désormais tiré aléatoirement parmi une dizaine de phrases respectant le lore du Centre AURORA, plutôt qu'un texte toujours identique.

---

---

# Mise à jour 3.4.0 — ID et types affichés à la capture

---

## Plus d'infos sur tes captures

L'embed affiché lors d'une capture indique maintenant le **numéro de Pokédex** et le ou les **types** du Pokémon, juste en dessous du message de capture.

### Exemple

```
Xotia a capturé Bulbizarre !
🆔 N°1 • Plante / Poison
📍 Zone : Forêt
```

---

---

# Mise à jour 3.3.0 — Filtrage par type dans l'inscription raid

---

## Autocomplete `/raid` amélioré

Quand tu choisis un **type d'attaque** avant de sélectionner ton Pokémon, la liste de suggestions ne propose plus que les **Pokémon qui possèdent ce type** parmi ceux capturés cette saison.

### Exemple

1. `/raid` → sélectionne le type **Eau**
2. Tape une lettre dans `pokemon_name`
3. Seuls tes Pokémon de type Eau capturés cette saison apparaissent (Carapuce, Tortank, Stari…)

Si aucun type n'est sélectionné, le comportement reste inchangé : tous tes Pokémon de la saison sont proposés.

---

---

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
