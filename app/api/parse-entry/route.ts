import { apiLog, apiLogError } from "@/lib/server/apiLog";
import {
  buildConversationHistory,
  buildFewShotMessages,
  buildSystemPrompt,
  buildUserPrompt,
  journalParseJsonSchema,
} from "@/lib/prompts/journalParser";
import { buildAssistantMessage } from "@/lib/server/journalAssistantMessage";
import { getOpenAiModel } from "@/lib/server/config";
import { runJsonCompletion } from "@/lib/server/openaiParse";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { getAuthenticatedUserOrNull } from "@/lib/supabase/server";
import {
  coerceParseEnvelopeWithDetails,
  mergeDailyPatch,
  parseRequestBodySchema,
  type ParseRequestBody,
} from "@/lib/server/mergeDailyPatch";
import type { DailyLog } from "@/lib/schemas/dailyLog";

export const runtime = "nodejs";

const ROUTE = "parse-entry";

function existingSnapshotToLog(
  date: string,
  snap: NonNullable<ParseRequestBody["existingDay"]>,
): DailyLog {
  const id = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `snap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    date,
    foodItems: (snap.foodItems ?? []).map((f) => ({ ...f, id: f.id ?? id() })),
    cardioSessions: (snap.cardioSessions ?? []).map((c) => ({ ...c, id: id() })),
    strengthBlocks: (snap.strengthBlocks ?? []).map((s) => ({ ...s, id: id() })),
    updatedAt: 0,
  };
}

function summarizeBody(json: unknown) {
  if (!json || typeof json !== "object") return { type: typeof json };
  const o = json as Record<string, unknown>;
  const hist = Array.isArray(o.conversationHistory) ? o.conversationHistory : [];
  return {
    date: o.date,
    locale: o.locale,
    messageLen: typeof o.message === "string" ? o.message.length : null,
    messagePreview:
      typeof o.message === "string"
        ? o.message.slice(0, 80) + (o.message.length > 80 ? "…" : "")
        : null,
    conversationHistoryCount: hist.length,
    dailyBudgetKcal: o.dailyBudgetKcal,
  };
}

export async function POST(req: Request) {
  const reqId = `pe-${Date.now().toString(36)}`;
  apiLog(ROUTE, `→ ${reqId} zahtjev primljen`);

  const user = await getAuthenticatedUserOrNull();
  if (!user) {
    return Response.json({ error: "Niste prijavljeni.", reqId }, { status: 401 });
  }

  const rl = checkRateLimit({ key: `parse-entry:${user.id}`, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    apiLogError(ROUTE, `${reqId} rate limit`, { userId: user.id, resetMs: rl.resetMs });
    return Response.json(
      { error: "Previše zahtjeva. Pokušaj ponovo za par sekundi.", reqId },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      },
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    apiLogError(ROUTE, `${reqId} OPENAI_API_KEY nedostaje`);
    return Response.json({ error: "Nedostaje OPENAI_API_KEY u .env.local" }, { status: 503 });
  }

  apiLog(ROUTE, `${reqId} OPENAI_MODEL`, getOpenAiModel());

  let payload: ParseRequestBody;
  let rawJson: unknown;
  try {
    rawJson = await req.json();
    apiLog(ROUTE, `${reqId} tijelo (sažetak)`, summarizeBody(rawJson));

    const parsed = parseRequestBodySchema.safeParse(rawJson);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      apiLogError(ROUTE, `${reqId} validacija neuspješna`, {
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
      });
      return Response.json(
        {
          error: "Nevalidan zahtjev",
          detail: flat,
          issues: parsed.error.issues,
          reqId,
        },
        { status: 400 },
      );
    }
    payload = parsed.data;
  } catch (e) {
    apiLogError(ROUTE, `${reqId} JSON parse greška`, e);
    return Response.json({ error: "Očekujem JSON tijelo zahteva", reqId }, { status: 400 });
  }

  const locale = payload.locale ?? "sr";

  try {
    const history = buildConversationHistory(payload);
    apiLog(ROUTE, `${reqId} poziv OpenAI`, {
      model: getOpenAiModel(),
      historyTurns: history.length,
      locale,
    });

    const raw = await runJsonCompletion({
      system: buildSystemPrompt(locale),
      user: buildUserPrompt(payload, locale),
      history: [...buildFewShotMessages(locale), ...history],
      jsonSchema: journalParseJsonSchema,
    });

    const result = coerceParseEnvelopeWithDetails(raw, payload.date);
    if (!result.ok) {
      apiLogError(ROUTE, `${reqId} envelope validacija`, {
        issues: result.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        })),
        normalized: result.normalized,
        rawPreview:
          typeof result.raw === "string"
            ? result.raw
            : JSON.stringify(result.raw).slice(0, 800),
      });
      const first = result.issues[0];
      const hint = first ? `${first.path.join(".")}: ${first.message}` : "nepoznat format";
      return Response.json(
        {
          error: `Odgovor modela nije u očekivanom formatu (${hint})`,
          issues: result.issues,
          reqId,
        },
        { status: 422 },
      );
    }

    if (result.data.needsClarification) {
      apiLog(ROUTE, `${reqId} treba pojašnjenje`, result.data.questions);
      return Response.json({ ...result.data, reqId });
    }

    const dp = result.data.dailyPatch;
    dp.date = payload.date;

    const existingLog =
      payload.existingDay != null
        ? existingSnapshotToLog(payload.date, payload.existingDay)
        : undefined;
    const merged = mergeDailyPatch(existingLog, dp, payload.date);
    const modelMsg = result.data.assistantMessage?.trim();
    const assistantMessage =
      modelMsg && modelMsg.length >= 8
        ? modelMsg
        : buildAssistantMessage(merged, dp, 75, locale);

    apiLog(ROUTE, `${reqId} uspjeh`, {
      food: dp.foodItems?.length ?? 0,
      cardio: dp.cardioSessions?.length ?? 0,
      strength: dp.strengthBlocks?.length ?? 0,
    });

    return Response.json({
      needsClarification: false,
      dailyPatch: dp,
      mergedLog: merged,
      assistantMessage,
      reqId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Neočekivana greška";
    const aborted =
      e instanceof Error && (e.name === "AbortError" || /aborted|timeout/i.test(e.message));
    apiLogError(ROUTE, `${reqId} greška`, {
      message: msg,
      name: e instanceof Error ? e.name : undefined,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return Response.json(
      { error: aborted ? "AI servis je predugo trajao. Probaj ponovo." : msg, reqId },
      { status: aborted ? 504 : 500 },
    );
  }
}
