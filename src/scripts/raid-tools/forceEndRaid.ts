import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { closeRaidAndResolve, setDiscordClient } from "../../features/raid/raidScheduler";
import { loadRaidState } from "../../features/raid/raidState.service";
import { getGuildConfig, loadGuildRegistry } from "../../config/guilds";
import type { GuildRegistryEntry } from "../../types/GuildRegistryEntry";

dotenv.config();

function parseGuildId(argv: string[]): string | null {
  const index = argv.indexOf("--guildId");
  return index !== -1 ? argv[index + 1] : null;
}

async function processGuild(guild: GuildRegistryEntry): Promise<boolean> {
  const state = await loadRaidState(guild.guildId);

  if (state.status !== "registration") {
    console.log(`[${guild.name}] Rien à clôturer (statut actuel: "${state.status}").`);
    return true;
  }

  try {
    await closeRaidAndResolve(guild.guildId, guild.raidAnnounceChannelId);
    console.log(`[${guild.name}] Raid ${state.raidId ?? "?"} clôturé et résolu avec succès.`);
    return true;
  } catch (error) {
    console.error(`[${guild.name}] Échec de la clôture du raid ${state.raidId ?? "?"}:`, error);
    return false;
  }
}

async function main(): Promise<void> {
  const TOKEN = process.env.DISCORD_TOKEN;
  const guildIdArg = parseGuildId(process.argv.slice(2));

  if (!TOKEN) {
    console.error("Usage: npx ts-node src/scripts/raid-tools/forceEndRaid.ts [--guildId <id>]");
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
