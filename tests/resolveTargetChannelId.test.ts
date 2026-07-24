import { describe, it, expect } from "vitest";
import { resolveTargetChannelId } from "../src/scripts/announcements/lib/broadcast";
import { GuildRegistryEntry } from "../src/types/GuildRegistryEntry";

function makeGuild(overrides: Partial<GuildRegistryEntry> = {}): GuildRegistryEntry {
  return {
    guildId: "guild-1",
    name: "Guild One",
    raidAnnounceChannelId: "raid-chan",
    mainChannelId: "main-chan",
    ...overrides,
  };
}

describe("resolveTargetChannelId (src/scripts/announcements/lib/broadcast.ts)", () => {
  it('retourne raidAnnounceChannelId pour channelField "raid"', () => {
    const guild = makeGuild();
    expect(resolveTargetChannelId(guild, "raid")).toBe("raid-chan");
  });

  it('retourne mainChannelId pour channelField "main"', () => {
    const guild = makeGuild();
    expect(resolveTargetChannelId(guild, "main")).toBe("main-chan");
  });

  it('retourne devChannelId pour channelField "dev" quand il est défini', () => {
    const guild = makeGuild({ devChannelId: "dev-chan" });
    expect(resolveTargetChannelId(guild, "dev")).toBe("dev-chan");
  });

  it('retombe sur mainChannelId pour channelField "dev" quand devChannelId est absent', () => {
    const guild = makeGuild();
    expect(resolveTargetChannelId(guild, "dev")).toBe("main-chan");
  });

  it('retourne loreChannelId pour channelField "lore" quand il est défini', () => {
    const guild = makeGuild({ loreChannelId: "lore-chan" });
    expect(resolveTargetChannelId(guild, "lore")).toBe("lore-chan");
  });

  it('retombe sur mainChannelId pour channelField "lore" quand loreChannelId est absent', () => {
    const guild = makeGuild();
    expect(resolveTargetChannelId(guild, "lore")).toBe("main-chan");
  });

  it('utilise "main" par défaut quand channelField est omis', () => {
    const guild = makeGuild();
    expect(resolveTargetChannelId(guild)).toBe("main-chan");
  });
});
