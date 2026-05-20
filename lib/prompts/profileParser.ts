import type { Locale } from "@/lib/i18n/messages";
import type { ConversationTurn } from "@/lib/chat/conversation";
import type { UserContext } from "@/lib/schemas/userContext";

export type ProfileParseRequest = {
  message: string;
  currentProfile?: Partial<UserContext>;
  history?: ConversationTurn[];
  locale?: Locale;
};

/* ============================================================
 * JSON Schema (strict)
 * ============================================================ */

const profilePatchSchemaJson = {
  type: "object",
  additionalProperties: false,
  required: [
    "allergiesOrAvoid",
    "dietaryNote",
    "ageYears",
    "sex",
    "heightCm",
    "sportNote",
  ],
  properties: {
    allergiesOrAvoid: { type: ["string", "null"] },
    dietaryNote: { type: ["string", "null"] },
    ageYears: { type: ["integer", "null"], minimum: 1, maximum: 120 },
    sex: {
      anyOf: [{ type: "null" }, { type: "string", enum: ["muški", "ženski", "ne navodim"] }],
    },
    heightCm: { type: ["number", "null"], minimum: 1, maximum: 300 },
    sportNote: { type: ["string", "null"] },
  },
} as const;

export const profileParseJsonSchema = {
  name: "ProfileResponse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["needsClarification", "questions", "assistantMessage", "profilePatch"],
    properties: {
      needsClarification: { type: "boolean" },
      questions: { type: "array", items: { type: "string" } },
      assistantMessage: { type: ["string", "null"] },
      profilePatch: {
        anyOf: [{ type: "null" }, profilePatchSchemaJson],
      },
    },
  },
} as const;

/* ============================================================
 * System prompt
 * ============================================================ */

const RULES_SR = `Ti si prijateljski asistent koji kroz razgovor popunjava profil korisnika za fitness AI dnevnik.

PRAVILA RAZGOVORA
- Vodi razgovor kao coach: postavi JEDNO glavno pitanje po poruci (max 2 u questions[]).
- Koristi cijelu istoriju razgovora, ne samo zadnju poruku.
- Ako korisnik odgovori djelomično, postavi needsClarification = true, ali ipak popuni profilePatch sa svim što znaš iz istorije + nove poruke.
- needsClarification = false samo kada imaš dovoljno za smislen profil: bar sport/trening ILI ishranu, PLUS (godine ILI visinu).
- Ne izmišljaj medicinske dijagnoze.

assistantMessage
- Topao, kratak, na srpskom/hrvatskom. Sažmi šta si čuo + sljedeće pitanje. Bez fraze "Treba pojašnjenje".`;

const RULES_EN = `You are a friendly assistant filling out a user profile for a fitness AI journal through conversation.

CONVERSATION RULES
- Coach style: ONE main question per reply (max 2 in questions[]).
- Use the full conversation history, not just the latest message.
- If the user replies partially, set needsClarification = true but still populate profilePatch with everything you know so far.
- needsClarification = false only when you have enough for a meaningful profile: at least sport/training OR diet, PLUS (age OR height).
- Do not invent medical diagnoses.
- sex enum values stay in Serbian (muški, ženski, ne navodim).

assistantMessage
- Warm, short, in English. Summarize what you heard + next question. Avoid formal phrases like "Need clarification".`;

/* ============================================================
 * Few-shot
 * ============================================================ */

type FewShot = { user: string; assistant: string };

const FEW_SHOTS_SR: FewShot[] = [
  {
    user:
      'Zadnja poruka korisnika:\n"""32 god, 180cm, trčim 3x sedmično"""\n\nTrenutni profil u bazi:\n{}',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage:
        "Sjajno — 32 god, 180 cm, trčiš 3x sedmično. Imaš li alergije ili namirnice koje izbjegavaš?",
      profilePatch: {
        allergiesOrAvoid: null,
        dietaryNote: null,
        ageYears: 32,
        sex: null,
        heightCm: 180,
        sportNote: "trčanje 3x sedmično",
      },
    }),
  },
  {
    user:
      'Zadnja poruka korisnika:\n"""32 godine"""\n\nTrenutni profil u bazi:\n{}',
    assistant: JSON.stringify({
      needsClarification: true,
      questions: ["Koliko si visok/a i kako treniraš?"],
      assistantMessage:
        "Super, 32 godine. Možeš li mi reći visinu i kako treniraš?",
      profilePatch: {
        allergiesOrAvoid: null,
        dietaryNote: null,
        ageYears: 32,
        sex: null,
        heightCm: null,
        sportNote: null,
      },
    }),
  },
];

const FEW_SHOTS_EN: FewShot[] = [
  {
    user:
      'Latest user message:\n"""32 years old, 180cm, I run 3x a week"""\n\nCurrent profile:\n{}',
    assistant: JSON.stringify({
      needsClarification: false,
      questions: [],
      assistantMessage:
        "Great — 32 years old, 180 cm, running 3x a week. Any allergies or foods you avoid?",
      profilePatch: {
        allergiesOrAvoid: null,
        dietaryNote: null,
        ageYears: 32,
        sex: null,
        heightCm: 180,
        sportNote: "running 3x a week",
      },
    }),
  },
];

/* ============================================================
 * Builders
 * ============================================================ */

export function buildProfileSystemPrompt(locale: Locale = "sr"): string {
  return locale === "en" ? RULES_EN : RULES_SR;
}

export function buildProfileFewShotMessages(
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

export function buildProfileUserPrompt(body: ProfileParseRequest): string {
  const sr = body.locale !== "en";
  const parts: string[] = [];

  parts.push(
    sr
      ? `Zadnja poruka korisnika:\n"""${body.message}"""`
      : `Latest user message:\n"""${body.message}"""`,
  );

  if (body.currentProfile && Object.keys(body.currentProfile).length) {
    parts.push(
      (sr
        ? `Trenutni profil u bazi (merge — dopuni, ne briši osim ako korisnik mijenja):\n`
        : `Current profile (merge — extend, don't erase unless the user changes it):\n`) +
        JSON.stringify(body.currentProfile),
    );
  }

  return parts.join("\n\n");
}

export function buildProfileHistory(
  body: ProfileParseRequest,
): { role: "user" | "assistant"; content: string }[] {
  return (body.history ?? []).slice(-10);
}
