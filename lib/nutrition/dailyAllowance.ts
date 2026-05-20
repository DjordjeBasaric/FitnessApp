/**
 * Dnevna dozvoljena hrana = bazni limit iz cilja težine + procijenjeno sagorijevanje na treningu.
 * (Koncept: veća aktivnost → više prostora za hranu uz isti plan težine.)
 */
export function effectiveFoodAllowanceKcal(
  budgetKcal: number,
  trainingBurnKcal: number,
): number {
  return Math.round(budgetKcal + Math.max(0, trainingBurnKcal));
}

export function foodRemainingKcal(
  allowanceKcal: number,
  consumedFoodKcal: number,
): number {
  return Math.round(allowanceKcal - consumedFoodKcal);
}
