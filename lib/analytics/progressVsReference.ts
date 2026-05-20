import type { GoalProgramType } from "../schemas/goalPlan";
import type { WeightEntry } from "../schemas/weightEntry";
import { getReferenceWeeklyRange, type WeeklyDeltaKgRange } from "./referenceRanges";

export type PaceVsReference =
  | "u_referentnoj_zoni"
  | "sporije_od_reference"
  | "brže_tipičnog_umerenog"
  | "ekstremno_brzo_gubitak"
  | "nema_podataka"
  | "nema_reference_za_tip_plana";

function averageWeeklySlopeKg(entries: WeightEntry[], windowDays: number): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const lastDate = sorted[sorted.length - 1].date;
  const lastMs = new Date(lastDate).getTime();
  const cutoff = lastMs - windowDays * 24 * 60 * 60 * 1000;
  const windowed = sorted.filter((e) => new Date(e.date).getTime() >= cutoff);
  if (windowed.length < 2) return null;
  const first = windowed[0];
  const last = windowed[windowed.length - 1];
  const weeksElapsed = Math.max(
    7 / 7,
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );
  return (last.kg - first.kg) / weeksElapsed;
}

function classifyAgainstReference(
  userWeeklyDelta: number,
  ref: WeeklyDeltaKgRange,
  programType: GoalProgramType,
): PaceVsReference {
  const inZone =
    userWeeklyDelta >= Math.min(ref.minDelta, ref.maxDelta) &&
    userWeeklyDelta <= Math.max(ref.minDelta, ref.maxDelta);
  if (inZone) return "u_referentnoj_zoni";

  const deficitPlan =
    programType === "mršavljenje" || programType === "rekompozicija";

  if (deficitPlan) {
    if (userWeeklyDelta > Math.max(ref.minDelta, ref.maxDelta))
      return "sporije_od_reference";
    /** Brži gubitak (negatnije Δ). */
    if (userWeeklyDelta < Math.min(ref.minDelta, ref.maxDelta)) {
      if (userWeeklyDelta < Math.min(ref.minDelta, ref.maxDelta) - 0.45)
        return "ekstremno_brzo_gubitak";
      return "brže_tipičnog_umerenog";
    }
    return "nema_podataka";
  }

  /** Nabacivanje (pozitivni koridor). Sporije = ispod minimalnog surplusa; brže = iznad. */
  if (userWeeklyDelta < Math.min(ref.minDelta, ref.maxDelta))
    return "sporije_od_reference";
  if (userWeeklyDelta > Math.max(ref.minDelta, ref.maxDelta))
    return "brže_tipičnog_umerenog";
  return "nema_podataka";
}

export interface ProgressInterpretation {
  userWeeklyAvgDeltaKg: number | null;
  reference: WeeklyDeltaKgRange | null;
  pace: PaceVsReference;
  messageSr: string;
}

export function interpretWeightProgressVsReference(
  entries: WeightEntry[],
  programType: GoalProgramType,
  windowDays: number,
): ProgressInterpretation {
  const reference = getReferenceWeeklyRange(programType);
  const userWeeklyAvgDeltaKg = averageWeeklySlopeKg(entries, windowDays);

  if (!reference) {
    return {
      userWeeklyAvgDeltaKg,
      reference: null,
      pace: "nema_reference_za_tip_plana",
      messageSr:
        "Za ovaj tip programa nismo prikazali referentnu brzinu tempa — fokus na doslednosti unosa ili stručnom savetu za personalizovan plan.",
    };
  }

  if (userWeeklyAvgDeltaKg === null) {
    return {
      userWeeklyAvgDeltaKg: null,
      reference,
      pace: "nema_podataka",
      messageSr:
        "Unesi bar dvije vrijednosti vagom tijekom koliko sedmica da se izračuna nedeljni trend.",
    };
  }

  const pace = classifyAgainstReference(
    userWeeklyAvgDeltaKg,
    reference,
    programType,
  );
  let messageSr =
    pace === "u_referentnoj_zoni"
      ? `Tvoj nedeljni trend (${userWeeklyAvgDeltaKg.toFixed(2)} kg/ned.) pada u široku orientacionu referentnu zonu aplikacije (nije garant za tvoje zdravlje).`
      : pace === "sporije_od_reference"
        ? `Tempo (${userWeeklyAvgDeltaKg.toFixed(2)} kg/ned.) je sporiji ili blaži od široke koridor reference aplikacije — to često dugoročno nije strašno, ali cilj eventualno podešavaj sa stručnjakom ako treba rezultat.`
        : pace === "brže_tipičnog_umerenog"
          ? programType === "nabacivanje_mišića"
            ? `Tempo nabacivanja (${userWeeklyAvgDeltaKg.toFixed(2)} kg/ned.) izlazi iz šireg referentnog opsega aplikacije; veći surplus često nosi više masti — diskutuj cilj na trening planu sa strukom osobom ako treba preciznost.`
            : `Tempo (${userWeeklyAvgDeltaKg.toFixed(2)} kg/ned.) je iznad koridora kojeg aplikacija prikazuje kao umereni gubitak. Prati snagu na treningu, san i struk osobu ako držite veliki deficit.`
          : pace === "ekstremno_brzo_gubitak"
            ? `Trend gubitka je jako nagao (${userWeeklyAvgDeltaKg.toFixed(2)} kg/ned.) — veliki rizik jojo ili gubitka mišića. Razmisli uz struku osobu dok ne mijenjas plan samoprouzvoljno ako imaš dodatnih simptoma.`
            : "Nema dovoljno podataka za klasifikaciju.";

  if (pace === "ekstremno_brzo_gubitak" || pace === "brže_tipičnog_umerenog") {
    messageSr +=
      " Ovo nije medicinski savjet — složeni slučajevi obradi sa ljekarom/nutricionistom.";
  }

  return { userWeeklyAvgDeltaKg, reference, pace, messageSr };
}

/**
 * Konzistentnost prema dnevnom limitu (max unos).
 * Preko limita penalizuje jače; ispod limita blaže (mršavljenje).
 */
export function calorieGoalConsistencyPct(
  targetKcal: number,
  estimatedDailyTotals: Array<{ date: string; totalKcal: number }>,
  daysLookback: number,
): number | null {
  if (!estimatedDailyTotals.length || targetKcal <= 0) return null;
  const sorted = [...estimatedDailyTotals].sort((a, b) => (a.date < b.date ? 1 : -1));
  const slice = sorted.slice(0, Math.min(daysLookback, sorted.length));
  let weightedPenalty = 0;
  slice.forEach((d) => {
    const delta = d.totalKcal - targetKcal;
    if (delta > 0) {
      weightedPenalty += delta;
    } else {
      weightedPenalty += Math.abs(delta) * 0.35;
    }
  });
  const meanPenalty = weightedPenalty / slice.length;
  const relative = Math.max(0, 1 - meanPenalty / targetKcal);
  return Math.round(relative * 100);
}
