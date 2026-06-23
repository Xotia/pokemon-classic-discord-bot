export const TYPE_LABELS: Record<string, string> = {
  normal: "Normal",
  water: "Eau",
  fire: "Feu",
  grass: "Plante",
  electric: "Électrik",
  bug: "Insecte",
  poison: "Poison",
  flying: "Vol",
  fighting: "Combat",
  rock: "Roche",
  ground: "Sol",
  psychic: "Psy",
  ghost: "Spectre",
  dark: "Ténèbres",
  ice: "Glace",
  steel: "Acier",
  dragon: "Dragon",
  fairy: "Fée",
};

export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}
