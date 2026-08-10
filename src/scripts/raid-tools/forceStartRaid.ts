import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { openRaidRegistration, setDiscordClient } from "../../features/raid/raidScheduler";
import { loadRaidState } from "../../features/raid/raidState.service";
import { getGuildConfig, loadGuildRegistry, ensureGuildDataFiles } from "../../config/guilds";
import type { GuildRegistryEntry } from "../../types/GuildRegistryEntry";

dotenv.config();

function parseGuildId(argv: string[]): string | null {
  const index = argv.indexOf("--guildId");
  return index !== -1 ? argv[index + 1] : null;
}

async function processGuild(guild: GuildRegistryEntry): Promise<boolean> {
  ensureGuildDataFiles(guild.guildId);

  const state = await loadRaidState(guild.guildId);

  if (state.status === "registration") {
    console.log(
      `[${guild.name}] Un raid est déjà en inscription (${state.raidId ?? "?"}, zone "${state.zone}"). Ouverture ignorée.`,
    );
    return true;
  }

  try {
    await openRaidRegistration(guild.guildId, guild.raidAnnounceChannelId);
    const opened = await loadRaidState(guild.guildId);
    console.log(
      `[${guild.name}] Raid ${opened.raidId} ouvert : gen${opened.generation}, zone "${opened.zone}", ` +
        `${opened.raidPokemon?.name} (difficulté ${opened.raidPokemon?.difficulty}), ` +
        `inscriptions jusqu'à ${opened.registrationClosesAt}.`,
    );
    return true;
  } catch (error) {
    console.error(`[${guild.name}] Échec de l'ouverture du raid:`, error);
    return false;
  }
}

async function main(): Promise<void> {
  const TOKEN = process.env.DISCORD_TOKEN;
  const guildIdArg = parseGuildId(process.argv.slice(2));

  if (!TOKEN) {
    console.error("Usage: npx ts-node src/scripts/raid-tools/forceStartRaid.ts [--guildId <id>]");
    console.error("DISCORD_TOKEN requis dans le .env.");
    process.exit(1);
  }

  let targetGuilds: GuildRegistryEntry[];
  if (guildIdArg) {
    const guildConfig = getGuildConfig(guildIdArg);
    if (!guildConfig) {
      console.error(`Aucune guilde trouvée dans le registre pour guildId=${guildIdArg}.`);
      process.exit(1);
    }
    targetGuilds = [guildConfig];
  } else {
    targetGuilds = loadGuildRegistry();
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    setDiscordClient(client);

    let hasFailure = false;
    for (const guild of targetGuilds) {
      const ok = await processGuild(guild);
      if (!ok) hasFailure = true;
    }

    client.destroy();
    process.exit(hasFailure ? 1 : 0);
  });

  await client.login(TOKEN);
}

void main();
