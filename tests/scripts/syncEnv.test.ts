import { describe, expect, it } from "vitest";
import {
  appendMissingKeys,
  findMissingKeys,
  parseEnvKeys,
} from "../../src/scripts/sync-env";

describe("parseEnvKeys", () => {
  it("ignore les commentaires et les lignes vides", () => {
    const keys = parseEnvKeys("# COMMENT=1\n\nFOO=bar\n  BAZ=1 2 3\n");

    expect([...keys.keys()]).toEqual(["FOO", "BAZ"]);
    expect(keys.get("BAZ")).toBe("1 2 3");
  });

  it("garde la valeur vide d'une clé déclarée sans valeur", () => {
    expect(parseEnvKeys("TOKEN=\n").get("TOKEN")).toBe("");
  });
});

describe("findMissingKeys", () => {
  it("ne retient que les clés absentes du .env", () => {
    const missing = findMissingKeys(
      "FOO=deja-la\n",
      "FOO=exemple\nWORLD_BOSS_SCHEDULER_MODE=debug\n",
    );

    expect(missing).toEqual([{ key: "WORLD_BOSS_SCHEDULER_MODE", value: "debug" }]);
  });

  it("considère une clé présente mais vide comme configurée", () => {
    expect(findMissingKeys("TOKEN=\n", "TOKEN=xxx\n")).toEqual([]);
  });

  it("n'ajoute pas les clés commentées dans l'exemple", () => {
    expect(findMissingKeys("", "# METEORITE_EVENT_DEBUG=1\n")).toEqual([]);
  });
});

describe("appendMissingKeys", () => {
  it("ajoute les clés à la fin sans toucher au contenu existant", () => {
    const result = appendMissingKeys("FOO=bar", [{ key: "NEW", value: "1" }]);

    expect(result.startsWith("FOO=bar\n")).toBe(true);
    expect(result).toContain("NEW=1\n");
    expect(parseEnvKeys(result).get("FOO")).toBe("bar");
  });

  it("est idempotent une fois les clés écrites", () => {
    const result = appendMissingKeys("FOO=bar\n", [{ key: "NEW", value: "1" }]);

    expect(findMissingKeys(result, "FOO=x\nNEW=2\n")).toEqual([]);
  });
});
