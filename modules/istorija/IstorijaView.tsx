"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";
import { dailyIntakeBudgetKcal } from "@/lib/analytics/weightGoal";
import { deleteDailyLog } from "@/lib/supabase/queries/dailyLogs";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useJournalChat } from "@/hooks/JournalChatContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

import { AnalitikaView } from "@/modules/analitika/AnalitikaView";
import { DateStripCarousel } from "@/modules/istorija/DateStripCarousel";
import { DayCardioList, DayStrengthList } from "@/modules/istorija/DaySections";
import { DayEditor } from "@/modules/istorija/DayEditor";
import { DayFoodByMeals } from "@/modules/istorija/MealSections";
import { DaySummaryHeader } from "@/modules/istorija/DaySummaryHeader";
import { AnalyticsEmptyState } from "@/components/analytics/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  logs: DailyLog[];
  weights: WeightEntry[];
  weightGoal?: WeightGoal | null;
  seriesEndIso: string;
  buildSeries: (days: number) => import("@/lib/analytics/series").DaySeriesPoint[];
  calorieConsistencyPct: number | null;
  todayBudgetKcal: number | null;
  refresh: () => void;
};

type MainTab = "dnevnik" | "analitika";

function IstorijaMainTabs({
  value,
  onChange,
}: {
  value: MainTab;
  onChange: (tab: MainTab) => void;
}) {
  const { t } = useLocale();
  return (
    <div
      className="inline-flex gap-1.5 rounded-[var(--rounded-lg)] border border-hairline-soft bg-surface/60 p-1"
      role="tablist"
      aria-label={t("history.title")}
    >
      {(["dnevnik", "analitika"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={value === tab}
          onClick={() => onChange(tab)}
          className={cn(
            "min-h-8 rounded-[var(--rounded-md)] px-3 font-label-mono text-[11px] transition-colors duration-200 lg:min-h-10 lg:px-5 lg:text-[13px]",
            value === tab
              ? "bg-mint text-on-primary shadow-sm"
              : "text-charcoal hover:bg-surface hover:text-link-hover",
          )}
        >
          {tab === "dnevnik" ? t("history.tab.journal") : t("history.tab.analytics")}
        </button>
      ))}
    </div>
  );
}

function IstorijaTopBar({
  mainTab,
  onTabChange,
}: {
  mainTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-start justify-end gap-4 lg:justify-between">
      <div className="hidden min-w-0 flex-1 lg:block">
        <PageHeader
          title={t("history.title")}
          kicker={t("history.kicker")}
          description={t("history.description")}
        />
      </div>
      <div className="shrink-0 lg:pt-1">
        <IstorijaMainTabs value={mainTab} onChange={onTabChange} />
      </div>
    </div>
  );
}

function DayDetail({
  active,
  budgetKcal,
  weightGoal,
  weights,
  refresh,
}: {
  active: DailyLog;
  budgetKcal?: number | null;
  weightGoal?: WeightGoal | null;
  weights: WeightEntry[];
  refresh: () => void;
}) {
  const { clearChatForDate } = useJournalChat();
  const { t } = useLocale();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [active.date]);

  async function handleDeleteDay() {
    if (!user) return;
    await deleteDailyLog(user.id, active.date);
    clearChatForDate(active.date);
    refresh();
    setEditing(false);
  }

  if (editing) {
    return (
      <DayEditor
        log={active}
        onSaved={() => {
          refresh();
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        onDeleteDay={handleDeleteDay}
      />
    );
  }

  return (
    <div className="w-full space-y-5 lg:space-y-8">
      <DaySummaryHeader
        log={active}
        budgetKcal={budgetKcal}
        weightGoal={weightGoal}
        weights={weights}
      />
      <DayFoodByMeals rows={active.foodItems} />
      <div className="grid w-full gap-6 sm:grid-cols-2">
        <DayCardioList cardio={active.cardioSessions} />
        <DayStrengthList blocks={active.strengthBlocks} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-hairline pt-5 lg:gap-3 lg:pt-8">
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          {t("history.editDay")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-red-700"
          onClick={() => {
            if (window.confirm(t("history.deleteDayConfirm", { date: active.date }))) {
              void handleDeleteDay();
            }
          }}
        >
          {t("history.deleteDay")}
        </Button>
      </div>
    </div>
  );
}

export function IstorijaView({
  logs,
  weights,
  weightGoal,
  seriesEndIso,
  buildSeries,
  calorieConsistencyPct,
  todayBudgetKcal,
  refresh,
}: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>(() =>
    searchParams.get("tab") === "analitika" ? "analitika" : "dnevnik",
  );
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "analitika") setMainTab("analitika");
    else if (tab === "dnevnik" || tab == null) setMainTab("dnevnik");
  }, [searchParams]);

  function selectMainTab(tab: MainTab) {
    setMainTab(tab);
    router.replace(tab === "analitika" ? "/istorija?tab=analitika" : "/istorija", {
      scroll: false,
    });
  }

  const nonempty = useMemo(
    () =>
      [...logs]
        .filter(
          (l) =>
            (l.foodItems?.length ?? 0) > 0 ||
            (l.cardioSessions?.length ?? 0) > 0 ||
            (l.strengthBlocks?.length ?? 0) > 0,
        )
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [logs],
  );

  const filteredRows = useMemo(
    () => [...nonempty].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [nonempty],
  );

  const [focus, setFocus] = useState<string | null>(null);
  const [contentSpin, setContentSpin] = useState<1 | -1>(1);

  const active = filteredRows.find((l) => l.date === focus) ?? filteredRows.at(-1) ?? null;
  const targetKcal = active
    ? (weightGoal ? dailyIntakeBudgetKcal(weightGoal, active.date) : null) ?? undefined
    : undefined;

  function selectDay(date: string) {
    const nextIdx = filteredRows.findIndex((l) => l.date === date);
    const currentDate = focus ?? active?.date;
    const curIdx = currentDate
      ? filteredRows.findIndex((l) => l.date === currentDate)
      : -1;
    if (nextIdx >= 0 && curIdx >= 0 && nextIdx !== curIdx) {
      setContentSpin(nextIdx > curIdx ? 1 : -1);
    }
    setFocus(date);
  }

  const topBar = <IstorijaTopBar mainTab={mainTab} onTabChange={selectMainTab} />;

  if (mainTab === "analitika") {
    return (
      <div className="space-y-6 lg:space-y-8">
        {topBar}
        <AnalitikaView
          embedded
          logs={logs}
          seriesEndIso={seriesEndIso}
          buildSeries={buildSeries}
          weightGoal={weightGoal ?? null}
          calorieConsistencyPct={calorieConsistencyPct}
          todayBudgetKcal={todayBudgetKcal}
        />
      </div>
    );
  }

  if (!nonempty.length) {
    return (
      <div className="space-y-6">
        {topBar}
        <AnalyticsEmptyState
          title={t("history.emptyTitle")}
          description={t("history.emptyDesc")}
          actionHref="/unos"
          actionLabel={t("history.emptyAction")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      {topBar}

      <DateStripCarousel
        rows={filteredRows}
        activeDate={active?.date}
        onSelect={selectDay}
        onSpinDirection={setContentSpin}
      />

      <div className="min-w-0">
        {active ? (
          <div
            key={active.date}
            data-spin={contentSpin}
            className="day-detail-panel"
          >
            <DayDetail
              key={`${active.date}-view`}
              active={active}
              budgetKcal={targetKcal}
              weightGoal={weightGoal}
              weights={weights}
              refresh={refresh}
            />
          </div>
        ) : (
          <p className="py-20 text-center text-mute">{t("history.noRecords")}</p>
        )}
      </div>
    </div>
  );
}
