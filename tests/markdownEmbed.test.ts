import { describe, expect, it } from "vitest";
import {
  buildEmbed,
  MarkdownMessageError,
  parseMarkdownMessage,
} from "../src/scripts/announcements/lib/markdownEmbed";

describe("parseMarkdownMessage", () => {
  it("parse le front matter, la description et les champs", () => {
    const message = parseMarkdownMessage(
      [
        "---",
        "title: Titre",
        'color: "#8B0000"',
        "channel: lore",
        "content: '@everyone'",
        "---",
        "",
        "Description **en gras**.",
        "",
        "## Premier champ",
        "",
        "Contenu du premier.",
        "",
        "## Deuxième {inline}",
        "Contenu du deuxième.",
        "",
      ].join("\n"),
    );

    expect(message.title).toBe("Titre");
    expect(message.color).toBe(0x8b0000);
    expect(message.channel).toBe("lore");
    expect(message.content).toBe("@everyone");
    expect(message.description).toBe("Description **en gras**.");
    expect(message.fields).toEqual([
      { name: "Premier champ", value: "Contenu du premier.", inline: false },
      { name: "Deuxième", value: "Contenu du deuxième.", inline: true },
    ]);
  });

  it("gère un footer multi-ligne en bloc `|`", () => {
    const message = parseMarkdownMessage(
      ["---", "footer: |", "  Ligne un", "  Ligne deux", "---", "", "Corps.", ""].join("\n"),
    );

    expect(message.footer).toBe("Ligne un\nLigne deux");
  });

  it("accepte un fichier sans front matter et cible le lore par défaut", () => {
    const message = parseMarkdownMessage("Juste du texte.");

    expect(message.channel).toBe("lore");
    expect(message.timestamp).toBe(true);
    expect(message.description).toBe("Juste du texte.");
    expect(message.fields).toHaveLength(0);
  });

  it("transforme un `##` sans titre en champ à intitulé invisible", () => {
    const message = parseMarkdownMessage(["Corps.", "", "##", "Note de bas.", ""].join("\n"));

    expect(message.fields).toEqual([{ name: "​", value: "Note de bas.", inline: false }]);
  });

  it("ne confond pas un `###` avec un champ", () => {
    const message = parseMarkdownMessage(["Corps.", "", "### Sous-titre", ""].join("\n"));

    expect(message.fields).toHaveLength(0);
    expect(message.description).toBe("Corps.\n\n### Sous-titre");
  });

  it("accepte les trois notations de couleur", () => {
    expect(parseMarkdownMessage("---\ncolor: '#00FF00'\n---\nx").color).toBe(0x00ff00);
    expect(parseMarkdownMessage("---\ncolor: 0x00FF00\n---\nx").color).toBe(0x00ff00);
    expect(parseMarkdownMessage("---\ncolor: 65280\n---\nx").color).toBe(65280);
  });

  it("refuse un salon inconnu", () => {
    expect(() => parseMarkdownMessage("---\nchannel: potato\n---\nx")).toThrow(
      MarkdownMessageError,
    );
  });

  it("refuse une couleur invalide", () => {
    expect(() => parseMarkdownMessage("---\ncolor: rouge\n---\nx")).toThrow(MarkdownMessageError);
  });

  it("refuse un front matter jamais refermé", () => {
    expect(() => parseMarkdownMessage("---\ntitle: X\n\nCorps.")).toThrow(MarkdownMessageError);
  });

  it("refuse un message vide", () => {
    expect(() => parseMarkdownMessage("---\nchannel: lore\n---\n\n")).toThrow(
      MarkdownMessageError,
    );
  });

  it("refuse un champ au contenu vide", () => {
    expect(() => parseMarkdownMessage("Corps.\n\n## Champ vide\n\n")).toThrow(
      /contenu vide/,
    );
  });

  it("refuse une description dépassant la limite Discord", () => {
    expect(() => parseMarkdownMessage("a".repeat(4097))).toThrow(/max 4096/);
  });

  it("refuse un champ dépassant 1024 caractères", () => {
    expect(() => parseMarkdownMessage(`Corps.\n\n## Trop long\n${"a".repeat(1025)}`)).toThrow(
      /max 1024/,
    );
  });
});

describe("buildEmbed", () => {
  it("reporte les champs du message parsé sur l'embed", () => {
    const message = parseMarkdownMessage(
      [
        "---",
        "title: Titre",
        'color: "#8B0000"',
        "footer: Pied",
        "timestamp: false",
        "---",
        "Description.",
        "",
        "## Champ",
        "Valeur.",
      ].join("\n"),
    );

    const json = buildEmbed(message).toJSON();

    expect(json.title).toBe("Titre");
    expect(json.color).toBe(0x8b0000);
    expect(json.description).toBe("Description.");
    expect(json.footer).toEqual({ text: "Pied" });
    expect(json.timestamp).toBeUndefined();
    expect(json.fields).toEqual([{ name: "Champ", value: "Valeur.", inline: false }]);
  });

  it("horodate par défaut", () => {
    expect(buildEmbed(parseMarkdownMessage("Corps.")).toJSON().timestamp).toBeDefined();
  });
});
