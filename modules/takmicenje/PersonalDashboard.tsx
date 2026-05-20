"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame, Target, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDaysToIso, isoDateFromLocal } from "@/lib/date";
import { useAuth } from "@/lib/supabase/AuthContext";
import { listRecentScores } from "@/lib/supabase/queries/scores";
import { caloriePrecisionPoints } from "@/lib/scoring/caloriePrecision";
import { computeStreakFromLogs } from "@/lib/scoring/streak";
import { healthyPointsFromLog } from "@/lib/scoring/healthyPoints";
import { useFitnessState } from "@/hooks/useFitnessState";
import { dailyIntakeBudgetKcal } from "@/lib/analytics/weightGoal";
import { sumFoodItems } from "@/lib/nutrition/meals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RANGE_DAYS = 14;

export function PersonalDashboard() {
  const { user } = useAuth();
  const fs = useFitnessState();
  const userId = user?.id;
  const today = isoDateFromLocal();

  const scoresQ = useQuery({
    queryKey: ["scores", userId, "recent", RANGE_DAYS],
    queryFn: () => listRecentScores(userId!, RANGE_DAYS),
    enabled: !!userId,
  });

  const todayLog = fs.logs.find((l) => l.date === today);
  const budget = fs.weightGoal ? dailyIntakeBudgetKcal(fs.weightGoal, today) : null;
  const totals = todayLog ? sumFoodItems(todayLog.foodItems) : null;

  const calPoints =
    budget != null && totals != null ? caloriePrecisionPoints(totals.kcal, budget) : 0;
  const healthy = healthyPointsFromLog(todayLog);
  const todayTotal = calPoints + healthy.total;

  const localStreak = computeStreakFromLogs(fs.logs, today);
  const liveStreak =
    scoresQ.data?.find((s) => s.date === today)?.current_streak ?? localStreak;
  const longest = scoresQ.data
    ? scoresQ.data.reduce((m, s) => Math.max(m, s.current_streak ?? 0), liveStreak)
    : liveStreak;

  const trendPoints: { date: string; total: number }[] = [];
  {
    const byDate = new Map((scoresQ.data ?? []).map((s) => [s.date, s]));
    for (let i = RANGE_DAYS - 1; i >= 0; i--) {
      const d = addDaysToIso(today, -i);
      const s = byDate.get(d);
      trendPoints.push({ date: d.slice(5), total: s?.total_points ?? 0 });
    }
  }
  const trend = trendPoints;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-5 text-mint" aria-hidden />
              Strik
            </CardTitle>
            <CardDescription>Uzastopni dani sa potpunim dnevnikom</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display-xl tabular-nums text-ink">{liveStreak}</p>
            <p className="font-caption-sm mt-1 text-mute">Najduži: {longest}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-5 text-mint" aria-hidden />
              Preciznost danas
            </CardTitle>
            <CardDescription>±100 kcal = 10, ±200 = 5, ±300 = 2</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display-xl tabular-nums text-ink">
              {calPoints}
              <span className="ml-1 font-caption-sm text-mute">/ 10</span>
            </p>
            {budget != null && totals != null ? (
              <p className="font-caption-sm mt-1 text-mute tabular-nums">
                {Math.round(totals.kcal)} / {budget} kcal
              </p>
            ) : (
              <p className="font-caption-sm mt-1 text-mute">Postavi cilj težine za skor</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-5 text-mint" aria-hidden />
              Današnji ukupno
            </CardTitle>
            <CardDescription>Preciznost + zdravi poeni</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display-xl tabular-nums text-mint">{todayTotal}</p>
            <p className="font-caption-sm mt-1 text-mute">
              {calPoints} preciznost + {healthy.total} zdravlje
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Razlaz današnjih zdravih poena</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <PointRow
              label="Protein cilj (≥95%)"
              hit={healthy.proteinGoalHit}
              points={healthy.proteinPoints}
              max={5}
            />
            <PointRow
              label="Vlakna ≥25g"
              hit={healthy.fiberPoints > 0}
              points={healthy.fiberPoints}
              max={3}
            />
            <PointRow
              label="Trening (kardio ili snaga)"
              hit={healthy.trainingPoints > 0}
              points={healthy.trainingPoints}
              max={5}
            />
            <PointRow
              label="4+ različita obroka"
              hit={healthy.varietyPoints > 0}
              points={healthy.varietyPoints}
              max={3}
            />
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend bodova (14 dana)</CardTitle>
          <CardDescription>
            Ukupan dnevni skor (preciznost + zdravlje)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 30]} />
                <Tooltip
                  formatter={(value) => [Number(value), "bodovi"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill="var(--mint, #2d9d8a)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PointRow({
  label,
  hit,
  points,
  max,
}: {
  label: string;
  hit: boolean;
  points: number;
  max: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className={hit ? "text-ink" : "text-mute"}>{label}</span>
      <span className={`tabular-nums ${hit ? "text-mint" : "text-mute"}`}>
        {points} / {max}
      </span>
    </li>
  );
}
