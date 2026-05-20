"use client";

import { Suspense } from "react";
import { useFitnessState } from "@/hooks/useFitnessState";
import { TezinaView } from "@/modules/tezina/TezinaView";

function TezinaPageContent() {
  const fs = useFitnessState();

  return (
    <TezinaView
      weightGoal={fs.weightGoal}
      weights={fs.weightsSorted}
      refresh={fs.refresh}
      onGoalSaved={(g) => {
        fs.setWeightGoalState(g);
        fs.refresh();
      }}
    />
  );
}

export default function TezinaPage() {
  return (
    <Suspense fallback={null}>
      <TezinaPageContent />
    </Suspense>
  );
}
