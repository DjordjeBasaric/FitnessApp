"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";
import { addDaysToIso, isoDateFromLocal } from "@/lib/date";
import { calorieGoalConsistencyPct } from "@/lib/analytics/progressVsReference";
import { dailyIntakeBudgetKcal } from "@/lib/analytics/weightGoal";
import type { DaySeriesPoint } from "@/lib/analytics/series";
import { resolveBodyWeightKg } from "@/lib/nutrition/bodyWeight";
import { sumTrainingBurnKcal } from "@/lib/nutrition/trainingBurn";
import { sumFoodItems } from "@/lib/nutrition/meals";
import { useAuth } from "@/lib/supabase/AuthContext";
import { listDailyLogs } from "@/lib/supabase/queries/dailyLogs";
import { listWeightEntries } from "@/lib/supabase/queries/weightEntries";
import { getWeightGoal, setWeightGoal } from "@/lib/supabase/queries/weightGoals";

export function sumFoodTotals(log: DailyLog) {
  const t = sumFoodItems(log.foodItems);
  return {
    kcal: t.kcal,
    proteinG: t.proteinG,
    carbsG: t.carbsG,
    fatG: t.fatG,
    fiberG: t.fiberG,
    sodiumMg: t.sodiumMg,
  };
}

export function buildSeriesFromLogs(
  logs: DailyLog[],
  endIso: string,
  days: number,
  weightGoal?: WeightGoal | null,
  weights: WeightEntry[] = [],
): DaySeriesPoint[] {
  const out: DaySeriesPoint[] = [];
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  for (let i = days - 1; i >= 0; i--) {
    const d = addDaysToIso(endIso, -i);
    const log = logByDate.get(d);
    const t = log ? sumFoodTotals(log) : null;
    let cardioMinutes = 0;
    let cardioKm = 0;
    log?.cardioSessions.forEach((c) => {
      cardioMinutes += c.minutes ?? 0;
      cardioKm += c.distanceKm ?? 0;
    });
    const hasFood = (log?.foodItems?.length ?? 0) > 0;
    const hasTraining =
      (log?.cardioSessions?.length ?? 0) > 0 || (log?.strengthBlocks?.length ?? 0) > 0;
    const bw = resolveBodyWeightKg(d, weights, weightGoal);
    const burn = log && hasTraining ? sumTrainingBurnKcal(log, bw) : null;
    const budget = weightGoal ? dailyIntakeBudgetKcal(weightGoal, d) : null;
    out.push({
      date: d.slice(5),
      kcal: hasFood && t ? t.kcal : null,
      proteinG: hasFood && t ? t.proteinG : null,
      carbsG: hasFood && t ? t.carbsG : null,
      fatG: hasFood && t ? t.fatG : null,
      fiberG: hasFood && t ? t.fiberG : null,
      sodiumMg: hasFood && t ? t.sodiumMg : null,
      cardioMinutes: log?.cardioSessions?.length ? cardioMinutes : null,
      cardioKm: log?.cardioSessions?.length ? cardioKm : null,
      trainingBurnKcal: burn && burn > 0 ? burn : null,
      budgetKcal: budget,
    });
  }
  return out;
}

export function seriesEndIso(logs: DailyLog[]): string {
  const last = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return last?.date ?? isoDateFromLocal();
}

export type ChatLine = { role: "user" | "assistant" | "system"; text: string };

export const fitnessKeys = {
  all: (userId: string) => ["fitness", userId] as const,
  dailyLogs: (userId: string) => ["fitness", userId, "dailyLogs"] as const,
  weightEntries: (userId: string) => ["fitness", userId, "weightEntries"] as const,
  weightGoal: (userId: string) => ["fitness", userId, "weightGoal"] as const,
};

export function useFitnessState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;

  const enabled = userId != null;

  const logsQ = useQuery({
    queryKey: userId ? fitnessKeys.dailyLogs(userId) : ["fitness", "anon", "dailyLogs"],
    queryFn: () => listDailyLogs(userId!),
    enabled,
  });
  const weightsQ = useQuery({
    queryKey: userId ? fitnessKeys.weightEntries(userId) : ["fitness", "anon", "weightEntries"],
    queryFn: () => listWeightEntries(userId!),
    enabled,
  });
  const weightGoalQ = useQuery({
    queryKey: userId ? fitnessKeys.weightGoal(userId) : ["fitness", "anon", "weightGoal"],
    queryFn: () => getWeightGoal(userId!),
    enabled,
  });

  const logs = useMemo(
    () => (logsQ.data ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)),
    [logsQ.data],
  );
  const weights = useMemo(
    () => (weightsQ.data ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)),
    [weightsQ.data],
  );
  const weightGoal = weightGoalQ.data ?? null;

  const refresh = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: fitnessKeys.all(userId) });
  }, [qc, userId]);

  const setWeightGoalState = useCallback(
    (g: WeightGoal | null) => {
      if (!userId) return;
      qc.setQueryData(fitnessKeys.weightGoal(userId), g);
      void setWeightGoal(userId, g).catch((e) => console.warn(e));
    },
    [qc, userId],
  );

  const endIso = seriesEndIso(logs);
  const todayBudget =
    weightGoal != null ? dailyIntakeBudgetKcal(weightGoal, isoDateFromLocal()) : null;
  const weightsSorted = [...weights].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const calorieConsistencyPct = useMemo(() => {
    if (todayBudget == null) return null;
    return calorieGoalConsistencyPct(
      todayBudget,
      logs.map((log) => ({
        date: log.date,
        totalKcal: sumFoodTotals(log).kcal,
      })),
      14,
    );
  }, [todayBudget, logs]);

  return {
    refresh,
    logs,
    weights,
    weightGoal,
    setWeightGoalState,
    weightsSorted,
    seriesEndIso: endIso,
    buildSeries: (days: number) => buildSeriesFromLogs(logs, endIso, days, weightGoal, weights),
    todayBudgetKcal: todayBudget,
    calorieConsistencyPct,
    dataVersion: (logsQ.dataUpdatedAt ?? 0) + (weightsQ.dataUpdatedAt ?? 0),
    ready: logsQ.isSuccess && weightsQ.isSuccess && weightGoalQ.isSuccess,
  };
}
