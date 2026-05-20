import type { WeightGoal } from "@/lib/schemas/weightGoal";

export type ActivityLevel =
  | "sedentaran"
  | "lagan"
  | "umjeren"
  | "aktivan"
  | "vrlo_aktivan";

export type Sex = "muski" | "zenski";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentaran: 1.2,
  lagan: 1.375,
  umjeren: 1.55,
  aktivan: 1.725,
  vrlo_aktivan: 1.9,
};

/** Mifflin–St Jeor BMR (kcal/dan). */
export function mifflinStJeorBmr(
  kg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
): number {
  const base = 10 * kg + 6.25 * heightCm - 5 * ageYears;
  return sex === "muski" ? base + 5 : base - 161;
}

/** TDEE bez punog profila — bliže MFP za veće/teže osobe. */
function estimatedTdeeFromKgOnly(kg: number, activity: ActivityLevel = "lagan"): number {
  const heightCm = Math.round(168 + (kg - 70) * 0.25);
  const ageYears = 35;
  let bmr: number;
  if (kg >= 82) {
    bmr = mifflinStJeorBmr(kg, heightCm, ageYears, "muski");
  } else if (kg <= 62) {
    bmr = mifflinStJeorBmr(kg, heightCm, ageYears, "zenski");
  } else {
    const m = mifflinStJeorBmr(kg, heightCm, ageYears, "muski");
    const f = mifflinStJeorBmr(kg, heightCm, ageYears, "zenski");
    bmr = (m + f) / 2;
  }
  return bmr * ACTIVITY_FACTOR[activity];
}

export type MaintenanceInput = {
  kg: number;
  sex?: Sex;
  ageYears?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel;
};

/** Procijenjeni održavajući (TDEE) unos. */
export function estimateMaintenanceKcal(input: MaintenanceInput): number {
  const activity = input.activityLevel ?? "lagan";
  const { kg, sex, ageYears, heightCm } = input;

  if (sex && ageYears != null && ageYears > 0 && heightCm != null && heightCm > 0) {
    const bmr = mifflinStJeorBmr(kg, heightCm, ageYears, sex);
    return Math.round(bmr * ACTIVITY_FACTOR[activity]);
  }

  return Math.round(estimatedTdeeFromKgOnly(kg, activity));
}

export function maintenanceFromWeightGoal(goal: WeightGoal): number {
  return estimateMaintenanceKcal({
    kg: goal.startKg,
    sex: goal.sex,
    ageYears: goal.ageYears,
    heightCm: goal.heightCm,
    activityLevel: goal.activityLevel,
  });
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentaran: "Sjedilački / malo aktivan",
  lagan: "Lagana aktivnost (MFP „lightly active“)",
  umjeren: "Umjerena",
  aktivan: "Aktivan",
  vrlo_aktivan: "Vrlo aktivan",
};
