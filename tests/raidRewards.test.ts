import { describe, it, expect } from "vitest";
import { buildRaidResultEmbed } from "../src/features/raid/buildRaidResultEmbed";
import { RaidState } from "../src/types/raid/RaidState";

function makeResolvedState(success: boolean): RaidState {
  const teamValue = success ? 200 : 50;
  return {
    raidId: "test-raid",
    status: "resolved",
    createdAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    resolvedAt: new Date().toISOString(),
    generation: 1,
    zone: "Plaine Verdoyante",
    raidPokemon: {
      id: 25,
      name: "Pikachu",
      zone: "Plaine Verdoyante",
      types: ["electric"],
      attackType: "electric",
      difficulty: 3,
      baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
      finalStats: { hp: 105, attack: 165, defense: 120, specialAttack: 150, specialDefense: 150, speed: 270 },
      defenseEffectiveness: { ground: 2 },
    },
    defenders: [
      {
        userId: "u1",
        pokemonId: 95,
        pokemonName: "Onix",
        attackType: "ground",
        registeredAt: new Date().toISOString(),
        snapshot: {
          types: ["rock", "ground"],
          defenseEffectiveness: { electric: 0 },
          stats: { hp: teamValue, attack: teamValue, defense: teamValue, specialAttack: teamValue, specialDefense: teamValue, speed: teamValue },
        },
      },
    ],
    result: {
      success,
      missingStats: success ? [] : ["attack", "defense", "specialAttack", "specialDefense", "speed"],
      participantsCount: 1,
      teamStats: { hp: teamValue, attack: teamValue, defense: teamValue, specialAttack: teamValue, specialDefense: teamValue, speed: teamValue },
      statDiffs: { hp: 0, attack: teamValue - 165, defense: teamValue - 120, specialAttack: teamValue - 150, specialDefense: teamValue - 150, speed: teamValue - 270 },
    },
    reward: success
      ? { xp: 350, raidWin: true, zoneUnlocked: "Plaine Verdoyante", capturedByUserId: "u1", capturedByPlayerName: "Brock" }
      : null,
  };
}

describe("buildRaidResultEmbed", () => {
  it("builds victory embed with capture info", () => {
    const state = makeResolvedState(true);
    const embed = buildRaidResultEmbed(state);
    const json = embed.toJSON();
    expect(json.title).toContain("Victoire");
    expect(json.description).toContain("+350 XP");
    expect(json.description).toContain("Plaine Verdoyante");
    expect(json.description).toContain("Brock");
    expect(json.description).toContain("Pikachu");
    expect(json.description).not.toContain("Comparaison");
    expect(json.color).toBe(0x2ecc71);
  });

  it("builds defeat embed with missing stats text", () => {
    const state = makeResolvedState(false);
    const embed = buildRaidResultEmbed(state);
    const json = embed.toJSON();
    expect(json.title).toContain("Défaite");
    expect(json.description).toContain("manquait de");
    expect(json.description).toContain("Attaque");
    expect(json.description).not.toContain("Comparaison");
    expect(json.color).toBe(0xe74c3c);
  });

  it("handles missing result gracefully", () => {
    const state = makeResolvedState(true);
    state.result = null;
    const embed = buildRaidResultEmbed(state);
    const json = embed.toJSON();
    expect(json.description).toContain("indisponibles");
  });
});
