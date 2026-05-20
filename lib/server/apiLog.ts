const PREFIX = "[fitness-api]";

/** Logovanje na serveru (terminal `next dev` / deploy logs). */
export function apiLog(scope: string, message: string, data?: unknown) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${PREFIX} ${ts} [${scope}] ${message}`, data);
  } else {
    console.log(`${PREFIX} ${ts} [${scope}] ${message}`);
  }
}

export function apiLogError(scope: string, message: string, data?: unknown) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.error(`${PREFIX} ${ts} [${scope}] ${message}`, data);
  } else {
    console.error(`${PREFIX} ${ts} [${scope}] ${message}`);
  }
}
