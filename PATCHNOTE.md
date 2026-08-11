# Mise à jour 3.5.3 — Les raids se jouent enfin comme un combat

---

## Vos attaques visent maintenant ses défenses

Jusqu'ici, un raid comparait chaque statistique à son équivalent chez le Pokémon enragé : votre Attaque contre son Attaque, votre Défense contre sa Défense. Autrement dit, face à un boss en béton armé, il fallait vous-mêmes vous fabriquer une armure en béton armé pour espérer le battre.

Ce n'est plus le cas. Désormais :

- Votre **Attaque** et votre **Attaque Spé.** affrontent sa **Défense** et sa **Défense Spé.** — vous devez percer sa garde.
- Votre **Défense** et votre **Défense Spé.** affrontent son **Attaque** et son **Attaque Spé.** — vous devez encaisser ses coups.
- La **Vitesse** reste face à la Vitesse, c'est la seule course directe.

---

## Ce que ça change pour vos équipes

La difficulté globale des raids ne bouge pas : il ne faut ni plus ni moins de participants qu'avant. En revanche, **le profil du Pokémon enragé compte enfin**.

Un boss qui frappe fort mais encaisse mal devient dur à supporter et facile à percer : montez la Défense de l'équipe et son Attaque suffira. À l'inverse, un mur défensif se prend au contraire par la puissance offensive. Choisir qui inscrire au raid en regardant les stats du boss devient une vraie décision.

Et comme avant, le type d'attaque que vous choisissez reste décisif : il pèse directement sur votre capacité à percer sa défense.

---

## Séléroc rôde dans le Cratère de météorite

**Séléroc** peut désormais être rencontré dans le **Cratère de météorite**, en plus de ses zones habituelles.

---

---

# Mise à jour 3.5.2 — Correctif capture

---

## Plus d'erreur sur `/capture` sans argument

Depuis l'ouverture de la Gen 3, un `/capture` lancé sans préciser de génération pouvait tomber sur **Hoenn** alors qu'aucune zone de cette région n'est encore débloquée — et renvoyait une erreur au lieu d'un Pokémon.

Le tirage aléatoire ne pioche désormais que parmi les générations dont au moins une zone est débloquée. Hoenn rejoindra automatiquement le tirage dès le déblocage de sa première zone.

Si vous choisissez explicitement une génération dont aucune zone n'est ouverte, un message clair vous l'indique.

---

---

# Mise à jour 3.5.1 — Correctifs & données de recherche

---

## Les légendaires ne s'attaquent plus aux raids

Les Pokémon **Légendaires** et **Légendaires itinérants** ne peuvent plus apparaître comme Pokémon enragé lors d'un raid. Ils restaient capturables et rencontrables dans les zones, mais leur présence comme boss de raid n'était pas intentionnelle.

---

## Données de recherche visibles partout

Les gains en **données de recherche** sont maintenant affichés explicitement :

- À chaque capture, le footer indique `+N données de recherche` en plus du gain XP.
- En cas de victoire en raid, les récompenses listent également le gain en données de recherche pour chaque participant.

---

## Zone Gen 3 — Jungle luxuriante

La zone **Jungle** de la Gen 3 a été renommée en **Jungle luxuriante**. Les Pokémon qui y habitaient ne sont pas affectés.

---

---

# Mise à jour 3.5.0 — Hoenn, Données de Recherche & surprises à venir

---

## Génération 3 — Hoenn disponible

135 nouveaux Pokémon de la région Hoenn (Poussifeu, Gobou, Arcko et leurs évolutions) sont désormais capturables via `/capture` et en raid. Un nouveau choix **Hoenn (Génération 3)** est disponible dans le menu déroulant de `/capture`. (Fonctionnera pas temps qu'on a pas débloqué de zone de la génération 3).

---

## Nouveau palier de rareté : Légendaire itinérant 🧭

Un nouveau palier apparaît au-dessus de Légendaire, encore plus difficile à croiser. Six Pokémon entrent dans cette catégorie : **Mew, Raikou, Entei, Suicune, Latias** et **Latios**.

---

## Recalibrage des raretés Gen 1 & Gen 2

119 raretés ont été corrigées sur les 251 Pokémon des deux premières générations, suite à un audit complet du moteur de calcul. Certains Pokémon sont devenus plus rares, d'autres plus accessibles — consultez le changelog détaillé si vous voulez le détail.

---

## Données de recherche 🔬

Chaque profil joueur dispose maintenant d'une nouvelle ressource : les **données de recherche**. Elle s'accumule au même rythme que l'XP — chaque capture ou victoire en raid rapporte les deux en même temps. Le solde est visible dans `/pokedex`.

---

## Nouvelle commande : `/capture-cible`

Dépensez vos données de recherche pour cibler une **zone** et une **rareté** précises au lieu de laisser le hasard décider. Le coût varie selon la rareté visée (de 3 300 pour Commun jusqu'à 300 000 pour Légendaire). Le solde est vérifié avant de consommer le cooldown.

---

## Nouvelle commande : `/get-pokemon-info`

Consultez la fiche complète d'un Pokémon — rareté, types, faiblesses et résistances en défense, statistiques — sans avoir besoin de l'avoir capturé.

---

## Quelque chose se prépare…

Les capteurs du Centre AURORA ont détecté une activité inhabituelle. Les techniciens restent discrets, mais les relevés ne mentent pas. Restez attentifs aux annonces à venir.

---

## Corrections

- Les faiblesses et résistances de type Feu et Eau étaient incorrectes — 106 Pokémon concernés ont été recalculés.
- Les libellés de zones mal orthographiés ou mal capitalisés ont été corrigés (ex. "Phare de Bonne-Espérance").

---

Bonne chasse, dresseurs.

---

---

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
