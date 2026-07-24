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
- [ ] A2 (révisé le 2026-07-24 : liste manuelle, pas de détection
      automatique — cf. Décisions). Ajouter `legendary_wandering` dans
      `RARITY_ORDER` / `rarityList` / `rarityBoostedList`
      (`src/config/rarity.ts`), au-dessus de `legendary`, taux plus faible.
      Ajouter un mécanisme simple pour marquer manuellement un id comme
      "itinérant" (override explicite écrit à la main par l'utilisateur
      dans le pipeline de génération JSON, pas un script de calcul) —
      appliqué après `computeRarity`, dans le même esprit que
      l'injection de zones. Pas de passage par `risk-lead`/`architect`
      nécessaire vu la simplification : `implementer` direct suffit.
      Ajouter la valeur dans `RARITY_ORDER` / `rarityList` /
      `rarityBoostedList` (`src/config/rarity.ts`).
- [ ] A4. Généraliser `createGenJson.ts` (utilise encore l'ancien
      `getRarity.ts`) ou réutiliser `createGen3Json.ts` comme modèle pour
      régénérer `data/pokemon-gen1.json` et `data/pokemon-gen2.json` avec
      `computeRarity` + la nouvelle règle "itinérant". Comparer avant/après
      avec `compareRarityWithManual.ts` (déjà le bon outil pour ça) avant de
      valider le diff.

### Slice B — Corrections de bugs (indépendantes entre elles)
- [ ] B1. `data/all_types.json:195-212` — le tableau `fire.defense.double`
      est faux (`bug, fire, flying, ice, poison`). Corriger en
      `water, ground, rock` (le `half`/`zero` actuels sont déjà corrects,
      ne pas y toucher sans vérif équivalente pour d'autres types tant que
      ça n'est pas demandé).
- [ ] B2. Corriger le libellé de zone "Phare de bon espérance" →
      "Phare de Bonne-Espérance" dans `data/zones_to_unlock.default.json:24`
      et `data/zones_all.json:30`. Vérifier si les fichiers déployés en prod
      (`data/guilds/{guildId}/zones_*.json`, non versionnés) doivent être
      corrigés manuellement côté serveur après déploiement (l'id
      `cape-of-good-hope-lighthouse` ne change pas, seul le libellé change,
      donc impact limité à l'affichage).
- [ ] B3. Bug "messages auto envoyés dans le channel de raid" —
      `src/scripts/lib/broadcast.ts:34` défaut `channelField = "raid"`.
      `send-maintenance.ts`, `send-back-online.ts`,
      `send-quick-maintenance.ts`, `send-quick-back-online.ts` n'appellent
      pas `broadcastEmbed` avec `channelField: "general"` (contrairement à
      `send-lore-new-adventure.ts`) → corriger les 4 appels. Mettre à jour
      la doc `README.md` section "Scripts d'annonce ponctuelle" qui décrit
      actuellement ce comportement comme voulu.
- [ ] B4. Tests préexistants cassés sur `HEAD` (repérés le 2026-07-24,
      hors périmètre initial mais à corriger avec le reste des
      corrections) :
      - `tests/pitySystem.test.ts` + `tests/tryCatchPokemon.test.ts` :
        `vi.mock("../src/utils/logger")` n'expose pas `getLoggerForGuild`
        → `TypeError` dès que `pitySystem.ts`/`tryCatchPokemon.ts`
        l'appelle. Ajouter le mock manquant.
      - `tests/pitySystem.test.ts` — `resetPityCounterIfNeeded` ne remet
        pas `player.pityCounter` à 0 pour la rareté `very_rare` (bug
        réel dans `src/methods/pity/pitySystem.ts`, pas juste un test
        mal écrit — à vérifier lequel des deux est faux avant de corriger).

### Slice C — Rangement du repo (checkpoint de confirmation requis)
- [ ] C0. Gitignore des fichiers `data/` dont le serveur n'a pas besoin en
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
- [ ] C1. Lister précisément les scripts "perso dev-only" à retirer de git
      (candidats forts identifiés : `src/scripts/editJson.ts` (chemins
      Windows en dur), tout `src/scripts/old/` (JS legacy pré-TS),
      `debug-lines.ts`, `filter-captures.ts`, `testGetMultiplier.ts`).
      Cas à trancher avec l'utilisateur avant suppression : `testRarity.ts`,
      `compareRarityWithManual.ts`, `runRarityAudit.ts` (outils de QA
      rareté potentiellement réutiles pour valider gen1/2 en Slice A —
      probablement à garder), scripts d'annonce ponctuelle (perso ou
      opérationnels ? probablement à garder, ce sont des outils prod).
      **Ne pas supprimer sans validation explicite de la liste finale.**
- [ ] C2. Réorganiser le reste de `src/scripts/` en sous-dossiers par
      domaine (ex. `rarity/`, `zones/`, `gen-json/`, `player-maintenance/`,
      `raid-tools/`, `announcements/`, `fetch/`), en miroir de la convention
      déjà utilisée dans `src/methods/`. Mettre à jour les imports relatifs
      et toute référence dans `package.json` (scripts npm).
- [ ] C3. Retirer `GENERATION_NUMBER` : `.env`, `.env.example`, section
      "Variables d'environnement" de `README.md`,
      `src/types/GuildRegistryEntry.ts:15` (`generationNumber?`),
      `src/config/guildSettings.ts:43-47`, et les 2 sites consommateurs
      (`src/features/raid/raidGenerator.service.ts:90-91,220-221,246`,
      `src/scripts/simulateCapture.ts:133,139`). Vérifier au préalable
      qu'aucun flux ne dépend encore de cette valeur par défaut (le
      `/capture [generation]` en prend déjà un en paramètre explicite par
      commande d'après le README) — passer par `implementer`, mais si un
      doute d'architecture apparaît (flux encore dépendant), remonter à
      `risk-lead`.
- [ ] C4. `src/scripts/addXpAndLevelToPlayers.ts:4-9` définit un type
      `Player` local dupliqué et plus permissif que le vrai
      `src/types/Player.ts`. Supprimer le type local, importer
      `Player`/`PlayersRecord` depuis `src/types/Player.ts`, adapter le
      script aux champs réels (`name` et non `username`, `xp`/`level`
      non-optionnels).

### Slice D — Nouvelle ressource "données de recherche" + 3 commandes
- [ ] D1. Design de la ressource (nouveau champ sur `Player`
      `src/types/Player.ts`, module `src/methods/research/` en miroir de
      `src/methods/xp/xp.ts`, table de coût par palier de rareté pour la
      capture ciblée, sources de gain). **Décision d'économie de jeu** à
      faire trancher (au moins les chiffres) — passer par le flow
      design-then-build (`risk-lead` → `architect` si le calibrage a des
      implications de balance/anti-abus, sinon direct `implementer` si les
      règles sont déjà claires côté utilisateur).
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
- [ ] G1. Dépend de A3 (injection des zones gen3) — une fois fait, auditer
      le reste du flux gen3 (raid, pokedex, capture, commandes existantes)
      pour confirmer qu'il n'y a pas de code encore gen1/gen2-only qui
      bloquerait gen3 en usage réel (le README documente déjà
      `/capture [generation]`, donc le multi-gen est probablement déjà
      câblé — à vérifier, pas à supposer).

### Slice H — Release
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

Démarrer par **A1** : finir et committer le travail en cours sur
`fix/rarity-one-time-only-scope`, faire tourner les tests, puis PR vers
`main`. C'est un prérequis bloquant pour A2-A4 et pour G1.
