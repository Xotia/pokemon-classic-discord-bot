# Programme de release 3.5.0

## Context

Cette mise à jour regroupe un gros paquet de changements hétérogènes (rareté
gen1/2, nouvelle rareté "légendaire itinérant", corrections de bugs,
rangement du repo, 3 nouvelles commandes + nouvelle ressource "données de
recherche", scripts d'automatisation, événement lunaire, génération 3) sous
une seule release **3.5.0**. `package.json` est déjà à `3.5.0` (bump
anticipé) mais `CHANGELOG.md` s'arrête à `3.4.2` : la release n'est pas
encore coupée.

Vu la taille du travail, ce document sert de **PROGRAM.md** (convention
définie dans les instructions globales de l'utilisateur) : il doit être
copié à la racine du repo (`E:\source\pokemon-classic\PROGRAM.md`) dès la
première session d'exécution, puis **mis à jour à la fin de chaque session**
(statut des slices, décisions prises, prochaine étape). Toute nouvelle
session Claude Code démarrant sur ce repo doit le lire en premier.

But final : une branche `release/3.5.0` mergée dans `main`, taguée
`v3.5.0`, avec un `CHANGELOG.md` à jour — c'est cette release qui sera
déployée sur le serveur de prod (en attendant, la dernière release publiée
reste en place).

## Décisions déjà actées (ne pas rouvrir sans raison)

- **Suivi** : PROGRAM.md dans le repo, pas seulement le plan Claude local.
- **Branching (révisé le 2026-07-24)** : `fix/rarity-one-time-only-scope`
  a fini par contenir plus que son scope d'origine (A1 + A3 + G1) et n'est
  **pas** mergée dans `main` en l'état (décision explicite de
  l'utilisateur). Process retenu : créer `release/3.5.0` depuis `main`
  maintenant, y merger le travail déjà fait sur
  `fix/rarity-one-time-only-scope`, puis enchaîner toutes les slices
  suivantes sur des branches courtes parties de `release/3.5.0` et
  remergées dedans. `main` reste ainsi disponible pour un hotfix prod
  pendant les (probablement plusieurs) semaines de développement de la
  3.5.0 — cohérent avec le rythme de release très fréquent observé dans
  `CHANGELOG.md` (plusieurs patches le même jour par le passé). Tag
  `v3.5.0` posé uniquement au merge final `release/3.5.0` → `main`
  (Slice H).
- **Rareté "légendaire itinérant" (révisé le 2026-07-24)** : **liste
  manuelle**, pas de détection automatique par seuil — l'utilisateur
  indique lui-même quels Pokémon légendaires sont "itinérants". Pas de
  script de calcul à écrire pour la détection ; juste un mécanisme simple
  pour forcer la rareté d'un id donné (ex. un champ/override explicite
  plutôt qu'une règle dérivée des zones). Reste acté : positionnée
  **au-dessus de `legendary`** dans `RARITY_ORDER` (`src/config/rarity.ts`),
  avec un taux d'apparition **plus faible** que `legendary`. Nom de code
  proposé : `legendary_wandering` (libellé FR à définir, ex. "Légendaire
  itinérant"). Donnée de référence pour la liste manuelle à venir : en
  Gen 3, Latios/Latias apparaissent dans 11 zones sur 12
  (`data/gen3_zones.csv`), le prochain plus haut score est à 4/12 — utile
  comme indice mais la décision finale revient à l'utilisateur, pas à un
  seuil.

## Slices

### Slice A — Finaliser le moteur de rareté (fondation, bloquant pour A/G)
- [x] A1. Fix "one-time-only scope" sur `rarityScoring.ts` : ajout de
      `"npc-trade"` aux méthodes de rencontre fixe/scriptée (exclues du
      calcul C1, comme les dons/échanges garantis) + tests associés. Diff
      vérifié, build (`tsc --noEmit`) clean, tests `rarityScoring.test.ts`
      192/192 verts. Commit fait le 2026-07-24 (`e3b4ea8`, confirmé
      explicitement par l'utilisateur — le changement "npc-trade" avait été
      vérifié en détail : régression réelle sur Posipi/Plusle, échange NPC
      garanti à Feuvenelle en Émeraude). **Reste à faire : ouvrir la PR vers
      `main` et la merger.**
- [x] A3 (fait en avance, par une session Claude Code parallèle terminée le
      2026-07-24 ~12h15-12h20) — `injectZones.ts` généralisé en
      `src/scripts/injectZonesGen3.ts` (lit `data/gen3_zones.csv` +
      `zones_all.json.gen3`), + `src/scripts/simulateGen3Zones.ts` (outil de
      simulation/équilibrage 1000 captures par zone gen3). Zones injectées
      dans `data/pokemon-gen3.json` : 135/135 Pokémon ont un champ `zones`
      non vide. `data/zones_all.json`, `zones_to_unlock.default.json`,
      `zones_unlocked.default.json` mis à jour avec les entrées `gen3`.
      Nouveaux scripts npm : `inject-zones-gen3`, `simulate-gen3-zones`.
      Confirmé : Latios/Latias toujours à 11 zones/12 (donnée de référence
      pour A2).
- [x] G1 (accéléré par le même travail) — `src/utils/pokemonCatalog.ts`
      inclut maintenant `POKEMON_GEN3_DB` (nouvelle constante dans
      `src/config/paths.ts`) dans le catalogue runtime aux côtés de gen1/2 :
      gen3 est déjà capturable en pratique une fois déployé. Reste à
      auditer capture/raid/pokedex pour confirmer qu'aucun autre point du
      code n'est encore gen1/gen2-only (cf. Slice G ci-dessous, à finir
      après A2).
- [x] A2 (fait le 2026-07-24, branche `feat/legendary-wandering-rarity`
      depuis `release/3.5.0`) — `legendary_wandering` ("Légendaire
      itinérant") ajouté dans `src/config/rarity.ts`
      (`Rarity`/`RARITY_ORDER`/`rarityList` poids 120/`rarityBoostedList`
      poids 2000, couleur `0x8A2BE2`), positionné juste au-dessus de
      `legendary`. Propagé dans les 3 autres endroits qui dupliquent la
      logique de rareté (repérés un par un, pas génériques) :
      `src/methods/rarity/downgradeRarity.ts`,
      `src/features/raid/downgradeRaidRarity.ts` (liste
      `boostedRarityOrder` séparée de `RARITY_ORDER`),
      `src/methods/pity/resetPityCounterIfNeeded.ts`, et l'emoji dans
      `src/commands/getRarityCommand.ts` (🧭). Liste manuelle appliquée via
      le nouveau script idempotent `src/scripts/applyWanderingLegendaries.ts`
      (`npm run apply-wandering-legendaries`), exécuté sur les 3 fichiers
      JSON : Mew (151), Raikou (243), Entei (244), Suicune (245), Latias
      (380), Latios (381) sont maintenant `"legendary_wandering"`. Diff
      sémantique vérifié indépendamment (comparaison champ par champ
      ancien/nouveau JSON) : seuls ces 6 champs `rarity` ont changé, le
      reste du diff volumineux sur gen1/gen2.json est un reformatage
      JSON pur (première réécriture via `JSON.stringify(..., null, 2)`,
      jamais passés par un script de post-traitement avant). `tsc`
      clean, mêmes 5 échecs de tests préexistants (B4), aucune régression.
      **Découverte au passage (à trancher séparément, pas bloquant)** : tout
      le dossier `tests/` est dans `.gitignore` (`.gitignore:29`) — les
      tests unitaires qui y vivent (dont `pitySystem.test.ts`,
      `tryCatchPokemon.test.ts` visés par B4) ne sont donc jamais commités.
      Probablement une règle gitignore trop large/accidentelle plutôt
      qu'un choix voulu — à confirmer avec l'utilisateur avant d'y toucher
      (ajouté comme B5 ci-dessous, décision utilisateur : pas maintenant).
- [x] A4 (terminé le 2026-07-24, branche `feat/regenerate-gen1-gen2-rarity`
      depuis `release/3.5.0`).
      - `GEN1_VERSIONS`/`GEN2_VERSIONS` ajoutés dans `rarityScoring.ts`
        (extrapolation raisonnée du pattern `GEN3_VERSIONS` existant :
        trilogie d'origine + remakes directs de la même génération —
        red/blue/yellow/firered/leafgreen et
        gold/silver/crystal/heartgold/soulsilver. Choix nouveau, pas
        copié d'un pattern existant, à valider via le CSV).
      - `src/scripts/runRarityAuditGen1Gen2.ts` (nouveau) : audite les 251
        ids gen1+gen2 via `computeRarity`, écrit
        `data/rarity-audit-gen1-gen2.json`. Exécuté pour de vrai (pas
        juste smoke-testé) : `npm run audit-gen1-gen2`.
      - `src/scripts/compareRarityGen1Gen2WithProd.ts` (nouveau) : compare
        directement contre `data/pokemon-gen1.json`/`gen2.json` actuels
        (pas de CSV manuel externe comme pour gen3), exclut les 4 ids à
        override manuel (151/243/244/245, déjà `legendary_wandering` —
        comparer contre l'output brut de `computeRarity` serait toujours
        un faux diff pour eux). Écrit
        `data/rarity-comparison-gen1-gen2.csv`. Exécuté : `npm run
        compare-gen1-gen2`.
      - **Résultat** : 247 comparés, 89 identiques, **158 différents**
        (~64%) — recalibrage important, pas juste des ajustements
        mineurs. Plus gros écarts : Zarbi (unknown→common, -9 — `unknown`
        était une valeur de repli dans l'ancien système, pas une vraie
        évaluation, donc ce chiffre trompe sur l'ampleur réelle),
        Métamorph (ultra_rare→common, -5), Flagadoss/Leveinard/
        Kangourex/Ronflex/Simularbre/Scarhino (-3 chacun). Beaucoup de
        ±1/±2 sur des évolutions dont le score hérite désormais du
        parent (`priority:no_encounters_inherits_parent`), cohérent avec
        le moteur, pas une anomalie.
      - CSV envoyé à l'utilisateur pour relecture manuelle avant toute
        application (décision explicite : ni tout appliquer, ni
        appliquer seulement les petits écarts — relecture complète
        d'abord).
      - `data/rarity-audit-gen1-gen2.json` et
        `data/rarity-comparison-gen1-gen2.csv` ajoutés au `.gitignore`
        (mêmes règles que leurs équivalents gen3 en C0).
      - Relecture manuelle complète des 158 lignes par l'utilisateur,
        décisions consignées dans `data/gen1_2_rarity_change.csv` (id,
        name, computed = décision finale — parfois la suggestion du
        moteur, parfois l'ancienne valeur gardée, parfois une troisième
        valeur choisie à la main).
      - `src/scripts/applyGen1Gen2RarityChanges.ts` (nouveau, idempotent,
        `npm run apply-gen1-gen2-rarity-changes`) : applique ces 158
        décisions à `pokemon-gen1.json`/`gen2.json`, et génère en même
        temps le changelog joueurs `data/rarity-changelog-gen1-gen2.csv`
        (id, name, oldRarity/oldRarityLabel, newRarity/newRarityLabel —
        FR via `rarityList`), trié par id, **seulement les lignes où la
        rareté a réellement changé** (les décisions "je garde l'ancienne"
        n'y apparaissent pas).
      - **Résultat final** : sur les 158 décisions, **119 changements
        réels** appliqués (77 en gen1, 42 en gen2), 39 no-ops (retour
        volontaire à la valeur actuelle). Vérifié indépendamment (diff
        champ par champ ancien/nouveau JSON vs contenu du changelog) :
        correspondance exacte, aucun autre champ touché, aucune ligne en
        trop ou manquante. `tsc` clean, mêmes 5 échecs de tests
        préexistants (B4), aucune régression.
      - Mergé dans `release/3.5.0` (`ef78362`). **Reste à faire** : décider
        si `data/rarity-changelog-gen1-gen2.csv` sert de base au patchnote
        joueurs de la release 3.5.0 (Slice E1/H1).

### Slice B — Corrections de bugs (indépendantes entre elles)
- [x] B1 (terminé le 2026-07-24, branche `fix/type-chart-fire-defense`
      depuis `release/3.5.0` — élargi en cours de route, cf. ci-dessous).
      Fix initial demandé : `data/all_types.json` `fire.defense.double`
      faux (`bug, fire, flying, ice, poison` au lieu de `water, ground,
      rock`). Un correctif partiel avait déjà été tenté en parallèle
      (patché seulement dans les JSON générés, pas dans la source) —
      détecté et remplacé. Suite à la demande explicite de l'utilisateur
      de vérifier s'il restait d'autres erreurs, audit complet des 18
      types (attack + defense) contre le tableau canonique Gen 6+ :
      **un second bug distinct trouvé**, `water.attack.half` contenait
      `steel` au lieu de `water` (confirmé concrètement sur Magikarp,
      qui affichait `attack.steel: 0.5` au lieu de `attack.water: 0.5`).
      Les 2 bugs corrigés dans `data/all_types.json` (vérifié
      indépendamment : 0 écart restant sur les 18 types, attack et
      defense, contre le référentiel canonique). Champ `effectiveness`
      régénéré proprement pour tous les Pokémon des 3 générations via
      `src/scripts/regenerateEffectiveness.ts` (nouveau,
      `npm run regenerate-effectiveness`) : 106 Pokémon affectés (44 en
      gen1, 28 en gen2, 34 en gen3), vérifié indépendamment qu'aucun
      Pokémon sans type Feu/Eau n'a été touché et qu'aucun autre champ
      n'a bougé. `tsc` clean, mêmes 5 échecs de tests préexistants (B4).
- [x] B2 (terminé le 2026-07-24, branche `fix/zone-names-formatting`
      depuis `release/3.5.0`, élargi à la demande de l'utilisateur pour
      uniformiser TOUS les libellés de zone, pas seulement le fix
      initial). "Phare de bon espérance" → "Phare de Bonne-Espérance"
      corrigé dans les 3 fichiers (`zones_all.json`,
      `zones_to_unlock.default.json` — `zones_unlocked.default.json` ne
      contient pas cette zone). En passant en revue les ~37 libellés des
      3 fichiers, 8 autres incohérences de casse trouvées (des noms où
      les deux mots étaient capitalisés au lieu de suivre la convention
      française standard — seul le premier mot capitalisé) : "Route
      Bucolique"→"bucolique", "Chemin Escarpé"→"escarpé", "Plaine
      Verdoyante"→"verdoyante", "Grotte de Glace"→"de glace", "Colline
      Florale"→"florale", "Sentier Rupestre"→"rupestre", "Grotte
      Magmatique"→"magmatique", "Tour Céleste"→"céleste". Toutes
      appliquées de façon cohérente dans les 3 fichiers (`zones_all.json`
      = source, `zones_to_unlock.default.json`/`zones_unlocked.default.json`
      = sous-ensembles qui doivent matcher exactement). Vérifié par
      script : 0 divergence de libellé entre les 3 fichiers pour un même
      id, aucune des anciennes formes ne subsiste, aucun autre fichier du
      repo ne hardcode ces libellés. `tsc` clean, mêmes 5 échecs
      préexistants (B4).
      Point non résolu (pas bloquant, à surveiller) : les fichiers déployés
      en prod par serveur (`data/guilds/{guildId}/zones_*.json`, non
      versionnés, seedés une fois au démarrage depuis les `.default.json`)
      ne se mettent pas à jour rétroactivement — impact limité à
      l'affichage (l'id ne change pas), mais les libellés resteront
      anciens sur les serveurs déjà seedés tant qu'ils ne sont pas
      re-seedés manuellement.
- [x] B3 (terminé le 2026-07-24, branche `fix/broadcast-scripts-channel`
      depuis `release/3.5.0`). Root cause : `broadcastEmbed()`
      (`src/scripts/lib/broadcast.ts`) défaut `channelField = "raid"` —
      `send-maintenance.ts`, `send-back-online.ts`,
      `send-quick-maintenance.ts`, `send-quick-back-online.ts` appelaient
      `broadcastEmbed` sans préciser l'option, donc tombaient sur "raid"
      (contrairement à `send-lore-new-adventure.ts`, seul appelant
      explicite). Aucun de ces messages n'est lié au raid — fix en deux
      temps : (1) défaut de `broadcastEmbed` inversé, `"general"` au lieu
      de `"raid"` (root-cause : empêche la même erreur pour un futur
      script qui oublierait de préciser l'option), (2) les 4 appels
      corrigés explicitement quand même, par cohérence avec le style déjà
      utilisé par `send-lore-new-adventure.ts`. Vérifié qu'aucun autre
      script/commande du repo n'a le même bug (`raidAnnounceChannelId`
      n'est utilisé ailleurs que pour des flux réellement liés au raid :
      `forceEndRaidCommand.ts`, `raidScheduler.ts`, `forceEndRaid.ts` —
      corrects, pas touchés). Doc `README.md` ("Scripts d'annonce
      ponctuelle") corrigée, décrivait ce comportement comme voulu.
      `src/scripts/send-lore.ts` (mentionné dans le README) est un script
      perso non versionné (`.gitignore`), absent de cette machine — hors
      de portée, rien à vérifier dessus. `tsc` clean, mêmes 5 échecs
      préexistants (B4).
- [x] B4 (terminé le 2026-07-24, branche `fix/pity-test-mocks` depuis
      `release/3.5.0`). Confirmé : 2 causes racines, toutes deux dans les
      fichiers de test, aucun bug de prod. (1) `vi.mock("../src/utils/logger")`
      dans `tests/pitySystem.test.ts` et `tests/tryCatchPokemon.test.ts`
      ne stubait que l'export `default`, pas l'export nommé
      `getLoggerForGuild` → `TypeError` dès que le code testé l'appelle ;
      mock complété. (2) Signatures d'appel obsolètes : les tests
      appelaient `pitySystem(player)`, `resetPityCounterIfNeeded(player,
      rarity)`, `tryCatchPokemon(player, generation, zone)` sans le
      `guildId` que la prod exige en premier paramètre depuis le refactor
      multi-serveur — jamais mis à jour depuis. Tests corrigés pour
      passer un `guildId` de test. `tsc` clean, **1171/1171 tests passent
      désormais** (contre 1166/1171 avant, 5 échecs préexistants résolus).
- [x] B5 (terminé le 2026-07-24, même branche que B4 —
      `fix/pity-test-mocks` — puisque B4 ne pouvait pas être committé
      sans B5 : le fix vit dans des fichiers que git ignorait). `tests/`
      et `tsconfig.vitest.json` retirés du `.gitignore` (le `tsconfig.json`
      principal excluait déjà `tests` de la compilation prod — deux
      mécanismes différents confondus par erreur, le gitignore ne
      protégeait rien côté prod, il retirait juste les tests du dépôt).
      Les 10 fichiers de `tests/` + `tsconfig.vitest.json` sont maintenant
      trackés. Script npm `"test": "vitest run"` ajouté. `README.md` mis
      à jour : `npm test` documenté dans le tableau des commandes, et
      ajouté en première étape du "Workflow production / mise a jour"
      (pas de CI dans ce repo à ce jour, donc c'est la seule porte de
      sécurité avant un déploiement).

### Slice C — Rangement du repo (checkpoint de confirmation requis)
- [x] C0 (terminé, fait au fil de A1/A4). Gitignore des fichiers `data/` dont le serveur n'a pas besoin en
      prod (le bot ne les lit jamais au runtime, ce sont des
      entrées/sorties d'outils dev) : `data/gen3_zones.csv` (source CSV de
      `injectZonesGen3.ts`), `data/gen3.csv` (orphelin, aucune référence
      dans `src/` — probablement une ancienne source manuelle pré-PokeAPI,
      à confirmer avant suppression totale), `data/rarity-audit-gen3.json`
      + `data/rarity-audit-gen3-readable.csv` (sortie de
      `runRarityAudit.ts`), `data/rarity-comparison-gen3.csv` (sortie de
      `compareRarityWithManual.ts`), `data/raid_debug.json` (déjà repéré
      comme fichier de debug à exclure dans `REFACTOR_MULTI_GUILD.md:513`,
      jamais fait), `data/rollRarityJson.json` (déjà dans `.gitignore`
      mais encore tracké — `git rm --cached` nécessaire ; sa suppression
      était déjà annoncée dans `CHANGELOG.md` 3.2.1 sans avoir été
      réellement appliquée). Nécessite `git rm --cached` pour les fichiers
      déjà trackés (untrack sans supprimer le fichier local). Point
      d'attention : ça retire aussi ces fichiers du diff visible en review
      de PR (ex. `rarity-comparison-gen3.csv` servait de preuve de
      cohérence pour A4) — accepté comme compromis, le critère demandé est
      "ce dont le serveur n'a pas besoin", pas la review.
- [x] C1 (terminé le 2026-07-24, branche `chore/remove-personal-dev-scripts`
      depuis `release/3.5.0`). Liste finale validée explicitement par
      l'utilisateur, 14 fichiers supprimés : `src/scripts/old/` (3
      fichiers JS/TS legacy pré-TS), `editJson.ts` (chemins Windows en
      dur, référençait un fichier inexistant), `debug-lines.ts` +
      `filter-captures.ts` + `stats-pokemon.ts` (pipeline perso d'analyse
      de logs texte exportés à la main, sans rapport avec le bot — le
      vrai système de stats vit dans `src/methods/stats/`),
      `testGetMultiplier.ts` (smoke-test d'une ligne), `add-pity-to-
      players.ts` (chemin relatif cassé, migration obsolète, ne suivait
      pas la convention `--guildId`), `add-generation-to-pokemon.ts`
      (obsolète — le champ `generation` est ajouté automatiquement en
      amont par `buildPokemonJson.ts` pour chaque génération),
      `getPlayerAvatar.ts` (code mort, zéro import ailleurs dans le
      repo — vérifié), `src/utils/check-pokemon-images.js` +
      `createGenJson.js` + `editGenJson.js` (JS legacy mal rangé hors de
      `scripts/old/`, doublons morts). Vérifié avant suppression : aucun
      import de ces fichiers nulle part dans `src/`, aucune référence
      dans `package.json`. `tsconfig.json` nettoyé (retrait des entrées
      `exclude` pointant vers des fichiers supprimés). Gardés (outillage
      légitime, pas "perso uniquement") : toute la chaîne rareté/zones/
      effectiveness, les scripts de maintenance joueurs `--guildId`, les
      scripts d'annonce, `forceEndRaid.ts`, les outils QA/simulation.
      `tsc` clean, 1171/1171 tests passent.
      Découverte annexe, non bloquante, non traitée : `scripts/generate-
      pokemon-list.js` (utilisé par `npm run build`) ne liste que
      gen1/gen2 par défaut, pas gen3 — sans impact prod car
      `pokemon-list.json` n'est plus consommé par le bot en prod depuis
      A3 (tout passe par `getPokemonCatalog()`), seulement par 2 outils
      dev (`check-pokemon-images.js`, supprimé ; `test-raid-pokemon.ts`,
      gardé).
- [x] C1 bis (terminé le 2026-07-24, branche `chore/remove-migration-script`
      depuis `release/3.5.0` — découvert en dehors de `src/scripts/`,
      dans le dossier racine `scripts/` distinct, JS brut non compilé,
      exécuté directement via `node` avant même que `tsc` tourne — d'où
      sa séparation légitime de `src/scripts/`, ce n'est PAS un problème
      de rangement). `scripts/migrate-to-guild-dirs.js` retiré : migration
      ponctuelle du passage mono-serveur → multi-guild, déjà exécutée en
      prod (confirmé explicitement par l'utilisateur, malgré des cases
      encore non cochées dans `REFACTOR_MULTI_GUILD.md` — doc jamais mis
      à jour après coup). Aucune référence ailleurs (`package.json`,
      code) vérifiée par grep avant suppression. `REFACTOR_MULTI_GUILD.md`
      annoté d'une note historique sur la section concernée plutôt que
      réécrit en détail. En même temps : fix de la découverte annexe de
      C1 — `scripts/generate-pokemon-list.js` liste maintenant
      `pokemon-gen3.json` dans ses `defaultFiles` (vérifié en régénérant
      `data/pokemon-list.json` en local : 393 Pokémon dont 135 de gen3,
      contre 258 avant). `tsc` clean, 1171/1171 tests passent.
- [x] C2 (terminé le 2026-07-24, branche `chore/reorganize-scripts`
      depuis `release/3.5.0`). 40 fichiers déplacés de `src/scripts/`
      (plat) vers 7 sous-dossiers par domaine : `announcements/` (+
      `lib/broadcast.ts`), `fetch/`, `gen-json/`, `player-maintenance/`,
      `raid-tools/`, `rarity/`, `zones/` — miroir de la convention déjà
      utilisée dans `src/methods/`. Tous les imports relatifs internes
      (entre scripts déplacés, vers `config/`/`types/`/`methods/`/`utils/`/
      `features/`, vers `data/*.json` via `__dirname`) retracés et corrigés
      pour la nouvelle profondeur. `package.json` (12 scripts npm),
      `tsconfig.json` (`exclude`, 6 chemins), `README.md` ("Scripts
      d'annonce ponctuelle" + "Structure du projet") mis à jour. Vérifié
      indépendamment : `tsc --noEmit` clean, 1171/1171 tests passent,
      aucune référence résiduelle aux anciens chemins plats trouvée par
      grep dans le code (seuls `PROGRAM.md`/`REFACTOR_MULTI_GUILD.md`
      mentionnent encore d'anciens chemins, dans du texte historique —
      pas corrigé, hors scope).
      Découverte annexe pré-existante, non corrigée (hors scope, exclue
      du build TS donc jamais détectée avant) : `raid-tools/test-raid-
      pokemon.ts` importe `from "./logger"`, un fichier qui n'a jamais
      existé à cet emplacement.
- [x] C3 (terminé le 2026-07-24, branche
      `chore/remove-generation-number-env` depuis `release/3.5.0`).
      **Pivot complet par rapport au plan initial** — la demande de
      départ ("retirer `GENERATION_NUMBER`, ça ne sert à rien") s'est
      révélée fausse à la vérification : la variable est activement
      utilisée par `src/config/guildSettings.ts:42-51`
      (`getGenerationNumber`) → `src/methods/zones/getMaxGeneration.ts`
      → `src/methods/zones/resolveCaptureLocation.ts:42`, qui plafonne le
      tirage aléatoire de génération sur `/capture` (sans génération ni
      zone précisée) à `1..GENERATION_NUMBER`. Avec `GENERATION_NUMBER=2`,
      gen3 était donc silencieusement exclu du tirage aléatoire.
      En creusant, **2 autres trous gen3 indépendants trouvés** dans le
      même flux : le dropdown `generation` de `/capture`
      (`src/commandDefinitions.ts`) ne listait que Kanto/Johto (pas de
      choix Hoenn), et `src/features/raid/raidGenerator.service.ts:220`
      avait `randomInt(1, 2)` codé en dur pour la génération de raid,
      totalement indépendant de `GENERATION_NUMBER`.
      **Décision finale (utilisateur)** : garder `GENERATION_NUMBER`
      (bumpé `2` → `3` dans `.env`, `.env.example`, `README.md`) plutôt
      que le retirer, et corriger les 3 trous ensemble :
      - `commandDefinitions.ts` : ajout de `{ name: "Hoenn (Generation 3)",
        value: "gen3" }` au dropdown `/capture`.
      - `raidGenerator.service.ts` : `type GenerationKey` élargi à
        `"gen1" | "gen2" | "gen3"` ; `randomInt(1, 2)` remplacé par
        `randomInt(1, getGenerationNumber(guildId))` (import ajouté
        depuis `guildSettings.ts`, cohérent avec le pattern déjà utilisé
        par `resolveCaptureLocation.ts` — respecte les surcharges
        `generationNumber` par serveur au lieu de lire `process.env`
        directement, contrairement à la suggestion initiale de
        l'utilisateur, corrigée en cours de route).
      `tsc` clean, 1171/1171 tests passent (aucun test ne dépendait du
      plafond gen1-2 codé en dur).
- [x] C4 (terminé le 2026-07-24, branche `chore/extract-player-type-c4`
      depuis `release/3.5.0`). Type `Player` local supprimé de
      `src/scripts/player-maintenance/addXpAndLevelToPlayers.ts`, importe
      désormais `PlayersRecord` depuis `src/types/Player.ts`. `tsc`
      clean, 1171/1171 tests. Règle générale codifiée en TEAM CONVENTIONS
      dans `~/.claude/skills/golden-rules-languages/rules/typescript.md`
      (fichier global, hors de ce dépôt) : un type de domaine partagé ne
      se redéclare jamais localement, il vit une seule fois dans
      `src/types/` et s'importe partout ailleurs.
      Découverte au passage, pas encore traitée : ce script cible encore
      `data/players.json` (ancien fichier legacy pré-multi-guild) au lieu
      de `data/guilds/{guildId}/players.json`, et ne suit pas la
      convention `--guildId` des autres scripts de maintenance joueurs
      (`add-captured-in-current-season.ts`, `migrate-players.ts`,
      `sync-players-from-stats.ts`, `update-stats-from-players.ts`) — cf.
      C5 ci-dessous.
- [x] C5 (terminé le 2026-07-24, branche `audit/legacy-multiguild-paths`
      depuis `release/3.5.0`). Audit complet par grep de tout `src/` pour
      les chemins legacy racine (`data/players.json`, `data/stats.json`,
      `data/raid.json`, `data/zones_unlocked.json`,
      `data/zones_to_unlock.json`) et la convention `--guildId`. Portée
      finale plus restreinte que redouté — **2 fichiers concernés**,
      aucun autre (confirmé : rien en dehors de `src/scripts/` ne touche
      ces chemins racine, tout le code de prod passe déjà par
      `data/guilds/{guildId}/`) :
      - `addXpAndLevelToPlayers.ts` (déjà repéré en C4) — **converti**
        vers `playersDb(guildId)` + `--guildId`, même pattern que ses 4
        frères déjà conformes (`migrate-players.ts` etc.).
      - `injectZones.ts` (prédécesseur d'`injectZonesGen3.ts`) —
        **supprimé**, pas converti. En creusant : cassé (son CSV source
        `data/zone_par_pokemon_2.csv` n'existe plus sur le disque,
        confirmé) et obsolète (écrivait vers
        `data/pokemon-gen2-with-zones.json`, qui n'existe pas non plus —
        les zones gen2 sont déjà dans `pokemon-gen2.json` depuis
        longtemps, sa mission est déjà remplie). Même catégorie que les
        scripts retirés en C1. `tsconfig.json` nettoyé de l'entrée
        `exclude` correspondante. Aucune référence ailleurs (npm
        scripts, code) vérifiée avant suppression.
      `tsc` clean, 1171/1171 tests passent.

### Slice D — Nouvelle ressource "données de recherche" + 3 commandes
- [~] D1. Design de la ressource (nouveau champ sur `Player`
      `src/types/Player.ts`, module `src/methods/research/` en miroir de
      `src/methods/xp/xp.ts`, table de coût par palier de rareté pour la
      capture ciblée, sources de gain).
      **Décision d'économie de jeu actée le 2026-07-24** (utilisateur) :
      valeur initiale de la ressource = xp actuel du joueur au moment de la
      migration (pas de calcul dérivé, pas de recalibrage).
      Fait (2026-07-24) : champ `researchData: number` (non optionnel,
      comme `xp`) ajouté à `Player` (`src/types/Player.ts`). Script
      d'initialisation créé : `src/scripts/player-maintenance/init-research-data.ts`
      (`npm run init-research-data`), même pattern `--guildId`
      idempotent que les autres scripts du dossier (kebab-case, pas
      calqué sur `addXpAndLevelToPlayers.ts` sur ce point) —
      `researchData = researchData ?? xp ?? 0`. Rendre le champ
      obligatoire a cassé la création de nouveau profil
      (`src/methods/player/createProfileIfNeeded.ts`, `TS2741`) :
      corrigé en ajoutant `researchData: 0` à l'objet initial, cohérent
      avec la décision (xp d'un nouveau joueur = 0 de toute façon). `tsc`
      clean, 1171/1171 tests. Script npm ajouté : `init-research-data`.
      **Reste à trancher** : module `src/methods/research/` (lecture/
      écriture de la ressource en jeu), table de coût par palier de
      rareté (D4) et sources de gain continues après la migration
      initiale — pas encore abordé.
- [x] D1bis (terminé le 2026-07-24). Deux lignes ajoutées au bloc
      `summary` de `src/methods/embed/buildPokedexPageEmbed.ts` :
      `✨ **XP :** ${playerXp}` et `🔬 **Données de recherche :**
      ${playerResearchData}`, avec fallback défensif `0` si `undefined`
      (même pattern que `playerLevel` juste au-dessus). `tsc` clean,
      1171/1171 tests.
      **Gap non traité** : aucun test n'existe pour
      `buildPokedexPageEmbed` (vérifié par grep, aucun `*.test.ts` ne la
      référence) — pas de régression possible mais pas de couverture
      nouvelle non plus. À transmettre à `quality-lead` si une couverture
      est souhaitée avant la release (candidat naturel pour H0, la slice
      E2E).
- [ ] D2. Commande "statistiques d'un Pokémon" — nouveau fichier
      `src/commands/<nom>Command.ts` sur le modèle de
      `captureCommand.ts`/`pokedexCommand.ts`, lecture depuis
      `data/pokemon-list.json`.
- [ ] D3. Commande "liste des Pokémon capturés dans une zone donnée" —
      croiser `player.captureList` (via `src/utils/jsonPlayers.ts`) avec le
      champ `zones` de chaque Pokémon, pagination façon `pokedexCommand.ts`.
- [ ] D4. Commande "capturer un Pokémon dans une zone + rareté précisées"
      consommant les données de recherche — réutiliser la logique gacha de
      `captureCommand.ts` / `src/methods/gatcha/`, valider que la
      combinaison zone+rareté demandée existe avant de débiter la ressource.

### Slice E — Scripts d'automatisation (opérationnel)
- [ ] E1. Script de publication automatique du patchnote sur le Discord de
      chaque serveur (source : dernière entrée de `CHANGELOG.md` ou
      `PATCHNOTE.md`), réutiliser `src/scripts/lib/broadcast.ts` avec
      `channelField: "general"`.
- [ ] E2. Script de mise à jour automatique du serveur — **à investiguer
      avant de designer** : comment le bot tourne actuellement en prod
      (process manager ? service Windows/Linux ? docker ?) n'a pas encore
      été identifié dans cette session. Premier pas : clarifier ça avec
      l'utilisateur ou auditer le serveur de prod avant d'écrire le script
      (git pull / npm install / build / restart doit s'adapter au run réel).

### Slice F — Événement lunaire
- [ ] F1. **Spec à clarifier avec l'utilisateur avant tout design** : nature
      exacte de l'événement (spawns spéciaux liés à la phase de lune réelle,
      fréquence, effet sur les taux/zones, durée, notification aux joueurs).
      Rien d'assez concret encore pour lancer une conception.

### Slice G — Génération 3 (déjà bien avancée)
- [x] G1 (clos le 2026-07-24, audit read-only via quality-lead →
      codebase-audit, aucune modification de code nécessaire). Capture et
      raids confirmés gen3-complets par C3 (dropdown `/capture`, tirage
      aléatoire, génération de raid). Deuxième passe d'audit sur les 9
      commandes restantes (`/pokedex`, `/leaderboard`, `/get-rarity`,
      `/get-shiny-rate`, `/cheat`, `/pity`, `/raid`, `/raid-squad`,
      `/raid-force-end`) : **toutes gen3-complètes**, aucun plafond/liste de
      génération codé en dur trouvé, tout passe par `getPokemonCatalog()`
      (`src/utils/pokemonCatalog.ts:20-25`, gen1+gen2+gen3) ou par des
      chemins indépendants de la génération (pity, raid state, taux de
      shiny). Vérifié en particulier : `getTotalPokemonNumber.ts` dérive le
      dénominateur du Pokédex du catalogue réel (pas une constante 251/258),
      et `randomInt()` dans `raidGenerator.service.ts` est bien inclusif aux
      deux bornes (gen3 réellement atteignable via `getGenerationNumber`,
      pas d'off-by-one caché).
      **Point opérationnel non-bloquant relevé (à garder pour Slice H
      déploiement)** : `pokemonCatalog.ts` mémoïse le catalogue par
      `guildId` dans un `Map` au niveau module, jamais invalidé — si
      `data/pokemon-gen3.json` est déployé pendant que le process tourne, un
      redémarrage du bot est nécessaire pour que gen3 apparaisse côté
      guildes déjà en cache. Pas un bug (le code lit bien gen3), une
      contrainte de procédure de déploiement.

### Slice H — Release
- [ ] H0. Tests E2E automatisés (décidé le 2026-07-24, à faire avant le
      merge final, pas maintenant). Pas un vrai E2E réseau (bot connecté à
      Discord — trop fragile/dangereux à automatiser : token réel, rate
      limits, pas d'assertions fiables côté UI Discord). Approche retenue :
      simuler des objets `Interaction` discord.js et appeler directement les
      handlers de commandes (`captureCommand`, `raidCommand`, etc.) contre
      un dossier de guilde de test avec de vraies données JSON — couvre le
      parcours complet (capture avec/sans rareté forcée → xp → pokedex →
      stats, raid complet, pity) sans dépendre du réseau Discord. À faire
      designer/écrire par `e2e-test-writer` (via `quality-lead`) : liste de
      parcours d'abord, puis implémentation. Doit passer avant H2.
- [ ] H1. `CHANGELOG.md` : rédiger l'entrée `[3.5.0]` consolidée
      (Ajouts / Corrections / Modifications / Suppressions) à partir de
      toutes les slices ci-dessus.
- [ ] H2. Vérifier `package.json` (déjà `3.5.0`), merger `release/3.5.0` →
      `main`, tag `v3.5.0` (uniquement sur confirmation explicite —
      commit/push restent soumis aux règles habituelles : jamais de push
      sans autorisation, jamais de commit sans confirmation affichée).
      Déployer selon le "Workflow production / mise à jour" du `README.md`.
- [ ] H3. Dogfooder E1 (script de patchnote auto) pour l'annonce de sortie.

## Vérification (à chaque slice)

- `npm test` (vitest) doit passer.
- Pour tout changement touchant la génération de JSON (`data/pokemon-gen*.json`),
  relire le diff avec `compareRarityWithManual.ts` ou équivalent avant merge —
  ces fichiers sont consommés directement par le bot en prod.
- Pour les nouvelles commandes (Slice D), tester manuellement en dev via
  `npm run dev` + `npm run deploy:dev` (propagation instantanée) sur un
  serveur de test avant tout déploiement global.
- Aucune slice ne doit merger dans `release/3.5.0` avec des tests rouges ou
  un `npm run build` cassé.

## Prochaine étape immédiate

Slices A, B, C et G sont closes. Restent D (nouvelle ressource "données de
recherche" + 3 commandes), E (scripts d'automatisation), F (événement
lunaire, spec à clarifier avec l'utilisateur avant tout design) et H
(release finale). Aucune dépendance dure entre D/E/F entre elles — l'ordre
est au choix de l'utilisateur. F nécessite une clarification de spec avant
de pouvoir démarrer ; D1 nécessite une décision d'économie de jeu (à
trancher via le flow design-then-build si le calibrage a des implications
de balance/anti-abus).
