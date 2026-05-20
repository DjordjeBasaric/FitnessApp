import { addDaysToIso, isoDateFromLocal } from "@/lib/date";
import type { DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";

export type ExportPeriod = "7d" | "14d" | "30d" | "goal" | "all";

export function getPeriodDateRange(
  period: ExportPeriod,
  weightGoal: WeightGoal | null,
  endIso = isoDateFromLocal(),
): { start: string; end: string } | null {
  switch (period) {
    case "7d":
      return { start: addDaysToIso(endIso, -6), end: endIso };
    case "14d":
      return { start: addDaysToIso(endIso, -13), end: endIso };
    case "30d":
      return { start: addDaysToIso(endIso, -29), end: endIso };
    case "goal":
      if (!weightGoal) return null;
      return { start: weightGoal.startDate, end: weightGoal.endDate };
    case "all":
      return null;
  }
}

function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function filterLogsForPeriod(
  logs: DailyLog[],
  period: ExportPeriod,
  weightGoal: WeightGoal | null,
  endIso = isoDateFromLocal(),
): DailyLog[] {
  const range = getPeriodDateRange(period, weightGoal, endIso);
  const withContent = logs.filter(
    (l) =>
      l.foodItems.length > 0 ||
      l.cardioSessions.length > 0 ||
      l.strengthBlocks.length > 0,
  );
  if (!range) return sortByDateAsc(withContent);
  return sortByDateAsc(
    withContent.filter((l) => l.date >= range.start && l.date <= range.end),
  );
}

export function filterWeightsForPeriod(
  weights: WeightEntry[],
  period: ExportPeriod,
  weightGoal: WeightGoal | null,
  endIso = isoDateFromLocal(),
): WeightEntry[] {
  const range = getPeriodDateRange(period, weightGoal, endIso);
  if (!range) return sortByDateAsc(weights);
  return sortByDateAsc(
    weights.filter((w) => w.date >= range.start && w.date <= range.end),
  );
}
