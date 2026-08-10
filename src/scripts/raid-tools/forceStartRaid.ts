import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { openRaidRegistration, setDiscordClient } from "../../features/raid/raidScheduler";
import { loadRaidState } from "../../features/raid/raidState.service";
import { generateRaidState } from "../../features/raid/raidGenerator.service";
import { getGuildConfig, loadGuildRegistry, ensureGuildDataFiles } from "../../config/guilds";
import type { GuildRegistryEntry } from "../../types/GuildRegistryEntry";

dotenv.config();

function parseGuildId(argv: string[]): string | null {
  const index = argv.indexOf("--guildId");
  return index !== -1 ? argv[index + 1] : null;
}

function parseGeneration(argv: string[]): number | null {
  const index = argv.indexOf("--generation");
  if (index === -1) return null;

  const parsed = Number(argv[index + 1]);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`--generation attend un entier >= 1 (reçu: "${argv[index + 1]}").`);
    process.exit(1);
  }

  return parsed;
}

async function processGuild(guild: GuildRegistryEntry, generation: number | null): Promise<boolean> {
  ensureGuildDataFiles(guild.guildId);

  const state = await loadRaidState(guild.guildId);

  if (state.status === "registration") {
    console.log(
      `[${guild.name}] Un raid est déjà en inscription (${state.raidId ?? "?"}, zone "${state.zone}"). Ouverture ignorée.`,
    );
    return true;
  }

  try {
    const factory =
      generation !== null
        ? (guildId: string) => generateRaidState(guildId, generation)
        : undefined;

    await openRaidRegistration(guild.guildId, guild.raidAnnounceChannelId, factory);
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
  const generationArg = parseGeneration(process.argv.slice(2));

  if (!TOKEN) {
    console.error(
      "Usage: npx ts-node src/scripts/raid-tools/forceStartRaid.ts [--guildId <id>] [--generation <n>]",
    );
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
      const ok = await processGuild(guild, generationArg);
      if (!ok) hasFailure = true;
    }

    client.destroy();
    process.exit(hasFailure ? 1 : 0);
  });

  await client.login(TOKEN);
}

void main();
