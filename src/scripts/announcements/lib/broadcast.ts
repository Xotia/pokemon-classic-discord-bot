import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { loadGuildRegistry } from "../../../config/guilds";
import { GuildRegistryEntry } from "../../../types/GuildRegistryEntry";

dotenv.config();

function parseChannelId(argv: string[]): string | null {
  const index = argv.indexOf("--channelId");
  return index !== -1 ? argv[index + 1] : null;
}

type BroadcastOptions = {
  /** Contenu texte brut envoyé en plus de l'embed (ex: mentions). */
  content?: string;
  /**
   * Salon ciblé par défaut pour chaque serveur du registre.
   * - "raid" : raidAnnounceChannelId (aucun repli).
   * - "main" : mainChannelId (aucun repli).
   * - "dev" : devChannelId, retombe sur mainChannelId si absent.
   * - "lore" : loreChannelId, retombe sur mainChannelId si absent.
   * Par défaut : "main" — seuls les scripts liés au raid lui-même
   * doivent explicitement passer "raid".
   */
  channelField?: "raid" | "main" | "dev" | "lore";
};

/**
 * Résout l'identifiant du salon cible pour un serveur donné selon le champ demandé.
 * Fonction pure, sans effet de bord, testable indépendamment de Discord.
 */
export function resolveTargetChannelId(
  guild: GuildRegistryEntry,
  channelField: BroadcastOptions["channelField"] = "main",
): string {
  switch (channelField) {
    case "raid":
      return guild.raidAnnounceChannelId;
    case "main":
      return guild.mainChannelId;
    case "dev":
      return guild.devChannelId ?? guild.mainChannelId;
    case "lore":
      return guild.loreChannelId ?? guild.mainChannelId;
  }
}

/**
 * Envoie un embed sur le salon ciblé (raid, jeu principal, dev ou lore) de tous les serveurs du registre.
 * Passer --channelId <id> pour cibler un seul salon (test) à la place.
 */
export function broadcastEmbed(
  embed: EmbedBuilder,
  scriptRelativePath: string,
  options: BroadcastOptions = {},
): void {
  broadcastEmbeds([embed], scriptRelativePath, options);
}

/**
 * Variante multi-embeds : chaque embed part dans son PROPRE message, dans
 * l'ordre. Discord plafonne une description d'embed à 4096 caractères, et
 * regrouper plusieurs embeds dans un seul message ne relâche pas la contrainte
 * (6000 caractères cumulés) : un patchnote long a besoin de plusieurs
 * messages, pas de plusieurs embeds.
 *
 * `content` n'est attaché qu'au premier message : une mention répétée à chaque
 * partie serait du spam.
 */
export function broadcastEmbeds(
  embeds: EmbedBuilder[],
  scriptRelativePath: string,
  options: BroadcastOptions = {},
): void {
  const TOKEN = process.env.DISCORD_TOKEN;
  const CHANNEL_ID = parseChannelId(process.argv.slice(2));
  const { content, channelField = "main" } = options;

  if (embeds.length === 0) {
    console.error("Aucun embed à envoyer — rien n'a été diffusé.");
    process.exit(1);
  }

  if (!TOKEN) {
    console.error(`Usage: npx ts-node ${scriptRelativePath} [--channelId <id>]`);
    console.error("DISCORD_TOKEN requis dans le .env.");
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  async function sendTo(channelId: string, label: string): Promise<void> {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isSendable()) {
        console.error(`Salon introuvable ou non envoyable (${label}, channelId=${channelId}).`);
        return;
      }
      for (const [position, embed] of embeds.entries()) {
        const withContent = Boolean(content) && position === 0;
        await channel.send(withContent ? { content, embeds: [embed] } : { embeds: [embed] });
      }

      console.log(
        embeds.length > 1
          ? `${embeds.length} messages envoyés sur ${label}.`
          : `Message envoyé sur ${label}.`,
      );
    } catch (err) {
      console.error(`Erreur sur ${label} (channelId=${channelId}):`, err);
    }
  }

  client.once("ready", async () => {
    try {
      if (CHANNEL_ID) {
        await sendTo(CHANNEL_ID, "salon ciblé");
      } else {
        for (const guild of loadGuildRegistry()) {
          const targetChannelId = resolveTargetChannelId(guild, channelField);
          await sendTo(targetChannelId, guild.name);
        }
      }
    } finally {
      client.destroy();
      process.exit(0);
    }
  });

  client.login(TOKEN);
}
