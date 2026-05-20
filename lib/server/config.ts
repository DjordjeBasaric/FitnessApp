/** Centralizovana konfiguracija servera (OpenAI model + timeouti). */

export const DEFAULT_OPENAI_MODEL = "gpt-5-nano";

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

export const OPENAI_REQUEST_TIMEOUT_MS = 25_000;
export const OPENAI_MAX_RETRIES = 2;

/** gpt-5 / o-serija prihvataju samo podrazumijevanu temperature (1). */
export function supportsCustomTemperature(model: string): boolean {
  const m = model.toLowerCase();
  if (m.startsWith("gpt-5") || /^o\d/.test(m)) return false;
  return true;
}

/**
 * Neki tanji modeli ne podržavaju response_format json_schema sa strict:true.
 * Held lista — proširi po potrebi.
 */
export function supportsJsonSchema(model: string): boolean {
  const m = model.toLowerCase();
  // Po dokumentaciji gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5*, o-serija imaju structured outputs.
  if (/^gpt-(4o|4\.1|5)/.test(m)) return true;
  if (/^o\d/.test(m)) return true;
  return false;
}
