import OpenAI from "openai";
import {
  getOpenAiModel,
  OPENAI_MAX_RETRIES,
  OPENAI_REQUEST_TIMEOUT_MS,
  supportsCustomTemperature,
  supportsJsonSchema,
} from "./config";
import { parseModelJson } from "./parseModelJson";

export { supportsCustomTemperature, supportsJsonSchema } from "./config";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type JsonSchemaSpec = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export type RunJsonOptions = {
  /** System prompt (jedna ili više rečenica) */
  system: string;
  /** User prompt sa kontekstom */
  user: string;
  /** Few-shot ili istorija razgovora — ide između sistema i user-a */
  history?: ChatMsg[];
  /**
   * Ako je dat, koristi se response_format json_schema (strict),
   * inače fallback na json_object. Bezbjedno za sve modele.
   */
  jsonSchema?: JsonSchemaSpec;
  /** override modela (default iz env) */
  model?: string;
};

function buildClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("Nedostaje OPENAI_API_KEY u .env.local");
  return new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    maxRetries: OPENAI_MAX_RETRIES,
    timeout: OPENAI_REQUEST_TIMEOUT_MS,
  });
}

/**
 * Zove OpenAI chat completion, parsira sirovi JSON odgovor.
 * Sa json_schema (kada model podržava) — strict mode garantuje strukturu.
 * Sa abort signalom — eksterno možeš otkazati zahtjev.
 */
export async function runJsonCompletion(opts: RunJsonOptions, signal?: AbortSignal): Promise<unknown> {
  const model = opts.model ?? getOpenAiModel();
  const useSchema = opts.jsonSchema != null && supportsJsonSchema(model);
  const openai = buildClient();

  const messages: ChatMsg[] = [
    { role: "system", content: opts.system },
    ...(opts.history ?? []),
    { role: "user", content: opts.user },
  ];

  const responseFormat = useSchema
    ? {
        type: "json_schema" as const,
        json_schema: {
          name: opts.jsonSchema!.name,
          strict: opts.jsonSchema!.strict ?? true,
          schema: opts.jsonSchema!.schema as unknown as Record<string, unknown>,
        },
      }
    : { type: "json_object" as const };

  const completion = await openai.chat.completions.create(
    {
      model,
      messages,
      ...(supportsCustomTemperature(model) ? { temperature: 0.2 } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_format: responseFormat as any,
    },
    { signal },
  );

  const choice = completion.choices[0];
  const text = choice?.message?.content;
  if (!text) throw new Error("Prazan odgovor modela.");
  if (choice?.finish_reason === "length") {
    throw new Error("Odgovor modela odsječen (length). Probaj kraću poruku.");
  }
  return parseModelJson(text);
}
