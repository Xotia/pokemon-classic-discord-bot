# Programme : évènement Halloween (31 octobre 2026)

Branche : `feat/halloween-event`. Release visée : `3.10.0`, déployée au plus
tard le 30 octobre au soir.

## Contexte

Évènement d'une journée, sur le modèle de l'évènement Météorite
(`src/features/meteoriteEvent/`) : zone temporaire « Manoir hanté », cooldown
réduit, XP boostée, Pokémon thématiques, sprites spéciaux, objets à trouver
(citrouilles), concours de capture avec un gagnant par serveur, World Boss
spécial, et une `/capture-cible` admin pour remettre la récompense.

Fenêtre : 31 octobre 00h00 → 23h59:59, heure de Paris. **Attention : l'heure
d'hiver commence le 25 octobre 2026, Paris est en UTC+1** (la Météorite était
en UTC+2). Dates en UTC dans le code :

- début : `2026-10-30T23:00:00Z`
- fin : `2026-10-31T22:59:59Z`

## Décisions prises

- Un gagnant par serveur.
- Le score du concours intègre des points par citrouille trouvée.
- Sprites fournis et branchés à la main par Kévin (le code ne fournit que le
  mécanisme de surcharge).
- Récompense remise via une commande admin qui exécute une capture ciblée pour
  un joueur passé en paramètre.
- `/capture-cible` reçoit un paramètre `deja_capture` (voir étape 4).
- Pokémon des générations 4+ : **ids nationaux officiels, dans des fichiers
  `pokemon-genN.json` partiels** (seulement les Pokémon de l'évènement pour
  l'instant). Raisons :
  - les captures des joueurs sont indexées par id (`captureList`) : un id
    custom obligerait à migrer tous les profils le jour où la génération
    arrive vraiment, un id national non ;
  - le jour où une génération est ajoutée, on complète le fichier au lieu de
    le créer, sans doublon ;
  - ces Pokémon n'ont que `haunted-manor` dans `zones[]` : ils ne peuvent pas
    apparaître ailleurs, et le filtre par `generation` des zones normales les
    exclut déjà.
  Les ids custom (4096+) restent réservés aux formes alternatives (Deoxys).
- **D1** Cooldown ÷2 et XP ×2 **dans le Manoir hanté uniquement**, le 31
  (comme la Météorite).
- **D2** Liste des Pokémon : celle de l'annexe, complétée plus tard par Kévin.
- **D3** Les Pokémon de l'évènement **comptent dans le total du Pokédex** :
  le total augmente du nombre de Pokémon ajoutés, aucun filtre dans
  `getTotalPokemonNumber`. Ils redeviendront capturables quand leur
  génération sera ouverte.
- **D4** Score = points par capture selon la rareté + 3 points par
  citrouille. Égalité : plusieurs gagnants.
- **D4 bis** Seules les captures faites dans le Manoir hanté pendant la
  fenêtre comptent pour le concours.
- **D5** 15 % de chance de trouver une citrouille par capture réussie, **dans
  le Manoir hanté uniquement**.
- **D6** La capture-cible admin est une **capture cadeau** : ni crédit ni
  débit de données de recherche. Raisons : une seule écriture du profil au
  lieu de trois (créditer, capturer, débiter), donc pas d'état intermédiaire
  si la capture échoue au milieu (joueur crédité de 100 000 données sans
  capture, ou débité sans rien recevoir) ; et l'historique des données du
  joueur reste juste. Pas d'option `gratuit`.
- **D8** Chance de chromatique ×3 dans le Manoir hanté le 31 (1/85 environ
  avec `SHINY_RATE=256`), `shinyRateFactor = 3`.
- **D7** World Boss d'Halloween : **Darkrai**, samedi 31 octobre 2026,
  inscriptions de 18h00 à 23h00 (Paris). Dates modifiables dans
  `halloweenEventConfig.ts`. Il reste capturable dans le Manoir comme légendaire
  de la zone ; le World Boss ne donne pas de capture (règle existante).

## Décisions à prendre

Aucune.

## Étapes

Chaque étape se termine tests verts (`npm test`) et build OK (`npm run build`).

### Étape 1 : registre d'évènements et zone Manoir hanté

La logique « zone d'évènement » est aujourd'hui codée en dur pour la Météorite
à 9 endroits (`checkIfUserCanCatch`, `computeCaptureXp`,
`handleSuccessfulCapture`, `resolveCaptureLocation`, `resolveRequestedZone`,
`handleTargetedCapture`, `computeAllZonesCompletion`, `raidScheduler`,
`applyRaidRewards`). Ajouter un second évènement par copier-coller doublerait
chaque branche.

- Créer `src/features/events/eventZones.ts` : un registre de zones
  d'évènement `{ zoneId, label, generationToken, isActive(now),
  cooldownFactor, xpMultiplier }`, avec `findActiveEventZone(input)`,
  `matchesEventZone(input)`, `getEventCooldownFactor(zone)`,
  `getEventXpMultiplier(zone)`.
- Y enregistrer la Météorite (comportement strictement identique) puis
  migrer les 9 points d'appel vers le registre.
- Ajouter `src/features/halloweenEvent/halloweenEventConfig.ts` (dates,
  `HALLOWEEN_ZONE_ID = "haunted-manor"`, label « Manoir hanté », variable
  `HALLOWEEN_EVENT_DEBUG=1` comme la Météorite) et l'enregistrer.
- Manoir : `cooldownFactor = 0.5`, `xpMultiplier = 2`, appliqués seulement
  aux captures dans la zone (D1).
- Chance de chromatique : champ `shinyRateFactor` dans le registre (1 pour
  la Météorite, 3 pour le manoir, D8). `isThePokemonGonnaBeShiny` prend la zone
  en paramètre et divise `SHINY_RATE` par ce facteur. Les deux appels
  (`handleSuccessfulCapture`, `handleTargetedCapture`) passent la zone.
  Tests : taux de base inchangé hors manoir et hors fenêtre, taux boosté dans
  le manoir le 31 (aléatoire injecté).
- Tests : ceux de la Météorite passent sans modification (filet de non
  régression du refactor) ; tests du registre (actif/inactif, bornes de
  dates UTC+1, debug).

### Étape 2 : Pokémon de l'évènement

- Ajouter `haunted-manor` aux `zones[]` des Pokémon gen1-3 retenus (D2).
- Créer `data/pokemon-gen4.json` (et suivants si besoin) avec les Pokémon
  retenus, même schéma que `pokemon-gen3.json` (`types`, `effectiveness`,
  `stats`, `generation`, `image`, `shinyImage`, `zones: ["haunted-manor"]`).
  Adapter le script `createGen3Json.ts` pour générer ces entrées plutôt que
  de les écrire à la main.
- Charger ces fichiers dans `utils/pokemonCatalog.ts`, `config/paths.ts` et
  `scripts/generate-pokemon-list.js`.
- D3 : aucun filtre sur le total. Vérifier seulement que le total du Pokédex
  et de `/stats` augmente bien du nombre de Pokémon ajoutés.
- Vérifier que les gen4+ ne sortent ni des raids (`raidGenerator.service.ts`,
  `GenerationKey`) ni des choix de génération de `/capture`.
- Lancer `npm run simulate:capture` sur le manoir pour vérifier la
  répartition des raretés (pas de rareté vide).

### Étape 3 : annonces et sprites

- `halloweenEventScheduler.ts` + `halloweenEventState.service.ts`
  (`data/guilds/<id>/halloween_event.json`) sur le modèle de la Météorite :
  annonce d'avance, ouverture, fin avec résultats du concours (étape 5).
  Mêmes garde-fous : `client.isReady()`, étape marquée faite seulement en
  cas de succès.
- Embeds de lore dans `buildHalloweenLoreEmbeds.ts`.
- Sprites : `data/halloween-sprites.json` (`{ "<id>": { image, shinyImage } }`,
  vide au départ, rempli par Kévin). Pendant l'évènement, l'embed de capture
  utilise le sprite surchargé s'il existe, sinon le sprite normal. Rien n'est
  stocké sur le profil.
- Brancher le scheduler dans `index.ts`.

### Étape 4 : `/capture-cible` : `deja_capture` et version admin

- Refactor de `handleTargetedCapture` : le joueur ciblé et les options sont
  passés en paramètres (`target: { userId, name }`,
  `{ chargeCost, onlyUncaptured }`) au lieu d'être lus sur
  `interaction.user`.
- `getRandomPokemonFromRarity` (et `getNewPokemon`) acceptent un ensemble
  d'ids à exclure.
- Nouveau paramètre optionnel `deja_capture` (booléen) sur `/capture-cible` :
  - `true` : uniquement les Pokémon déjà capturés, coût ÷2 ;
  - absent : tous les Pokémon de la rareté dans la zone, coût ÷1,5 ;
  - `false` : uniquement les Pokémon jamais capturés, plein tarif ;
  - aucun candidat : commande annulée **avant tout débit**, avec un message
    qui dit pourquoi et distingue les deux cas : « aucun Pokémon de rareté X
    dans la zone Y » et « tu as déjà capturé les N Pokémon de rareté X de la
    zone Y ».
- Nouvelle commande `/capture-cible-admin joueur zone rarity [deja_capture]` :
  contrôle `ADMIN_ID` comme les autres commandes admin, plus
  `setDefaultMemberPermissions(Administrator)` pour la masquer. Elle applique
  la capture au joueur choisi (profil créé si besoin) en capture cadeau
  (`chargeCost: false`, D6) et logge l'action (admin, joueur, Pokémon).
- Ajout dans `commandDefinitions.ts`, `index.ts`, `helpCommand.ts`.
- Tests : exclusion des capturés, refus sans débit quand le pool est vide,
  admin non autorisé refusé, données de recherche du joueur inchangées après
  une capture admin.

### Étape 5 : objets (citrouilles) et concours

- Système d'objets générique : `Player.items?: Record<string, number>` et
  `src/config/items.ts` (catalogue : `pumpkin` = « Citrouille », emoji).
- Pendant l'évènement, chaque capture réussie **dans le manoir** a 15 % de
  chance de donner une citrouille (D5) : ajout à l'inventaire, mention dans
  l'embed de capture.
- Barème de points par rareté dans `src/config/halloweenContest.ts`
  (proposition, ajustable) : common 1, uncommon 2, rare 3, very_rare 5,
  epic 8, ultra_rare 12, mythic 20, legendary 30, legendary_wandering 30.
  Citrouille : 3 points (≈ une capture rare). Un barème entier dédié plutôt
  que `RARITY_XP_MULTIPLIER` : des points lisibles dans le classement, et
  l'équilibrage de l'XP reste indépendant du concours.
- Suivi du concours dans l'état de l'évènement (par serveur) :
  `{ [userId]: { captures: Record<Rarity, number>, pumpkins: number } }`. Il
  est alimenté depuis `handleSuccessfulCapture` (pas depuis `captureList`,
  qui est cumulatif), selon D4 bis. Les captures ciblées ne comptent pas,
  sinon les données de recherche achètent le concours.
- Score selon D4, calculé à la lecture (on ne stocke que les faits, le barème
  reste ajustable jusqu'à la fin).
- Commande `/concours` : ton score, ton rang, top 10 du serveur.
- Commande `/inventaire` : objets possédés.
- À la fin de l'évènement, le scheduler annonce le ou les gagnants de chaque
  serveur (égalité = plusieurs gagnants) et les logge. L'admin remet ensuite
  la récompense avec `/capture-cible-admin`.
- Tests : score, égalité à plusieurs gagnants, drop de citrouille (aléatoire
  injecté, manoir uniquement), rien n'est compté hors fenêtre ni hors
  manoir.

### Étape 6 : World Boss d'Halloween

- **6.0** Fait : Pokémon et horaire fixés par D7 (Darkrai, 18h-23h). Entrée
  `wb-halloween-2026-darkrai` ajoutée avec ses données (portail « Chambre des
  Cauchemars du Manoir hanté », stats du Pokédex #491).
- Ajouter l'entrée du boss (D7) dans `data/world-boss-list.json` avec un
  indicateur `eventOnly: true`. `getAliveWorldBosses` exclut les entrées
  `eventOnly` du tirage hebdomadaire.
- Un tick global (`halloweenWorldBossScheduler.ts`, état dans
  `data/halloween_world_boss.json`) ouvre le World Boss le 31 via
  `openWorldBoss(client, { bossId })` et le ferme avec
  `closeWorldBossAndResolve` à l'horaire choisi, seulement si le boss ouvert
  est Darkrai. Le World Boss est global : l'ouverture se fait une seule fois,
  pas par serveur. Il utilise les dates explicites, pas `HALLOWEEN_EVENT_DEBUG`.
- Vérifier qu'aucun World Boss hebdomadaire ne tombe dans la même fenêtre (le
  31 est un samedi) : sinon l'ouverture forcée tombe sur « déjà ouvert ».
- Tests : boss `eventOnly` jamais tiré au hasard, ouverture forcée.

### Étape 7 : release

- `FEATURES.md`, `PATCHNOTE.md`, `CHANGELOG.md`, version `3.10.0`.
- `npm run deploy` (nouvelles commandes et nouveau paramètre).
- Répétition générale en dev avec `HALLOWEEN_EVENT_DEBUG=1` : capture dans le
  manoir, citrouille, `/concours`, annonce de fin, capture-cible admin.

## Calendrier

| Jour | Étapes |
|---|---|
| 27-28 oct | 1, 2 |
| 28-29 oct | 3, 4 |
| 29-30 oct | 5, 6 |
| 30 oct | 7, déploiement |

Si le temps manque, on coupe dans cet ordre : World Boss (étape 6), sprites,
`/inventaire`. Le cœur (zone, boost, Pokémon, concours, récompense) reste.

## Annexe : Pokémon proposés (D2)

- Gen 1 : Pikachu, Raichu, Rattatac, Fantominus, Spectrum, Ectoplasma, Mélofée, Osselait, Ossatueur,
  Hypnomade, M. Mime, Noeunoeuf.
- Gen 2 : Pichu, Feuforêve, Zarbi, Noctali, Cornèbre, Malosse, Démolosse, Teddiursa, Togepi, Mimigal,
  Migalos.
- Gen 3 : Polichombr, Branette, Skelénox, Téraclope, Ténéfix, Absol.
- Gen 4+ : Spiritomb, Magirêve, Noctunoir, Momartik, Motisma, Corboss,
  Pitrouille et Banshitrouye (le Pokémon citrouille, indispensable),
  Funécire, Mélancolux, Lugulabre, Mimiqui, Théffroi, Polthegeist.

Les Pokémon gen 1-3 gardent leur rareté actuelle. `computeRarity` s'appuie
sur les rencontres des versions gen 3 : il ne sait pas noter les gen 4+, dont
la rareté est donc fixée à la main (ajustable) :

| Id | Pokémon | Rareté |
|---|---|---|
| 607 | Funécire | common |
| 710 | Pitrouille | uncommon |
| 608 | Mélancolux | rare |
| 854 | Théffroi | rare |
| 429 | Magirêve | very_rare |
| 430 | Corboss | very_rare |
| 407 | Roserade | very_rare |
| 442 | Spiritomb | epic |
| 477 | Noctunoir | epic |
| 478 | Momartik | epic |
| 609 | Lugulabre | epic |
| 855 | Polthegeist | epic |
| 479 | Motisma | ultra_rare |
| 711 | Banshitrouye | ultra_rare |
| 778 | Mimiqui | ultra_rare |
| 491 | Darkrai | legendary |
| 4106–4110 | Motisma, formes Chaleur, Lavage, Froid, Hélice, Tonte (ids custom, comme les formes de Deoxys) | ultra_rare |
