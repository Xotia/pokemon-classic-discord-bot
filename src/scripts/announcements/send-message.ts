import fs from "fs";
import path from "path";
import { broadcastEmbed } from "./lib/broadcast";
import {
  buildEmbed,
  ChannelField,
  MarkdownMessageError,
  ParsedMessage,
  parseMarkdownMessage,
} from "./lib/markdownEmbed";

const SCRIPT_PATH = "src/scripts/announcements/send-message.ts";
const MESSAGE_DIR = "message";

function usage(received: string[]): never {
  console.error(
    [
      `Arguments reçus : ${received.length > 0 ? received.join(" ") : "(aucun)"}`,
      "",
      `Usage: npx ts-node ${SCRIPT_PATH} <fichier.md> [--send] [--channel lore|main|dev|raid] [--channelId <id>]`,
      "",
      `Le fichier est cherché tel quel, puis dans ${MESSAGE_DIR}/ (avec ou sans extension .md).`,
      "  (défaut)     aperçu : affiche l'embed résolu sans rien envoyer.",
      "  --send       envoie réellement le message.",
      "  --channel    surcharge le salon défini dans le front matter du fichier.",
      "  --channelId  envoie sur ce seul salon (test) au lieu de tous les serveurs.",
    ].join("\n"),
  );
  process.exit(1);
}

function resolveMessagePath(input: string): string {
  const candidates = [
    input,
    `${input}.md`,
    path.join(MESSAGE_DIR, input),
    path.join(MESSAGE_DIR, `${input}.md`),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) {
    console.error(`Fichier introuvable. Chemins essayés :\n- ${candidates.join("\n- ")}`);
    process.exit(1);
  }
  return found;
}

/** Options attendant une valeur : leur argument suivant n'est pas un positionnel. */
const VALUED_OPTIONS = new Set(["--channel", "--channelId"]);

function parseArgs(argv: string[]): { positionals: string[]; options: Map<string, string> } {
  const positionals: string[] = [];
  const options = new Map<string, string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    if (!VALUED_OPTIONS.has(arg)) continue;

    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      console.error(`L'option ${arg} attend une valeur.`);
      process.exit(1);
    }
    options.set(arg, value);
    i++;
  }

  return { positionals, options };
}

const argv = process.argv.slice(2);
const { positionals, options } = parseArgs(argv);
if (positionals.length !== 1) usage(argv);

const filePath = resolveMessagePath(positionals[0]);
/**
 * L'envoi est opt-in : un aperçu accidentel ne coûte rien, un envoi accidentel
 * est irrattrapable. Ne jamais nommer ce flag `--dry-run` : `npm run` intercepte
 * `--dry-run` pour son propre compte et ne le transmet pas au script.
 */
const send = argv.includes("--send");
const channelOverride = options.get("--channel");

let message: ParsedMessage;
try {
  message = parseMarkdownMessage(fs.readFileSync(filePath, "utf8"));
} catch (err) {
  if (err instanceof MarkdownMessageError) {
    console.error(`[${filePath}] ${err.message}`);
    process.exit(1);
  }
  throw err;
}

if (channelOverride) {
  if (!["raid", "main", "dev", "lore"].includes(channelOverride)) {
    console.error(`--channel invalide : "${channelOverride}" (attendu : raid, main, dev, lore).`);
    process.exit(1);
  }
  message.channel = channelOverride as ChannelField;
}

const embed = buildEmbed(message);

if (!send) {
  const target = options.get("--channelId") ?? `salons "${message.channel}" de tous les serveurs`;
  console.log(`Fichier   : ${filePath}`);
  console.log(`Cible     : ${target}`);
  console.log(`Contenu   : ${message.content ?? "(aucun)"}`);
  console.log("Embed     :");
  console.log(JSON.stringify(embed.toJSON(), null, 2));
  console.log("\nAPERÇU — rien n'a été envoyé. Ajouter --send pour publier.");
  process.exit(0);
}

broadcastEmbed(embed, SCRIPT_PATH, {
  channelField: message.channel,
  content: message.content,
});
