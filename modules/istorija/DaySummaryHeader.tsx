"use client";

import type { DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";
import { sumFoodTotals } from "@/hooks/useFitnessState";
import { resolveBodyWeightKg } from "@/lib/nutrition/bodyWeight";
import {
  effectiveFoodAllowanceKcal,
  foodRemainingKcal,
} from "@/lib/nutrition/dailyAllowance";
import { formatLongDate } from "@/lib/date";
import { sumTrainingBurnKcal } from "@/lib/nutrition/trainingBurn";
import { cn } from "@/lib/utils";

type Props = {
  log: DailyLog;
  budgetKcal?: number | null;
  weightGoal?: WeightGoal | null;
  weights?: WeightEntry[];
};

export function DaySummaryHeader({ log, budgetKcal, weightGoal, weights }: Props) {
  const totals = sumFoodTotals(log);
  const baseLimit = budgetKcal ?? undefined;
  const bodyKg = resolveBodyWeightKg(log.date, weights ?? [], weightGoal);
  const trainingBurn = sumTrainingBurnKcal(log, bodyKg);
  const allowance =
    baseLimit != null ? effectiveFoodAllowanceKcal(baseLimit, trainingBurn) : undefined;
  const remaining =
    allowance != null ? foodRemainingKcal(allowance, totals.kcal) : null;
  const pct =
    allowance != null && allowance > 0
      ? Math.min(100, Math.round((totals.kcal / allowance) * 100))
      : null;

  const hasFood = log.foodItems.length > 0;
  const hasTraining = trainingBurn > 0;

  return (
    <header className="verge-card rounded-[var(--rounded-md)] p-4 lg:p-6">
      <p className="font-caption-sm text-mint">Izabrani dan</p>
      <h2 className="mt-1.5 font-heading-lg capitalize text-ink lg:mt-2">{formatLongDate(log.date)}</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:mt-6 lg:gap-6">
        <div>
          <p className="font-heading-xl tabular-nums text-ink">
            {hasFood ? Math.round(totals.kcal) : "—"}
          </p>
          <p className="font-caption-sm mt-1 text-mute">kcal · hrana</p>
        </div>

        {hasTraining ? (
          <div>
            <p className="font-heading-xl tabular-nums text-mint">{Math.round(trainingBurn)}</p>
            <p className="font-caption-sm mt-1 text-mute">kcal · trening</p>
          </div>
        ) : null}

        {allowance != null && hasFood && remaining != null ? (
          <div>
            <p
              className={cn(
                "font-heading-lg tabular-nums",
                remaining > 0 ? "text-mint" : remaining === 0 ? "text-mint" : "text-purple",
              )}
            >
              {remaining > 0
                ? `Još ${remaining} kcal`
                : remaining === 0
                  ? "Na dozvoli"
                  : `+${Math.abs(remaining)} preko`}
            </p>
            <p className="font-caption-sm mt-1 text-mute">
              Dozvoljeno {allowance} kcal
              {hasTraining ? ` (limit ${Math.round(baseLimit!)} + trening)` : ""}
            </p>
            {pct != null ? (
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-hairline-soft bg-surface">
                <div
                  className={cn("h-full rounded-full", pct >= 100 ? "bg-purple" : "bg-mint")}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-mute sm:col-span-2 lg:text-base">
            {hasTraining && !hasFood
              ? "Samo trening — dodaj hranu u Unosu."
              : !hasFood
                ? "Nema hrane za ovaj dan."
                : "Postavi cilj u tabu Cilj."}
          </p>
        )}
      </div>
    </header>
  );
}
