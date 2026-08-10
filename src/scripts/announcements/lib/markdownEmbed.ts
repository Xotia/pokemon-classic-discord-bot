import { EmbedBuilder } from "discord.js";

/** Limites imposées par l'API Discord sur un embed. */
const LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  author: 256,
  fields: 25,
  total: 6000,
} as const;

const CHANNEL_FIELDS = ["raid", "main", "dev", "lore"] as const;
export type ChannelField = (typeof CHANNEL_FIELDS)[number];

export type ParsedField = {
  name: string;
  value: string;
  inline: boolean;
};

export type ParsedMessage = {
  title?: string;
  color?: number;
  channel: ChannelField;
  content?: string;
  footer?: string;
  image?: string;
  thumbnail?: string;
  author?: string;
  url?: string;
  timestamp: boolean;
  description: string;
  fields: ParsedField[];
};

export class MarkdownMessageError extends Error {}

/**
 * Découpe le front matter (`---` ... `---`) du corps markdown.
 * Le front matter est optionnel : sans lui, tout le fichier est le corps.
 */
function splitFrontMatter(raw: string): { frontMatter: string[]; body: string[] } {
  const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { frontMatter: [], body: lines };
  }
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closing === -1) {
    throw new MarkdownMessageError("Front matter ouvert par `---` mais jamais refermé.");
  }
  return { frontMatter: lines.slice(1, closing), body: lines.slice(closing + 1) };
}

/**
 * Parse un front matter minimal : `clé: valeur` et blocs `clé: |` (lignes indentées).
 * Volontairement pas de YAML complet — le besoin se limite à des scalaires.
 */
function parseFrontMatter(lines: string[]): Record<string, string> {
  const meta: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      throw new MarkdownMessageError(
        `Ligne de front matter invalide (attendu \`clé: valeur\`) : "${line}"`,
      );
    }

    const [, key, rawValue] = match;

    if (rawValue.trim() === "|") {
      const block: string[] = [];
      while (i + 1 < lines.length && (lines[i + 1].trim() === "" || /^\s+/.test(lines[i + 1]))) {
        block.push(lines[++i].replace(/^ {2}/, ""));
      }
      meta[key] = block.join("\n").replace(/\s+$/, "");
      continue;
    }

    meta[key] = unquote(rawValue.trim());
  }

  return meta;
}

function unquote(value: string): string {
  const match = /^(["'])([\s\S]*)\1$/.exec(value);
  return match ? match[2] : value;
}

/** Accepte `#8B0000`, `0x8B0000` ou `9109504`. */
function parseColor(raw: string): number {
  const cleaned = raw.trim();
  const hex = /^#([0-9a-fA-F]{6})$/.exec(cleaned) ?? /^0x([0-9a-fA-F]{6})$/.exec(cleaned);
  if (hex) return parseInt(hex[1], 16);
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  throw new MarkdownMessageError(
    `Couleur invalide : "${raw}" (attendu #RRGGBB, 0xRRGGBB ou un entier).`,
  );
}

function parseBoolean(raw: string, key: string): boolean {
  const cleaned = raw.trim().toLowerCase();
  if (["true", "yes", "oui", "1"].includes(cleaned)) return true;
  if (["false", "no", "non", "0", ""].includes(cleaned)) return false;
  throw new MarkdownMessageError(`Valeur booléenne invalide pour \`${key}\` : "${raw}".`);
}

/**
 * Découpe le corps en description (avant le premier `##`) et champs (un par `##`).
 * Un titre de champ peut porter le suffixe `{inline}`.
 */
function parseBody(lines: string[]): { description: string; fields: ParsedField[] } {
  const descriptionLines: string[] = [];
  const fields: ParsedField[] = [];
  let current: { name: string; inline: boolean; lines: string[] } | null = null;

  const flush = (): void => {
    if (!current) return;
    fields.push({
      name: current.name,
      value: trimBlank(current.lines).join("\n"),
      inline: current.inline,
    });
    current = null;
  };

  for (const line of lines) {
    const heading = /^##(?!#)\s*(.*)$/.exec(line);
    if (heading) {
      flush();
      let name = heading[1].trim();
      let inline = false;
      const inlineMarker = /\s*\{inline\}$/i.exec(name);
      if (inlineMarker) {
        inline = true;
        name = name.slice(0, inlineMarker.index).trim();
      }
      current = { name: name === "" ? "​" : name, inline, lines: [] };
      continue;
    }

    if (current) current.lines.push(line);
    else descriptionLines.push(line);
  }
  flush();

  return { description: trimBlank(descriptionLines).join("\n"), fields };
}

function trimBlank(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}

/**
 * Parse un fichier markdown d'annonce en structure d'embed.
 * Fonction pure : aucun accès disque ni réseau, testable isolément.
 */
export function parseMarkdownMessage(raw: string): ParsedMessage {
  const { frontMatter, body } = splitFrontMatter(raw);
  const meta = parseFrontMatter(frontMatter);
  const { description, fields } = parseBody(body);

  const channel = (meta.channel ?? "lore").trim() as ChannelField;
  if (!CHANNEL_FIELDS.includes(channel)) {
    throw new MarkdownMessageError(
      `\`channel\` invalide : "${meta.channel}" (attendu : ${CHANNEL_FIELDS.join(", ")}).`,
    );
  }

  const message: ParsedMessage = {
    title: meta.title,
    color: meta.color !== undefined ? parseColor(meta.color) : undefined,
    channel,
    content: meta.content,
    footer: meta.footer,
    image: meta.image,
    thumbnail: meta.thumbnail,
    author: meta.author,
    url: meta.url,
    timestamp: meta.timestamp !== undefined ? parseBoolean(meta.timestamp, "timestamp") : true,
    description,
    fields,
  };

  validate(message);
  return message;
}

/** Vérifie les limites Discord avant l'envoi : une erreur ici évite un 400 opaque. */
function validate(message: ParsedMessage): void {
  const errors: string[] = [];
  const check = (label: string, value: string | undefined, max: number): void => {
    if (value !== undefined && value.length > max) {
      errors.push(`${label} : ${value.length} caractères (max ${max}).`);
    }
  };

  if (!message.title && !message.description && message.fields.length === 0) {
    errors.push("Message vide : il faut au moins un titre, une description ou un champ.");
  }

  check("title", message.title, LIMITS.title);
  check("description", message.description, LIMITS.description);
  check("footer", message.footer, LIMITS.footer);
  check("author", message.author, LIMITS.author);

  if (message.fields.length > LIMITS.fields) {
    errors.push(`${message.fields.length} champs (max ${LIMITS.fields}).`);
  }
  message.fields.forEach((field, index) => {
    check(`champ #${index + 1} (titre)`, field.name, LIMITS.fieldName);
    check(`champ #${index + 1} "${field.name}" (contenu)`, field.value, LIMITS.fieldValue);
    if (field.value.trim() === "") {
      errors.push(`champ #${index + 1} "${field.name}" : contenu vide (interdit par Discord).`);
    }
  });

  const total =
    (message.title?.length ?? 0) +
    message.description.length +
    (message.footer?.length ?? 0) +
    (message.author?.length ?? 0) +
    message.fields.reduce((sum, f) => sum + f.name.length + f.value.length, 0);
  if (total > LIMITS.total) {
    errors.push(`total de l'embed : ${total} caractères (max ${LIMITS.total}).`);
  }

  if (errors.length > 0) {
    throw new MarkdownMessageError(`Message invalide :\n- ${errors.join("\n- ")}`);
  }
}

/** Construit l'embed discord.js correspondant au message parsé. */
export function buildEmbed(message: ParsedMessage): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (message.title) embed.setTitle(message.title);
  if (message.url) embed.setURL(message.url);
  if (message.color !== undefined) embed.setColor(message.color);
  if (message.description) embed.setDescription(message.description);
  if (message.author) embed.setAuthor({ name: message.author });
  if (message.image) embed.setImage(message.image);
  if (message.thumbnail) embed.setThumbnail(message.thumbnail);
  if (message.footer) embed.setFooter({ text: message.footer });
  if (message.timestamp) embed.setTimestamp();
  if (message.fields.length > 0) embed.addFields(message.fields);

  return embed;
}
