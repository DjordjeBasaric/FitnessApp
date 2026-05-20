export type DaySeriesPoint = {
  date: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  cardioMinutes: number | null;
  cardioKm: number | null;
  /** Sagorijevanje na treningu (kcal) */
  trainingBurnKcal: number | null;
  /** Preporučeni max unos hrane iz cilja težine */
  budgetKcal: number | null;
};
