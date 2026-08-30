import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  MAX_DESCRIPTION_LENGTH,
  extractPatchnoteBody,
  parsePatchnoteEntries,
  splitPatchnoteBody,
} from "../../src/scripts/announcements/lib/patchnote";

const PATCHNOTE = fs
  .readFileSync(path.resolve(__dirname, "../../PATCHNOTE.md"), "utf-8")
  .replace(/\r\n/g, "\n");

describe("parsePatchnoteEntries", () => {
  it("lit les entrées dans l'ordre du fichier, la plus récente en tête", () => {
    const entries = parsePatchnoteEntries(PATCHNOTE);

    expect(entries.length).toBeGreaterThan(1);
    expect(entries[0].version).toBe("3.7.0");
    expect(entries[1].version).toBe("3.6.0");
  });
});

describe("extractPatchnoteBody", () => {
  it("s'arrête au double séparateur, sans mordre sur l'entrée suivante", () => {
    const entries = parsePatchnoteEntries(PATCHNOTE);
    const body = extractPatchnoteBody(PATCHNOTE, entries[0]);

    expect(body).not.toContain("# Mise à jour 3.6.0");
    expect(body).toContain("/world-boss");
    expect(body).toContain("/zone-progression");
  });
});

describe("splitPatchnoteBody", () => {
  it("respecte la limite Discord sur chaque partie", () => {
    const entries = parsePatchnoteEntries(PATCHNOTE);

    for (const entry of entries) {
      for (const part of splitPatchnoteBody(extractPatchnoteBody(PATCHNOTE, entry))) {
        expect(part.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
      }
    }
  });

  it("ne perd rien du contenu : c'est le point de tout le découpage", () => {
    const entries = parsePatchnoteEntries(PATCHNOTE);
    const body = extractPatchnoteBody(PATCHNOTE, entries[0]);
    const rejoined = splitPatchnoteBody(body).join("\n\n");

    // Le découpage retire les `---` de section et normalise les blancs :
    // on compare donc sur le texte utile, mot à mot.
    const words = (text: string) => text.replace(/^---$/gm, " ").split(/\s+/).filter(Boolean);

    expect(words(rejoined)).toEqual(words(body));
  });

  it("découpe la 3.7.0 en plusieurs parties plutôt que de la tronquer", () => {
    const entries = parsePatchnoteEntries(PATCHNOTE);
    const body = extractPatchnoteBody(PATCHNOTE, entries[0]);

    expect(body.length).toBeGreaterThan(MAX_DESCRIPTION_LENGTH);
    expect(splitPatchnoteBody(body).length).toBeGreaterThan(1);
  });

  it("laisse une entrée courte en une seule partie", () => {
    expect(splitPatchnoteBody("Une ligne.\n\n---\n\nUne autre.")).toEqual([
      "Une ligne.\n\nUne autre.",
    ]);
  });

  it("coupe un paragraphe plus long que la limite, en dernier recours", () => {
    const parts = splitPatchnoteBody("a".repeat(250), 100);

    expect(parts).toHaveLength(3);
    expect(parts.every((part) => part.length <= 100)).toBe(true);
    expect(parts.join("")).toBe("a".repeat(250));
  });

  it("rend une liste vide sur un corps vide", () => {
    expect(splitPatchnoteBody("   \n\n  ")).toEqual([]);
  });
});
