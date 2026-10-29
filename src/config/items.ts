export interface ItemDefinition {
  name: string;
  emoji: string;
}

export const PUMPKIN_ITEM_ID = "pumpkin";

// Catalogue des objets de l'inventaire (`Player.items`, indexé par id d'objet).
export const ITEMS: Record<string, ItemDefinition> = {
  [PUMPKIN_ITEM_ID]: { name: "Citrouille", emoji: "🎃" },
};

/** Définition d'un objet ; un id absent du catalogue reste affichable. */
export function getItemDefinition(itemId: string): ItemDefinition {
  return ITEMS[itemId] ?? { name: itemId, emoji: "📦" };
}
