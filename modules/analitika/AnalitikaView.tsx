"use client";

import { useState } from "react";
import type { DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightGoal } from "@/lib/schemas/weightGoal";
import { assessWeightGoal } from "@/lib/analytics/weightGoal";
import { useLocale } from "@/lib/i18n/LocaleContext";

import { AnalyticsOverview } from "@/modules/analitika/AnalyticsOverview";
import { EnergyBalanceChart } from "@/components/ChartsPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  logs: DailyLog[];
  seriesEndIso: string;
  buildSeries: (days: number) => import("@/lib/analytics/series").DaySeriesPoint[];
  weightGoal: WeightGoal | null;
  calorieConsistencyPct: number | null;
  todayBudgetKcal: number | null;
  /** Ugrađeno u Istoriju — bez zasebnog page headera. */
  embedded?: boolean;
};

export function AnalitikaView({
  logs,
  seriesEndIso,
  buildSeries,
  weightGoal,
  calorieConsistencyPct,
  todayBudgetKcal,
  embedded = false,
}: Props) {
  const { t, locale } = useLocale();
  const [chartDays, setChartDays] = useState(14);
  const series = buildSeries(chartDays);
  const assessment = weightGoal ? assessWeightGoal(weightGoal, locale) : null;

  return (
    <div className={embedded ? "space-y-6 lg:space-y-8" : "space-y-8 lg:space-y-12"}>
      {!embedded ? (
        <PageHeader
          title="Analitika"
          kicker="Ishrana i trening"
          description="Agregat unosa hrane, sagorijevanja na treningu i linije cilja iz težine. Prazni dani se ne crtaju kao nula."
        />
      ) : null}

      {assessment?.warningSr || assessment?.limitNoteSr ? (
        <div
          className={cn(
            "rounded-[var(--rounded-md)] border px-4 py-3 text-sm space-y-2",
            assessment.feasible
              ? "border-mint-border bg-surface text-charcoal"
              : "border-purple/40 bg-purple/10",
          )}
        >
          {assessment.suggestedDailyLimitKcal != null ? (
            <p className="font-medium tabular-nums text-mint">
              {t("analytics.chartLimit", {
                kcal: assessment.suggestedDailyLimitKcal,
              })}
            </p>
          ) : null}
          {assessment.warningSr ? <p className="font-medium">{assessment.warningSr}</p> : null}
          {assessment.limitNoteSr ? <p className="text-mute">{assessment.limitNoteSr}</p> : null}
        </div>
      ) : null}

      <AnalyticsOverview
        logs={logs}
        endIso={seriesEndIso}
        periodDays={chartDays}
        onPeriodChange={setChartDays}
        targetKcal={todayBudgetKcal ?? undefined}
        calorieConsistencyPct={calorieConsistencyPct}
        hasWeightGoal={weightGoal != null}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.energyTitle")}</CardTitle>
          <CardDescription>
            Zelena = hrana. Ljubičasta = trening. Isprekidana = bazni limit iz cilja težine (dozvoljena
            hrana na danu = limit + trening u detalju dana).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnergyBalanceChart data={series} />
        </CardContent>
      </Card>
    </div>
  );
}
