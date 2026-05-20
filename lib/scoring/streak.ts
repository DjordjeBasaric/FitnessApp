import type { DailyLog } from "@/lib/schemas/dailyLog";
import { addDaysToIso } from "@/lib/date";

const MIN_UNIQUE_SLOTS = 3;

export function dayQualifiesForStreak(log: DailyLog | undefined): boolean {
  if (!log) return false;
  const slots = new Set(
    log.foodItems.map((f) => f.mealSlot).filter((s): s is NonNullable<typeof s> => !!s),
  );
  return slots.size >= MIN_UNIQUE_SLOTS;
}

/**
 * Strik koji se završava `endIso` — broj uzastopnih kvalifikovanih dana unazad.
 */
export function computeStreakFromLogs(logs: DailyLog[], endIso: string): number {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  let streak = 0;
  let cursor = endIso;
  while (true) {
    const log = byDate.get(cursor);
    if (!dayQualifiesForStreak(log)) break;
    streak += 1;
    cursor = addDaysToIso(cursor, -1);
  }
  return streak;
}
