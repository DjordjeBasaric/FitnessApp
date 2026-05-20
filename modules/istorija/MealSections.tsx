"use client";

import type { DailyLog } from "@/lib/schemas/dailyLog";
import { mealLabelKey } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/LocaleContext";
import {
  emptyFoodTotals,
  groupFoodByMeal,
  MEAL_SLOTS,
  type MealGroup,
} from "@/lib/nutrition/meals";
import { NutritionBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function MealHeader({
  mealLabel,
  totals,
  hasItems,
}: {
  mealLabel: string;
  totals: ReturnType<typeof emptyFoodTotals>;
  hasItems: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-1.5 rounded-[var(--rounded-md)] px-2.5 py-2 lg:mb-4 lg:gap-2 lg:px-4 lg:py-3",
        hasItems
          ? "verge-tile-mint"
          : "border border-hairline-soft bg-surface",
      )}
    >
      <p
        className={cn(
          "font-caption-sm",
          hasItems ? "text-on-primary/80" : "text-mute",
        )}
      >
        {mealLabel}
      </p>
      <p
        className={cn(
          "text-base font-semibold tabular-nums lg:text-xl",
          hasItems ? "text-on-primary" : "text-mute",
        )}
      >
        {hasItems ? Math.round(totals.kcal) : "-"}
        <span
          className={cn(
            "text-xs font-normal lg:text-base",
            hasItems ? "text-on-primary/75" : "text-mute",
          )}
        >
          {" "}
          kcal
        </span>
      </p>
      <p
        className={cn(
          "text-xs tabular-nums lg:text-sm",
          hasItems ? "text-on-primary/90" : "text-mute",
        )}
      >
        {hasItems ? (
          <>
            P {Math.round(totals.proteinG)} · UH {Math.round(totals.carbsG)} · M{" "}
            {Math.round(totals.fatG)}
          </>
        ) : (
          <>P - · UH - · M -</>
        )}
      </p>
    </div>
  );
}

function MealColumn({
  slot,
  group,
}: {
  slot: (typeof MEAL_SLOTS)[number];
  group: MealGroup | undefined;
}) {
  const { t } = useLocale();
  const items = group?.items ?? [];
  const totals = group?.totals ?? emptyFoodTotals();
  const hasItems = items.length > 0;
  const mealLabel = t(mealLabelKey(slot));

  return (
    <div className="flex min-w-0 flex-col border-l border-hairline-soft pl-4 first:border-l-0 first:pl-0 sm:pl-5">
      <MealHeader mealLabel={mealLabel} totals={totals} hasItems={hasItems} />

      {hasItems ? (
        <div className="space-y-4">
          {items.map((r) => (
            <div
              key={r.id}
              className="border-b border-hairline-soft pb-3 last:border-b-0 last:pb-0"
            >
              <p className="text-[13px] leading-snug text-charcoal lg:text-[15px]">{r.description}</p>
              <p className="mt-1 tabular-nums text-xs text-mute lg:mt-1.5 lg:text-sm">
                {Math.round(r.kcal)} · P {Math.round(r.proteinG)} · UH{" "}
                {Math.round(r.carbsG)} · M {Math.round(r.fatG)}
              </p>
              <div className="mt-1.5">
                <NutritionBadge level={r.nutritionConfidence} />
                {r.nutritionNote ? (
                  <p className="mt-1 text-xs text-mute">{r.nutritionNote}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DayFoodByMeals({ rows }: { rows: DailyLog["foodItems"] }) {
  const { t } = useLocale();
  const groups = groupFoodByMeal(rows);
  const bySlot = Object.fromEntries(groups.map((g) => [g.slot, g])) as Partial<
    Record<(typeof MEAL_SLOTS)[number], MealGroup>
  >;

  return (
    <Card className="w-full">
      <CardHeader className="py-3 lg:py-5">
        <CardTitle className="text-sm lg:text-lg">{t("history.foodByMeals")}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 lg:pb-6">
        <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {MEAL_SLOTS.map((slot) => (
            <MealColumn key={slot} slot={slot} group={bySlot[slot]} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
