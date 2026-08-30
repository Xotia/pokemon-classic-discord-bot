# Simulateur de raid du centre de recherche

Outil web mis à la disposition des joueurs : ils saisissent la créature du raid
et l'équipe engagée, l'outil rejoue le combat et annonce le résultat avant la
clôture des inscriptions.

## Ce que c'est, techniquement

Un dossier de fichiers **statiques**, publié sur GitHub Pages. Aucun process ne
tourne, nulle part. Le simulateur ne parle à rien — ni au bot, ni à Discord, ni
à une base. Il ne connaît pas le raid en cours, c'est le joueur qui saisit
tout.

```
tools/raid-simulator/
  src/                  sources (versionnées)
    index.html
    style.css
    app.js              interface, aucun calcul de combat
    raidSimCore.js      moteur de combat, miroir de celui du bot
    favicon.svg
  server.js             aperçu local uniquement, jamais déployé
dist-web/raid-simulator/  sortie du build (générée, non versionnée)
```

## Construire et prévisualiser

```bash
npm run raid-sim:build   # génère dist-web/raid-simulator/
npm run raid-sim         # build + aperçu sur http://127.0.0.1:4173
```

`npm run build` (celui du bot) ne touche **pas** au simulateur, volontairement :
un pokédex malformé doit faire échouer la publication du site, pas un
déploiement du bot. C'est GitHub Actions qui construit et publie (voir plus
bas).

## Les deux garde-fous à ne pas contourner

**1. Le moteur ne doit jamais diverger de celui du bot.**
`raidSimCore.js` est une réimplémentation en JS navigateur de
`computeBruteBattleResult` (`src/features/raid/computeBruteRaidResult.ts`).
`tests/raid/raidSimulatorParity.test.ts` charge le fichier côté Node et compare
les deux moteurs sur une matrice de cas (immunités, efficacités absentes,
équipes multiples, types non renseignés). Un simulateur qui dérive annonce aux
joueurs des victoires qui n'auront pas lieu : si ce test casse, c'est lui qui a
raison.

**2. Seul le strict nécessaire part en ligne.**
Le pokédex publié (`pokedex.json`) est **reconstruit champ par champ** par
`src/scripts/raid-tools/buildRaidSimulator.ts` : id, nom, sprite, types, stats,
efficacités défensives. Ni rareté, ni zones, ni génération.
`tests/scripts/buildRaidSimulator.test.ts` verrouille cette liste blanche.

Le serveur d'aperçu exposait autrefois une route `/data/` qui servait
n'importe quel JSON du dossier `data/` du bot — `players.json` et
`guilds.json` compris. Elle a été supprimée. **Ne la réintroduisez pas** : le
build est le seul chemin par lequel une donnée a le droit d'atteindre le web.

## Publication (GitHub Pages)

Le site est publié automatiquement par le workflow
[`.github/workflows/deploy-raid-simulator.yml`](../../.github/workflows/deploy-raid-simulator.yml).

**URL publique : https://xotia.github.io/pokemon-classic-discord-bot/**

Rien n'est hébergé sur le VPS : le simulateur ne vit pas sur la machine du bot,
n'ouvre aucun port et ne peut donc rien lui faire. Si le site tombe, le bot ne
le sent pas.

### Activation, une seule fois

Dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source :
GitHub Actions**. Le premier `push` sur `main` publie ensuite le site.

### Cycle de publication

Le workflow se déclenche sur `main` quand l'un de ces chemins change :

- `tools/raid-simulator/**`
- `src/scripts/raid-tools/buildRaidSimulator.ts`, `src/config/paths.ts`
- `data/pokemon-gen{1,2,3}.json` (le pokédex publié en dépend)
- le workflow lui-même

Une mise à jour du bot sans effet sur le simulateur ne republie donc rien. Pour
forcer une publication : onglet **Actions → Deploy raid simulator → Run
workflow**.

Avant de publier, le workflow rejoue les deux tests garde-fous ci-dessus. Un
simulateur qui a dérivé du moteur du bot, ou un pokédex qui exposerait un champ
hors liste blanche, **ne franchit pas la publication**.

### Notes

- Le site est servi sous le sous-chemin `/pokemon-classic-discord-bot/`. Tous
  les chemins d'assets de la page sont relatifs, c'est ce qui le permet : ne
  passez aucun `href`/`src` en absolu (`/style.css`), la page casserait en
  ligne tout en marchant en local.
- `package-lock.json` est versionné et le workflow installe avec `npm ci` : le
  site publié est build avec les versions exactes du lockfile. Un `npm install`
  aurait laissé une mise à jour de dépendance transitive changer le simulateur
  sans qu'aucun commit ne bouge.
- Le contenu publié est intégralement public. C'est déjà le cas du dépôt, et le
  build ne laisse sortir que la liste blanche du pokédex.
- Un hébergement auto-géré (nginx sur le VPS) reste possible : le dossier
  `dist-web/raid-simulator/` se sert tel quel. Ce n'est plus le chemin retenu.
