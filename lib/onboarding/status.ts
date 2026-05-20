import type { GoalPlan } from "@/lib/schemas/goalPlan";
import type { UserContext } from "@/lib/schemas/userContext";

/** Profil smatra popunjenim ako ima bar jedan smislen podatak za AI. */
export function isProfileMeaningful(profile: UserContext): boolean {
  return Boolean(
    profile.sportNote?.trim() ||
      profile.dietaryNote?.trim() ||
      profile.allergiesOrAvoid?.trim() ||
      profile.ageYears ||
      profile.heightCm ||
      profile.sex,
  );
}

/** Plan spreman za dnevnik i analitiku — ime, tip i ciljni kcal. */
export function isPlanReady(plan: GoalPlan | undefined): boolean {
  return Boolean(plan?.name?.trim() && plan.programType && plan.targetDailyKcal != null && plan.targetDailyKcal > 0);
}

export type OnboardingStatus = {
  profileDone: boolean;
  planDone: boolean;
  isComplete: boolean;
  nextStep: "profile" | "plan" | null;
};

export function getOnboardingStatus(
  profile: UserContext | null,
  activePlan: GoalPlan | undefined,
): OnboardingStatus {
  const profileDone = profile ? isProfileMeaningful(profile) : false;
  const planDone = isPlanReady(activePlan);

  return {
    profileDone,
    planDone,
    isComplete: profileDone && planDone,
    nextStep: !profileDone ? "profile" : !planDone ? "plan" : null,
  };
}
