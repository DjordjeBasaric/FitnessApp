/**
 * Orientacioni opsezi nedelje promene telesne mase (kg/week).
 *
 * NIJE medicinska prognoza niti garantovan ishod pojedinca.
 *
 * Za mršavljenje: javni saveti često govore o umerenom tempu, ali jak varija među ljudima;
 * za MVP koristimo ŠIROK oprezan opseg.
 *
 * [see: general guidance] — dokumentuj izvor kojim se vodiš (CDC/WHO/itd.).
 */
import type { GoalProgramType } from "../schemas/goalPlan";

export type WeeklyDeltaKgRange = { minDelta: number; maxDelta: number };

/** Tipični umereni tempo mršavljenja (Δkg nedeljno, obično negativni brojevi). */
export function referenceWeeklyDeltaKgForLoss(): WeeklyDeltaKgRange {
  return {
    minDelta: -1.1,
    maxDelta: -0.2,
  };
}

/** Umereni surplus nabacivanja mase (kg/week). */
export function referenceWeeklyDeltaKgForBulk(): WeeklyDeltaKgRange {
  return { minDelta: 0.06, maxDelta: 0.45 };
}

export function getReferenceWeeklyRange(
  programType: GoalProgramType,
): WeeklyDeltaKgRange | null {
  switch (programType) {
    case "mršavljenje":
      return referenceWeeklyDeltaKgForLoss();
    case "nabacivanje_mišića":
      return referenceWeeklyDeltaKgForBulk();
    case "rekompozicija":
      return referenceWeeklyDeltaKgForLoss();
    case "održavanje_težine":
    default:
      return null;
  }
}
