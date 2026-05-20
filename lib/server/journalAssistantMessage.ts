import type { Locale } from "@/lib/i18n/messages";
import type { DailyLog, DailyPatch, MealSlot } from "@/lib/schemas/dailyLog";
import { MEAL_LABELS, sumFoodItems } from "@/lib/nutrition/meals";
import { sumTrainingBurnKcal } from "@/lib/nutrition/trainingBurn";

function sumFoodTotals(log: DailyLog) {
  return sumFoodItems(log.foodItems);
}

const MEAL_LABELS_EN: Record<MealSlot, string> = {
  dorucak: "breakfast",
  rucak: "lunch",
  vecera: "dinner",
  uzina: "snacks",
};

function shortDesc(description: string, max = 42): string {
  const t = description.replace(/^\[[^\]]+\]\s*/i, "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function slotLabel(slot: MealSlot, locale: Locale): string {
  return locale === "en"
    ? MEAL_LABELS_EN[slot]
    : MEAL_LABELS[slot].toLowerCase();
}

/**
 * Lokalizovan fallback assistant message kada model ne pošalje svoj.
 */
export function buildAssistantMessage(
  log: DailyLog,
  patch: DailyPatch,
  bodyWeightKg = 75,
  locale: Locale = "sr",
): string {
  const sr = locale !== "en";
  const parts: string[] = [];

  if (patch.mergeMode === "correct_items") {
    if (patch.removeMealSlots?.length) {
      const names = patch.removeMealSlots
        .map((s) => slotLabel(s as MealSlot, locale))
        .join(", ");
      parts.push(sr ? `Uklonio sam ${names} iz dnevnika.` : `Removed ${names} from the journal.`);
    }
    for (const item of patch.foodItems ?? []) {
      const desc = shortDesc(item.description);
      const tweaks: string[] = [];
      if (item.proteinG > 0)
        tweaks.push((sr ? "protein " : "protein ") + `${Math.round(item.proteinG)} g`);
      if (item.kcal > 0 && item.proteinG <= 0)
        tweaks.push(`~${Math.round(item.kcal)} kcal`);
      if (tweaks.length) {
        parts.push(
          sr
            ? `Ažurirao sam „${desc}” (${tweaks.join(", ")}).`
            : `Updated "${desc}" (${tweaks.join(", ")}).`,
        );
      }
    }
    if (!parts.length) {
      parts.push(sr ? "Ispravio sam unos za taj dan." : "Corrected the entry for that day.");
    }
  } else if (patch.mergeMode === "replace_day") {
    parts.push(
      sr
        ? "Zamijenio sam cijeli dan novim unosom."
        : "Replaced the whole day with new entries.",
    );
  } else {
    const foods = patch.foodItems ?? [];
    if (foods.length === 1) {
      const f = foods[0];
      const slot = f.mealSlot ? slotLabel(f.mealSlot, locale) : sr ? "dnevnik" : "the journal";
      parts.push(
        sr
          ? `Dodao sam na ${slot}: ${shortDesc(f.description)} (~${Math.round(f.kcal)} kcal, P ${Math.round(f.proteinG)} g).`
          : `Added to ${slot}: ${shortDesc(f.description)} (~${Math.round(f.kcal)} kcal, P ${Math.round(f.proteinG)} g).`,
      );
    } else if (foods.length > 1) {
      parts.push(
        sr ? `Dodao sam ${foods.length} stavki hrane.` : `Added ${foods.length} food items.`,
      );
    }

    const cardio = patch.cardioSessions ?? [];
    if (cardio.length) {
      const c = cardio[0];
      const burn =
        c.estimatedKcalBurned != null && c.estimatedKcalBurned > 0
          ? `, ~${Math.round(c.estimatedKcalBurned)} kcal`
          : "";
      parts.push(
        sr
          ? `Zapisao sam ${c.kind}${c.minutes ? ` (${c.minutes} min)` : ""}${burn}.`
          : `Logged ${c.kind}${c.minutes ? ` (${c.minutes} min)` : ""}${burn}.`,
      );
    }

    const strength = patch.strengthBlocks ?? [];
    if (strength.length) {
      const label = strength[0].muscleGroup?.trim() || (sr ? "snagu" : "strength");
      parts.push(
        sr ? `Zapisao sam trening (${label}).` : `Logged a workout (${label}).`,
      );
    }
  }

  if (patch.dayNote?.trim()) {
    parts.push(patch.dayNote.trim());
  }

  const totals = log.foodItems.length ? sumFoodTotals(log) : null;
  if (totals && totals.kcal > 0) {
    const burn = sumTrainingBurnKcal(log, bodyWeightKg);
    if (sr) {
      let line = `Za dan ukupno ~${Math.round(totals.kcal)} kcal (P ${Math.round(totals.proteinG)} g`;
      if (burn > 0) line += `, trening ~${burn} kcal`;
      line += ").";
      parts.push(line);
    } else {
      let line = `Day total ~${Math.round(totals.kcal)} kcal (P ${Math.round(totals.proteinG)} g`;
      if (burn > 0) line += `, training ~${burn} kcal`;
      line += ").";
      parts.push(line);
    }
  }

  return (
    parts.join(" ").trim() ||
    (sr
      ? "Evidencija za dan je ažurirana. Detalje vidi u Istoriji."
      : "Day log updated. See details in the Journal.")
  );
}
