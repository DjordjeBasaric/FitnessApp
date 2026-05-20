import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";

const DEFAULT_KG = 70;

/** Težina za MET i procjene: evidencija na dan → zadnja prije datuma → cilj → default. */
export function resolveBodyWeightKg(
  dateIso: string,
  weights: WeightEntry[],
  goal?: WeightGoal | null,
): number {
  const onDay = weights.find((w) => w.date === dateIso);
  if (onDay) return onDay.kg;

  const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const lastOnOrBefore = [...sorted].filter((w) => w.date <= dateIso).pop();
  if (lastOnOrBefore) return lastOnOrBefore.kg;

  if (goal?.startKg) return goal.startKg;
  if (sorted.length) return sorted[sorted.length - 1].kg;
  return DEFAULT_KG;
}
