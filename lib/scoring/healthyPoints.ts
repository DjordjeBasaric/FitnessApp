import type { DailyLog } from "@/lib/schemas/dailyLog";
import { sumFoodItems } from "@/lib/nutrition/meals";

export type HealthyPointsInput = {
  proteinConsumedG: number;
  proteinGoalG: number | null | undefined;
  fiberConsumedG: number;
  trained: boolean;
  mealSlotsCount: number;
};

export type HealthyPointsBreakdown = {
  total: number;
  proteinGoalHit: boolean;
  proteinPoints: number;
  fiberPoints: number;
  trainingPoints: number;
  varietyPoints: number;
};

export const HEALTHY_POINTS_MAX = 5 + 3 + 5 + 3;

export function healthyPointsFromLog(
  log: DailyLog | undefined,
  proteinGoalG?: number | null,
): HealthyPointsBreakdown {
  if (!log) {
    return {
      total: 0,
      proteinGoalHit: false,
      proteinPoints: 0,
      fiberPoints: 0,
      trainingPoints: 0,
      varietyPoints: 0,
    };
  }
  const totals = sumFoodItems(log.foodItems);
  const slots = new Set(
    log.foodItems.map((f) => f.mealSlot).filter((s): s is NonNullable<typeof s> => !!s),
  );
  const trained =
    log.cardioSessions.length > 0 || log.strengthBlocks.length > 0;

  return healthyPoints({
    proteinConsumedG: totals.proteinG,
    proteinGoalG,
    fiberConsumedG: totals.fiberG,
    trained,
    mealSlotsCount: slots.size,
  });
}

export function healthyPoints(i: HealthyPointsInput): HealthyPointsBreakdown {
  const proteinGoalHit =
    i.proteinGoalG != null && i.proteinGoalG > 0 && i.proteinConsumedG >= i.proteinGoalG * 0.95;
  const proteinPoints = proteinGoalHit ? 5 : 0;
  const fiberPoints = i.fiberConsumedG >= 25 ? 3 : 0;
  const trainingPoints = i.trained ? 5 : 0;
  const varietyPoints = i.mealSlotsCount >= 4 ? 3 : 0;
  return {
    total: proteinPoints + fiberPoints + trainingPoints + varietyPoints,
    proteinGoalHit,
    proteinPoints,
    fiberPoints,
    trainingPoints,
    varietyPoints,
  };
}
