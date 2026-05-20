import { addDaysToIso } from "@/lib/date";
import { translate, type Locale } from "@/lib/i18n/messages";
import { maintenanceFromWeightGoal } from "@/lib/nutrition/maintenance";
import type { WeightGoal } from "@/lib/schemas/weightGoal";

const KCAL_PER_KG_FAT = 7700;
const MAX_WEEKLY_LOSS_KG_FOR_BUDGET = 1;
const MAX_WEEKLY_GAIN_KG_FOR_BUDGET = 0.5;
const MIN_DAILY_KCAL_FLOOR = 1200;

export type WeightGoalAssessment = {
  totalDays: number;
  totalDeltaKg: number;
  weeklyDeltaKg: number;
  avgDailyDeficitKcal: number | null;
  dailyDeficitForBudgetKcal: number | null;
  feasible: boolean;
  warningSr: string | null;
  suggestedDailyLimitKcal: number | null;
  estimatedMaintenanceKcal: number | null;
  limitNoteSr: string | null;
};

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const a = new Date(sy, sm - 1, sd);
  const b = new Date(ey, em - 1, ed);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

function maintenanceKcal(goal: WeightGoal): number {
  return maintenanceFromWeightGoal(goal);
}

/** Ublažava samo ekstreman tempo u prikazu limita (iz datuma). */
function effectiveDeltaKgForBudget(goal: WeightGoal, totalDays: number): number {
  const totalDeltaKg = goal.targetKg - goal.startKg;
  const weeks = totalDays / 7;
  if (weeks <= 0) return totalDeltaKg;

  if (totalDeltaKg < 0) {
    const maxLossOverPeriod = -MAX_WEEKLY_LOSS_KG_FOR_BUDGET * weeks;
    return Math.max(totalDeltaKg, maxLossOverPeriod);
  }
  if (totalDeltaKg > 0) {
    const maxGainOverPeriod = MAX_WEEKLY_GAIN_KG_FOR_BUDGET * weeks;
    return Math.min(totalDeltaKg, maxGainOverPeriod);
  }
  return 0;
}

/** Dnevni deficit iz razlike kilaze i broja dana u periodu. */
export function dailyDeficitKcalForBudget(goal: WeightGoal, totalDays: number): number {
  const effectiveDelta = effectiveDeltaKgForBudget(goal, totalDays);
  return (-effectiveDelta * KCAL_PER_KG_FAT) / totalDays;
}

function clampDailyBudget(maintenance: number, raw: number): number {
  const softFloor = Math.max(MIN_DAILY_KCAL_FLOOR, Math.round(maintenance * 0.52));
  const ceiling = Math.round(maintenance * 1.08);
  if (raw >= softFloor && raw <= ceiling) return raw;
  return Math.min(ceiling, Math.max(softFloor, raw));
}

export function dailyIntakeBudgetKcal(goal: WeightGoal, dateIso: string): number | null {
  const totalDays = daysBetweenInclusive(goal.startDate, goal.endDate);
  if (dateIso < goal.startDate || dateIso > goal.endDate) return null;

  const maintenance = maintenanceKcal(goal);
  const deficit = dailyDeficitKcalForBudget(goal, totalDays);
  return clampDailyBudget(maintenance, Math.round(maintenance - deficit));
}

export function assessWeightGoal(goal: WeightGoal, locale: Locale = "sr"): WeightGoalAssessment {
  const totalDays = daysBetweenInclusive(goal.startDate, goal.endDate);
  const totalDeltaKg = goal.targetKg - goal.startKg;
  const weeks = totalDays / 7;
  const weeklyDeltaKg = weeks > 0 ? totalDeltaKg / weeks : totalDeltaKg;

  const maintenance = maintenanceKcal(goal);
  const dailyDeficitForBudget = dailyDeficitKcalForBudget(goal, totalDays);
  const suggestedDailyLimitKcal = clampDailyBudget(
    maintenance,
    Math.round(maintenance - dailyDeficitForBudget),
  );

  const avgDailyDeficitKcal = totalDays > 0 ? dailyDeficitForBudget : null;

  const effectiveDelta = effectiveDeltaKgForBudget(goal, totalDays);
  const budgetUsesCappedPace = effectiveDelta !== totalDeltaKg;

  let feasible = true;
  let warningSr: string | null = null;
  let limitNoteSr: string | null = null;

  if (totalDeltaKg < 0 && weeklyDeltaKg < -1) {
    feasible = false;
    warningSr = translate(locale, "goal.warning.aggressiveLoss", {
      pace: Math.abs(weeklyDeltaKg).toFixed(2),
    });
  } else if (totalDeltaKg > 0 && weeklyDeltaKg > 0.75) {
    feasible = false;
    warningSr = translate(locale, "goal.warning.aggressiveGain", {
      pace: weeklyDeltaKg.toFixed(2),
    });
  } else if (avgDailyDeficitKcal != null && avgDailyDeficitKcal > 1100) {
    warningSr = translate(locale, "goal.warning.bigDeficit", {
      kcal: Math.round(avgDailyDeficitKcal),
    });
  }

  if (budgetUsesCappedPace && totalDeltaKg < 0) {
    limitNoteSr = translate(locale, "goal.note.cappedPace", {
      max: MAX_WEEKLY_LOSS_KG_FOR_BUDGET,
    });
  }

  return {
    totalDays,
    totalDeltaKg,
    weeklyDeltaKg,
    avgDailyDeficitKcal,
    dailyDeficitForBudgetKcal: Math.round(dailyDeficitForBudget),
    feasible,
    warningSr,
    suggestedDailyLimitKcal,
    estimatedMaintenanceKcal: maintenance,
    limitNoteSr,
  };
}

export function buildBudgetSeries(
  goal: WeightGoal,
  endIso: string,
  days: number,
): { date: string; budgetKcal: number }[] {
  const out: { date: string; budgetKcal: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysToIso(endIso, -i);
    const b = dailyIntakeBudgetKcal(goal, iso);
    if (b != null) out.push({ date: iso.slice(5), budgetKcal: b });
  }
  return out;
}
