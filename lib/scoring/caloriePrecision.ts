/**
 * Kalorijska preciznost — boduje koliko si blizu svom dnevnom budžetu.
 * Identično SQL logici u `recompute_daily_score`.
 */
export function caloriePrecisionPoints(consumed: number, budget: number): number {
  if (!Number.isFinite(consumed) || !Number.isFinite(budget) || budget <= 0) return 0;
  const diff = Math.abs(consumed - budget);
  if (diff <= 100) return 10;
  if (diff <= 200) return 5;
  if (diff <= 300) return 2;
  return 0;
}

export const CALORIE_PRECISION_MAX = 10;
