import type { Locale } from "@/lib/i18n/messages";
import type { ConversationTurn } from "@/lib/chat/conversation";
import type { GoalPlan } from "@/lib/schemas/goalPlan";
import type { UserContext } from "@/lib/schemas/userContext";

export type PlanParseRequest = {
  message: string;
  currentProfile?: Partial<UserContext>;
  currentPlan?: Partial<GoalPlan> | null;
  intent?: "create" | "update";
  history?: ConversationTurn[];
  locale?: Locale;
};

/* ============================================================
 * JSON Schema (strict)
 * ============================================================ */

const planPatchSchemaJson = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "programType",
    "startDate",
    "targetDailyKcal",
    "targetProteinG",
    "targetCarbsG",
    "targetFatG",
    "targetWeeklyWeightDeltaKg",
  ],
  properties: {
    name: { type: "string", minLength: 1 },
    programType: {
      type: "string",
      enum: ["mršavljenje", "održavanje_težine", "nabacivanje_mišića", "rekompozicija"],
    },
    startDate: { type: ["string", "null"] },
    targetDailyKcal: { type: ["number", "null"], minimum: 0 },
    targetProteinG: { type: ["number", "null"], minimum: 0 },
    targetCarbsG: { type: ["number", "null"], minimum: 0 },
    targetFatG: { type: ["number", "null"], minimum: 0 },
    targetWeeklyWeightDeltaKg: { type: ["number", "null"] },
  },
} as const;

export const planParseJsonSchema = {
  name: "PlanResponse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["needsClarification", "questions", "assistantMessage", "activate", "planPatch"],
    properties: {
      needsClarification: { type: "boolean" },
      questions: { type: "array", items: { type: "string" } },
      assistantMessage: { type: ["string", "null"] },
      activate: { type: "boolean" },
      planPatch: {
        anyOf: [{ type: "null" }, planPatchSchemaJson],
      },
    },
  },
} as const;

/* ============================================================
 * System prompt
 * ============================================================ */

const RULES_SR = `Ti pomažeš korisniku da kroz razgovor postavi ciljni plan ishrane/treninga.

PRAVILA RAZGOVORA
- Vodi razgovor korak po korak; jedno glavno pitanje po poruci (max 2 u questions[]).
- needsClarification = false samo kad imaš sve od: programType, name i targetDailyKcal (makroe smiješ procijeniti).
- Ako fali ključni podatak, postavi needsClarification = true i postavi planPatch sa onim što već imaš (npr. samo name + programType) — server neće aktivirati plan dok nema kcal.
- Koristi profil korisnika (godine, visina, sport) i postojeći cilj težine za procjenu kcal i makroa.

assistantMessage
- Topao, kratak. Sažmi šta si razumio + postavi sljedeće pitanje. Bez fraza tipa "Treba pojašnjenje".`;

const RULES_EN = `You help the user set up a nutrition/training goal plan via conversation.

CONVERSATION RULES
- Step by step; one main question per reply (max 2 in questions[]).
- needsClarification = false only when you have: programType, name and targetDailyKcal (macros may be estimated).
- If a key piece is missing, set needsClarification = true and return planPatch with what you have so far (e.g. name + programType only) — the server will not activate the plan without kcal.
- Use the user's profile (age, height, sport) and existing weight goal to estimate kcal and macros.
- programType enum values stay in Serbian (mršavljenje, održavanje_težine, nabacivanje_mišića, rekompozicija).

assistantMessage
- Warm, short. Summarize what you understood + ask the next question. Avoid formal phrases like "Need clarification".`;

/* ============================================================
 * Few-shot
 * ============================================================ */

type FewShot = { user: string; assistant: string };

const FEW_SHOTS_SR: FewShot[] = [
  {
    user:
      'Zadnja poruka korisnika:\n"""trebam plan za mršavljenje, oko 1900 kcal"""\n\nNamjera: kreiraj novi plan.\nProfil: {"ageYears":32,"heightCm":180,"sportNote":"trčanje 3x sedmično"}\nNema plana u aplikaciji.',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage:
        "Postavio sam plan mršavljenja sa 1900 kcal/dan i procijenjenim makroima. Možemo ga finije podesiti ako želiš.",
      activate: true,
      planPatch: {
        name: "Mršavljenje 1900 kcal",
        programType: "mršavljenje",
        startDate: null,
        targetDailyKcal: 1900,
        targetProteinG: 145,
        targetCarbsG: 200,
        targetFatG: 60,
        targetWeeklyWeightDeltaKg: -0.5,
      },
    }),
  },
  {
    user:
      'Zadnja poruka korisnika:\n"""trebam nešto za mršavljenje"""\n\nNamjera: kreiraj novi plan.\nProfil: {}\nNema plana u aplikaciji.',
    assistant: JSON.stringify({
      needsClarification: true,
      questions: ["Koliko kalorija dnevno ciljaš ili koju težinu želiš dostići?"],
      assistantMessage:
        "Hajde da krenemo od mršavljenja. Koliko kalorija dnevno otprilike ciljaš, ili da ti procijenim iz težine i tempa?",
      activate: false,
      planPatch: {
        name: "Plan mršavljenja",
        programType: "mršavljenje",
        startDate: null,
        targetDailyKcal: null,
        targetProteinG: null,
        targetCarbsG: null,
        targetFatG: null,
        targetWeeklyWeightDeltaKg: null,
      },
    }),
  },
];

const FEW_SHOTS_EN: FewShot[] = [
  {
    user:
      'Latest user message:\n"""I need a fat loss plan, around 1900 kcal"""\n\nIntent: create a new plan.\nProfile: {"ageYears":32,"heightCm":180,"sportNote":"running 3x/week"}\nNo plan in the app.',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage:
        "Set up a fat loss plan at 1900 kcal/day with estimated macros. We can fine-tune anytime.",
      activate: true,
      planPatch: {
        name: "Fat loss 1900 kcal",
        programType: "mršavljenje",
        startDate: null,
        targetDailyKcal: 1900,
        targetProteinG: 145,
        targetCarbsG: 200,
        targetFatG: 60,
        targetWeeklyWeightDeltaKg: -0.5,
      },
    }),
  },
];

/* ============================================================
 * Builders
 * ============================================================ */

export function buildPlanSystemPrompt(locale: Locale = "sr"): string {
  return locale === "en" ? RULES_EN : RULES_SR;
}

export function buildPlanFewShotMessages(
  locale: Locale = "sr",
): { role: "user" | "assistant"; content: string }[] {
  const shots = locale === "en" ? FEW_SHOTS_EN : FEW_SHOTS_SR;
  const msgs: { role: "user" | "assistant"; content: string }[] = [];
  for (const s of shots) {
    msgs.push({ role: "user", content: s.user });
    msgs.push({ role: "assistant", content: s.assistant });
  }
  return msgs;
}

function summarizeProfile(p: Partial<UserContext>): string {
  const parts: string[] = [];
  if (p.ageYears) parts.push(`${p.ageYears}g`);
  if (p.heightCm) parts.push(`${p.heightCm}cm`);
  if (p.sex) parts.push(p.sex);
  if (p.sportNote) parts.push(`sport: ${p.sportNote}`);
  if (p.dietaryNote) parts.push(`ishrana: ${p.dietaryNote}`);
  if (p.allergiesOrAvoid) parts.push(`izbjegava: ${p.allergiesOrAvoid}`);
  return parts.length ? parts.join(", ") : "(prazan)";
}

export function buildPlanUserPrompt(body: PlanParseRequest): string {
  const sr = body.locale !== "en";
  const parts: string[] = [];

  parts.push(
    sr
      ? `Zadnja poruka korisnika:\n"""${body.message}"""`
      : `Latest user message:\n"""${body.message}"""`,
  );
  parts.push(
    body.intent === "update"
      ? sr
        ? "Namjera: ažuriraj postojeći plan."
        : "Intent: update existing plan."
      : sr
        ? "Namjera: kreiraj novi plan."
        : "Intent: create a new plan.",
  );

  if (body.currentProfile && Object.keys(body.currentProfile).length) {
    parts.push((sr ? "Profil: " : "Profile: ") + summarizeProfile(body.currentProfile));
  }
  if (body.currentPlan)
    parts.push((sr ? "Trenutni plan: " : "Current plan: ") + JSON.stringify(body.currentPlan));
  else parts.push(sr ? "Nema plana u aplikaciji." : "No plan in the app.");

  return parts.join("\n\n");
}

export function buildPlanHistory(
  body: PlanParseRequest,
): { role: "user" | "assistant"; content: string }[] {
  return (body.history ?? []).slice(-10);
}
