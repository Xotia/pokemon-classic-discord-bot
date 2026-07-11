export type GuildRegistryEntry = {
  guildId: string;
  name: string;
  raidAnnounceChannelId: string;
  // Réglages de gameplay optionnels : si absents, repli sur la variable
  // d'environnement globale correspondante (voir src/config/guildSettings.ts).
  shinyRate?: number;
  cooldownMinutes?: number;
  pityThreshold?: number;
  pokemonPerPage?: number;
  buttonTimeoutMs?: number;
  generationNumber?: number;
  raidSchedulerMode?: 'production' | 'debug';
  raidNextZoneChance?: number;
  raidStartHour?: string;
  raidEndHour?: string;
};
