# Messages à publier

Un fichier markdown = un message Discord. Le script les envoie sans qu'on ait
besoin d'écrire du TypeScript à chaque annonce.

Par défaut le script n'envoie rien : il affiche l'embed résolu pour relecture.

```bash
npm run send-message -- lore-new-adventure
```

L'envoi réel demande un `--send` explicite. **Passer par `npx ts-node` pour
l'envoi**, parce que `npm run` mange les options (voir plus bas) :

```bash
npx ts-node src/scripts/announcements/send-message.ts lore-new-adventure --send
```

Le nom du fichier peut être donné avec ou sans `.md`, avec ou sans le préfixe
`message/`.

> **`npm run` supprime les `--options`.** Cette version de npm ne transmet au
> script que les arguments sans tiret : `npm run send-message -- fichier --send`
> arrive côté script comme `fichier` tout court. C'est sans danger ici — sans
> `--send` le script se contente de l'aperçu — mais ça explique pourquoi l'envoi
> se fait en `npx ts-node`. Si on tient à npm, il faut doubler le séparateur :
> `npm run send-message -- -- fichier --send`.
>
> C'est aussi la raison pour laquelle le mode aperçu est le défaut plutôt qu'un
> `--dry-run` : un flag avalé en silence ne doit jamais transformer un aperçu en
> publication.

## Format

```markdown
---
title: 📡 TRANSMISSION CRYPTÉE
color: "#8B0000"
channel: lore
footer: |
  — Professeure LYRA VOSS
  Transmission terminée.
---

Le texte avant le premier `##` devient la description de l'embed.
Le markdown Discord classique fonctionne : **gras**, *italique*, `code`, > citation.

## 🔬 Premier champ

Chaque titre `##` ouvre un champ de l'embed. Tout ce qui suit, jusqu'au `##`
suivant, en est le contenu.

## 📋 Champ côte à côte {inline}

Le suffixe `{inline}` place le champ sur la même ligne que ses voisins inline.

##

Un `##` sans titre produit un champ sans intitulé (séparateur visuel).
```

### Clés du front matter

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `title` | — | Titre de l'embed (256 car. max) |
| `color` | — | `#RRGGBB`, `0xRRGGBB` ou un entier |
| `channel` | `lore` | `lore`, `main`, `dev` ou `raid` |
| `content` | — | Texte hors embed, pour les mentions (`@everyone`) |
| `footer` | — | Pied de page ; `\|` pour du multi-ligne |
| `author` | — | Ligne d'auteur au-dessus du titre |
| `url` | — | Lien porté par le titre |
| `image` | — | URL de la grande image |
| `thumbnail` | — | URL de la vignette |
| `timestamp` | `true` | Horodatage au bas de l'embed |

Le front matter est optionnel : sans lui, le fichier entier est la description et
le message part sur le salon lore.

### Options

À passer via `npx ts-node` (cf. la remarque sur `npm run` plus haut).

- `--send` : publie réellement. Sans lui, le script se contente de l'aperçu.
- `--channel <lore\|main\|dev\|raid>` : surcharge le salon du front matter.
- `--channelId <id>` : envoie sur ce seul salon au lieu de tous les serveurs du
  registre. À combiner avec `--send` pour un vrai test sur un salon privé.

### Limites Discord

Le script vérifie les limites avant l'envoi (titre 256, description 4096, champ
1024, 25 champs, 6000 au total) et refuse le fichier en listant ce qui dépasse,
plutôt que de laisser Discord renvoyer une erreur illisible.
