import * as fs from "fs";
import * as path from "path";
import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

const PATCHNOTE_PATH = path.resolve(__dirname, "../../../../PATCHNOTE.md");
// Matches: # Mise à jour 3.4.2 — Some title
const VERSION_HEADER_RE = /^# Mise à jour (\d+\.\d+\.\d+) — (.+)/m;
const MAX_DESCRIPTION_LENGTH = 4000;

const patchnote = fs.readFileSync(PATCHNOTE_PATH, "utf-8");

const headerMatch = patchnote.match(VERSION_HEADER_RE);
if (!headerMatch) {
  throw new Error("Aucune entrée trouvée dans PATCHNOTE.md");
}

const version = headerMatch[1];
const headerIndex = patchnote.indexOf(headerMatch[0]);
const afterHeader = patchnote.slice(headerIndex + headerMatch[0].length);

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

const embed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle(`📋 Patchnote [${version}]`)
  .setDescription(description)
  .setFooter({ text: `Centre AURORA — Release ${version}` })
  .setTimestamp();

broadcastEmbed(embed, "src/scripts/announcements/send-patchnote.ts", {
  channelField: "dev",
});
