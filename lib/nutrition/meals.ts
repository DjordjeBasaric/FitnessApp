import type { FoodItem } from "@/lib/schemas/dailyLog";
import { mealSlotSchema, type MealSlot } from "@/lib/schemas/dailyLog";

export const MEAL_SLOTS: MealSlot[] = ["dorucak", "rucak", "vecera", "uzina"];

export const MEAL_LABELS: Record<MealSlot, string> = {
  dorucak: "Doručak",
  rucak: "Ručak",
  vecera: "Večera",
  uzina: "Užine",
};

export type FoodTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  count: number;
};

export function emptyFoodTotals(): FoodTotals {
  return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0, count: 0 };
}

export function sumFoodItems(items: FoodItem[]): FoodTotals {
  const t = emptyFoodTotals();
  for (const f of items) {
    t.kcal += f.kcal;
    t.proteinG += f.proteinG;
    t.carbsG += f.carbsG;
    t.fatG += f.fatG;
    t.fiberG += f.fiberG ?? 0;
    t.sodiumMg += f.sodiumMg ?? 0;
    t.count += 1;
  }
  return t;
}

/** Nasumična procjena obroka iz opisa (stari zapisi bez mealSlot). */
export function inferMealSlot(description: string): MealSlot {
  const d = description.toLowerCase();

  if (/(doručak|dorucak|breakfast|jutarnj|ujutro|jutro)\b/.test(d)) return "dorucak";
  if (/(ručak|rucak|lunch|podne|popodne)\b/.test(d)) return "rucak";
  if (/(večera|vecera|dinner|veče|vece|noću|nocu)\b/.test(d)) return "vecera";
  if (/(užin|uzin|snack|grickalic|kolač|kolac|voće|voca|smoothie|kafa|čaj|caj|sok)\b/.test(d))
    return "uzina";

  return "uzina";
}

export function resolveMealSlot(item: FoodItem): MealSlot {
  if (item.mealSlot) {
    const parsed = mealSlotSchema.safeParse(item.mealSlot);
    if (parsed.success) return parsed.data;
  }
  return inferMealSlot(item.description);
}

/** 4 kcal/g P i UH, 9 kcal/g masti */
export function kcalFromMacros(proteinG: number, carbsG: number, fatG: number): number {
  return 4 * proteinG + 4 * carbsG + 9 * fatG;
}

/** Uskladi kcal s makroima ako AI odstupi >15%. */
export function reconcileFoodItemMacros(item: FoodItem): FoodItem {
  const fromMacros = kcalFromMacros(item.proteinG, item.carbsG, item.fatG);
  if (fromMacros <= 0) return item;
  const reported = item.kcal;
  const diff = Math.abs(reported - fromMacros);
  if (reported <= 0 || diff / Math.max(reported, 1) > 0.15) {
    return { ...item, kcal: Math.round(fromMacros) };
  }
  return item;
}

export function normalizeFoodItem(item: FoodItem): FoodItem {
  const mealSlot = resolveMealSlot(item);
  const withSlot = item.mealSlot === mealSlot ? item : { ...item, mealSlot };
  return reconcileFoodItemMacros(withSlot);
}

export type MealGroup = {
  slot: MealSlot;
  label: string;
  items: FoodItem[];
  totals: FoodTotals;
};

export function groupFoodByMeal(items: FoodItem[]): MealGroup[] {
  const buckets: Record<MealSlot, FoodItem[]> = {
    dorucak: [],
    rucak: [],
    vecera: [],
    uzina: [],
  };

  for (const raw of items) {
    const item = normalizeFoodItem(raw);
    buckets[resolveMealSlot(item)].push(item);
  }

  return MEAL_SLOTS.map((slot) => ({
    slot,
    label: MEAL_LABELS[slot],
    items: buckets[slot],
    totals: sumFoodItems(buckets[slot]),
  })).filter((g) => g.items.length > 0);
}

export function formatMacroSummary(t: FoodTotals): string {
  return `${Math.round(t.kcal)} kcal · P ${Math.round(t.proteinG)} · UH ${Math.round(t.carbsG)} · M ${Math.round(t.fatG)}`;
}

/** Kcal po obroku za rollup tabelu. */
export function mealKcalBySlot(items: FoodItem[]): Record<MealSlot, number> {
  const out: Record<MealSlot, number> = { dorucak: 0, rucak: 0, vecera: 0, uzina: 0 };
  for (const raw of items) {
    const item = normalizeFoodItem(raw);
    out[resolveMealSlot(item)] += item.kcal;
  }
  return out;
}
