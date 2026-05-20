const PREFIX = "[fitness-unos]";

/** Log u browser konzoli (F12 → Console). */
export function clientParseLog(message: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`${PREFIX} ${message}`, data);
  } else {
    console.log(`${PREFIX} ${message}`);
  }
}

export function clientParseError(message: string, data?: unknown) {
  if (data !== undefined) {
    console.error(`${PREFIX} ${message}`, data);
  } else {
    console.error(`${PREFIX} ${message}`);
  }
}

/** Čitljiva poruka za chat iz API odgovora. */
export function formatParseApiError(
  status: number,
  data: Record<string, unknown> | null,
): string {
  const base = typeof data?.error === "string" ? data.error : `HTTP ${status}`;
  const reqId = typeof data?.reqId === "string" ? ` (id: ${data.reqId})` : "";

  if (status === 400 && data?.detail) {
    const detail = data.detail as { fieldErrors?: Record<string, string[]> };
    const fields = detail.fieldErrors
      ? Object.entries(detail.fieldErrors)
          .filter(([, msgs]) => msgs?.length)
          .map(([k, msgs]) => `${k}: ${msgs?.join(", ")}`)
          .join("; ")
      : "";
    const issues = Array.isArray(data.issues)
      ? (data.issues as { path?: (string | number)[]; message?: string }[])
          .map((i) => `${(i.path ?? []).join(".")}: ${i.message}`)
          .join("; ")
      : "";
    const extra = fields || issues || JSON.stringify(data.detail);
    clientParseError("validacija", { status, detail: data.detail, issues: data.issues });
    return `${base}${reqId} — ${extra}`;
  }

  if (status === 503) {
    return process.env.NODE_ENV === "development"
      ? `${base}${reqId} — dodaj OPENAI_API_KEY u .env.local i restartuj \`npm run dev\`.`
      : `${base}${reqId}`;
  }

  if (status === 429) {
    return `${base}${reqId}`;
  }

  if (status === 422 && Array.isArray(data?.issues)) {
    const issues = (data.issues as { path?: (string | number)[]; message?: string }[])
      .map((i) => `${(i.path ?? []).join(".")}: ${i.message}`)
      .join("; ");
    clientParseError("envelope", { status, issues: data.issues });
    return `${base}${reqId} — ${issues || "pogrešan format odgovora AI"}`;
  }

  clientParseError("API", { status, data });
  return `${base}${reqId}`;
}
