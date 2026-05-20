"use client";

import type { DailyLog } from "@/lib/schemas/dailyLog";
import { computeFoodPeriodStats } from "@/lib/analytics/periodStats";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PeriodChips } from "@/components/analytics/PeriodChips";

type Props = {
  logs: DailyLog[];
  endIso: string;
  periodDays: number;
  onPeriodChange: (days: number) => void;
  targetKcal?: number;
  calorieConsistencyPct: number | null;
  hasWeightGoal?: boolean;
};

export function AnalyticsOverview({
  logs,
  endIso,
  periodDays,
  onPeriodChange,
  targetKcal,
  calorieConsistencyPct,
  hasWeightGoal,
}: Props) {
  const stats = computeFoodPeriodStats(logs, endIso, periodDays, targetKcal);

  const deltaTone =
    stats.vsTargetAvgDelta == null
      ? "muted"
      : stats.vsTargetAvgDelta > 150
        ? "purple"
        : "mint";

  return (
    <section className="space-y-4" aria-labelledby="analytics-overview-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="analytics-overview-heading" className="font-heading-md text-ink">
            Pregled perioda
          </h2>
          <p className="mt-1 text-base text-mute">
            {hasWeightGoal
              ? "Cilj je postavljen — linija trenda na grafikonu."
              : "Postavi cilj u tabu Cilj za liniju max unosa."}
          </p>
        </div>
        <PeriodChips value={periodDays} onChange={onPeriodChange} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Prosjek kcal"
          value={stats.avgKcal != null ? `${Math.round(stats.avgKcal)}` : "—"}
          hint={
            stats.daysWithFood > 0
              ? `iz ${stats.daysWithFood} dana sa hranom`
              : "nema unosa hrane u periodu"
          }
        />
        <KpiCard
          label="Prosjek proteina"
          value={stats.avgProteinG != null ? `${Math.round(stats.avgProteinG)} g` : "—"}
          hint={targetKcal ? `cilj kcal: ${Math.round(targetKcal)}` : undefined}
        />
        <KpiCard
          label="vs limit"
          value={
            stats.vsTargetAvgDelta != null
              ? `${stats.vsTargetAvgDelta > 0 ? "+" : ""}${Math.round(stats.vsTargetAvgDelta)} kcal`
              : "—"
          }
          hint={targetKcal ? "prosjek unosa − dnevni limit" : "postavi cilj u Cilju"}
          tone={deltaTone}
        />
        <KpiCard
          label="Konzistentnost"
          value={
            typeof calorieConsistencyPct === "number" ? `${calorieConsistencyPct}%` : "—"
          }
          hint="pogodak kalorijskog obrasca (14 dana)"
          tone={
            typeof calorieConsistencyPct === "number" && calorieConsistencyPct >= 70
              ? "mint"
              : "default"
          }
        />
      </div>
    </section>
  );
}
