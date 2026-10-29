import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/methods/pokemon/getPokemonById", () => ({
  getPokemonById: (_guildId: string, id: number) =>
    id === 491
      ? {
          id: 491,
          name: "Darkrai",
          types: ["dark"],
          stats: { hp: 70, attack: 90, defense: 90, specialAttack: 135, specialDefense: 90, speed: 125 },
          effectiveness: { defense: { dark: 0.5 } },
        }
      : null,
}));
vi.mock("../../src/config/guildSettings", () => ({
  getRaidStartHour: () => "0 18 * * *",
  getRaidEndHour: () => "0 21 * * *",
  getRaidNextZoneChance: () => 0,
  getGenerationNumber: () => 3,
}));

import { generateEventRaidState } from "../../src/features/events/generateEventRaidState";
import { generateHalloweenRaidState } from "../../src/features/halloweenEvent/generateHalloweenRaidState";

describe("générateur de raid d'évènement", () => {
  it("construit l'état avec le Pokémon, la zone et la clôture fournis, sans génération", async () => {
    const closesAt = new Date("2026-10-31T20:00:00Z");
    const state = await generateEventRaidState({
      guildId: "g",
      pokemonId: 491,
      zoneLabel: "Manoir hanté",
      difficulty: 3,
      registrationClosesAt: closesAt,
    });

    expect(state.status).toBe("registration");
    expect(state.raidPokemon?.id).toBe(491);
    expect(state.zone).toBe("Manoir hanté");
    expect(state.generation).toBeNull();
    expect(state.registrationClosesAt).toBe(closesAt.toISOString());
    expect(state.raidPokemon?.difficulty).toBe(3);
    expect(state.raidPokemon?.finalStats.hp).toBe(70 * 3);
  });

  it("échoue clairement si le Pokémon est absent du catalogue", async () => {
    await expect(
      generateEventRaidState({ guildId: "g", pokemonId: 9999, zoneLabel: "x", difficulty: 2 }),
    ).rejects.toThrow(/9999/);
  });
});

describe("raid Darkrai d'Halloween", () => {
  it("Darkrai #491, Manoir hanté, génération null, durée d'inscription d'un raid normal, difficulté 2 à 5", async () => {
    const before = Date.now();
    const state = await generateHalloweenRaidState("g");

    expect(state.raidPokemon?.id).toBe(491);
    expect(state.zone).toBe("Manoir hanté");
    expect(state.generation).toBeNull();
    const closesIn = new Date(state.registrationClosesAt!).getTime() - before;
    expect(Math.abs(closesIn - 3 * 60 * 60 * 1000)).toBeLessThan(5000);
    expect(state.raidPokemon!.difficulty).toBeGreaterThanOrEqual(2);
    expect(state.raidPokemon!.difficulty).toBeLessThanOrEqual(5);
  });
});
