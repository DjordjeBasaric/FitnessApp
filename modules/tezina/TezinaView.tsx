"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import {
  weightGoalSchema,
  type ActivityLevel,
  type WeightGoal,
} from "@/lib/schemas/weightGoal";
import { assessWeightGoal } from "@/lib/analytics/weightGoal";
import { activityLabelKey } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { setWeightGoal } from "@/lib/supabase/queries/weightGoals";
import { upsertWeightEntry } from "@/lib/supabase/queries/weightEntries";
import { useAuth } from "@/lib/supabase/AuthContext";
import { newDailyItemId } from "@/lib/dailyLog/helpers";
import { formatLongDate, isoDateFromLocal } from "@/lib/date";

import { PageHeader } from "@/components/layout/PageHeader";
import { WeightLineChart } from "@/components/ChartsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  weightGoal: WeightGoal | null;
  weights: WeightEntry[];
  refresh: () => void;
  onGoalSaved: (g: WeightGoal | null) => void;
};

function GoalAssessmentBlock({
  assessment,
}: {
  assessment: ReturnType<typeof assessWeightGoal>;
}) {
  const { t } = useLocale();
  const delta =
    assessment.totalDeltaKg > 0
      ? `+${assessment.totalDeltaKg.toFixed(1)}`
      : assessment.totalDeltaKg.toFixed(1);
  const weekly =
    assessment.weeklyDeltaKg > 0
      ? `+${assessment.weeklyDeltaKg.toFixed(2)}`
      : assessment.weeklyDeltaKg.toFixed(2);

  return (
    <div
      className={cn(
        "rounded-[var(--rounded-md)] border px-4 py-3 text-sm",
        assessment.feasible
          ? "border-mint-border bg-surface text-charcoal"
          : "border-purple/40 bg-purple/10 text-ink",
      )}
    >
      <p className="tabular-nums">
        {t("goal.change", {
          delta,
          days: assessment.totalDays,
          weekly,
        })}
      </p>
      {assessment.avgDailyDeficitKcal != null ? (
        <p className="mt-1 tabular-nums text-mute">
          {t("goal.deficit", { kcal: Math.round(assessment.avgDailyDeficitKcal) })}
        </p>
      ) : null}
      {assessment.estimatedMaintenanceKcal != null ? (
        <p className="mt-2 tabular-nums text-mute">
          {t("goal.tdee", { kcal: assessment.estimatedMaintenanceKcal })}
        </p>
      ) : null}
      {assessment.suggestedDailyLimitKcal != null ? (
        <p className="mt-2 font-medium tabular-nums text-mint">
          {t("goal.limit", { kcal: assessment.suggestedDailyLimitKcal })}
        </p>
      ) : null}
      {assessment.warningSr ? (
        <p className={cn("mt-2 font-medium", !assessment.feasible && "text-purple")}>
          {assessment.warningSr}
        </p>
      ) : null}
      {assessment.limitNoteSr ? (
        <p className="mt-2 text-mute">{assessment.limitNoteSr}</p>
      ) : null}
    </div>
  );
}

export function TezinaView({ weightGoal, weights, refresh, onGoalSaved }: Props) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantEdit = searchParams.get("edit") === "1";

  const today = isoDateFromLocal();
  const [editing, setEditing] = useState(!weightGoal);
  const [startDate, setStartDate] = useState(weightGoal?.startDate ?? today);
  const [endDate, setEndDate] = useState(weightGoal?.endDate ?? today);
  const [startKg, setStartKg] = useState(String(weightGoal?.startKg ?? ""));
  const [targetKg, setTargetKg] = useState(String(weightGoal?.targetKg ?? ""));
  const [sex, setSex] = useState<"muski" | "zenski" | "">(weightGoal?.sex ?? "");
  const [ageYears, setAgeYears] = useState(
    weightGoal?.ageYears != null ? String(weightGoal.ageYears) : "",
  );
  const [heightCm, setHeightCm] = useState(
    weightGoal?.heightCm != null ? String(weightGoal.heightCm) : "",
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(
    weightGoal?.activityLevel ?? "lagan",
  );
  const [logDate, setLogDate] = useState(today);
  const [logKg, setLogKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function loadGoalIntoForm(g: WeightGoal) {
    setStartDate(g.startDate);
    setEndDate(g.endDate);
    setStartKg(String(g.startKg));
    setTargetKg(String(g.targetKg));
    setSex(g.sex ?? "");
    setAgeYears(g.ageYears != null ? String(g.ageYears) : "");
    setHeightCm(g.heightCm != null ? String(g.heightCm) : "");
    setActivityLevel(g.activityLevel ?? "lagan");
  }

  useEffect(() => {
    if (wantEdit) {
      if (weightGoal) loadGoalIntoForm(weightGoal);
      setEditing(true);
      return;
    }
    if (!weightGoal) {
      setEditing(true);
    } else {
      setEditing(false);
    }
  }, [wantEdit, weightGoal]);

  const draft: WeightGoal | null = (() => {
    const parsed = weightGoalSchema.safeParse({
      startDate,
      endDate,
      startKg: Number(startKg),
      targetKg: Number(targetKg),
      sex: sex || undefined,
      ageYears: ageYears.trim() ? Number(ageYears) : undefined,
      heightCm: heightCm.trim() ? Number(heightCm) : undefined,
      activityLevel: activityLevel || undefined,
    });
    return parsed.success ? parsed.data : null;
  })();

  const draftAssessment = draft ? assessWeightGoal(draft, locale) : null;
  const savedAssessment = weightGoal ? assessWeightGoal(weightGoal, locale) : null;
  const showForm = !weightGoal || editing;

  function resetFormEmpty() {
    setStartDate(today);
    setEndDate(today);
    setStartKg("");
    setTargetKg("");
    setSex("");
    setAgeYears("");
    setHeightCm("");
    setActivityLevel("lagan");
  }

  async function saveGoal() {
    if (!draft) {
      setMsg(t("goal.invalid"));
      return;
    }
    if (!user) {
      setMsg("Niste prijavljeni.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await setWeightGoal(user.id, draft);
      onGoalSaved(draft);
      setEditing(false);
      setMsg(t("goal.saved"));
      router.replace("/tezina");
    } catch {
      setMsg(t("goal.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function clearGoal() {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      await setWeightGoal(user.id, null);
      onGoalSaved(null);
      setEditing(true);
      resetFormEmpty();
      setMsg(t("goal.removed"));
      router.replace("/tezina");
    } catch {
      setMsg(t("goal.removeError"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (weightGoal) loadGoalIntoForm(weightGoal);
    setEditing(true);
    setMsg(null);
    router.replace("/tezina?edit=1");
  }

  function cancelEdit() {
    setEditing(false);
    setMsg(null);
    router.replace("/tezina");
  }

  async function addWeight() {
    const kg = Number(logKg);
    if (!Number.isFinite(kg) || kg <= 0) {
      setMsg(t("goal.invalidWeight"));
      return;
    }
    if (!user) {
      setMsg("Niste prijavljeni.");
      return;
    }
    await upsertWeightEntry(user.id, {
      id: newDailyItemId(),
      date: logDate,
      kg,
      createdAt: Date.now(),
    });
    setLogKg("");
    refresh();
    setMsg(t("goal.weightLogged"));
  }

  const chartRows = weights.map((w) => ({ date: w.date.slice(5), kg: w.kg }));
  const activityLevels = [
    "sedentaran",
    "lagan",
    "umjeren",
    "aktivan",
    "vrlo_aktivan",
  ] as const;

  return (
    <div className="space-y-8 lg:space-y-12">
      <PageHeader
        title={t("goal.title")}
        kicker={t("goal.kicker")}
        description={t("goal.description")}
      />

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{weightGoal ? t("goal.editTitle") : t("goal.newTitle")}</CardTitle>
            <CardDescription>
              {t("goal.periodHint", { start: startDate, end: endDate })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t("goal.start")}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("goal.end")}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startKg">{t("goal.startKg")}</Label>
                <Input
                  id="startKg"
                  inputMode="decimal"
                  value={startKg}
                  onChange={(e) => setStartKg(e.target.value)}
                  placeholder="95"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetKg">{t("goal.targetKg")}</Label>
                <Input
                  id="targetKg"
                  inputMode="decimal"
                  value={targetKg}
                  onChange={(e) => setTargetKg(e.target.value)}
                  placeholder="85"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">{t("goal.sex")}</Label>
                <select
                  id="sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as "muski" | "zenski" | "")}
                  className="w-full rounded-[var(--rounded-xs)] border border-hairline bg-surface px-3 py-2 text-ink"
                >
                  <option value="">—</option>
                  <option value="muski">{t("goal.sexMale")}</option>
                  <option value="zenski">{t("goal.sexFemale")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">{t("goal.age")}</Label>
                <Input
                  id="age"
                  inputMode="numeric"
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value)}
                  placeholder="32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">{t("goal.height")}</Label>
                <Input
                  id="height"
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity">{t("goal.activity")}</Label>
                <select
                  id="activity"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full rounded-[var(--rounded-xs)] border border-hairline bg-surface px-3 py-2 text-ink"
                >
                  {activityLevels.map((k) => (
                    <option key={k} value={k}>
                      {t(activityLabelKey(k))}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {draftAssessment ? <GoalAssessmentBlock assessment={draftAssessment} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={saving} onClick={() => void saveGoal()}>
                {t("goal.save")}
              </Button>
              {weightGoal && editing ? (
                <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit}>
                  {t("common.cancel")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : weightGoal && savedAssessment ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("goal.activeTitle")}</CardTitle>
            <CardDescription>
              {formatLongDate(weightGoal.startDate)} — {formatLongDate(weightGoal.endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="font-caption-sm text-mute">{t("goal.currentToTarget")}</dt>
                <dd className="mt-1 text-xl font-medium tabular-nums text-ink">
                  {weightGoal.startKg} kg → {weightGoal.targetKg} kg
                </dd>
              </div>
              <div>
                <dt className="font-caption-sm text-mute">{t("goal.period")}</dt>
                <dd className="mt-1 tabular-nums text-ink">
                  {weightGoal.startDate} — {weightGoal.endDate}
                </dd>
              </div>
              <div>
                <dt className="font-caption-sm text-mute">{t("goal.activity")}</dt>
                <dd className="mt-1 text-ink">
                  {t(activityLabelKey(weightGoal.activityLevel ?? "lagan"))}
                </dd>
              </div>
              {(weightGoal.sex || weightGoal.ageYears || weightGoal.heightCm) && (
                <div className="sm:col-span-2">
                  <dt className="font-caption-sm text-mute">{t("goal.profile")}</dt>
                  <dd className="mt-1 text-ink">
                    {weightGoal.sex === "muski"
                      ? t("goal.sexMale")
                      : weightGoal.sex === "zenski"
                        ? t("goal.sexFemale")
                        : "—"}
                    {weightGoal.ageYears != null
                      ? ` · ${weightGoal.ageYears} ${t("goal.years")}`
                      : ""}
                    {weightGoal.heightCm != null ? ` · ${weightGoal.heightCm} cm` : ""}
                  </dd>
                </div>
              )}
            </dl>

            <GoalAssessmentBlock assessment={savedAssessment} />

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={saving} onClick={startEdit}>
                {t("common.edit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void clearGoal()}
              >
                {t("goal.remove")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {msg ? <p className="text-sm text-mute">{msg}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("goal.weightLog")}</CardTitle>
          <CardDescription>{t("goal.weightLogDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="wdate">{t("common.date")}</Label>
              <Input
                id="wdate"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wkg">kg</Label>
              <Input
                id="wkg"
                inputMode="decimal"
                className="w-28"
                value={logKg}
                onChange={(e) => setLogKg(e.target.value)}
              />
            </div>
            <Button type="button" onClick={() => void addWeight()}>
              {t("common.add")}
            </Button>
          </div>
          <WeightLineChart rows={chartRows} />
        </CardContent>
      </Card>
    </div>
  );
}
