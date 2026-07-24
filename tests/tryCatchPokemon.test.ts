import { describe, it, expect, vi } from "vitest";
import { Player } from "../src/types/Player";

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

vi.mock("../src/methods/gatcha/getNewGatchaPokemon", () => ({
  getNewGatchaPokemon: vi.fn().mockResolvedValue({
    pokemonCatched: { id: 1, name: "Bulbasaur", rarity: "common" },
    rarity: "common",
  }),
}));

import { tryCatchPokemon } from "../src/methods/pokemon/tryCatchPokemon";

describe("tryCatchPokemon", () => {
  it("returns gacha pokemon normally", async () => {
    const player: Player = { name: "test", pityCounter: 0, xp: 0, level: 1 };
    const result = await tryCatchPokemon("test-guild", player, "gen1", "verdant-plain");
    expect(result.pokemonCatched?.name).toBe("Bulbasaur");
  });
});
