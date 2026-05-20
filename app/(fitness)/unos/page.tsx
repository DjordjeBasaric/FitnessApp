"use client";

import { useFitnessState } from "@/hooks/useFitnessState";
import { UnosChat } from "@/modules/unos/UnosChat";

export default function UnosPage() {
  const fs = useFitnessState();

  return (
    <UnosChat
      logs={fs.logs}
      weights={fs.weights}
      refresh={fs.refresh}
      weightGoal={fs.weightGoal}
    />
  );
}
