import { z } from "zod";

import { goalPlanSchema, goalProgramTypeSchema } from "@/lib/schemas/goalPlan";
import { userContextSchema, type UserContext } from "@/lib/schemas/userContext";
import type { ProfileParseRequest } from "@/lib/prompts/profileParser";
import type { PlanParseRequest } from "@/lib/prompts/planParser";

const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const profileParseRequestSchema = z.object({
  message: z.string().min(1).max(12_000),
  currentProfile: userContextSchema.partial().optional(),
  history: z.array(conversationTurnSchema).max(24).optional(),
  locale: z.enum(["sr", "en"]).optional(),
});

export const planParseRequestSchema = z.object({
  message: z.string().min(1).max(12_000),
  currentProfile: userContextSchema.partial().optional(),
  currentPlan: goalPlanSchema.partial().nullable().optional(),
  intent: z.enum(["create", "update"]).optional(),
  history: z.array(conversationTurnSchema).max(24).optional(),
  locale: z.enum(["sr", "en"]).optional(),
});

/**
 * Strict JSON Schema model nam šalje `null` za nedostajuća polja
 * (umjesto izostavljenih). Pretvaramo `null` u undefined prije Zod parsa
 * da bismo zadržali `.optional()` semantiku.
 */
function nullsToUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    (out as Record<string, unknown>)[k] = v === null ? undefined : v;
  }
  return out;
}

const profilePatchSchema = z.object({
  allergiesOrAvoid: z.string().optional(),
  dietaryNote: z.string().optional(),
  ageYears: z.number().int().positive().max(120).optional(),
  sex: z.enum(["muški", "ženski", "ne navodim"]).optional(),
  heightCm: z.number().positive().max(300).optional(),
  sportNote: z.string().optional(),
});

const profileEnvelopeSchema = z.object({
  needsClarification: z.boolean(),
  questions: z.array(z.string()).optional(),
  assistantMessage: z.string().optional(),
  profilePatch: profilePatchSchema.nullable().optional(),
});

const planPatchSchema = z.object({
  name: z.string().min(1),
  programType: goalProgramTypeSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetDailyKcal: z.number().positive().optional(),
  targetProteinG: z.number().nonnegative().optional(),
  targetCarbsG: z.number().nonnegative().optional(),
  targetFatG: z.number().nonnegative().optional(),
  targetWeeklyWeightDeltaKg: z.number().optional(),
});

const planEnvelopeSchema = z.object({
  needsClarification: z.boolean(),
  questions: z.array(z.string()).optional(),
  assistantMessage: z.string().optional(),
  activate: z.boolean().optional(),
  planPatch: planPatchSchema.nullable().optional(),
});

export type ProfileParseResult =
  | {
      needsClarification: true;
      questions: string[];
      profilePatch?: z.infer<typeof profilePatchSchema>;
      assistantMessage?: string;
    }
  | {
      needsClarification: false;
      profilePatch: z.infer<typeof profilePatchSchema>;
      assistantMessage?: string;
    };

export type PlanParseResult =
  | {
      needsClarification: true;
      questions: string[];
      planPatch?: z.infer<typeof planPatchSchema>;
      assistantMessage?: string;
      activate?: boolean;
    }
  | {
      needsClarification: false;
      planPatch: z.infer<typeof planPatchSchema>;
      activate: boolean;
      assistantMessage?: string;
    };

export function coerceProfileEnvelope(raw: unknown): ProfileParseResult {
  const cleaned =
    raw && typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? {
          ...(raw as Record<string, unknown>),
          profilePatch:
            (raw as Record<string, unknown>).profilePatch &&
            typeof (raw as Record<string, unknown>).profilePatch === "object" &&
            !Array.isArray((raw as Record<string, unknown>).profilePatch)
              ? nullsToUndefined(
                  (raw as Record<string, unknown>).profilePatch as Record<string, unknown>,
                )
              : (raw as Record<string, unknown>).profilePatch,
        }
      : raw;
  const env = profileEnvelopeSchema.safeParse(cleaned);
  if (!env.success) throw new Error("Model nije vratio očekivani JSON za profil.");

  const e = env.data;
  const profilePatch = e.profilePatch ? profilePatchSchema.parse(e.profilePatch) : undefined;

  if (e.needsClarification) {
    const q = (e.questions ?? []).filter((s) => s.trim().length > 0);
    if (!q.length) throw new Error("Treba pojašnjenje ali nema pitanja.");
    return {
      needsClarification: true,
      questions: q,
      profilePatch,
      assistantMessage: e.assistantMessage,
    };
  }
  if (!profilePatch) throw new Error("Nedostaje profilePatch.");
  return {
    needsClarification: false,
    profilePatch,
    assistantMessage: e.assistantMessage,
  };
}

export function coercePlanEnvelope(raw: unknown): PlanParseResult {
  const cleaned =
    raw && typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? {
          ...(raw as Record<string, unknown>),
          planPatch:
            (raw as Record<string, unknown>).planPatch &&
            typeof (raw as Record<string, unknown>).planPatch === "object" &&
            !Array.isArray((raw as Record<string, unknown>).planPatch)
              ? nullsToUndefined(
                  (raw as Record<string, unknown>).planPatch as Record<string, unknown>,
                )
              : (raw as Record<string, unknown>).planPatch,
        }
      : raw;
  const env = planEnvelopeSchema.safeParse(cleaned);
  if (!env.success) throw new Error("Model nije vratio očekivani JSON za plan.");

  const e = env.data;
  let planPatch: z.infer<typeof planPatchSchema> | undefined;
  if (e.planPatch) {
    const parsed = planPatchSchema.safeParse(e.planPatch);
    if (parsed.success) planPatch = parsed.data;
  }

  if (e.needsClarification) {
    const q = (e.questions ?? []).filter((s) => s.trim().length > 0);
    if (!q.length) throw new Error("Treba pojašnjenje ali nema pitanja.");
    return {
      needsClarification: true,
      questions: q,
      planPatch,
      assistantMessage: e.assistantMessage,
      activate: e.activate,
    };
  }
  if (!planPatch) throw new Error("Nedostaje planPatch.");
  if (!planPatch.targetDailyKcal)
    throw new Error("Plan mora imati targetDailyKcal prije čuvanja.");
  return {
    needsClarification: false,
    planPatch,
    activate: e.activate ?? true,
    assistantMessage: e.assistantMessage,
  };
}

export function mergeProfilePatch(existing: UserContext, patch: z.infer<typeof profilePatchSchema>): UserContext {
  return userContextSchema.parse({
    ...existing,
    ...patch,
    id: "me",
  });
}

export type { ProfileParseRequest, PlanParseRequest };
