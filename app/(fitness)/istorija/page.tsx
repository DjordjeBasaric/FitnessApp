"use client";

import { Suspense } from "react";
import { useFitnessState } from "@/hooks/useFitnessState";
import { IstorijaView } from "@/modules/istorija/IstorijaView";

function IstorijaPageContent() {
  const fs = useFitnessState();

  return (
    <IstorijaView
      logs={fs.logs}
      weights={fs.weights}
      weightGoal={fs.weightGoal}
      seriesEndIso={fs.seriesEndIso}
      buildSeries={fs.buildSeries}
      calorieConsistencyPct={fs.calorieConsistencyPct}
      todayBudgetKcal={fs.todayBudgetKcal}
      refresh={fs.refresh}
    />
  );
}

export default function IstorijaPage() {
  return (
    <Suspense fallback={null}>
      <IstorijaPageContent />
    </Suspense>
  );
}
