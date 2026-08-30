# Changelog

Tous les changements notables du **Pokémon Classic Discord Bot** sont documentés ici.  
Format basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

# [3.7.0] - 2026-08-30

## Ajouts

### World Boss — un événement unique pour tous les serveurs
- Nouveau système d'événement hebdomadaire, distinct du raid : **un seul boss, une seule équipe, un seul résultat** pour tout le parc de serveurs. Là où le raid est local à un serveur, le world boss agrège les défenseurs de tous les serveurs dans une ligne commune.
- Créneau fixe : ouverture le **dimanche à 12h00**, clôture à **20h00**, fuseau `Europe/Paris`, identique partout. Le scheduler enregistre **deux crons pour tout le parc**, jamais un couple par serveur : boucler sur le registre aurait produit N ouvertures et N résolutions du même événement.
- État global dans `data/world-boss.json` et `data/world-boss-history.json`, à la racine de `data/` et non par serveur. Toutes les écritures passent par un verrou par fichier.
- Le moteur de combat du raid a été extrait en `computeBruteBattleResult` et est réutilisé tel quel : les deux événements ne peuvent pas diverger sur la résolution. La validation des Pokémon inscrits est elle aussi celle du raid, réutilisée sans copie.

### Catalogue de boss autonome — les 33 Gigamax
- `data/world-boss-list.json` : chaque entrée porte ses propres stats, types, efficacités défensives, sprite, portail et lore, sans dépendre du catalogue Pokémon. Le fichier est validé au chargement, une entrée malformée fait échouer le démarrage plutôt que l'événement du dimanche.
- Peuplé avec les **33 formes Gigamax** du jeu (32 espèces, Shifours comptant pour ses deux styles). Les efficacités défensives sont dérivées de `data/all_types.json` en croisant les deux types, les stats sont les stats de base réelles de chaque espèce.
- Tirage aléatoire uniforme parmi les boss jamais vaincus. Une **victoire retire le boss du vivier définitivement**, dans la même écriture verrouillée que l'entrée d'historique ; une défaite ne retire rien. Vivier épuisé : aucun événement n'est ouvert et l'état reste `idle`, traité comme un cas normal par le cron comme par le forçage admin.

### `/get-pokemon-info` accepte les Gigamax
- L'autocomplétion de la commande liste désormais les 33 Gigamax en plus du Pokédex du serveur, et la fiche d'un Gigamax affiche son lore, son portail, ses types, ses faiblesses et ses résistances.
- Ni rareté ni statistiques sur cette fiche : les stats d'un world boss dépendent de la difficulté tirée à l'ouverture du portail et n'ont pas de valeur hors combat.

### Difficulté héritée de la mobilisation précédente
- La difficulté multiplie les stats de base du boss et vaut le **nombre de participants de l'événement précédent**, avec un repli à 6 s'il n'y a pas de précédent ou si le précédent n'a eu aucun inscrit.
- L'historique est écrit à chaque cycle, défaite et événement désert compris, sans quoi la difficulté suivante repartirait sur une valeur périmée.

### La difficulté n'est plus chiffrée côté joueur : elle est une couleur de portail
- `worldBossPortalTier` traduit `boss.difficulty` en palier coloré, **un palier par point de difficulté de 1 à 9** : 🟢 vert, 🔵 bleu, 🟡 jaune, 🟠 orange, 🔴 rouge, 🟣 violet, 🟤 cuivré, ⚫ noir, ⚪ blanc. Le dernier palier est ouvert vers le haut : une mobilisation exceptionnelle ne sort pas de l'échelle. La couleur du palier noir est `0x0b0b0b` et non `0x000000`, que Discord interprète comme « pas de couleur ».
- Les trois embeds joueurs (annonce, équipe, résultat) désignent le portail par sa couleur et prennent la **couleur du palier** comme couleur d'embed. Le nom de brèche propre à chaque boss (`portal`) ne figure plus dans les embeds de l'événement ; il reste consultable hors combat via `/get-pokemon-info`, et dans les logs.
- Aucun changement de calcul : la difficulté reste le multiplicateur de stats et la source des récompenses. Elle reste chiffrée là où elle sert à opérer — logs, historique, réponse de `/world-boss-force-start`, option `difficulte` du forçage.

### Annonce d'ouverture resserrée
- Nouveau format : titre « 🌀 Un Portail {couleur} s'est ouvert au-dessus du centre de recherche ! », puis présence du boss, appel à mobilisation, types, commande, heure de fin. Plus de champs d'embed, tout tient dans la description.
- Le caractère mondial tient en une phrase (« les dresseurs de l'ensemble des centres de recherche du monde sont appelés à se mobiliser : tous les portails ouvrent sur le même combat »), qui remplace l'ancienne explication sur l'équipe mondiale.
- Retirés de l'annonce : le lore du boss, le nom de la brèche, la formule « X force le portail » et les lignes d'ambiance par palier. Un test verrouille leur absence.

### `/world-boss` et `/world-boss-squad`
- `/world-boss <pokemon_name> [type]` engage un Pokémon dans la ligne mondiale. L'unicité porte sur le **compte Discord seul**, pas sur le couple serveur/joueur : se réinscrire depuis un autre serveur remplace l'engagement au lieu de l'ajouter.
- Le pseudo et le nom du serveur sont figés à l'inscription, `guild.members.fetch()` ne traversant pas les serveurs.
- `/world-boss-squad` affiche la ligne complète, regroupée par serveur d'origine, et rend exactement le même contenu depuis n'importe quel serveur. Les plafonds Discord (25 champs, 1024 caractères par champ) sont gérés par regroupement et mention explicite du surplus, jamais par troncature silencieuse.

### `/world-boss-force-start` et `/world-boss-force-end` (admin)
- Ouverture et clôture manuelles, réservées à l'`ADMIN_ID`, en réponse éphémère. `force-start` accepte un `boss` (autocomplétion restreinte aux boss encore vivants) et une `difficulte`, refuse d'ouvrir si un événement est déjà en cours, refuse un boss déjà vaincu et annonce explicitement un vivier épuisé.

### Récompenses
- Chaque participant reçoit **XP** et **données de recherche** à hauteur des PV de base du boss × difficulté × **10**, crédités sur son serveur d'inscription. Le multiplicateur (`WORLD_BOSS_REWARD_MULTIPLIER`) tient au rythme de l'événement : un rendez-vous par semaine face à un raid quotidien. Pas de capture, pas de déblocage de zone.
- Nouveau compteur `worldBossWins` dans les profils joueurs.
- Les gains sont groupés par serveur : un seul `updatePlayers` par `players.json`, jamais un appel par joueur. Un serveur illisible ou un profil disparu ne prive pas les autres de leurs gains.

### `/zone-progression` — avancement du joueur zone par zone
- Nouvelle commande joueur : pour une zone donnée (autocomplétion, mêmes zones que `/capture`), affiche le nombre de Pokémon différents capturés sur le total présent dans la zone, le pourcentage, le reste à trouver et le nombre de shinys.
- **Aucun compteur n'est stocké dans `players.json`** : le calcul est refait à chaque appel. Un compteur dérivé aurait dû être invalidé à chaque capture *et* à chaque modification des `zones[]` du catalogue (rééquilibrage, ajout d'un roster custom, nouvelle génération), avec un pourcentage faux et silencieux à la moindre invalidation manquée. Le coût évité est nul : le catalogue est déjà en mémoire et `captureList` est indexée par id.
- L'unité comptée est le **Pokémon différent**, pas la capture : 12 captures du même Pokémon valent 1.
- Un Pokémon présent dans plusieurs zones compte dans chacune. Les pourcentages de deux zones ne s'additionnent donc pas, et le pied de l'embed le dit.
- Les Pokémon sans zone (les 4 formes de Deoxys, le roster custom de chaque serveur) n'entrent dans aucun total : la somme des zones ne fait pas le Pokédex complet, c'est voulu.
- Une zone connue mais pas encore débloquée sur le serveur est refusée explicitement plutôt que traitée comme inconnue. La zone d'événement n'est consultable que pendant l'événement, exactement comme dans `/capture`.

### Index zone -> Pokémon
- `getZonePokemonIndex` construit une fois par serveur la table `zoneId -> Set<id>`, avec la même durée de vie que le cache du catalogue (le process). Le filtrage par zone de `getRandomPokemonFromRarity` passe par cet index : la capture et la progression partagent désormais une seule définition de « ce Pokémon appartient à cette zone », et le filtre est en O(1) par Pokémon au lieu d'un `includes` sur le tableau `zones`.
### Simulateur de raid public (site statique)
- Nouvel outil joueur : `tools/raid-simulator/`, publié sous forme de site **100 % statique** sur GitHub Pages (https://xotia.github.io/pokemon-classic-discord-bot/). Les joueurs saisissent la créature et l'équipe engagée, l'outil rejoue le combat et rend le verdict avant la clôture des inscriptions.
- **Rien n'est hébergé sur le VPS.** Le simulateur ne vit pas sur la machine du bot, n'y ouvre aucun port et n'ajoute aucun service à superviser : le seul hébergement auto-géré envisagé (nginx sur le VPS) aurait ajouté une surface exposée sur la machine du bot pour un site qui n'a besoin de rien.
- L'outil ne parle à rien — ni au bot, ni à Discord, ni à une base. Il ne connaît pas l'état du raid en cours, par choix : une version branchée sur les données live aurait demandé une API exposée depuis le VPS, pour un gain que la saisie manuelle couvre déjà.
- Publication par `.github/workflows/deploy-raid-simulator.yml` : déclenchée par les push sur `main` touchant au simulateur ou aux fichiers `data/pokemon-gen*.json`, plus déclenchement manuel. Le workflow **rejoue les deux tests garde-fous avant de publier** : un simulateur qui a dérivé du moteur du bot n'atteint pas les joueurs. Permissions minimales au niveau workflow (`contents: read`), élévation `pages`/`id-token` sur le seul job de déploiement, actions épinglées par SHA, `concurrency` sans annulation d'un déploiement en cours.
- `npm run build` ne construit **pas** le simulateur, volontairement : un pokédex malformé doit faire échouer la publication du site, pas un déploiement du bot. En local, `npm run raid-sim:build` construit et `npm run raid-sim` prévisualise.
- Les chemins d'assets de la page sont tous relatifs : le site fonctionne sous le sous-chemin `/pokemon-classic-discord-bot/` de GitHub Pages.

### Moteur de combat partagé et verrouillé
- Le calcul du simulateur vit dans `tools/raid-simulator/src/raidSimCore.js`, chargeable à la fois par le navigateur et par Node.
- `tests/raid/raidSimulatorParity.test.ts` compare ce moteur à `computeBruteBattleResult` sur une matrice de cas : immunités (division par zéro, défenses infinies), attaque sans effet, types absents des tables d'efficacité, type d'attaque non renseigné, équipes de 0 à 8 défenseurs. L'ordre d'accumulation des stats reproduit celui du bot, aux flottants près.
- Sans ce test, une évolution du moteur côté bot ferait annoncer aux joueurs des victoires qui n'auront pas lieu. C'est le seul garde-fou contre cette dérive.

### Habillage aux couleurs du centre de recherche
- Refonte visuelle complète : identité « terminal du centre de recherche », panneaux numérotés, chiffres en chasse fixe, verdict en deux états lisibles d'un coup d'œil.
- Libellés réécrits en langage joueur (« niveau de menace » au lieu de « multiplicateur de stats », stat affrontée explicitée avec le possessif correct).
- Nouveaux blocs pédagogiques : règle des cinq axes, explication du verdict nommant les axes en déficit, et mention explicite que les PV ne décident de rien — ils sont affichés en gris, marqués « indicatif ».
- Cas des défenses infinies (défenseur insensible au type d'attaque de la créature) accompagné d'une explication, au lieu d'un `∞` brut qui passait pour un bug d'affichage.
- Page utilisable au téléphone : colonne unique sous 620 px, cibles tactiles à 44 px, tableaux larges dans un conteneur à défilement propre. Favicon et métadonnées de partage pour le lien collé dans Discord.

## Sécurité

- **Route `/data/` supprimée du serveur du simulateur.** Elle servait n'importe quel `.json` du dossier `data/` du bot : `players.json` (identifiants Discord et collections des joueurs) et `guilds.json` (identifiants de serveurs et de salons) étaient accessibles dès lors que le serveur tournait. En usage local l'exposition restait sur la machine ; mise en ligne telle quelle, c'était une fuite de données personnelles.
- Le pokédex publié est désormais un **asset généré** (`pokedex.json`), reconstruit champ par champ à partir d'une liste blanche : id, nom, sprite, types, stats, efficacités défensives. Ni rareté, ni zones, ni génération, ni nom d'origine. Une entrée incomplète fait échouer le build plutôt que de produire un simulateur qui calcule faux. `tests/scripts/buildRaidSimulator.test.ts` verrouille cette liste.
- `server.js` est désormais un serveur d'**aperçu local uniquement** : il ne sert que le dossier buildé, refuse les méthodes autres que GET/HEAD, n'accepte que les extensions attendues, et sa vérification de confinement compare sur `racine + séparateur` (un dossier voisin de même préfixe ne passe plus). Il écoute sur `127.0.0.1` par défaut.
- **`package-lock.json` est désormais versionné** et le workflow installe avec `npm ci` (au lieu de `npm install`). Depuis cette version la CI build un site public : sans lockfile, une mise à jour de dépendance transitive pouvait changer le simulateur mis en ligne sans qu'aucun commit ne bouge. Le cache npm de `setup-node` devient utilisable au passage.
- `.gitignore` : `tools/` était entièrement ignoré (« outil local, non déployé »). L'exception `!tools/raid-simulator/` est nécessaire pour que le workflow GitHub Pages trouve les sources à builder ; `dist-web/` reste ignoré, c'est un artefact.

## Corrections

- **`send-patchnote` ne tronque plus la fin d'une note de version.** La description d'un embed Discord plafonne à 4096 caractères ; au-delà, le script coupait net et remplaçait le reste par « *(suite sur le dépôt)* ». L'entrée 3.7.0 fait ~7 500 caractères : la moitié du patchnote n'aurait pas été lue. Le corps est désormais découpé aux séparateurs de section et envoyé en plusieurs messages (2 pour la 3.7.0), les entrées courtes restant en un seul message. Logique isolée dans `src/scripts/announcements/lib/patchnote.ts` et couverte par `tests/announcements/patchnote.test.ts`, dont un test qui vérifie qu'aucun mot n'est perdu au découpage.
- **Sprites Gigamax corrigés.** Les deux formes de Shifours étaient interverties (Poing Final portait le sprite de Mille Poings) et Mille Poings pointait sur un PNG fixe au lieu d'un GIF animé. Pyrobut utilisait le sprite rétro `gen5ani`, seul de la liste dans ce style. Les 33 sprites ont été vérifiés un à un contre la référence PokéAPI.

### Filet sur les commandes non câblées
- `handleInteraction` était une chaîne de `if` sans cas par défaut : une commande déclarée dans `commandDefinitions.ts` mais absente du dispatch traversait tout, la fonction retournait, et Discord affichait « l'application ne répond pas » au bout de 3 secondes — sans une ligne de log. Le symptôme ne désignait pas sa cause.
- La chaîne se termine désormais par un log `unhandled_command` et une réponse éphémère nommant la commande fautive.
- `tests/commandWiring.test.ts` compare les noms déclarés dans `commandDefinitions.ts` à ceux aiguillés dans `index.ts` : un trou de câblage est rouge au test au lieu d'être silencieux en production.

### Hygiène du dépôt
- `src/scripts/raid-tools/simulateRaidZones.ts` et `simulateRaidModels.ts` étaient ignorés alors que `package.json` expose `npm run simulate:raid-zones` : la commande échouait sur tout clone neuf. Les deux scripts sont versionnés.
- Ajoutés au `.gitignore` : `coverage/` (sortie `vitest --coverage`) et `.claude/settings.local.json`, qui ne dépendait jusqu'ici que du `.gitignore` global de la machine.
- Commentaire explicite sur `data/players_example.json` : malgré son nom, le fichier contient de vrais identifiants Discord et de vrais pseudos. La règle qui l'ignore ne doit jamais être retirée.

## Tests
- Suite dédiée `tests/worldBoss/`, dont un scénario **bout-en-bout sur deux serveurs simulés** avec joueurs fictifs et vrais fichiers `players.json` : annonce double, vision partagée, inscriptions concurrentes, double inscription inter-serveurs, récompenses créditées des deux côtés, historique, difficulté héritée, boss vaincu jamais retiré, vivier épuisé.
- Checklist de vérification manuelle : `data/spec/WORLD_BOSS_TESTING_CHECKLIST.md`.

## Modifications
- Numéro de version : 3.6.0 → 3.7.0.
- `/help` liste les cinq nouvelles commandes.

---
# [3.6.0] - 2026-08-15

## Corrections

### Raids — le tirage « nouvelle zone » ne se perd plus sur une génération épuisée
- Le raid tirait d'abord sa génération, puis décidait s'il ouvrait la prochaine zone à débloquer. Quand le tirage tombait sur une génération dont toutes les zones sont déjà débloquées (Johto aujourd'hui), la chance « nouvelle zone » était consommée pour rien et le raid repartait sur une zone connue. Plus une génération est terminée, plus la progression des autres ralentit.
- L'ordre est inversé : le type de raid (nouvelle zone ou zone connue) est décidé en premier, puis la génération est tirée parmi celles qui peuvent réellement l'honorer. `RAID_NEXT_ZONE_CHANCE` redevient la fréquence réelle des raids de déblocage, et le comportement reste correct au fur et à mesure que gen1 puis gen3 s'épuiseront à leur tour.
- Aucune relance de tirage n'est utilisée : quand plus aucune génération n'a de zone à débloquer, le raid part sur une zone déjà débloquée. Pas de boucle potentiellement infinie.
- Le fallback historique est conservé : une génération sans aucune zone débloquée ouvre quand même sa première zone à débloquer.

## Ajouts

### `/raid-force-start` — lancement manuel d'un raid (admin)
- Nouvelle commande réservée à l'`ADMIN_ID` du `.env`, avec deux paramètres facultatifs : `generation` (Kanto / Johto / Hoenn) et `nouvelle-zone` (prochaine zone à débloquer ou zone déjà débloquée). Sans paramètre, le raid suit le tirage normal.
- La commande refuse de lancer un second raid si des inscriptions sont déjà ouvertes, et renvoie un message explicite quand la combinaison demandée est impossible (par exemple `generation: Johto` + `nouvelle-zone: true`, Johto n'ayant plus rien à débloquer).
- Réponse éphémère côté admin ; l'annonce du raid part normalement dans le salon dédié.

## Modifications
- Numéro de version : 3.5.3 → 3.6.0.

---

# [3.5.3] - 2026-08-11

## Modifications

### Raids — les stats de l'équipe affrontent les stats opposées du boss
- La résolution d'un raid ne compare plus chaque statistique à son homonyme chez le boss. L'Attaque et l'Attaque Spé. de l'équipe affrontent désormais la Défense et la Défense Spé. du boss, sa Défense et sa Défense Spé. affrontent l'Attaque et l'Attaque Spé. du boss. La Vitesse reste le seul axe symétrique.
- L'ancienne comparaison en miroir demandait à l'équipe d'opposer une armure à l'armure du boss, ce qui n'avait pas de sens en combat. Les multiplicateurs de type étaient déjà calculés dans le sens croisé (l'attaque de l'équipe pondérée par son efficacité contre le boss, sa défense divisée par l'efficacité de l'attaque du boss) : seul le verdict final était resté en miroir.
- Simulation comparative sur les 173 boss réellement tirables × difficultés 2 à 5 : la difficulté globale ne bouge pas (écart moyen de -0,02 défenseur requis, 504 couples sur 692 inchangés). Le changement redistribue la difficulté selon le profil du boss au lieu de la déplacer. Un boss très offensif et peu défensif devient dur à encaisser mais facile à percer, là où il était puni deux fois auparavant.
- `resolveRaid` construit les écarts du cas « aucun défenseur » à partir du même appariement, les deux chemins de résolution ne peuvent plus diverger.

### Catalogue Pokémon
- Séléroc (#337) apparaît désormais aussi dans le Cratère de météorite, en plus de ses zones existantes.

### Divers
- Numéro de version : 3.5.2 → 3.5.3.

---

# [3.5.2] - 2026-08-09

## Corrections

### Capture aléatoire — générations sans zone débloquée
- `/capture` sans argument ne tire plus une génération dont aucune zone n'est débloquée. Depuis le passage de `GENERATION_NUMBER` à `3`, le tirage pouvait sortir `gen3` alors qu'aucune zone de Hoenn n'était accessible, ce qui provoquait une erreur côté joueur.
- Nouveau helper `getAvailableGenerations` : croise le plafond `GENERATION_NUMBER` avec les zones réellement débloquées de la guilde. Une génération entre dans le pool dès le déblocage de sa première zone, sans redéploiement.
- Choisir explicitement une génération sans zone débloquée renvoie désormais un message clair au lieu d'une erreur technique.

### Mise à jour serveur — accumulation de screens
- `npm run get-last-update` réutilise désormais toujours la même session `screen` au lieu d'en laisser s'empiler de nouvelles à chaque mise à jour.
- La session est ciblée par son identifiant complet (`pid.nom`) : avec plusieurs sessions homonymes, le ciblage par nom seul devenait ambigu et les commandes n'atteignaient plus le bot.
- Les sessions mortes sont purgées (`screen -wipe`) et les doublons portant le même nom sont fermés au début de chaque mise à jour.
- La session est créée en shell et non en session-commande : le Ctrl+C d'arrêt du bot ne tue plus le screen, qui survit d'une mise à jour à l'autre.

## Modifications
- Numéro de version : 3.5.1 → 3.5.2.

---

# [3.5.1] - 2026-07-25

## Ajouts

### Données de recherche — affichage des gains
- Le footer de chaque capture affiche désormais le gain en données de recherche (`+N données de recherche`), en plus du gain XP.
- L'embed de résultat de raid affiche le gain en données de recherche dans les récompenses (`🔬 +N données de recherche pour chaque participant`).

## Corrections

### Raids — exclusion des légendaires du pool de boss
- Les Pokémon de rareté `legendary` et `legendary_wandering` sont désormais exclus du tirage du Pokémon enragé lors de la génération d'un raid.
- Avant ce correctif, un légendaire présent dans la zone pouvait être sélectionné comme boss de raid.

### Catalogue Pokémon
- **Jirachi** (id 385, Gen 3) retiré de `pokemon-gen1.json` où il était présent par erreur.

### Zone Gen 3 — renommage
- Zone `jungle` renommée en `lush-jungle` (label : **Jungle luxuriante**) dans `zones_all.json`, `zones_to_unlock.default.json` et `pokemon-gen3.json`.

## Modifications

### Script `init-research-data`
- Ajout du flag `--all` : traite toutes les guildes en une seule commande.
- Usage : `ts-node src/scripts/player-maintenance/init-research-data.ts --all`.

### Script `get-last-update`
- Retrait de l'envoi automatique du patchnote depuis le script de mise à jour serveur — à envoyer manuellement via `npm run send-patchnote`.

## Suppressions
- `FEATURES.md`, `PROGRAM.md` et `REFACTOR_MULTI_GUILD.md` retirés du repo et ajoutés au `.gitignore` (documents de développement internes).

## Modifications
- Numéro de version : 3.5.0 → 3.5.1.

---

# [3.5.0] - 2026-07-24

## Ajouts

### Génération 3 — Hoenn
- 135 Pokémon Hoenn (Gen 3) capturables via `/capture` et `/raid`, avec leurs zones de spawn dédiées.
- Nouveau choix `Hoenn (Génération 3)` dans le dropdown `/capture`.
- Variable d'environnement `GENERATION_NUMBER` passée de `2` à `3` — Gen 3 incluse dans le tirage aléatoire de capture.

### Nouveau palier de rareté : Légendaire itinérant
- Palier `legendary_wandering` ajouté au-dessus de `legendary`, avec un taux d'apparition encore plus faible.
- 6 Pokémon classés dans ce palier : **Mew, Raikou, Entei, Suicune, Latias, Latios**.
- Emoji dédié 🧭 dans `/get-rarity`.

### Recalibrage des raretés Gen 1 & Gen 2
- Audit complet des 251 Pokémon Gen 1 et Gen 2 via le moteur de rareté.
- **119 raretés corrigées** (77 en Gen 1, 42 en Gen 2) suite à relecture manuelle.

### Ressource "Données de recherche"
- Nouveau champ `researchData` sur chaque profil joueur, initialisé à la valeur XP actuelle à la migration.
- À chaque gain d'XP (capture normale ou raid), le même montant est octroyé en données de recherche.
- Solde visible dans `/pokedex`.

### Commande `/capture-cible`
- Nouvelle commande permettant de cibler une **zone** et une **rareté** précises en échange de données de recherche.
- Coûts : common 3 300 / uncommon 4 000 / rare 5 000 / very_rare 8 500 / epic 14 500 / ultra_rare 25 000 / mythic 100 000 / legendary et legendary_wandering 300 000.
- Le solde est vérifié et débité de façon atomique — aucune dépense si le cooldown n'est pas disponible ou si aucun Pokémon n'est disponible à la rareté demandée.

### Commande `/get-pokemon-info`
- Affiche les informations d'un Pokémon depuis le catalogue complet : id, nom FR/EN, rareté, types, faiblesses et résistances en défense, statistiques.
- Autocomplete sur les 393 Pokémon (Gen 1, 2 et 3).

### Événement à venir (non annoncé)
- Infrastructure d'événement ponctuel intégrée : zone dédiée, bonus XP et cooldown, raids spéciaux, embeds de lore, scheduler par guilde.
- Détails non divulgués intentionnellement.

### Configuration serveur à 4 salons
- Schéma `guilds.json` revu : `mainChannelId` (obligatoire), `raidAnnounceChannelId` (inchangé), `devChannelId` (optionnel — patchnotes), `loreChannelId` (optionnel — événements).
- `devChannelId` et `loreChannelId` se replient sur `mainChannelId` si absents.
- ⚠️ **Migration requise** : ajouter `mainChannelId` dans `data/guilds.json` avant le déploiement.

### Scripts d'automatisation
- `npm run send-patchnote` — publie la dernière entrée de `CHANGELOG.md` dans le salon dev de chaque serveur.
- `npm run get-last-update` — met à jour le bot automatiquement (maintenance → `git pull` → build → redémarrage via `screen`).

## Corrections

### Tableau des types
- `fire.defense.double` contenait `bug, fire, flying, ice, poison` au lieu de `water, ground, rock`.
- `water.attack.half` contenait `steel` au lieu de `water`.
- **106 Pokémon** (44 Gen 1, 28 Gen 2, 34 Gen 3) dont le champ `effectiveness` était incorrect ont été recalculés.

### Moteur de rareté
- Les échanges NPC garantis (ex. Posipi/Plusle à Feuvenelle en Émeraude) sont désormais exclus du calcul de score de rareté (`npc-trade` traité comme méthode fixe/scriptée).

### Scripts de maintenance
- `send-maintenance`, `send-back-online`, `send-quick-maintenance` et `send-quick-back-online` envoyaient par défaut dans le salon raid au lieu du salon principal.

### Libellés de zones
- "Phare de bon espérance" corrigé en "Phare de Bonne-Espérance".
- 8 autres libellés corrigés pour respecter la convention française (seul le premier mot capitalisé).

### Tests unitaires
- 5 tests échouaient à cause de mocks `logger` incomplets et de signatures d'appel obsolètes (paramètre `guildId` manquant). Tous verts désormais (1224 tests).

## Modifications

- `src/scripts/` réorganisé en 7 sous-dossiers par domaine : `announcements/`, `fetch/`, `gen-json/`, `player-maintenance/`, `raid-tools/`, `rarity/`, `zones/`. Les scripts npm et le README sont mis à jour en conséquence.
- `npm test` (`vitest run`) ajouté et documenté dans le README comme première étape du workflow de déploiement.
- Numéro de version : 3.4.2 → 3.5.0.

## Suppressions

- `generalChannelId` retiré du schéma de configuration serveur (remplacé par `mainChannelId`).
- 14 scripts de développement personnels obsolètes supprimés de `src/scripts/`.
- Script de migration `scripts/migrate-to-guild-dirs.js` supprimé (migration mono-serveur → multi-guild déjà effectuée en prod).

---

# [3.4.2] - 2026-07-01

## Corrections
- La fin des inscriptions au raid (`registrationClosesAt`) était calculée avec une durée fixe de 8h, indépendante des variables `RAID_START_HOUR` / `RAID_END_HOUR`. Sur un serveur avec une fenêtre de raid différente de 8h (ex : 12h → 22h), les inscriptions se fermaient avant la résolution réelle du raid, provoquant une erreur `La période d'inscription au raid est terminée.` lors d'un `/raid` encore valide.
- La durée d'inscription est désormais calculée dynamiquement à partir de `RAID_END_HOUR - RAID_START_HOUR`, garantissant que la fin des inscriptions correspond à l'heure de fin de raid configurée.

## Modifications
- Numéro de version : 3.4.1 → 3.4.2.

---


# [3.4.1] - 2026-07-01

## Corrections
- Cooldown réduit à **10 minutes** (au lieu du cooldown complet) lorsqu'une capture ne trouve aucun Pokémon.
- Le message "Aucun Pokémon trouvé" est désormais tiré aléatoirement parmi une dizaine de phrases RP respectant le lore du Centre AURORA, au lieu d'un message fixe.

## Modifications
- Numéro de version : 3.4.0 → 3.4.1.

---


# [3.4.0] - 2026-07-01

## Ajouts

### ID et types affichés lors d'une capture
- L'embed de capture affiche désormais le **numéro de Pokédex** et le ou les **types** du Pokémon capturé, sous le message de capture.

## Modifications
- Numéro de version : 3.3.0 → 3.4.0.

---


# [3.3.0] - 2026-06-28

## Ajouts

### Filtrage par type dans l'autocomplete de `/raid`
- Lorsqu'un type d'attaque est sélectionné avant de choisir le Pokémon, l'autocomplete du paramètre **`pokemon_name`** ne propose désormais que les Pokémon possédant ce type (en plus du filtre saison en cours).
- Fonctionne dès la première lettre saisie dans le champ `pokemon_name`.

## Modifications
- Numéro de version : 3.2.1 → 3.3.0.

---


# [3.2.1] - 2026-06-27

## Suppressions
- Suppression de `data/rollRarityJson.json` — fichier inutilisé, les statistiques de rareté sont déjà sauvegardées dans `data/stats.json`.
- `rollRarityJson.json` ajouté au `.gitignore`.

---


# [3.2.0] - 2026-06-27

## Ajouts

### Génération dynamique de `pokemon-list.json`
- `pokemon-list.json` n'est plus versionné dans Git — il est désormais **généré automatiquement** avant chaque build via le script `scripts/generate-pokemon-list.js`.
- Par défaut, le script concatène `pokemon-gen1.json` et `pokemon-gen2.json`.
- Variable d'environnement `EXTRA_POKEMON_FILES` : permet d'ajouter des fichiers JSON supplémentaires à la liste (ex : `EXTRA_POKEMON_FILES=othermons.json`). Plusieurs fichiers séparés par des virgules sont supportés.
- `othermons.json` ajouté au `.gitignore` — fichier personnalisé uploadé manuellement par serveur (ex : faux Pokémon du 1er avril).

## Modifications
- Nouveau script npm `generate-pokemon-list` ajouté au pipeline `build`.
- `pokemon-list.json` et `othermons.json` ajoutés au `.gitignore`.
- Numéro de version : 3.1.0 → 3.2.0.

---

# [3.1.0] - 2026-06-27

## Ajouts

### Nouvelle commande `/leaderboard` (remplace `/stats`)
- **Top Joueurs** — classement par captures uniques et totales (shiny retiré de cette section)
- **Top Shiny** — classement des joueurs par nombre de shinys capturés
- **Top Level** — classement des joueurs par niveau et XP
- **Top Pokédex** — classement par complétion du Pokédex (uniques/total avec pourcentage)
- **Top Pokédex Saison** — classement par complétion du Pokédex sur la saison en cours
- **Top Raids** — inchangé
- **Top 3 Pokémons** — inchangé

### Scripts de maintenance RP
- `send-maintenance.ts` — message de maintenance longue (embed orange)
- `send-back-online.ts` — annonce de reprise après maintenance longue (embed vert)
- `send-quick-maintenance.ts` — message de micro-maintenance (embed jaune)
- `send-quick-back-online.ts` — annonce de reprise après micro-maintenance (embed vert)
- Nouvelle variable d'environnement `MAIN_CHANNEL_ID` pour configurer le salon principal.

### Horaires de raid configurables
- Les heures d'ouverture et de fermeture du raid sont désormais configurables via les variables d'environnement `RAID_START_HOUR` et `RAID_END_HOUR` (expressions cron).
- Valeurs par défaut : `00 12 * * *` (ouverture à 12h) et `00 20 * * *` (fermeture à 20h).

## Modifications
- Commande `/stats` renommée en `/leaderboard` (deploy-commands, index, help, README, FEATURES).
- Numéro de version : 3.0.2 → 3.1.0.

---

# [3.0.2] - 2026-06-25

## Ajouts

### Nouvelle commande `/raid-squad`
- Affiche les **informations du raid en cours** (Pokémon boss, zone, difficulté, type d'attaque) et la **composition de l'équipe de défense** avec les Pokémon inscrits.
- Commande enregistrée dans `deploy-commands.ts` et ajoutée dans `/help`.

### Mise à jour de `/help`
- Description de `/capture` et `/pokedex` actualisées.
- Ajout de `/raid-squad` dans la liste des commandes.

## Modifications
- Numéro de version : 3.0.1 → 3.0.2.

---

# [3.0.1] - 2026-06-23

## Ajouts

### Affichage de la zone de capture
- La **zone de capture** est désormais affichée dans l'embed d'annonce de capture (ex : `📍 Zone : Étang aigri`).
- Le nom de la zone est affiché en **français** (label) et non en ID anglais.

### Autocomplete amélioré pour `/raid`
- Le paramètre **`pokemon_name`** propose désormais en autocomplete uniquement les Pokémon que le joueur a **capturés durant la saison en cours** (`capturedInCurrentSeason`).
- Le paramètre **`type`** est passé en autocomplete dynamique : si un Pokémon est sélectionné, seuls ses types sont proposés ; sinon, la liste complète est affichée.

## Corrections

### Boucle infinie à la capture
- Correction d'une **boucle infinie** dans `getNewPokemon` lorsqu'une zone ne contenait qu'un seul Pokémon de la rareté tirée (et que ce Pokémon était le même que le dernier capturé). Le système essaie désormais 10 fois maximum avant d'accepter le doublon.

## Modifications
- Numéro de version : 3.0.0 → 3.0.1.

---

# [3.0.0] - 2026-06-22

## Ajouts

### Système de zones de capture
- **Zones de capture** : Chaque Pokémon est désormais assigné à une ou plusieurs zones géographiques.
- **Paramètre zone dans `/capture`** : Le joueur peut choisir une zone en plus de la génération, ou laisser le tirage aléatoire parmi les zones débloquées.
- **Autocomplete** sur le champ zone pour faciliter la sélection.
- **Système de déblocage progressif** : Les zones sont séparées entre `zones_unlocked.json` (accessibles) et `zones_to_unlock.json` (à débloquer via les raids).
- **Chargement dynamique des zones** : Les zones débloquées sont relues depuis le fichier JSON à chaque appel, plus besoin de redémarrer le bot après un déblocage.
- **Downgrade de rareté par zone** : Si aucun Pokémon n'existe à la rareté tirée pour la zone, le système descend automatiquement d'un cran de rareté.

### Système XP & Niveaux
- **XP à la capture** : XP gagnée basée sur les HP du Pokémon capturé (×10 si shiny).
- **Formule de niveau** style Pokémon (`4 × level³ / 5`), niveau max 100.
- **Notification de level-up** dans l'embed de capture.
- **Champs `xp` et `level`** ajoutés au profil joueur.

### Système de saisons
- **Flag `capturedInCurrentSeason`** sur chaque entrée de capture dans le Pokédex.
- **Marqueur visuel 🎯** dans le Pokédex pour les Pokémon capturés en saison.
- **Compteur de saison** dans le Pokédex : affiche le nombre de Pokémon différents capturés durant la saison en cours.
- Condition requise pour participer aux raids.

### Système de Raid
- **Nouvelle commande `/raid <pokemon> [type]`** : Inscris un de tes Pokémon pour défendre le centre de recherche contre un Pokémon enragé.
- **Raids quotidiens automatiques** : Un raid s'ouvre automatiquement chaque jour, avec une période d'inscription de 8 heures.
- **Annonce Discord automatique** : Un message est envoyé dans le salon avec le nom du Pokémon, sa zone, sa difficulté, son type d'attaque et l'heure de fermeture des inscriptions.
- **Résolution automatique** : Le combat est résolu automatiquement à l'heure configurée en comparant les stats de l'équipe de défense à celles du boss.
- **Bonus/malus de type** : Les multiplicateurs d'efficacité de type sont appliqués sur l'attaque (efficacité du défenseur contre le boss) et la défense (faiblesse du défenseur face au boss).
- **Récompenses de victoire** :
  - XP = HP de base du Pokémon du raid × 10, attribuée à chaque participant.
  - Compteur `raidWins` incrémenté pour chaque participant.
  - Le Pokémon du raid est capturé automatiquement par un participant tiré au sort (avec mise à jour des stats).
- **Déblocage de zone** : Si la zone du raid n'est pas encore débloquée, elle est ajoutée à `zones_unlocked.json` et retirée de `zones_to_unlock.json` après une victoire.
- **Message de résultat** : Message de victoire (vert) ou défaite (rouge) avec récompenses ou stats manquantes en texte naturel.
- **Mode debug** : Ouverture toutes les 2 min, résolution toutes les 3 min (configurable via `RAID_SCHEDULER_MODE`).

### Refactoring commande `/cheat`
- `/cheat` est désormais fonctionnel avec les paramètres `player`, `pokemon` et `shiny`.
- Réservé à l'admin (`ADMIN_ID`).
- Gère la recherche du joueur par nom, la recherche du Pokémon par nom, la mise à jour du Pokédex et des stats.

### Enrichissement des données Pokémon
- **Stats complètes** : HP, attaque, défense, attaque spé., défense spé., vitesse ajoutées à chaque Pokémon.
- **Types** : Chaque Pokémon a désormais ses types (eau, feu, plante, etc.).
- **Effectiveness** : Tables d'efficacité attaque/défense par type pour chaque Pokémon.
- **Génération** : Champ `generation` ajouté.
- **Données Gen 1 enrichies** : `pokemon-gen1.json` entièrement reconstruit avec stats, types, zones et effectiveness.

### Nouveaux fichiers et utilitaires
- **Types** : `Params.ts`, `Embed.ts`, `zones.ts`, types raid (`RaidBoss`, `RaidDefender`, `RaidResult`, `RaidReward`, `RaidState`, `RaidStats`, `RaidStatus`).
- **Embeds** : `buildCapturedPokemonEmbed.ts`, `buildCaptureEmbed.ts`, `buildPokedexPageEmbed.ts`, `isValidHttpUrl.ts` (extrait de `buildEmbed.ts`).
- **Joueur** : `getCapturePlayer.ts`, `getPlayerByName.ts`, `getPlayerIdByName.ts`, `markPokemonAsCapturedInCurrentSeason.ts`, `savePlayerDataById.ts`, `registerCapturedPokemon.ts`.
- **Pokémon** : `getPokemonByName.ts`, `getPokemonById.ts`, `getCapturedPokemonHp.ts`, `handleSuccessfulCapture.ts`, `handleNoPokemonFound.ts`, `tryCatchPokemon.ts`, `getRandomPokemonType.ts`.
- **Rareté** : `downgradeRarity.ts`, `getPokemonByRarity.ts`.
- **Zones** : `resolveCaptureLocation.ts`, `getAllZones.ts`, `getGenerationByZone.ts`, `getZonesByGeneration.ts`, `findZoneById.ts`, `pickRandomZone.ts`, `isZoneInGeneration.ts`, `getMaxGeneration.ts`, `logCaptureLocationSelection.ts`.
- **XP** : `xp.ts` (calcul XP, niveaux, level-up).
- **Config** : `url.ts`, `raid.config.ts`, `typeLabels.ts` (traduction française des types).
- **Stats joueur** : `addPokemonInPlayerTotalCaptures.ts`, `addRarityInPlayerStats.ts`, `addShinyCaptureForPlayer.ts`, `addPokemonInpokemonPerPlayerList.ts`.
- **Utilitaires data** : `buildPokemonJson.ts`, `createGenJson.ts`, `fetchPokemon.ts`, `fetchSpecies.ts`, `getPokemonStats.ts`, `getPokemonTypes.ts`, `injectZones.ts`, `add-captured-in-current-season.ts`, `add-generation-to-pokemon.ts`, `addXpAndLevelToPlayers.ts`.
- **Tests Vitest** : 28 tests couvrant le système de raid, XP et pity.

### Autres
- **Traduction française des types** : Tous les types d'attaque sont affichés en français (annonce raid, inscription, résultat).
- **Fichier `FEATURES.md`** : Documentation complète de toutes les fonctionnalités du bot.
- **Checklist de tests manuels** : `data/spec/RAID_TESTING_CHECKLIST.md`.
- **Classement raids dans `/stats`** : Affiche le top 5 des joueurs par nombre de raids remportés.
- **Commande `/raid`** ajoutée dans `/help`.
- **Constante `RARITY_ORDER`** ajoutée dans `rarity.ts`.

## Modifications

### Refactoring `/capture`
- Commande entièrement réécrite : découpage en fonctions dédiées (`resolveCaptureLocation`, `getCapturePlayer`, `tryCatchPokemon`, `handleSuccessfulCapture`, `handleNoPokemonFound`).
- Gestion des zones et de la génération avec inférence automatique.
- `/capture` restreint aux zones débloquées uniquement.

### Refactoring Pokédex
- **Pokédex paginé** avec boutons Discord (premier, précédent, suivant, dernier).
- Affichage enrichi : numéro, nom, nombre de captures, shinys, marqueur saison, niveau joueur, progression.
- Pokédex construit par pages avec `buildPokedexPageEmbed.ts`.

### Refactoring embeds
- `buildEmbed` accepte désormais un paramètre `fields` optionnel pour les champs additionnels.
- `editFooter` refactoré pour accepter un objet `EditFooterParams` (au lieu de `interaction`) avec XP gagnée et level-up.
- `buildDescriptionForPokemonCaptureEmbed` refactoré pour accepter un objet `BuildDescriptionParams` avec `trainerName` (au lieu de `interaction`).
- `isValidHttpUrl` extrait dans son propre fichier.

### Refactoring profil joueur
- `Player.captureList` passe de `array` à `Record<string, PokemonCaptureStats>` avec `total`, `shiny` et `capturedInCurrentSeason`.
- Initialisation du profil avec `xp: 0` et `level: 1`.

### Refactoring stats
- `addAllStats` refactoré : ne prend plus `interaction` en paramètre, prend directement le `Player`.
- Ajout de `markPokemonAsCapturedInCurrentSeason` dans le flux de stats.

### Refactoring gacha
- `getNewGatchaPokemon` accepte maintenant un paramètre `zone` et gère le downgrade de rareté par zone.
- `getRandomPokemonFromRarity` filtre par zone si fournie.

### Autres modifications
- **`/cheat` corrigé** : L'indication "possède déjà ce Pokémon" est maintenant vérifiée sur le joueur cible et non sur l'admin.
- **Correction du calcul d'efficacité de type dans les raids** : Les multiplicateurs étaient inversés.
- **`/pokedex`** : Ajout de `createProfileIfNeeded` à l'entrée de la commande.
- **`tsconfig.json`** : Migration vers `NodeNext` module resolution, ajout de `strict: true`.
- **`package.json`** : Ajout de `node-cron`, `csv-parse`, `pino`, `pino-pretty`. Ajout de `vitest` en devDependencies.
- **Numéro de version** : 2.0.4 → 3.0.0.

## Suppressions
- **Ancien format `captureList` en tableau** : Remplacé par un `Record<string, PokemonCaptureStats>`.
- **Dépendance directe à `interaction`** dans `editFooter` et `buildDescriptionForPokemonCaptureEmbed` : Remplacée par des objets de paramètres typés.
- **`isValidHttpUrl` inline** dans `buildEmbed.ts` : Extrait dans son propre fichier.
- **Import inutilisé `ActionRow`** supprimé de `buildDisabledPokedexButtons.ts`.
- **Duplication `readPlayers`/`readPokemonList`** : Nettoyée dans `RegisterRaidDefender.ts`.

---

# [2.0.4] - 2026-04-09

# Ajouts
- Vous avez maintenant la possibilité de préciser la génération du pokemon que vous souhaitez capturer avec /capture.
- Vous devez pour cela préciser /capture 1 pour la génération 1 ou /capture 2 pour la génération 2 (il y a une aide normalement).
- C'est facultatif, si vous ne le précisez pas, la capture se fera dans une génération aléatoire.

## Modifications
- Modification du numéro de version

# [2.0.3] - 2026-04-09

# Ajouts
- Nouvelle commande **/get-rarity** pour connaitre  les chances actuelles d’apparition par rareté.

## Modifications
- Ajout de /get-rarity dans /help

## Corrections
- Patchnote

# [2.0.2] - 2026-04-09

## Corrections
- Modification du numéro de version dans package.json
- Delete import inutiles dans captureCommand.ts
- Delete pokemonGen2 paths

# [2.0.1] - 2026-04-09

## Corrections
- Update README.md, .gitignore et ajout de src/types

# [2.0.0] - 2026-04-09

## Ajouts
- ✨ **Ajout de la seconde génération** ✨
- Il n'est (normalement?) plus possible que le pokémon qui vient d'être capturé soit identique au précédent.
- Ajout de la "**Pity**" : En gros si vous avez pas de chance, le jeu a pitié de vous et vous augmente vos chances pour le prochain /capture. Si lors des **10 dernières captures** vous n'avez pas eu un pokemon de rareté "**Très Rare**" ou +, la prochaine capture sera boostée.
- Vous pouvez consulter votre compteur actuel de pitié avec **la nouvelle commande /pity**

## Modifications
- **random-capture** devient "**capture**", tout simplement.
- La commande "**/capture**" repose dorénavent sur un système similaire à un **gatcha** : Chaque pokémon a une **rareté, plus il est rare, plus il sera difficile de le capturer !** La liste des rareté ainsi que les taux seront prochainement consultable.
- Toutes mentions "random" dans le code a été retiré.

## Corrections mineurs
- Clean code.

# [1.3.2] - 2026-02-05

## Corrections mineurs
- Correction du nombre de pokémon unique capturé par chaque joueur.
- Restructuration de la commande /random-capture afin d'optimiser le temps de réponse (on doit être en dessous de 3 sec pour éviter le timeout de Discord)

# [1.3.1] - 2026-01-25

## Corrections mineurs
- Ajout de la description de /random-stats dans la commande /help
- Correction du fonctionnement du cooldown (quand on relance le serveur le cooldown était reset, normalement c'est corrigé).

# [1.3.0] - 2026-01-20

## ✨ **Nouvelles fonctionnalités pour les joueurs**

- **Pokédex enrichi** 
  - Quantité de captures par Pokémon (`15x Bulbizarre`)
  - Indicateur shiny (`✨2` si capturé)
  - Compteur global : `42/151 Pokémon` + \"X restants à capturer\"

- **Commande `/stats`** 
  - Stats serveur
  - Classement TOP joueurs
  - **TOP 3 Pokémons** les plus capturés (🥇🥈🥉)

- **??0** **αʖ0цŧ�**

## 🎮 **Améliorations gameplay**

- **Nom bot corrigé** dans les messages
- **Tri ID** Pokédex (1, 4, 7... logique)

## 🔧 **Modifications techniques**

### Stats & Données

- 💥 BREAKING CHANGE : Format players.json modifié
- randomCaptures: { \"1\": { total: 15, shiny: 2 } }

### Nouvelles méthodes

utils/getPlayerAvatar.ts
utils/loadPokemonStats.ts
utils/logger.ts
utils/playerStats.ts

stats/random
├── addPokemonInPlayerTotalCaptures
├── addPokemonInTotalCaptures
├── addPokemonInTotalPokemonCaptures
├── addShinyCaptureForPlayer
└── addShinyInTotalShinyCaptures

pokedex/addCaptureToPlayer
pokedex/isPokemonInPokedex

commands/getStatsCommand

### Corrections

✅ [object Promise] → await getPokemonName()
✅ Warning \"stats vide\" → parse random.totalCaptures
✅ TypeScript strict (async/await partout)

### Docs & Logs

📝 README.md corrigé
📊 Logs détaillés Pokédex/stats

## 🚀 **Commandes disponibles**

/stats → Stats serveur + TOP 3

## [1.2.1] - 2026-01-13

### Changements pour les joueurs ✨
- **✅ Pokédex préservé** : Les données ne sont plus écrasées à chaque redémarrage du serveur
- **✅ URLs GIF corrigées** : M.Mime, Nidoran Mâle et Nidoran Femelle s'affichent correctement
- **🔧 Clean code** : Code plus propre et maintenable

### Changements techniques ⚙️
- **Fix majeur data persistence** : `data/players.json` plus écrasé par `npm run build`
- **Refactor modularité** : Méthodes séparées dans `src/methods/`
- **Nouveaux fichiers** :
  - `paths.ts` : Centralisation des chemins
  - `createProfileIfNeeded()` : Gestion nouveaux joueurs
  - `verifyIfPlayerExist()` : Vérification existence profil
- **Types globaux** : `Player` et `Pokemon` réutilisables partout
- **Utils refactoring** : `loadPlayer()` et `loadData()`
- **Git best practices** : `.gitignore` → `dist/` et `data/` exclus
- **Tests Vitest** : Tentative d'implémentation (abandonnée)
- **Changelog** : Ce fichier !

## [1.2.0] - 2026-01-13

### Ajouté 🎮
- **Renommage commandes** : `/capture` → `/random-capture`, `/pokedex` → `/random-pokedex`
- **Rareté visuelle** : Couleur embed selon rareté Pokémon + `(Rare)` dans titre
- **Indicateur première capture** : "Premier Bulbizarre capturé !"
- **Pagination Pokédex** : Navigation boutons (⏮️◀️▶️⏭️)
- **Commande `/help`** : Liste complète des commandes
- **Commande `/get-shiny-rate`** : Affichage taux shiny actuel
- **Taux shiny nerfé** : 1/256 (était 1/512)

### Amélioré 💎
- **Rareté Pokémon** : Système objectif (à valider par la communauté 😄)

### Refactor 🔄
- Clean code généralisé

## [1.1.0] - 2026-01-12

### Corrigé 🐛
- **Process Git** : `.gitignore` → `dist/` et `data/` exclus du repo
- **Clean repo** : Suppression `dist/` et `data/` du versionning

## [1.0.0] - 2026-01-01

### Ajouté 🚀
- **Création bot Discord** : Pokémon Classic premier génération
- **Commande `/capture`** : Tirage aléatoire 151 Pokémon → Stockage Pokédex
- **Commande `/pokedex`** : Affichage Pokédex joueur

---

**💡 Note** : Rareté Pokémon à valider par la communauté. Feedbacks bienvenus !  
**📊 Prochaine version** : Mode Shiny + Leaderboard ?
