"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, Flame, Lock, ShieldCheck, Target, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { listRecentScores } from "@/lib/supabase/queries/scores";
import type { DailyScore } from "@/lib/supabase/queries/scores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress?: string;
};

function deriveAchievements(scores: DailyScore[]): Achievement[] {
  const sorted = scores.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const longestStreak = sorted.reduce((m, s) => Math.max(m, s.current_streak ?? 0), 0);
  const proteinHits = sorted.filter((s) => s.protein_goal_hit).length;
  const perfectDays = sorted.filter((s) => (s.calorie_precision_points ?? 0) === 10).length;

  const tail = sorted.slice(-7);
  const perfectWeek =
    tail.length === 7 && tail.every((s) => (s.calorie_precision_points ?? 0) === 10);

  const trainedDays = sorted.filter((s) => s.trained).length;

  return [
    {
      id: "first-day",
      title: "Prvi dan",
      description: "Prvi unos sa skorom.",
      icon: Zap,
      unlocked: sorted.length >= 1,
    },
    {
      id: "streak-7",
      title: "7-dnevni strik",
      description: "Sedam dana zaredom kompletan dnevnik.",
      icon: Flame,
      unlocked: longestStreak >= 7,
      progress: `${Math.min(longestStreak, 7)} / 7`,
    },
    {
      id: "streak-30",
      title: "Mjesec mira",
      description: "30 uzastopnih kvalifikovanih dana.",
      icon: ShieldCheck,
      unlocked: longestStreak >= 30,
      progress: `${Math.min(longestStreak, 30)} / 30`,
    },
    {
      id: "precision-week",
      title: "Snajper",
      description: "7 zaredom dana u ±100 kcal.",
      icon: Target,
      unlocked: perfectWeek,
      progress: `${perfectDays} ukupno`,
    },
    {
      id: "protein-30",
      title: "Protein hero",
      description: "30 dana pogođenog cilja proteina.",
      icon: Award,
      unlocked: proteinHits >= 30,
      progress: `${Math.min(proteinHits, 30)} / 30`,
    },
    {
      id: "trained-20",
      title: "Aktivni mjesec",
      description: "20 trening dana u zadnjih 30.",
      icon: Flame,
      unlocked: trainedDays >= 20,
      progress: `${Math.min(trainedDays, 20)} / 20`,
    },
  ];
}

export function AchievementBadges() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["scores", user?.id, "achievements"],
    queryFn: () => listRecentScores(user!.id, 90),
    enabled: !!user?.id,
  });

  const achievements = deriveAchievements(q.data ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Postignuća</CardTitle>
        <CardDescription>Otključavaju se automatski iz tvojih skorova.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => {
            const Icon = a.unlocked ? a.icon : Lock;
            return (
              <li
                key={a.id}
                className={`rounded-[var(--rounded-md)] border p-3 ${
                  a.unlocked
                    ? "border-mint bg-mint/5"
                    : "border-hairline-soft bg-canvas opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-full ${
                      a.unlocked ? "bg-mint text-on-primary" : "bg-mute/15 text-mute"
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{a.title}</p>
                    <p className="font-caption-sm text-mute">{a.description}</p>
                    {a.progress ? (
                      <p className="font-caption-sm mt-1 text-mute tabular-nums">
                        {a.progress}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
