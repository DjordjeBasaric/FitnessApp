"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type DailyScore = Database["public"]["Tables"]["daily_scores"]["Row"];

export async function getDailyScore(
  userId: string,
  date: string,
): Promise<DailyScore | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("daily_scores")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listRecentScores(
  userId: string,
  days = 14,
): Promise<DailyScore[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("daily_scores")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(days);
  if (error) throw error;
  return (data ?? []).slice().reverse();
}

export async function recomputeScoreForDate(
  userId: string,
  date: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("recompute_daily_score", {
    p_user_id: userId,
    p_date: date,
  });
  if (error) throw error;
}

export type LeaderboardEntry = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  currentStreak: number;
  daysCounted: number;
};

/**
 * Sedmični/mjesečni leaderboard: prijatelji + ja.
 * Suma `total_points` u zadanom datumskom opsegu (uključivo).
 */
export async function getFriendsLeaderboard(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseBrowserClient();

  const { data: friendships, error: fErr } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (fErr) throw fErr;

  const friendIds = (friendships ?? []).map((f) =>
    f.user_a === userId ? f.user_b : f.user_a,
  );
  const ids = Array.from(new Set([userId, ...friendIds]));

  const [{ data: scores, error: sErr }, { data: profiles, error: pErr }] =
    await Promise.all([
      supabase
        .from("daily_scores")
        .select("user_id, total_points, current_streak, date")
        .in("user_id", ids)
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from("profiles")
        .select("*")
        .in("id", ids),
    ]);
  if (sErr) throw sErr;
  if (pErr) throw pErr;

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const agg = new Map<
    string,
    { totalPoints: number; daysCounted: number; latestStreak: number; latestDate: string }
  >();

  for (const row of scores ?? []) {
    const prev = agg.get(row.user_id) ?? {
      totalPoints: 0,
      daysCounted: 0,
      latestStreak: 0,
      latestDate: "0000-00-00",
    };
    prev.totalPoints += row.total_points ?? 0;
    prev.daysCounted += 1;
    if ((row.date as string) > prev.latestDate) {
      prev.latestDate = row.date as string;
      prev.latestStreak = row.current_streak ?? 0;
    }
    agg.set(row.user_id, prev);
  }

  const entries: LeaderboardEntry[] = ids.map((id) => {
    const p = profileById.get(id);
    const a = agg.get(id);
    return {
      userId: id,
      username: p?.username ?? "user",
      displayName: p?.display_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      totalPoints: a?.totalPoints ?? 0,
      currentStreak: a?.latestStreak ?? 0,
      daysCounted: a?.daysCounted ?? 0,
    };
  });

  entries.sort((a, b) => b.totalPoints - a.totalPoints || b.currentStreak - a.currentStreak);
  return entries;
}
