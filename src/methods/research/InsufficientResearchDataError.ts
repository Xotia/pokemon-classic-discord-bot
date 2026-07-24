export class InsufficientResearchDataError extends Error {
  constructor(
    public readonly cost: number,
    public readonly balance: number,
  ) {
    super(`Données de recherche insuffisantes : coût ${cost}, solde ${balance}.`);
    this.name = "InsufficientResearchDataError";
  }
}
