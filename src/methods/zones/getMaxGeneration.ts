export function getMaxGeneration(): number {
  const maxGeneration = Number.parseInt(
    process.env.GENERATION_NUMBER ?? "",
    10,
  );

  if (!Number.isInteger(maxGeneration) || maxGeneration < 1) {
    throw new Error("GENERATION_NUMBER est invalide ou manquant");
  }

  return maxGeneration;
}