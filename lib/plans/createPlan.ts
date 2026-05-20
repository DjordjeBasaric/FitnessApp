import { goalPlanSchema, type GoalPlan } from "@/lib/schemas/goalPlan";
import { isoDateFromLocal } from "@/lib/date";

export function newPlan(seed?: Partial<GoalPlan>): GoalPlan {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `plan_${Date.now()}`;
  const now = Date.now();
  return goalPlanSchema.parse({
    id,
    createdAt: now,
    name: seed?.name ?? "Nov plan",
    programType: seed?.programType ?? "mršavljenje",
    startDate: seed?.startDate ?? isoDateFromLocal(),
    targetDailyKcal: seed?.targetDailyKcal,
    targetProteinG: seed?.targetProteinG,
    targetCarbsG: seed?.targetCarbsG,
    targetFatG: seed?.targetFatG,
    targetWeeklyWeightDeltaKg: seed?.targetWeeklyWeightDeltaKg,
  });
}
