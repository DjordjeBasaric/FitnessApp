import type { DailyLog } from "@/lib/schemas/dailyLog";

/** kcal/min = MET × masa(kg) × 3.5 / 200 */
export function kcalPerMinuteFromMet(met: number, bodyWeightKg: number): number {
  return (met * 3.5 * bodyWeightKg) / 200;
}

function metFromIntensity(intensity?: string): number {
  const low = intensity?.toLowerCase() ?? "";
  if (low.includes("intens") || low.includes("jaka") || low.includes("hard")) return 10;
  if (low.includes("umjer") || low.includes("mod") || low.includes("tempo")) return 8;
  if (low.includes("lagan") || low.includes("easy") || low.includes("blag")) return 6;
  return 7;
}

function metFromKind(kind: string): number {
  const k = kind.toLowerCase();
  if (/trč|trc|run|jog/.test(k)) return 9;
  if (/hod|walk|šet|set/.test(k)) return 3.5;
  if (/bic|bike|cycle/.test(k)) return 7;
  if (/pliv|swim/.test(k)) return 8;
  if (/vesl|row/.test(k)) return 7;
  if (/hiit|interval/.test(k)) return 9;
  return 7;
}

/** Kardio: jedan MET model; ako ima km i min, MET iz pace-a. */
export function estimateCardioBurnKcal(
  bodyWeightKg: number,
  opts: {
    kind: string;
    minutes?: number;
    distanceKm?: number;
    intensity?: string;
    estimatedKcalBurned?: number;
  },
): number {
  if (opts.estimatedKcalBurned != null && opts.estimatedKcalBurned > 0) {
    return Math.round(opts.estimatedKcalBurned);
  }

  const minutes = opts.minutes ?? 0;
  const distanceKm = opts.distanceKm ?? 0;

  if (minutes > 0) {
    let met = metFromIntensity(opts.intensity);
    if (distanceKm > 0) {
      const paceMinPerKm = minutes / distanceKm;
      if (paceMinPerKm < 5) met = Math.max(met, 11);
      else if (paceMinPerKm < 6.5) met = Math.max(met, 9.5);
      else if (paceMinPerKm < 8) met = Math.max(met, 8);
      else met = Math.max(met, 6.5);
    } else {
      met = Math.max(met, metFromKind(opts.kind));
    }
    return Math.round(kcalPerMinuteFromMet(met, bodyWeightKg) * minutes);
  }

  if (distanceKm > 0) {
    const met = metFromKind(opts.kind);
    const estMinutes = distanceKm * (opts.kind.toLowerCase().includes("hod") ? 12 : 6);
    return Math.round(kcalPerMinuteFromMet(met, bodyWeightKg) * estMinutes);
  }

  return 0;
}

/** Snaga: AI procjena ili ~5 kcal/min procijenjenog trajanja (min 20 min sesija). */
export function estimateStrengthBurnKcal(
  details: string,
  estimatedKcalBurned?: number,
): number {
  if (estimatedKcalBurned != null && estimatedKcalBurned > 0) {
    return Math.round(estimatedKcalBurned);
  }

  const d = details.toLowerCase();
  const minMatch = d.match(/(\d+)\s*(?:min|minut)/);
  const minutes = minMatch ? Number(minMatch[1]) : 45;
  const setsMatch = d.match(/(\d+)\s*(?:serij|set|x\s*\d+)/g);
  const volumeBoost = setsMatch ? Math.min(1.4, 1 + setsMatch.length * 0.05) : 1;
  return Math.round(5 * minutes * volumeBoost);
}

export function sumTrainingBurnKcal(log: DailyLog, bodyWeightKg: number): number {
  let t = 0;
  for (const c of log.cardioSessions ?? []) {
    t += estimateCardioBurnKcal(bodyWeightKg, c);
  }
  for (const s of log.strengthBlocks ?? []) {
    t += estimateStrengthBurnKcal(s.details, s.estimatedKcalBurned);
  }
  return Math.round(t);
}
