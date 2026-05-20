import type { FoodItem, MealSlot } from "@/lib/schemas/dailyLog";
import { normalizeFoodItem, reconcileFoodItemMacros, resolveMealSlot } from "@/lib/nutrition/meals";

type FoodUpdate = Omit<FoodItem, "id"> & { id?: string };

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[\s,.-]+/)
    .filter((t) => t.length > 2);
}

function normalizeDescForMatch(s: string): string {
  return s
    .replace(/^\[(?:dorucak|rucak|vecera|uzina|breakfast|lunch)\]\s*/i, "")
    .trim();
}

export function foodDescriptionMatchScore(existingDesc: string, updateDesc: string): number {
  const a = tokenize(normalizeDescForMatch(existingDesc));
  const b = tokenize(normalizeDescForMatch(updateDesc));
  if (!b.length) return 0;
  let hits = 0;
  for (const t of b) {
    if (a.some((x) => x === t || x.includes(t) || t.includes(x))) hits += 1;
  }
  return hits / b.length;
}

function mergeFoodUpdate(item: FoodItem, update: FoodUpdate): FoodItem {
  const hasProtein = update.proteinG != null && Number.isFinite(update.proteinG);
  const hasCarbs = update.carbsG != null && Number.isFinite(update.carbsG);
  const hasFat = update.fatG != null && Number.isFinite(update.fatG);
  const hasKcal = update.kcal != null && update.kcal > 0;

  const merged = reconcileFoodItemMacros({
    ...item,
    proteinG: hasProtein ? update.proteinG : item.proteinG,
    carbsG: hasCarbs ? update.carbsG : item.carbsG,
    fatG: hasFat ? update.fatG : item.fatG,
    kcal: hasKcal ? update.kcal : item.kcal,
    nutritionConfidence: update.nutritionConfidence ?? item.nutritionConfidence,
    nutritionNote:
      update.nutritionNote !== undefined ? update.nutritionNote : item.nutritionNote,
  });

  return normalizeFoodItem(merged);
}

function isRemovalUpdate(update: FoodUpdate): boolean {
  const note = (update.nutritionNote ?? "").toLowerCase();
  const desc = update.description.toLowerCase();
  const removalText = /ukloni|obriši|obrisi|izbrisan|izbaci|remove|duplikat|brisi|briši/.test(
    note + " " + desc,
  );
  const zeroed =
    (update.kcal ?? 0) === 0 &&
    (update.proteinG ?? 0) === 0 &&
    (update.carbsG ?? 0) === 0 &&
    (update.fatG ?? 0) === 0;
  return removalText || (zeroed && update.mealSlot != null);
}

function applyRemovalUpdate(items: FoodItem[], update: FoodUpdate): FoodItem[] {
  if (update.mealSlot) {
    return items.filter((i) => resolveMealSlot(i) !== update.mealSlot);
  }

  const MATCH_MIN = 0.34;
  let bestI = -1;
  let bestScore = MATCH_MIN;
  for (let i = 0; i < items.length; i++) {
    const score = foodDescriptionMatchScore(items[i].description, update.description);
    if (score > bestScore) {
      bestScore = score;
      bestI = i;
    }
  }
  if (bestI >= 0) return items.filter((_, i) => i !== bestI);
  return items;
}

export function filterByRemovedMealSlots(
  items: FoodItem[],
  slots: MealSlot[] | undefined,
): FoodItem[] {
  if (!slots?.length) return items;
  const set = new Set(slots);
  return items.filter((i) => !set.has(resolveMealSlot(i)));
}

/** Ažurira ili uklanja postojeće stavke — ne dodaje nove. */
export function applyFoodItemCorrections(
  existing: FoodItem[],
  updates: FoodUpdate[],
): FoodItem[] {
  let items = existing.map(normalizeFoodItem);
  const MATCH_MIN = 0.34;

  for (const update of updates) {
    if (isRemovalUpdate(update)) {
      items = applyRemovalUpdate(items, update);
      continue;
    }

    if (update.id) {
      const idx = items.findIndex((i) => i.id === update.id);
      if (idx >= 0) {
        items[idx] = mergeFoodUpdate(items[idx], update);
        continue;
      }
    }

    let bestI = -1;
    let bestScore = MATCH_MIN;
    for (let i = 0; i < items.length; i++) {
      if (update.mealSlot && resolveMealSlot(items[i]) !== update.mealSlot) continue;
      let score = foodDescriptionMatchScore(items[i].description, update.description);
      if (update.mealSlot && resolveMealSlot(items[i]) === update.mealSlot) score += 0.15;
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
      }
    }
    if (bestI >= 0) {
      items[bestI] = mergeFoodUpdate(items[bestI], update);
    }
  }

  return items;
}
