# Mise à jour 3.1.0 — Commande /leaderboard

---

## `/stats` devient `/leaderboard`

La commande `/stats` a été renommée `/leaderboard` et enrichie avec de nouveaux classements !

### Classements disponibles

- 🥇 **Top Joueurs** — par captures uniques et totales
- ✨ **Top Shiny** — par nombre de shinys capturés
- 📈 **Top Level** — par niveau et XP
- 📖 **Top Pokédex** — par complétion du Pokédex (avec pourcentage)
- ⚔️ **Top Raids** — par victoires en raid
- 🔥 **Top 3 Pokémons** — les Pokémon les plus capturés

---

## Script de maintenance RP

Nouveau script pour envoyer un message de maintenance immersif dans le salon principal, dans l'univers du Centre AURORA.

```bash
npx ts-node src/scripts/send-maintenance.ts
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
