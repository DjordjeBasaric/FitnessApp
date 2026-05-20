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
import { mealLabelKey } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { MEAL_SLOTS, mealKcalBySlot } from "@/lib/nutrition/meals";
import { sumTrainingBurnKcal } from "@/lib/nutrition/trainingBurn";
import { cn } from "@/lib/utils";

function MacroLine({ label, consumed }: { label: string; consumed: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm lg:text-base">
      <span className="font-label-mono text-mute">{label}</span>
      <span className="tabular-nums text-ink">{Math.round(consumed)}</span>
    </div>
  );
}

export function DayIntakeSummary({
  log,
  budgetKcal,
  weightGoal,
  weights,
  dateIso,
}: {
  log: DailyLog | undefined;
  budgetKcal?: number | null;
  weightGoal?: WeightGoal | null;
  weights?: WeightEntry[];
  dateIso: string;
}) {
  const { t } = useLocale();
  const totals = log?.foodItems.length ? sumFoodTotals(log) : null;
  const mealKcal = log?.foodItems.length ? mealKcalBySlot(log.foodItems) : null;
  const bodyKg = resolveBodyWeightKg(dateIso, weights ?? [], weightGoal);
  const trainingBurn = log ? sumTrainingBurnKcal(log, bodyKg) : 0;

  const consumedKcal = totals?.kcal ?? 0;
  const baseLimit = budgetKcal ?? undefined;
  const allowance =
    baseLimit != null ? effectiveFoodAllowanceKcal(baseLimit, trainingBurn) : undefined;
  const remainingKcal =
    allowance != null ? foodRemainingKcal(allowance, consumedKcal) : null;
  const pct =
    allowance != null && allowance > 0
      ? Math.min(100, Math.round((consumedKcal / allowance) * 100))
      : null;

  const hasAnyFood = (totals?.kcal ?? 0) > 0;
  const hasTraining = trainingBurn > 0;

  return (
    <div className="w-full max-w-lg space-y-4 text-left lg:space-y-6">
      <div className="text-center">
        <p className="font-whisper text-charcoal">{t("intake.title")}</p>
        <p className="mt-1.5 font-heading-xl text-ink lg:mt-2">{t("intake.headline")}</p>
        <p className="mt-2 text-sm text-mute lg:mt-3 lg:text-base">{t("intake.hint")}</p>
      </div>

      <div className="verge-card rounded-[var(--rounded-md)] border border-hairline bg-canvas p-4 lg:p-6">
        <p className="font-caption-sm text-mint">{t("intake.todayAggregate")}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:mt-5 lg:gap-4">
          <div>
            <p className="font-heading-xl tabular-nums text-ink">{Math.round(consumedKcal)}</p>
            <p className="font-caption-sm mt-1 text-mute">{t("intake.foodKcal")}</p>
          </div>
          {hasTraining ? (
            <div>
              <p className="font-heading-xl tabular-nums text-mint">{Math.round(trainingBurn)}</p>
              <p className="font-caption-sm mt-1 text-mute">{t("intake.trainingKcal")}</p>
            </div>
          ) : null}
        </div>

        {allowance != null && baseLimit != null ? (
          <>
            <div className="mt-3 space-y-1.5 border-t border-hairline-soft pt-3 text-xs lg:mt-5 lg:space-y-2 lg:pt-5 lg:text-sm">
              <div className="flex justify-between tabular-nums">
                <span className="text-mute">{t("intake.baseLimit")}</span>
                <span className="text-ink">{Math.round(baseLimit)} kcal</span>
              </div>
              {hasTraining ? (
                <div className="flex justify-between tabular-nums">
                  <span className="text-mute">{t("intake.trainingPlus")}</span>
                  <span className="text-mint">+{Math.round(trainingBurn)} kcal</span>
                </div>
              ) : null}
              <div className="flex justify-between font-medium tabular-nums">
                <span className="text-mute">{t("intake.allowedToday")}</span>
                <span className="text-ink">{allowance} kcal</span>
              </div>
            </div>

            {remainingKcal != null ? (
              <p
                className={cn(
                  "mt-3 text-center text-base font-bold tabular-nums lg:mt-4 lg:text-xl",
                  remainingKcal > 0 ? "text-mint" : remainingKcal === 0 ? "text-mint" : "text-purple",
                )}
              >
                {remainingKcal > 0
                  ? t("intake.canEatMore", { kcal: remainingKcal })
                  : remainingKcal === 0
                    ? t("intake.limitUsed")
                    : t("intake.overAllowance", { kcal: Math.abs(remainingKcal) })}
              </p>
            ) : null}

            {pct != null ? (
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full border border-hairline-soft bg-surface">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct >= 100 ? "bg-purple" : "bg-mint",
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-mute lg:mt-4 lg:text-base">
            {hasAnyFood ? t("intake.noGoal") : t("intake.noEntries")}
          </p>
        )}

        {hasAnyFood && totals ? (
          <div className="mt-4 space-y-2 border-t border-hairline-soft pt-4 lg:mt-6 lg:space-y-3 lg:pt-5">
            <MacroLine label={t("intake.protein")} consumed={totals.proteinG} />
            <MacroLine label={t("intake.carbs")} consumed={totals.carbsG} />
            <MacroLine label={t("intake.fat")} consumed={totals.fatG} />
          </div>
        ) : null}

        {mealKcal && hasAnyFood ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-hairline-soft pt-3 lg:mt-5 lg:gap-2 lg:pt-5">
            {MEAL_SLOTS.map((slot) => {
              const k = mealKcal[slot];
              if (k <= 0) return null;
              return (
                <span
                  key={slot}
                  className="rounded-[var(--rounded-md)] border border-mint-border bg-surface px-2 py-1 font-caption-sm tabular-nums text-mint lg:px-3 lg:py-1.5"
                >
                  {t(mealLabelKey(slot))} {Math.round(k)}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
