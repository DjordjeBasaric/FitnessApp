"use client";

import type { DailyLog } from "@/lib/schemas/dailyLog";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { NutritionBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DayFoodTable({ rows }: { rows: DailyLog["foodItems"] }) {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">Hrana · stavke</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-5">
        {!rows.length ? (
          <p className="font-stats text-sm text-mute">Nema stavki.</p>
        ) : (
          <table className="min-w-[36rem] w-full text-sm">
            <thead className="font-display border-b border-hairline text-left text-[12px] font-semibold uppercase tracking-[0.15em] text-mute">
              <tr>
                <th className="pb-3 pr-3">Opis</th>
                <th className="pb-3 pr-2 font-stats">kcal</th>
                <th className="pb-3 pr-2 font-stats">P</th>
                <th className="pb-3 pr-2 font-stats">UH</th>
                <th className="pb-3 pr-2 font-stats">M</th>
                <th className="pb-3 font-stats">bilješka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-neutral-200 font-stats text-charcoal">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-[18rem] py-2 pr-3 text-[15px] leading-snug">{r.description}</td>
                  <td className="py-2 pr-2 tabular-nums">{Math.round(r.kcal)}</td>
                  <td className="py-2 pr-2 tabular-nums">{Math.round(r.proteinG)}</td>
                  <td className="py-2 pr-2 tabular-nums">{Math.round(r.carbsG)}</td>
                  <td className="py-2 pr-2 tabular-nums">{Math.round(r.fatG)}</td>
                  <td className="py-2 align-top text-[13px]">
                    <div className="mb-1">
                      <NutritionBadge level={r.nutritionConfidence} />
                    </div>
                    {r.nutritionNote ? <span className="text-mute">{r.nutritionNote}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export function DayCardioList({ cardio }: { cardio: DailyLog["cardioSessions"] }) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">{t("history.cardio")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-5">
        {!cardio.length ? (
          <p className="font-stats text-sm text-mute">{t("history.noCardio")}</p>
        ) : (
          cardio.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-hairline bg-canvas px-4 py-2 font-stats text-sm leading-relaxed text-charcoal"
            >
              <span className="font-display font-semibold uppercase tracking-[0.12em] text-ink">
                {c.kind}
              </span>
              {typeof c.minutes === "number" ? ` · ${c.minutes} min` : ""}
              {typeof c.distanceKm === "number" ? ` · ${c.distanceKm.toFixed(2)} km` : ""}
              {c.intensity ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="border-b border-dotted border-mint font-medium text-mint">
                    {c.intensity}
                  </span>
                </>
              ) : null}
              {c.estimatedKcalBurned != null ? (
                <span className="ml-1 tabular-nums text-mint"> · ~{Math.round(c.estimatedKcalBurned)} kcal</span>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DayStrengthList({ blocks }: { blocks: DailyLog["strengthBlocks"] }) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">{t("history.strength")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {!blocks.length ? (
          <p className="font-stats text-sm text-mute">{t("history.noStrength")}</p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="rounded-[var(--rounded-md)] border border-hairline bg-surface px-4 py-3">
              <p className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-ink">
                {b.muscleGroup}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{b.details}</p>
              {b.estimatedKcalBurned != null ? (
                <p className="mt-2 font-caption-sm tabular-nums text-mint">
                  ~{Math.round(b.estimatedKcalBurned)} kcal
                </p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
