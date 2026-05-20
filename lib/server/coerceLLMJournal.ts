import { z } from "zod";
import {
  dailyPatchSchema,
  foodItemSchema,
  mealSlotSchema,
  nutritionConfidenceSchema,
  type DailyPatch,
} from "@/lib/schemas/dailyLog";
import { reconcileFoodItemMacros } from "@/lib/nutrition/meals";

const MEAL_ALIASES: Record<string, z.infer<typeof mealSlotSchema>> = {
  dorucak: "dorucak",
  doručak: "dorucak",
  breakfast: "dorucak",
  rucak: "rucak",
  ručak: "rucak",
  lunch: "rucak",
  vecera: "vecera",
  večera: "vecera",
  dinner: "vecera",
  uzina: "uzina",
  užina: "uzina",
  snack: "uzina",
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0") return false;
  return undefined;
}

function asNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", ".").trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asStr(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function normalizeMealSlot(v: unknown): z.infer<typeof mealSlotSchema> | undefined {
  const s = asStr(v)?.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!s) return undefined;
  const key = s.replace(/\s+/g, "");
  return MEAL_ALIASES[key] ?? MEAL_ALIASES[s] ?? (mealSlotSchema.safeParse(key).success ? (key as z.infer<typeof mealSlotSchema>) : undefined);
}

function normalizeConfidence(v: unknown): z.infer<typeof nutritionConfidenceSchema> {
  const s = asStr(v)?.toLowerCase();
  const parsed = nutritionConfidenceSchema.safeParse(s);
  return parsed.success ? parsed.data : "medium";
}

function normalizeMergeMode(v: unknown): "append" | "replace_day" | "correct_items" {
  const s = asStr(v)?.toLowerCase().replace(/-/g, "_");
  if (s === "replace_day" || s === "replace" || s === "reset") return "replace_day";
  if (
    s === "correct_items" ||
    s === "correct" ||
    s === "update" ||
    s === "update_items" ||
    s === "patch"
  ) {
    return "correct_items";
  }
  return "append";
}

function normalizeFoodItem(raw: unknown) {
  const o = asRecord(raw);
  if (!o) return null;
  const description = asStr(pick(o, ["description", "name", "food", "item"]));
  if (!description) return null;
  const kcal = asNum(pick(o, ["kcal", "calories", "cal"])) ?? 0;
  const refId = asStr(pick(o, ["id", "itemId", "foodItemId", "food_item_id"]));
  const item = reconcileFoodItemMacros(
    foodItemSchema.parse({
      id: refId ?? "tmp",
      description,
      mealSlot: normalizeMealSlot(pick(o, ["mealSlot", "meal_slot", "slot", "meal"])),
      kcal,
      proteinG: asNum(pick(o, ["proteinG", "protein_g", "protein"])) ?? 0,
      carbsG: asNum(pick(o, ["carbsG", "carbs_g", "carbs", "carbohydrates"])) ?? 0,
      fatG: asNum(pick(o, ["fatG", "fat_g", "fat"])) ?? 0,
      fiberG: asNum(pick(o, ["fiberG", "fiber_g", "fiber"])),
      sodiumMg: asNum(pick(o, ["sodiumMg", "sodium_mg", "sodium"])),
      nutritionConfidence: normalizeConfidence(pick(o, ["nutritionConfidence", "confidence"])),
      nutritionNote: asStr(pick(o, ["nutritionNote", "note"])),
    }),
  );
  const { id: _id, ...rest } = item;
  return refId ? { ...rest, id: refId } : rest;
}

function normalizeCardio(raw: unknown) {
  const o = asRecord(raw);
  if (!o) return null;
  const kind = asStr(pick(o, ["kind", "type", "activity", "name", "sport"])) ?? "kardio";
  const minutes = asNum(pick(o, ["minutes", "durationMinutes", "duration_min", "duration"]));
  const distanceKm = asNum(pick(o, ["distanceKm", "distance_km", "km", "distance"]));
  const intensity = asStr(pick(o, ["intensity", "pace", "effort"]));
  const estimatedKcalBurned = asNum(
    pick(o, [
      "estimatedKcalBurned",
      "estimated_kcal_burned",
      "kcalBurned",
      "kcal_burned",
      "caloriesBurned",
      "burnedKcal",
    ]),
  );
  return {
    kind,
    ...(minutes != null ? { minutes } : {}),
    ...(distanceKm != null ? { distanceKm } : {}),
    ...(intensity ? { intensity } : {}),
    ...(estimatedKcalBurned != null ? { estimatedKcalBurned } : {}),
  };
}

function normalizeStrength(raw: unknown) {
  const o = asRecord(raw);
  if (!o) return null;
  const muscleGroup = asStr(pick(o, ["muscleGroup", "muscle_group", "group", "muscle"])) ?? "trening";
  const details = asStr(pick(o, ["details", "description", "exercises", "workout"])) ?? "";
  const estimatedKcalBurned = asNum(
    pick(o, ["estimatedKcalBurned", "estimated_kcal_burned", "kcalBurned", "kcal_burned"]),
  );
  return {
    muscleGroup,
    details,
    ...(estimatedKcalBurned != null ? { estimatedKcalBurned } : {}),
  };
}

function normalizeDailyPatch(raw: unknown, fallbackDate: string): Record<string, unknown> | null {
  const o = asRecord(raw);
  if (!o) return null;
  const date = asStr(pick(o, ["date"])) ?? fallbackDate;
  const mergeMode = normalizeMergeMode(pick(o, ["mergeMode", "merge_mode", "mode"]));

  const foodRaw = pick(o, ["foodItems", "food_items", "food", "meals"]);
  const cardioRaw = pick(o, ["cardioSessions", "cardio_sessions", "cardio"]);
  const strengthRaw = pick(o, ["strengthBlocks", "strength_blocks", "strength", "weights"]);

  const foodItems = Array.isArray(foodRaw)
    ? foodRaw.map((f) => normalizeFoodItem(f)).filter(Boolean)
    : undefined;
  const cardioSessions = Array.isArray(cardioRaw)
    ? cardioRaw.map(normalizeCardio).filter(Boolean)
    : undefined;
  const strengthBlocks = Array.isArray(strengthRaw)
    ? strengthRaw.map(normalizeStrength).filter(Boolean)
    : undefined;

  const dayNoteVal = pick(o, ["dayNote", "day_note", "note"]);
  let dayNote: string | null | undefined;
  if (dayNoteVal === null) dayNote = null;
  else if (dayNoteVal !== undefined) dayNote = asStr(dayNoteVal);

  const removeSlotsRaw = pick(o, ["removeMealSlots", "remove_meal_slots", "removeMeals"]);
  const removeMealSlots = Array.isArray(removeSlotsRaw)
    ? removeSlotsRaw
        .map((s) => normalizeMealSlot(s))
        .filter((s): s is z.infer<typeof mealSlotSchema> => s != null)
    : undefined;

  return {
    date,
    mergeMode,
    ...(removeMealSlots?.length ? { removeMealSlots } : {}),
    ...(foodItems?.length ? { foodItems } : {}),
    ...(cardioSessions?.length ? { cardioSessions } : {}),
    ...(strengthBlocks?.length ? { strengthBlocks } : {}),
    ...(dayNote !== undefined ? { dayNote } : {}),
  };
}

/** Normalizuje tipične varijante ključeva i tipova iz LLM odgovora. */
export function normalizeLLMEnvelope(raw: unknown, requestDate: string): unknown {
  const root = asRecord(raw);
  if (!root) return raw;

  const needsClarification =
    asBool(pick(root, ["needsClarification", "needs_clarification", "clarification"])) ?? false;

  const questionsRaw = pick(root, ["questions", "question", "clarificationQuestions"]);
  const questions = Array.isArray(questionsRaw)
    ? questionsRaw.map(asStr).filter((q): q is string => !!q)
    : asStr(questionsRaw)
      ? [asStr(questionsRaw)!]
      : [];

  const patchRaw = pick(root, ["dailyPatch", "daily_patch", "patch", "log"]);
  const dailyPatch =
    patchRaw === null
      ? null
      : patchRaw != null
        ? normalizeDailyPatch(patchRaw, requestDate)
        : undefined;

  const assistantRaw = pick(root, [
    "assistantMessage",
    "assistant_message",
    "reply",
    "message",
    "response",
  ]);
  const assistantMessage = asStr(assistantRaw)?.trim() || undefined;

  return {
    needsClarification,
    ...(questions.length ? { questions } : {}),
    ...(assistantMessage ? { assistantMessage } : {}),
    ...(dailyPatch !== undefined ? { dailyPatch } : {}),
  };
}

export type CoerceParseSuccess =
  | { needsClarification: true; questions: string[] }
  | {
      needsClarification: false;
      dailyPatch: DailyPatch;
      assistantMessage?: string;
    };

export type CoerceParseResult =
  | { ok: true; data: CoerceParseSuccess }
  | { ok: false; issues: z.ZodIssue[]; normalized: unknown; raw: unknown };

export function coerceParseEnvelopeWithDetails(
  raw: unknown,
  requestDate: string,
): CoerceParseResult {
  const normalized = normalizeLLMEnvelope(raw, requestDate);

  const envelopeSchema = z.object({
    needsClarification: z.boolean(),
    questions: z.array(z.string()).optional(),
    assistantMessage: z.string().max(2000).optional(),
    dailyPatch: dailyPatchSchema.optional().nullable(),
  });

  const env = envelopeSchema.safeParse(normalized);
  if (!env.success) {
    return { ok: false, issues: env.error.issues, normalized, raw };
  }

  const e = env.data;
  if (e.needsClarification) {
    const q = (e.questions ?? []).filter((s) => s.trim().length > 0);
    if (!q.length) {
      return {
        ok: false,
        issues: [{ code: "custom", path: ["questions"], message: "Prazna lista pitanja" }],
        normalized,
        raw,
      };
    }
    return { ok: true, data: { needsClarification: true, questions: q } };
  }

  if (!e.dailyPatch) {
    return {
      ok: false,
      issues: [{ code: "custom", path: ["dailyPatch"], message: "Nedostaje dailyPatch" }],
      normalized,
      raw,
    };
  }

  const patch = dailyPatchSchema.parse(e.dailyPatch);
  const assistantMessage = e.assistantMessage?.trim();
  return {
    ok: true,
    data: {
      needsClarification: false,
      dailyPatch: patch,
      ...(assistantMessage ? { assistantMessage } : {}),
    },
  };
}

/** @deprecated koristi coerceParseEnvelopeWithDetails */
export function coerceParseEnvelope(
  raw: unknown,
  requestDate: string,
):
  | { needsClarification: true; questions: string[] }
  | { needsClarification: false; dailyPatch: DailyPatch } {
  const r = coerceParseEnvelopeWithDetails(raw, requestDate);
  if (!r.ok) {
    const first = r.issues[0];
    throw new Error(
      first ? `Model JSON: ${first.path.join(".")} — ${first.message}` : "Model nije vratio očekivani JSON.",
    );
  }
  return r.data;
}
