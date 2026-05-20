import {
  buildProfileFewShotMessages,
  buildProfileHistory,
  buildProfileSystemPrompt,
  buildProfileUserPrompt,
  profileParseJsonSchema,
} from "@/lib/prompts/profileParser";
import {
  coerceProfileEnvelope,
  profileParseRequestSchema,
} from "@/lib/server/coerceProfilePlan";
import { runJsonCompletion } from "@/lib/server/openaiParse";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { getAuthenticatedUserOrNull } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthenticatedUserOrNull();
  if (!user) {
    return Response.json({ error: "Niste prijavljeni." }, { status: 401 });
  }
  const rl = checkRateLimit({ key: `parse-profile:${user.id}`, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return Response.json(
      { error: "Previše zahtjeva. Pokušaj ponovo za par sekundi." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Očekujem JSON tijelo" }, { status: 400 });
  }

  const parsed = profileParseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Nevalidan zahtjev", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const locale = parsed.data.locale ?? "sr";

  try {
    const raw = await runJsonCompletion({
      system: buildProfileSystemPrompt(locale),
      user: buildProfileUserPrompt({ ...parsed.data, locale }),
      history: [
        ...buildProfileFewShotMessages(locale),
        ...buildProfileHistory(parsed.data),
      ],
      jsonSchema: profileParseJsonSchema,
    });
    const result = coerceProfileEnvelope(raw);
    return Response.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Neočekivana greška";
    const aborted =
      e instanceof Error && (e.name === "AbortError" || /aborted|timeout/i.test(e.message));
    return Response.json(
      { error: aborted ? "AI servis je predugo trajao. Probaj ponovo." : msg },
      { status: aborted ? 504 : 500 },
    );
  }
}
