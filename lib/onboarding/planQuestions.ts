import type { GoalPlan } from "@/lib/schemas/goalPlan";
import { isPlanReady } from "@/lib/onboarding/status";

export function buildPlanOpeningMessage(activePlan?: GoalPlan): string {
  if (isPlanReady(activePlan)) {
    return `Aktivni plan: „${activePlan!.name}“ (${Math.round(activePlan!.targetDailyKcal!)} kcal/d). Želiš li nešto promijeniti?`;
  }

  if (activePlan?.programType && !activePlan.targetDailyKcal) {
    return "Imam tip programa — treba mi još okvirni dnevni cilj u kcal (ili mogu procijeniti ako napišeš težinu i cilj). Koliko kalorija dnevno ciljaš?";
  }

  return [
    "Sada ciljevi i plan ishrane.",
    "Šta želiš postići — mršavljenje, održavanje težine, nabacivanje mišića ili rekompozicija?",
    "I otprilike koliko kalorija dnevno (ako ne znaš, napiši težinu i tempo pa procijenim)?",
  ].join("\n\n");
}
