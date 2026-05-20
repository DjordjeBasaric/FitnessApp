import type { GoalPlan } from "../schemas/goalPlan";
import type { UserContext } from "../schemas/userContext";
import type { WeightEntry } from "../schemas/weightEntry";
import type { DailyLog, DailyPatch } from "../schemas/dailyLog";
import { normalizeFoodItem } from "../nutrition/meals";
import {
  applyFoodItemCorrections,
  filterByRemovedMealSlots,
} from "./applyFoodCorrections";
import {
  cardioSessionSchema,
  dailyLogSchema,
  dailyPatchSchema,
  foodItemSchema,
  strengthBlockSchema,
} from "../schemas/dailyLog";
import { z } from "zod";

export type ParseRequestBody = z.infer<typeof parseRequestBodySchema>;

const existingFoodSnapshotSchema = foodItemSchema.omit({ id: true }).extend({
  id: z.string().optional(),
});

export const parseRequestBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  message: z.string().min(1).max(16_000),
  /** Trenutni dnevnik — model i server koriste za ispravke, ne duplikate. */
  existingDay: z
    .object({
      foodItems: z.array(existingFoodSnapshotSchema).max(200).optional(),
      cardioSessions: z
        .array(cardioSessionSchema.omit({ id: true }))
        .max(50)
        .optional(),
      strengthBlocks: z
        .array(strengthBlockSchema.omit({ id: true }))
        .max(50)
        .optional(),
    })
    .optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(30)
    .optional(),
  /** null iz JSON-a tretiraj kao „nema budžeta“ */
  dailyBudgetKcal: z
    .union([z.number().positive(), z.null()])
    .optional()
    .transform((v) => (v == null ? undefined : v)),
  /** Jezik prompta i fallback poruka. */
  locale: z.enum(["sr", "en"]).optional(),
});

export { coerceParseEnvelope, coerceParseEnvelopeWithDetails } from "./coerceLLMJournal";

function newId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function mergeDailyPatch(
  existing: DailyLog | undefined,
  patch: DailyPatch,
  ensuredDate: string,
): DailyLog {
  const now = Date.now();

  const foodFromPatch = (patch.foodItems ?? []).map((f) =>
    normalizeFoodItem(
      foodItemSchema.parse({
        ...f,
        id:
          patch.mergeMode === "correct_items" && f.id?.trim()
            ? f.id.trim()
            : newId(),
      }),
    ),
  );
  const cardioFromPatch = (patch.cardioSessions ?? []).map((c) =>
    cardioSessionSchema.parse({ ...c, id: newId() }),
  );
  const strengthFromPatch = (patch.strengthBlocks ?? []).map((s) =>
    strengthBlockSchema.parse({ ...s, id: newId() }),
  );

  let dayNote = existing?.dayNote;
  if (patch.dayNote !== undefined)
    dayNote = patch.dayNote === null ? undefined : patch.dayNote;

  let foodItems: DailyLog["foodItems"];
  let cardioSessions: DailyLog["cardioSessions"];
  let strengthBlocks: DailyLog["strengthBlocks"];

  if (patch.mergeMode === "replace_day") {
    foodItems = foodFromPatch;
    cardioSessions = cardioFromPatch;
    strengthBlocks = strengthFromPatch;
  } else if (patch.mergeMode === "correct_items") {
    let base = filterByRemovedMealSlots(
      (existing?.foodItems ?? []).map(normalizeFoodItem),
      patch.removeMealSlots,
    );
    base =
      foodFromPatch.length > 0 ? applyFoodItemCorrections(base, foodFromPatch) : base;
    foodItems = base;
    cardioSessions = existing?.cardioSessions ?? [];
    strengthBlocks = existing?.strengthBlocks ?? [];
  } else {
    foodItems = [
      ...(existing?.foodItems ?? []).map(normalizeFoodItem),
      ...foodFromPatch,
    ];
    cardioSessions = [...(existing?.cardioSessions ?? []), ...cardioFromPatch];
    strengthBlocks = [...(existing?.strengthBlocks ?? []), ...strengthFromPatch];
  }

  return dailyLogSchema.parse({
    date: ensuredDate,
    foodItems,
    cardioSessions,
    strengthBlocks,
    dayNote,
    updatedAt: now,
  });
}

export type ExportBundle = {
  exportedAtIso: string;
  dailyLogs: DailyLog[];
  goalPlans: GoalPlan[];
  activePlanId: string | null;
  weightEntries: WeightEntry[];
  userContext: UserContext | null;
};
