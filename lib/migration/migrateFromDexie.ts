"use client";

import { upsertDailyLog } from "@/lib/supabase/queries/dailyLogs";
import { upsertWeightEntry } from "@/lib/supabase/queries/weightEntries";
import { upsertGoalPlan, setActivePlanId } from "@/lib/supabase/queries/goalPlans";
import { setUserContext } from "@/lib/supabase/queries/userContext";
import { setWeightGoal } from "@/lib/supabase/queries/weightGoals";
import {
  deleteDexieDatabase,
  detectDexieSnapshot,
  type DexieSnapshot,
} from "./dexieSnapshot";

export type MigrationProgress = {
  total: number;
  done: number;
  step: string;
};

export type MigrationResult = {
  uploaded: {
    dailyLogs: number;
    weightEntries: number;
    goalPlans: number;
    weightGoal: number;
    userContext: number;
  };
  errors: string[];
};

const STATE_KEY = "fait:dexieMigration:v1";

export type MigrationState =
  | { status: "pending" }
  | { status: "dismissed" }
  | { status: "completed"; at: number };

export function readMigrationState(): MigrationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MigrationState;
  } catch {
    return null;
  }
}

export function writeMigrationState(state: MigrationState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export async function findMigrationCandidate(): Promise<DexieSnapshot | null> {
  const state = readMigrationState();
  if (state?.status === "completed" || state?.status === "dismissed") return null;
  return detectDexieSnapshot();
}

export async function runMigration(
  userId: string,
  snapshot: DexieSnapshot,
  onProgress?: (p: MigrationProgress) => void,
): Promise<MigrationResult> {
  const total =
    snapshot.dailyLogs.length +
    snapshot.weightEntries.length +
    snapshot.goalPlans.length +
    (snapshot.weightGoal ? 1 : 0) +
    (snapshot.userContext ? 1 : 0);

  const result: MigrationResult = {
    uploaded: {
      dailyLogs: 0,
      weightEntries: 0,
      goalPlans: 0,
      weightGoal: 0,
      userContext: 0,
    },
    errors: [],
  };

  let done = 0;
  const report = (step: string) => onProgress?.({ total, done, step });

  if (snapshot.userContext) {
    try {
      await setUserContext(userId, snapshot.userContext);
      result.uploaded.userContext = 1;
    } catch (e) {
      result.errors.push(`user_context: ${asMsg(e)}`);
    }
    done += 1;
    report("profil");
  }

  if (snapshot.weightGoal) {
    try {
      await setWeightGoal(userId, snapshot.weightGoal);
      result.uploaded.weightGoal = 1;
    } catch (e) {
      result.errors.push(`weight_goal: ${asMsg(e)}`);
    }
    done += 1;
    report("cilj");
  }

  for (const plan of snapshot.goalPlans) {
    try {
      await upsertGoalPlan(userId, plan);
      result.uploaded.goalPlans += 1;
    } catch (e) {
      result.errors.push(`goal_plan ${plan.id}: ${asMsg(e)}`);
    }
    done += 1;
    report("planovi");
  }
  if (snapshot.activePlanId) {
    try {
      await setActivePlanId(userId, snapshot.activePlanId);
    } catch (e) {
      result.errors.push(`active_plan: ${asMsg(e)}`);
    }
  }

  for (const log of snapshot.dailyLogs) {
    try {
      await upsertDailyLog(userId, log);
      result.uploaded.dailyLogs += 1;
    } catch (e) {
      result.errors.push(`daily_log ${log.date}: ${asMsg(e)}`);
    }
    done += 1;
    report("dnevnik");
  }

  for (const entry of snapshot.weightEntries) {
    try {
      await upsertWeightEntry(userId, entry);
      result.uploaded.weightEntries += 1;
    } catch (e) {
      result.errors.push(`weight ${entry.date}: ${asMsg(e)}`);
    }
    done += 1;
    report("težine");
  }

  if (!result.errors.length) {
    await deleteDexieDatabase();
    writeMigrationState({ status: "completed", at: Date.now() });
  }

  report("gotovo");
  return result;
}

function asMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
