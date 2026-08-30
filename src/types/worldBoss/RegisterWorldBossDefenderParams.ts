import { WorldBossDefender } from "./WorldBossDefender";

/**
 * Tout le défenseur sauf l'horodatage, posé au moment de l'enregistrement.
 */
export type RegisterWorldBossDefenderParams = Omit<WorldBossDefender, "registeredAt">;
