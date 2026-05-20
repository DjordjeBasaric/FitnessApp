/** Lokalni kalendar kao YYYY-MM-DD (bez UTC pomaka). */
export function isoDateFromLocal(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToIso(iso: string, deltaDays: number): string {
  const [yy, mm, dd] = iso.split("-").map(Number);
  const dt = new Date(yy, mm - 1, dd);
  dt.setDate(dt.getDate() + deltaDays);
  return isoDateFromLocal(dt);
}

/** Kratki prikaz za tabele i grafikone: „pon 19.5.“ */
export function formatShortDate(iso: string): string {
  const [yy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yy, mm - 1, dd);
  const dow = new Intl.DateTimeFormat("sr-Latn", { weekday: "short" })
    .format(d)
    .replace(".", "");
  return `${dow} ${dd}.${mm}.`;
}

/** Naslov dana: „ponedjeljak, 19. maj 2026.“ */
export function formatLongDate(iso: string): string {
  const [yy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yy, mm - 1, dd);
  return new Intl.DateTimeFormat("sr-Latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
