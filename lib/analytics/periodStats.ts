import type { DailyLog } from "@/lib/schemas/dailyLog";
import { addDaysToIso } from "@/lib/date";
import { sumFoodItems } from "@/lib/nutrition/meals";

function sumFoodTotals(log: DailyLog) {
  return sumFoodItems(log.foodItems);
}

export type PeriodFoodStats = {
  daysInRange: number;
  daysLogged: number;
  daysWithFood: number;
  avgKcal: number | null;
  avgProteinG: number | null;
  totalKcal: number;
  vsTargetAvgDelta: number | null;
};

export function logsInRange(logs: DailyLog[], endIso: string, days: number): DailyLog[] {
  const start = addDaysToIso(endIso, -(days - 1));
  return logs.filter((l) => l.date >= start && l.date <= endIso);
}

export function computeFoodPeriodStats(
  logs: DailyLog[],
  endIso: string,
  days: number,
  targetKcal?: number,
): PeriodFoodStats {
  const inRange = logsInRange(logs, endIso, days);
  const withFood = inRange.filter((l) => (l.foodItems?.length ?? 0) > 0);
  const totals = withFood.map((l) => sumFoodTotals(l));

  const totalKcal = totals.reduce((s, t) => s + t.kcal, 0);
  const avgKcal = withFood.length ? totalKcal / withFood.length : null;
  const avgProteinG = withFood.length
    ? totals.reduce((s, t) => s + t.proteinG, 0) / withFood.length
    : null;

  return {
    daysInRange: days,
    daysLogged: inRange.length,
    daysWithFood: withFood.length,
    avgKcal,
    avgProteinG,
    totalKcal,
    vsTargetAvgDelta:
      avgKcal != null && targetKcal != null ? avgKcal - targetKcal : null,
  };
}
