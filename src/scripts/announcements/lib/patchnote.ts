/**
 * Lecture et découpage de PATCHNOTE.md, isolés de Discord et du système de
 * fichiers pour être testables.
 *
 * Le découpage existe parce qu'une description d'embed Discord plafonne à
 * 4096 caractères : une entrée qui dépasse était tronquée silencieusement, et
 * les joueurs perdaient la fin du patchnote (la 3.7.0 fait ~7500 caractères).
 */

/** Marge sous la limite Discord de 4096, pour le titre de partie et le pied. */
export const MAX_DESCRIPTION_LENGTH = 4000;

const VERSION_HEADER_RE = /^# Mise à jour (\d+\.\d+\.\d+) — (.+)/gm;

export type PatchnoteEntry = { version: string; index: number };

/** Toutes les entrées de version du fichier, dans l'ordre du fichier. */
export function parsePatchnoteEntries(patchnote: string): PatchnoteEntry[] {
  const entries: PatchnoteEntry[] = [];
  const regex = new RegExp(VERSION_HEADER_RE.source, VERSION_HEADER_RE.flags);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(patchnote)) !== null) {
    entries.push({ version: match[1], index: match.index });
  }

  return entries;
}

/**
 * Corps d'une entrée, hors ligne de titre. Les entrées sont séparées par un
 * double `---` (`---`, ligne vide, `---`) ; la dernière va jusqu'à la fin.
 */
export function extractPatchnoteBody(patchnote: string, entry: PatchnoteEntry): string {
  const headerEnd = patchnote.indexOf("\n", entry.index) + 1;
  const afterHeader = patchnote.slice(headerEnd);
  const separator = afterHeader.match(/\n---\n\n---/);

  return (separator ? afterHeader.slice(0, separator.index) : afterHeader).trim();
}

/**
 * Découpe un corps en parties de `maxLength` caractères au plus, en coupant
 * d'abord aux séparateurs de section (`---`), puis aux paragraphes.
 *
 * Un paragraphe plus long que la limite est coupé net : c'est le seul cas où
 * une phrase est tranchée, et il ne se produit pas avec des paragraphes de
 * taille normale.
 */
export function splitPatchnoteBody(
  body: string,
  maxLength: number = MAX_DESCRIPTION_LENGTH,
): string[] {
  const trimmed = body.trim();

  if (trimmed.length === 0) {
    return [];
  }

  // Sections d'abord : c'est la coupure la plus lisible pour un joueur.
  const sections = trimmed.split(/\n---\n/).map((section) => section.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const push = (): void => {
    if (current.length > 0) {
      chunks.push(current);
      current = "";
    }
  };

  const append = (piece: string): void => {
    const candidate = current.length === 0 ? piece : `${current}\n\n${piece}`;

    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }

    push();

    if (piece.length <= maxLength) {
      current = piece;
      return;
    }

    // Section seule trop longue : on retombe sur les paragraphes.
    for (const paragraph of piece.split(/\n\n+/)) {
      const withParagraph = current.length === 0 ? paragraph : `${current}\n\n${paragraph}`;

      if (withParagraph.length <= maxLength) {
        current = withParagraph;
        continue;
      }

      push();

      // Paragraphe seul trop long : coupe franche, dernier recours.
      let rest = paragraph;
      while (rest.length > maxLength) {
        chunks.push(rest.slice(0, maxLength));
        rest = rest.slice(maxLength);
      }
      current = rest;
    }
  };

  for (const section of sections) {
    append(section);
  }

  push();

  return chunks;
}
