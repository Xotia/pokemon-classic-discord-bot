import { describe, expect, it, vi } from "vitest";

vi.mock("../src/methods/pokemon/getPokemonById", () => ({
  getPokemonById: (_guildId: string, id: number) =>
    id === 386
      ? {
          id: 386,
          name: "Deoxys",
          types: ["psy"],
          stats: { hp: 50, attack: 150, defense: 50, speed: 150 },
          effectiveness: { defense: { psy: 1 } },
        }
      : null,
}));

import { generateMeteoriteRaidState } from "../src/features/meteoriteEvent/generateMeteoriteRaidState";

describe("état d'un raid météorite", () => {
  it("renseigne la fenêtre d'inscription attendue par le contrôle d'inscription", async () => {
    const closesAt = new Date("2026-08-10T10:00:00Z");

    const state = await generateMeteoriteRaidState("guild", 386, 5, closesAt);

    expect(state.status).toBe("registration");
    expect(state.registrationClosesAt).toBe(closesAt.toISOString());
    expect(state.registrationOpensAt).not.toBeNull();
    expect(state.createdAt).not.toBeNull();
    expect(state.raidId).not.toBe("");
  });

  it("laisse les inscriptions ouvertes jusqu'à la clôture du créneau", async () => {
    const closesAt = new Date(Date.now() + 90 * 60 * 1000);

    const state = await generateMeteoriteRaidState("guild", 386, 5, closesAt);

    // Le défaut des raids normaux est une durée fixe bien plus courte : le
    // créneau météorite doit rester ouvert sur toute sa fenêtre de 2h.
    expect(new Date(state.registrationClosesAt!).getTime()).toBe(closesAt.getTime());
  });

  it("est accepté par registerRaidDefender", async () => {
    const state = await generateMeteoriteRaidState(
      "guild",
      386,
      5,
      new Date(Date.now() + 60 * 60 * 1000),
    );

    // C'est exactement le chemin qui rejetait les joueurs le 10 août :
    // assertRaidIsOpenForRegistration exige registrationClosesAt.
    vi.doMock("../src/features/raid/raidState.service", () => ({
      loadRaidState: async () => state,
      saveRaidState: async () => undefined,
    }));
    vi.resetModules();
    const { registerRaidDefender: register } = await import(
      "../src/features/raid/RegisterRaidDefender"
    );

    await expect(
      register("guild", {
        userId: "u1",
        pokemonId: 25,
        pokemonName: "Pikachu",
        attackType: "electrik",
        snapshot: {
          types: ["electrik"],
          defenseEffectiveness: { psy: 1 },
          stats: { hp: 35, attack: 55, defense: 40, speed: 90 },
        },
      } as any),
    ).resolves.toMatchObject({ defenders: [expect.objectContaining({ userId: "u1" })] });
  });
});
