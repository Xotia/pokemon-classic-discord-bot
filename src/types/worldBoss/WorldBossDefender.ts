import { WorldBossStats } from "./WorldBossStats";

/**
 * Défenseur inscrit dans l'équipe mondiale. En plus des champs du raid, il
 * porte le contexte inter-serveurs : le serveur d'inscription (qui recevra les
 * récompenses) et le `displayName` figé — le bot ne peut pas résoudre le pseudo
 * d'un membre d'un serveur depuis un autre serveur.
 */
export interface WorldBossDefender {
  userId: string;
  guildId: string;
  guildName: string;
  displayName: string;
  pokemonId: number;
  pokemonName: string;
  attackType: string;
  registeredAt: string;
  snapshot: {
    types: string[];
    defenseEffectiveness: Record<string, number>;
    stats: WorldBossStats;
  };
}
