"use client";

/**
 * Read-only adapter za stari IndexedDB "FitnessAIJournal" Dexie store.
 * Postoji isključivo radi jednokratne migracije postojećih korisnika
 * u Supabase. Niko više ne pravi pisanje u Dexie.
 */

import { dailyLogSchema, type DailyLog } from "@/lib/schemas/dailyLog";
import { weightEntrySchema, type WeightEntry } from "@/lib/schemas/weightEntry";
import { goalPlanSchema, type GoalPlan } from "@/lib/schemas/goalPlan";
import { userContextSchema, type UserContext } from "@/lib/schemas/userContext";
import { weightGoalSchema, type WeightGoal } from "@/lib/schemas/weightGoal";

const DB_NAME = "FitnessAIJournal";
const WEIGHT_GOAL_KEY = "weightGoal:v1";
const ACTIVE_PLAN_KEY = "activePlanId";

export type DexieSnapshot = {
  dailyLogs: DailyLog[];
  weightEntries: WeightEntry[];
  goalPlans: GoalPlan[];
  activePlanId: string | null;
  userContext: UserContext | null;
  weightGoal: WeightGoal | null;
};

/**
 * Otvori postojeći IndexedDB bez pravljenja schema bump-a — verzija ostaje 1
 * (Dexie default). Vraća null ako baze nema.
 */
function openExistingDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = (event) => {
      // Ako stigne upgrade — baza ne postoji ili je nova. Prekini.
      const target = event.target as IDBOpenDBRequest;
      target.transaction?.abort();
      resolve(null);
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) {
      resolve([]);
      return;
    }
    try {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as T[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function readKey<T>(db: IDBDatabase, store: string, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) {
      resolve(null);
      return;
    }
    try {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result ?? null) as T | null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function detectDexieSnapshot(): Promise<DexieSnapshot | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openExistingDb();
  if (!db) return null;
  try {
    type SettingsRow = { key: string; value: string | null };
    const [logsRaw, weightsRaw, plansRaw, ctxRaw, weightGoalRow, activePlanRow] =
      await Promise.all([
        readAll<unknown>(db, "dailyLogs"),
        readAll<unknown>(db, "weightEntries"),
        readAll<unknown>(db, "goalPlans"),
        readAll<unknown>(db, "userContext"),
        readKey<SettingsRow>(db, "settings", WEIGHT_GOAL_KEY),
        readKey<SettingsRow>(db, "settings", ACTIVE_PLAN_KEY),
      ]);

    const dailyLogs = logsRaw
      .map((row) => dailyLogSchema.safeParse(row))
      .flatMap((r) => (r.success ? [r.data] : []));
    const weightEntries = weightsRaw
      .map((row) => weightEntrySchema.safeParse(row))
      .flatMap((r) => (r.success ? [r.data] : []));
    const goalPlans = plansRaw
      .map((row) => goalPlanSchema.safeParse(row))
      .flatMap((r) => (r.success ? [r.data] : []));
    const userContext =
      ctxRaw
        .map((row) => userContextSchema.safeParse(row))
        .flatMap((r) => (r.success ? [r.data] : []))[0] ?? null;

    let weightGoal: WeightGoal | null = null;
    if (weightGoalRow?.value) {
      try {
        const parsed = weightGoalSchema.safeParse(JSON.parse(weightGoalRow.value));
        if (parsed.success) weightGoal = parsed.data;
      } catch {
        /* ignore */
      }
    }

    const activePlanId = activePlanRow?.value ?? null;

    const empty =
      !dailyLogs.length &&
      !weightEntries.length &&
      !goalPlans.length &&
      !userContext &&
      !weightGoal;
    if (empty) return null;

    return {
      dailyLogs,
      weightEntries,
      goalPlans,
      activePlanId,
      userContext,
      weightGoal,
    };
  } finally {
    db.close();
  }
}

export async function deleteDexieDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
