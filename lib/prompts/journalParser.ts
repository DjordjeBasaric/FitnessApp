import type { Locale } from "@/lib/i18n/messages";
import type { ParseRequestBody } from "../server/mergeDailyPatch";

/* ============================================================
 * JSON Schema (strict) — model mora vratiti tačno ovu strukturu.
 * Optional polja modelovana sa `["string", "null"]` ili kao
 * not-required + null, jer strict mode zahtijeva da sva polja
 * deklarisana u `properties` budu i u `required`.
 * ============================================================ */

const foodItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "description",
    "mealSlot",
    "kcal",
    "proteinG",
    "carbsG",
    "fatG",
    "fiberG",
    "sodiumMg",
    "nutritionConfidence",
    "nutritionNote",
  ],
  properties: {
    id: {
      type: ["string", "null"],
      description:
        "Postavi NA postojeći id iz konteksta SAMO kod correct_items; inače null.",
    },
    description: { type: "string" },
    mealSlot: {
      type: "string",
      enum: ["dorucak", "rucak", "vecera", "uzina"],
    },
    kcal: { type: "number", minimum: 0 },
    proteinG: { type: "number", minimum: 0 },
    carbsG: { type: "number", minimum: 0 },
    fatG: { type: "number", minimum: 0 },
    fiberG: { type: ["number", "null"], minimum: 0 },
    sodiumMg: { type: ["number", "null"], minimum: 0 },
    nutritionConfidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    nutritionNote: { type: ["string", "null"] },
  },
} as const;

const cardioSessionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "minutes", "distanceKm", "intensity", "estimatedKcalBurned"],
  properties: {
    kind: { type: "string" },
    minutes: { type: ["number", "null"], minimum: 0 },
    distanceKm: { type: ["number", "null"], minimum: 0 },
    intensity: { type: ["string", "null"] },
    estimatedKcalBurned: { type: ["number", "null"], minimum: 0 },
  },
} as const;

const strengthBlockSchema = {
  type: "object",
  additionalProperties: false,
  required: ["muscleGroup", "details", "estimatedKcalBurned"],
  properties: {
    muscleGroup: { type: "string" },
    details: { type: "string" },
    estimatedKcalBurned: { type: ["number", "null"], minimum: 0 },
  },
} as const;

const dailyPatchSchemaJson = {
  type: "object",
  additionalProperties: false,
  required: [
    "date",
    "mergeMode",
    "removeMealSlots",
    "foodItems",
    "cardioSessions",
    "strengthBlocks",
    "dayNote",
  ],
  properties: {
    date: {
      type: "string",
      description: "YYYY-MM-DD, mora odgovarati datumu iz konteksta korisnika.",
    },
    mergeMode: {
      type: "string",
      enum: ["append", "replace_day", "correct_items"],
    },
    removeMealSlots: {
      type: "array",
      items: { type: "string", enum: ["dorucak", "rucak", "vecera", "uzina"] },
    },
    foodItems: { type: "array", items: foodItemSchema },
    cardioSessions: { type: "array", items: cardioSessionSchema },
    strengthBlocks: { type: "array", items: strengthBlockSchema },
    dayNote: { type: ["string", "null"] },
  },
} as const;

export const journalParseJsonSchema = {
  name: "JournalEntryResponse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["needsClarification", "questions", "assistantMessage", "dailyPatch"],
    properties: {
      needsClarification: { type: "boolean" },
      questions: { type: "array", items: { type: "string" } },
      assistantMessage: { type: ["string", "null"] },
      dailyPatch: {
        anyOf: [{ type: "null" }, dailyPatchSchemaJson],
      },
    },
  },
} as const;

/* ============================================================
 * System prompt — sr / en
 * ============================================================ */

const RULES_SR = `Ti si asistent za fitness/ishrana dnevnik. Korisnik piše slobodnim tekstom na srpskom ili hrvatskom.

PROCJENA HRANE
- Ako korisnik navede gramažu ili broj komada, koristi to direktno (nutritionConfidence "high").
- Ako ne, koristi standardnu prosječnu porciju (jaje 60g, banana 120g, kašika ulja 14g) i postavi nutritionConfidence "medium".
- Svaku NOVU stavku razvrstaj u mealSlot na osnovu konteksta (jutro → "dorucak", podne → "rucak", veče → "vecera", između → "uzina").

KOREKCIJE (mergeMode = "correct_items")
- Kada korisnik kaže "ne, ovo je imalo X" ili "promijeni Y na Z" — postavi id na tačan id iz "Već sačuvano" konteksta.
- Brisanje cijelog obroka → koristi removeMealSlots (npr. ["rucak"]) i NE ponavljaj foodItems za taj obrok.
- Nikad ne postavljaj kcal/protein na 0 da bi "obrisao" — koristi removeMealSlots ili izostavi stavku.

PROCJENA TRENINGA
- Procijeni estimatedKcalBurned na osnovu vrste, trajanja i intenziteta (npr. 5 km trčanje umjereno ≈ 350 kcal).
- Ne dupliraj istu sesiju ako je korisnik napisao dvojezično.

POJAŠNJENJA
- needsClarification = true samo kada poruka ne sadrži ništa obradivo ("ne", "da", "ovo" bez referenca).
- Već dat broj ili imenovana stavka nije razlog za pojašnjenje — koristi standardnu porciju.

ODGOVOR (assistantMessage)
- Topao, 1–2 rečenice, sažetak izmjene na istom jeziku na kojem korisnik piše.
- Ne ponavljaj formalne fraze tipa "Treba pojašnjenje".`;

const RULES_EN = `You are a fitness/nutrition journal assistant. The user writes freely in English.

FOOD ESTIMATION
- If the user gives grams or counts, use them directly (nutritionConfidence "high").
- Otherwise use standard average portions (egg 60g, banana 120g, tablespoon of oil 14g) with nutritionConfidence "medium".
- Sort each NEW item into a mealSlot from context (morning → "dorucak", noon → "rucak", evening → "vecera", in-between → "uzina"). Slot enum values stay in Serbian.

CORRECTIONS (mergeMode = "correct_items")
- When the user says "no, that had X" or "change Y to Z" — set id to the exact id from the "Already saved" context.
- To remove a full meal → use removeMealSlots (e.g. ["rucak"]) and do NOT re-add foodItems for that slot.
- Never set kcal/protein to 0 to "delete" — use removeMealSlots or omit the item.

TRAINING ESTIMATION
- Estimate estimatedKcalBurned based on type, duration and intensity (e.g. 5 km moderate run ≈ 350 kcal).
- Do not duplicate the same session if written bilingually.

CLARIFICATIONS
- needsClarification = true only when the message has nothing actionable ("no", "yes", "this" without a referent).
- A given number or named item is not a reason to ask — fall back to a standard portion.

REPLY (assistantMessage)
- Warm, 1–2 sentences, summary of the change, same language the user wrote in.
- Avoid formal phrases like "Need clarification".`;

/* ============================================================
 * Few-shot primjeri (mali skup koji najviše pomaže gpt-5-nano)
 * ============================================================ */

type FewShot = { user: string; assistant: string };

const FEW_SHOTS_SR: FewShot[] = [
  {
    user:
      'Datum dnevnika: 2026-05-20\nPoruka korisnika:\n"""dva jaja na oko i kafa sa mlijekom za doručak"""',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage:
        "Dodao sam doručak: dva jaja i kafu s mlijekom (~250 kcal).",
      dailyPatch: {
        date: "2026-05-20",
        mergeMode: "append",
        removeMealSlots: [],
        foodItems: [
          {
            id: null,
            description: "dva jaja na oko",
            mealSlot: "dorucak",
            kcal: 180,
            proteinG: 12,
            carbsG: 1,
            fatG: 14,
            fiberG: null,
            sodiumMg: null,
            nutritionConfidence: "medium",
            nutritionNote: null,
          },
          {
            id: null,
            description: "kafa sa mlijekom",
            mealSlot: "dorucak",
            kcal: 40,
            proteinG: 2,
            carbsG: 3,
            fatG: 2,
            fiberG: null,
            sodiumMg: null,
            nutritionConfidence: "medium",
            nutritionNote: null,
          },
        ],
        cardioSessions: [],
        strengthBlocks: [],
        dayNote: null,
      },
    }),
  },
  {
    user:
      'Datum dnevnika: 2026-05-20\nPoruka korisnika:\n"""ispravka — tunjevina je imala 25 g proteina, ne 18"""\n\nVeć sačuvano za ovaj dan:\n- id=abc-1 | [dorucak] tunjevina iz konzerve: 130 kcal, P 18g, UH 0g, M 6g',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage:
        "Ažurirao sam tunjevinu — protein 25 g.",
      dailyPatch: {
        date: "2026-05-20",
        mergeMode: "correct_items",
        removeMealSlots: [],
        foodItems: [
          {
            id: "abc-1",
            description: "tunjevina iz konzerve",
            mealSlot: "dorucak",
            kcal: 150,
            proteinG: 25,
            carbsG: 0,
            fatG: 6,
            fiberG: null,
            sodiumMg: null,
            nutritionConfidence: "high",
            nutritionNote: "Ispravka proteina po korisniku",
          },
        ],
        cardioSessions: [],
        strengthBlocks: [],
        dayNote: null,
      },
    }),
  },
  {
    user:
      'Datum dnevnika: 2026-05-20\nPoruka korisnika:\n"""obriši ručak, duplikat je"""\n\nVeć sačuvano za ovaj dan:\n- id=r1 | [rucak] pileća prsa: 220 kcal, P 38g, UH 0g, M 6g\n- id=r2 | [rucak] pileća prsa: 220 kcal, P 38g, UH 0g, M 6g',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage: "Uklonio sam ručak iz dnevnika.",
      dailyPatch: {
        date: "2026-05-20",
        mergeMode: "correct_items",
        removeMealSlots: ["rucak"],
        foodItems: [],
        cardioSessions: [],
        strengthBlocks: [],
        dayNote: null,
      },
    }),
  },
];

const FEW_SHOTS_EN: FewShot[] = [
  {
    user:
      'Journal date: 2026-05-20\nUser message:\n"""two fried eggs and a coffee with milk for breakfast"""',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage: "Logged breakfast: two eggs and a coffee with milk (~250 kcal).",
      dailyPatch: {
        date: "2026-05-20",
        mergeMode: "append",
        removeMealSlots: [],
        foodItems: [
          {
            id: null,
            description: "two fried eggs",
            mealSlot: "dorucak",
            kcal: 180,
            proteinG: 12,
            carbsG: 1,
            fatG: 14,
            fiberG: null,
            sodiumMg: null,
            nutritionConfidence: "medium",
            nutritionNote: null,
          },
          {
            id: null,
            description: "coffee with milk",
            mealSlot: "dorucak",
            kcal: 40,
            proteinG: 2,
            carbsG: 3,
            fatG: 2,
            fiberG: null,
            sodiumMg: null,
            nutritionConfidence: "medium",
            nutritionNote: null,
          },
        ],
        cardioSessions: [],
        strengthBlocks: [],
        dayNote: null,
      },
    }),
  },
  {
    user:
      'Journal date: 2026-05-20\nUser message:\n"""correction — the tuna actually had 25 g of protein, not 18"""\n\nAlready saved today:\n- id=abc-1 | [dorucak] canned tuna: 130 kcal, P 18g, C 0g, F 6g',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage: "Updated the tuna — protein 25 g.",
      dailyPatch: {
        date: "2026-05-20",
        mergeMode: "correct_items",
        removeMealSlots: [],
        foodItems: [
          {
            id: "abc-1",
            description: "canned tuna",
            mealSlot: "dorucak",
            kcal: 150,
            proteinG: 25,
            carbsG: 0,
            fatG: 6,
            fiberG: null,
            sodiumMg: null,
            nutritionConfidence: "high",
            nutritionNote: "User correction of protein",
          },
        ],
        cardioSessions: [],
        strengthBlocks: [],
        dayNote: null,
      },
    }),
  },
  {
    user:
      'Journal date: 2026-05-20\nUser message:\n"""remove lunch, it\'s a duplicate"""\n\nAlready saved today:\n- id=r1 | [rucak] chicken breast: 220 kcal, P 38g, C 0g, F 6g\n- id=r2 | [rucak] chicken breast: 220 kcal, P 38g, C 0g, F 6g',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage: "Removed lunch from the journal.",
      dailyPatch: {
        date: "2026-05-20",
        mergeMode: "correct_items",
        removeMealSlots: ["rucak"],
        foodItems: [],
        cardioSessions: [],
        strengthBlocks: [],
        dayNote: null,
      },
    }),
  },
];

/* ============================================================
 * Builders
 * ============================================================ */

export function buildSystemPrompt(locale: Locale = "sr"): string {
  return locale === "en" ? RULES_EN : RULES_SR;
}

export function buildFewShotMessages(
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

export function buildUserPrompt(body: ParseRequestBody, locale: Locale = "sr"): string {
  const sr = locale !== "en";
  const parts: string[] = [
    sr ? `Datum dnevnika: ${body.date}` : `Journal date: ${body.date}`,
    sr
      ? `Poruka korisnika:\n"""${body.message}"""`
      : `User message:\n"""${body.message}"""`,
  ];

  if (body.existingDay?.foodItems?.length) {
    const lines = body.existingDay.foodItems.map((f) => {
      const idPart = f.id ? `id=${f.id} | ` : "";
      return `- ${idPart}[${f.mealSlot ?? "?"}] ${f.description}: ${Math.round(f.kcal)} kcal, ${sr ? "P" : "P"} ${Math.round(f.proteinG)}g, ${sr ? "UH" : "C"} ${Math.round(f.carbsG)}g, ${sr ? "M" : "F"} ${Math.round(f.fatG)}g`;
    });
    parts.push(
      (sr
        ? `Već sačuvano za ovaj dan (NE ponavljaj ove stavke osim ispravke — koristi id):\n`
        : `Already saved today (do NOT repeat unless correcting — use id):\n`) +
        lines.join("\n"),
    );
  }

  if (body.existingDay?.cardioSessions?.length) {
    const lines = body.existingDay.cardioSessions.map(
      (c) =>
        `- ${c.kind}: ${c.minutes ?? "?"} min${c.distanceKm != null ? `, ${c.distanceKm} km` : ""}`,
    );
    parts.push((sr ? "Već sačuvan kardio:\n" : "Already saved cardio:\n") + lines.join("\n"));
  }

  return parts.join("\n\n");
}

/** Vraća (zadnjih 10) parova iz chat istorije za multi-turn context. */
export function buildConversationHistory(
  body: ParseRequestBody,
): { role: "user" | "assistant"; content: string }[] {
  return (body.conversationHistory ?? []).slice(-10);
}
