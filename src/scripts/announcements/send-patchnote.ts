import * as fs from "fs";
import * as path from "path";
import { EmbedBuilder } from "discord.js";
import { broadcastEmbeds } from "./lib/broadcast";
import {
  MAX_DESCRIPTION_LENGTH,
  extractPatchnoteBody,
  parsePatchnoteEntries,
  splitPatchnoteBody,
} from "./lib/patchnote";

const PATCHNOTE_PATH = path.resolve(__dirname, "../../../PATCHNOTE.md");

const targetVersion = process.argv[2] ?? null;

const patchnote = fs.readFileSync(PATCHNOTE_PATH, "utf-8").replace(/\r\n/g, "\n");

const entries = parsePatchnoteEntries(patchnote);

if (entries.length === 0) {
  throw new Error("Aucune entrée trouvée dans PATCHNOTE.md");
}

const entry = targetVersion ? entries.find((e) => e.version === targetVersion) : entries[0];

if (!entry) {
  throw new Error(`Version ${targetVersion} introuvable dans PATCHNOTE.md`);
}

const { version } = entry;

// Un patchnote qui dépasse la limite d'embed part en plusieurs messages plutôt
// que d'être tronqué : la fin d'une note de version est aussi lue que le début.
const parts = splitPatchnoteBody(extractPatchnoteBody(patchnote, entry), MAX_DESCRIPTION_LENGTH);

if (parts.length === 0) {
  throw new Error(`L'entrée ${version} de PATCHNOTE.md est vide.`);
}

const embeds = parts.map((description, index) =>
  new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(
      parts.length > 1
        ? `📋 Patchnote [${version}] — ${index + 1}/${parts.length}`
        : `📋 Patchnote [${version}]`,
    )
    .setDescription(description)
    .setFooter({ text: `Centre AURORA — Release ${version}` })
    .setTimestamp(),
);

broadcastEmbeds(embeds, "src/scripts/announcements/send-patchnote.ts", {
  channelField: "dev",
});
