import {
  dailyLogSchema,
  type CardioSession,
  type DailyLog,
  type FoodItem,
  type StrengthBlock,
} from "@/lib/schemas/dailyLog";
import { normalizeFoodItem, resolveMealSlot } from "@/lib/nutrition/meals";

export function newDailyItemId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeFoodItemsForSave(items: FoodItem[]): FoodItem[] {
  return items
    .filter((f) => f.description.trim().length > 0)
    .map((f) => {
      const withSlot = { ...f, mealSlot: f.mealSlot ?? resolveMealSlot(f) };
      return normalizeFoodItem(withSlot);
    });
}

export function normalizeDailyLog(draft: DailyLog): DailyLog {
  return dailyLogSchema.parse({
    ...draft,
    foodItems: normalizeFoodItemsForSave(draft.foodItems),
    cardioSessions: draft.cardioSessions.filter((c) => c.kind.trim().length > 0),
    strengthBlocks: draft.strengthBlocks.filter(
      (s) => s.muscleGroup.trim().length > 0 || s.details.trim().length > 0,
    ),
    updatedAt: Date.now(),
  });
}

export function emptyFoodItem(mealSlot?: FoodItem["mealSlot"]): FoodItem {
  return {
    id: newDailyItemId(),
    description: "",
    mealSlot,
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    nutritionConfidence: "medium",
  };
}

export function emptyCardioSession(): CardioSession {
  return { id: newDailyItemId(), kind: "" };
}

export function emptyStrengthBlock(): StrengthBlock {
  return { id: newDailyItemId(), muscleGroup: "", details: "" };
}
