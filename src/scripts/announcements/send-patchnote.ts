import * as fs from "fs";
import * as path from "path";
import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

const PATCHNOTE_PATH = path.resolve(__dirname, "../../../PATCHNOTE.md");
const VERSION_HEADER_RE = /^# Mise à jour (\d+\.\d+\.\d+) — (.+)/gm;
const MAX_DESCRIPTION_LENGTH = 4000;

const targetVersion = process.argv[2] ?? null;

const patchnote = fs.readFileSync(PATCHNOTE_PATH, "utf-8").replace(/\r\n/g, "\n");

// Collect all version entry positions
const entries: { version: string; index: number }[] = [];
let m: RegExpExecArray | null;
while ((m = VERSION_HEADER_RE.exec(patchnote)) !== null) {
  entries.push({ version: m[1], index: m.index });
}

if (entries.length === 0) {
  throw new Error("Aucune entrée trouvée dans PATCHNOTE.md");
}

const entry = targetVersion
  ? entries.find((e) => e.version === targetVersion)
  : entries[0];

if (!entry) {
  throw new Error(`Version ${targetVersion} introuvable dans PATCHNOTE.md`);
}

const headerEnd = patchnote.indexOf("\n", entry.index) + 1;
const afterHeader = patchnote.slice(headerEnd);

// Entries are separated by a double `---` (--- blank line ---)
const separatorMatch = afterHeader.match(/\n---\n\n---/);
const rawBody = separatorMatch
  ? afterHeader.slice(0, separatorMatch.index)
  : afterHeader;

let description = rawBody.trimEnd();

if (description.length > MAX_DESCRIPTION_LENGTH) {
  description =
    description.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd() +
    "\n*(suite sur le dépôt)*";
}

const { version } = entry;

const embed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle(`📋 Patchnote [${version}]`)
  .setDescription(description)
  .setFooter({ text: `Centre AURORA — Release ${version}` })
  .setTimestamp();

broadcastEmbed(embed, "src/scripts/announcements/send-patchnote.ts", {
  channelField: "dev",
});
