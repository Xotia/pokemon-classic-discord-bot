import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Une commande déclarée dans commandDefinitions.ts mais absente de la chaîne de
 * dispatch de handleInteraction ne produit aucune erreur : l'interaction
 * traverse tous les `if`, la fonction retourne, et Discord affiche
 * « l'application ne répond pas » au bout de 3 secondes. Rien dans les logs ne
 * désigne la cause.
 *
 * Ce test compare les deux fichiers pour que le trou de câblage soit rouge ici
 * plutôt que silencieux en production.
 */

const read = (relative: string): string =>
  fs.readFileSync(path.resolve(__dirname, "..", relative), "utf-8");

/** Noms de commandes racines : le `.setName` qui suit un `new SlashCommandBuilder()`. */
function declaredCommandNames(source: string): string[] {
  return [...source.matchAll(/new SlashCommandBuilder\(\)\s*\.setName\("([^"]+)"\)/g)].map(
    (match) => match[1],
  );
}

/** Noms de commandes effectivement aiguillés par handleInteraction. */
function dispatchedCommandNames(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/interaction\.commandName === "([^"]+)"/g)].map((match) => match[1]),
  );
}

describe("câblage des commandes", () => {
  const definitions = read("src/commandDefinitions.ts");
  const index = read("src/index.ts");

  const declared = declaredCommandNames(definitions);
  const dispatched = dispatchedCommandNames(index);

  it("trouve bien les commandes déclarées (garde-fou du parsing)", () => {
    expect(declared.length).toBeGreaterThan(10);
    expect(declared).toContain("world-boss-force-start");
    expect(declared).toContain("zone-progression");
  });

  it("n'a pas de doublon dans les noms déclarés", () => {
    expect(new Set(declared).size).toBe(declared.length);
  });

  it("aiguille chaque commande déclarée", () => {
    const missing = declared.filter((name) => !dispatched.has(name));

    expect(missing, `commandes déclarées mais non câblées : ${missing.join(", ")}`).toEqual([]);
  });

  it("garde un filet en fin de chaîne pour les commandes non câblées", () => {
    expect(index).toContain("unhandled_command");
  });
});
