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
    const rank = (v: string) => v.split(".").map(Number);

    expect(entries.length).toBeGreaterThan(1);
    // Aucun numéro en dur : le test survit à la release suivante.
    expect(rank(entries[0].version) > rank(entries[1].version)).toBe(true);
  });
});

describe("extractPatchnoteBody", () => {
  it("s'arrête au double séparateur, sans mordre sur l'entrée suivante", () => {
    const entries = parsePatchnoteEntries(PATCHNOTE);
    const body = extractPatchnoteBody(PATCHNOTE, entries[0]);

    // Le corps de la première entrée ne doit contenir aucun autre en-tête.
    for (const other of entries.slice(1)) {
      expect(body).not.toContain(`# Mise à jour ${other.version}`);
    }
    expect(body.length).toBeGreaterThan(0);
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

  it("découpe une entrée trop longue plutôt que de la tronquer", () => {
    // Corps synthétique : le test porte sur le découpage, pas sur la taille
    // qu'aura le patchnote du jour.
    const paragraph = "Paragraphe de contenu.";
    const section = Array(60).fill(paragraph).join("\n\n");
    const body = [section, section, section].join("\n\n---\n\n");

    expect(body.length).toBeGreaterThan(MAX_DESCRIPTION_LENGTH);

    const parts = splitPatchnoteBody(body);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => part.length <= MAX_DESCRIPTION_LENGTH)).toBe(true);
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
