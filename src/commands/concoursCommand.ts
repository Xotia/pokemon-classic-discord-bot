import { EmbedBuilder } from "discord.js";
import { readPlayers } from "../utils/jsonPlayers";
import {
  computeContestScore,
  formatRank,
  getContestPhase,
  getContestProgress,
  rankContest,
} from "../features/halloweenEvent/halloweenContest.service";
import { PUMPKIN_POINTS, RARITY_CONTEST_POINTS, UNKNOWN_RARITY_POINTS } from "../config/halloweenContest";
import { rarityList, Rarity } from "../config/rarity";

const COLOR = 0xff7518;
const TOP_SIZE = 10;

export async function concoursCommand(interaction: any) {
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    return;
  }

  const phase = getContestPhase();
  if (phase === "before") {
    await interaction.editReply(
      "🎃 Le concours commence le 31 octobre à minuit. Rendez-vous au Manoir hanté !",
    );
    return;
  }

  const players = await readPlayers(guildId);
  const ranking = rankContest(players);
  const userId = interaction.user.id;
  const me = players[userId];
  const myProgress = me ? getContestProgress(me) : undefined;
  const myScore = myProgress ? computeContestScore(myProgress) : 0;
  const myEntry = ranking.find((entry) => entry.userId === userId);

  const detail: string[] = [];
  if (myProgress) {
    for (const { rarity, french } of rarityList) {
      const count = myProgress.captures[rarity as Rarity] ?? 0;
      if (count > 0) {
        const points = RARITY_CONTEST_POINTS[rarity as Rarity] ?? UNKNOWN_RARITY_POINTS;
        detail.push(`${french} : ${count} × ${points} pt`);
      }
    }
    if (myProgress.pumpkins > 0) {
      detail.push(`🎃 Citrouilles : ${myProgress.pumpkins} × ${PUMPKIN_POINTS} pt`);
    }
  }

  const finished = phase === "after";
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(finished ? "🏆 Concours de capture : classement final" : "🏆 Concours de capture")
    .setDescription(
      finished
        ? "Le Manoir est refermé. Voici le classement final du serveur."
        : "Seules les captures normales faites dans le Manoir hanté comptent. Les citrouilles rapportent des points.",
    )
    .addFields(
      {
        name: "Ton score",
        value: myEntry
          ? `**${myScore} points** : ${formatRank(myEntry)}\n${detail.join("\n")}`
          : "Aucun point pour l'instant.",
      },
      {
        name: `Top ${TOP_SIZE} du serveur`,
        value: ranking.length
          ? ranking
              .slice(0, TOP_SIZE)
              .map((e) => `${formatRank(e)} - **${e.name}** : ${e.score} points`)
              .join("\n")
          : "Personne n'a encore osé entrer dans le Manoir…",
      },
    );

  if (!finished) embed.setFooter({ text: "Classement mis à jour à chaque capture." });

  await interaction.editReply({ embeds: [embed] });
}
