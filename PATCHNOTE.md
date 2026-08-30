# Mise à jour 3.7.0 — Les portails s'ouvrent

---

## Une créature, tous les centres, une seule équipe

Un raid, vous le défendez chez vous. Un **world boss**, non.

Chaque dimanche, un portail s'ouvre au-dessus de tous les centres de recherche en même temps. On ne le défend pas : on le **franchit**. De l'autre côté, les portails débouchent tous au même endroit — une dimension parallèle où les centres du monde entier se rejoignent, et où attend une créature de masse démesurée : une forme **Gigamax**.

Pourquoi aller la chercher plutôt que l'attendre ? Parce qu'un portail se traverse dans les deux sens. Si elle le franchit avant d'avoir été vaincue, elle ne débarque pas au-dessus d'un centre : elle débarque au-dessus de **tous**, et aucun n'a de quoi encaisser une masse pareille. Le combat se fait de l'autre côté pour qu'il n'ait jamais lieu de celui-ci.

Un dresseur qui franchit le portail depuis son centre apparaît sur les écrans de tous les autres : il est arrivé au même endroit qu'eux. Pas de classement entre centres — une seule équipe, un seul combat, un seul résultat, le même pour tout le monde.

---

## Le rythme

**Dimanche 12h00** — le portail s'ouvre, la créature est identifiée, l'engagement est ouvert partout.
**Jusqu'à 20h00** — vous pouvez engager un Pokémon, ou changer d'avis.
**Dimanche 20h00** — le portail se ferme et le combat se joue de l'autre côté. Le résultat tombe partout en même temps.

---

## S'engager

```
 /world-boss <pokemon> [type]      franchir le portail avec un Pokémon
 /world-boss-squad                 voir la créature et l'équipe déjà engagée
```

Un dresseur, un Pokémon, capturé dans la saison en cours comme pour les raids. Vous pouvez changer votre engagement jusqu'à 20h00, le dernier compte.

Attention à un point : **l'unicité porte sur votre compte, pas sur le centre**. Si vous vous engagez depuis un second centre, votre nouvel engagement remplace le premier, il ne s'y ajoute pas.

`/world-boss-squad` affiche la ligne **entière**, dresseurs des autres centres compris. Regardez-la avant de choisir : c'est le seul moyen de savoir ce qui manque encore.

---

## En cas de victoire

Un world boss ne se capture pas. Ce n'est pas une prise, c'est une menace qui cesse d'exister.

En revanche, une créature de cette masse laisse derrière elle une quantité de relevés **sans commune mesure avec un raid**. Chaque dresseur engagé reçoit de l'**expérience** et des **données de recherche** à la hauteur de ce qui a été vaincu, sur son centre d'origine. Une victoire de dimanche pèse plusieurs semaines de captures.

Les dresseurs restés de ce côté-ci ne reçoivent rien.

---

## Vous n'avez plus à deviner

Jusqu'ici, un raid se jouait à l'aveugle. Vous engagiez un Pokémon, vous
attendiez la clôture, et vous appreniez à ce moment-là que la défense de
l'équipe manquait de trente points. Trente points qu'un seul renfort aurait
comblés — si quelqu'un avait pu les voir à temps.

Le centre de recherche a reconstitué le calcul exact qui décide de l'issue d'un
raid, et il vous l'ouvre. **Le simulateur de raid du centre de recherche est en
ligne.**

**Accès : https://xotia.github.io/pokemon-classic-discord-bot/**

---

## Ce qu'il fait

Vous saisissez la créature du raid, son niveau de menace, et les Pokémon déjà
engagés. Le simulateur rejoue le combat et vous rend le verdict — le vrai, celui
qui tombera à la clôture.

Surtout, il vous dit **pourquoi**. Un raid ne se joue pas en points de vie, il
se joue sur **cinq axes** : vos attaques contre ses défenses, vos défenses
contre ses attaques, et la vitesse face à la vitesse. Les stats de toute
l'équipe sont additionnées, puis comparées axe par axe.

**Il faut dépasser la créature sur les cinq à la fois.** Un seul axe à égalité
suffit à faire échouer le raid, quelle que soit votre avance sur les autres.
C'est la règle qui a coûté le plus de raids, et c'est celle que le simulateur
vous montre en clair : il affiche l'écart sur chaque axe et nomme ceux qui
manquent.

Un bouton « Voir le calcul » détaille tout, ligne par ligne : les stats de la
créature multipliées par sa menace, et l'apport de chaque défenseur, efficacités
de type comprises.

---

## À quoi ça sert concrètement

Avant la clôture des inscriptions, vous pouvez enfin répondre à des questions
qui restaient sans réponse :

- **Est-ce que l'équipe actuelle passe ?** Saisissez les inscrits, vous avez le
  verdict.
- **Qu'est-ce qui manque ?** Le simulateur nomme les axes en déficit.
- **Un dresseur de plus suffirait-il ?** Ajoutez-le et regardez l'écart bouger.
- **Faut-il changer de type d'attaque ?** Le type se choisit pour chaque
  Pokémon, l'effet est immédiat.

De quoi organiser une composition à plusieurs plutôt que de croiser les doigts.

---

## Ce qu'il ne fait pas

Le simulateur **ne connaît pas le raid en cours**. Il ne sait pas quelle
créature est apparue chez vous ni qui s'est déjà inscrit : c'est vous qui
saisissez la composition. Une équipe saisie de travers donne une projection de
travers.

En revanche, le calcul, lui, est le vrai : c'est le moteur de combat du bot,
à l'identique. Une composition qui gagne dans le simulateur gagne dans le raid.

---

## Aussi dans cette mise à jour

- **`/zone-progression <zone>`** — pour la zone de votre choix, votre nombre de
  Pokémon différents capturés sur le total présent, le pourcentage, ce qu'il
  vous reste à trouver et vos shinys. Un Pokémon présent dans plusieurs zones
  compte dans chacune : les pourcentages de deux zones ne s'additionnent pas.
- **`/get-pokemon-info` connaît les Gigamax.** Tapez le nom d'un world boss et
  vous obtenez sa fiche : lore, portail, types, faiblesses et résistances. Pas
  de statistiques — celles d'un Gigamax dépendent du portail tiré le dimanche.
- Le simulateur est utilisable au téléphone, ce qui est probablement là que vous
  le consulterez en pleine négociation d'équipe sur Discord.
- Les types s'affichent sous leur nom français partout dans l'outil.

---

## Rien ne change pour le reste

Les raids quotidiens, les captures, le Pokédex et les classements continuent exactement comme avant. Le world boss s'ajoute, il ne remplace rien.

---

---

# Mise à jour 3.6.0 — Les raids d'exploration repartent de l'avant

---

## Johto ne bloque plus la découverte de nouvelles zones

Toutes les zones de **Johto** sont débloquées depuis un moment. Le problème : quand le raid du jour tirait Johto, il n'avait plus rien à ouvrir — et l'occasion d'explorer une nouvelle zone était perdue pour la journée, sans que personne ne le voie.

Le tirage a été revu. Le raid décide maintenant **d'abord** s'il part à la découverte d'une nouvelle zone, **ensuite** dans quelle région. Une région déjà entièrement explorée ne peut donc plus consommer une expédition à sa place.

Concrètement : les raids de déblocage retrouvent leur fréquence normale, et Kanto comme Hoenn avancent au rythme prévu. Le jour où ces deux régions seront terminées à leur tour, le mécanisme tiendra tout seul.

---

## Rien ne change pour vous

Aucune action de votre côté, aucun changement dans la façon de s'inscrire ou de combattre. Les raids sur les zones déjà connues continuent exactement comme avant.

---

---

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
