/** Uklanja ```json ograde koje modeli često dodaju uprkos response_format. */
export function stripMarkdownJsonFences(text: string): string {
  let s = text.trim();
  const fullFence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(s);
  if (fullFence) return fullFence[1].trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  }
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return s.slice(firstBrace, lastBrace + 1);
  }
  return s;
}

export function parseModelJson(text: string): unknown {
  return JSON.parse(stripMarkdownJsonFences(text));
}
