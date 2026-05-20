"use client";

import type { DailyLog } from "@/lib/schemas/dailyLog";
import { dailyLogSchema } from "@/lib/schemas/dailyLog";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["daily_logs"]["Row"];

function rowToLog(row: Row): DailyLog {
  return dailyLogSchema.parse({
    date: row.date,
    foodItems: Array.isArray(row.food_items) ? row.food_items : [],
    cardioSessions: Array.isArray(row.cardio_sessions) ? row.cardio_sessions : [],
    strengthBlocks: Array.isArray(row.strength_blocks) ? row.strength_blocks : [],
    dayNote: row.day_note ?? undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  });
}

export async function listDailyLogs(userId: string): Promise<DailyLog[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToLog);
}

export async function getDailyLog(
  userId: string,
  date: string,
): Promise<DailyLog | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToLog(data) : null;
}

export async function upsertDailyLog(userId: string, log: DailyLog): Promise<DailyLog> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .upsert({
      user_id: userId,
      date: log.date,
      food_items: log.foodItems as unknown as Database["public"]["Tables"]["daily_logs"]["Insert"]["food_items"],
      cardio_sessions: log.cardioSessions as unknown as Database["public"]["Tables"]["daily_logs"]["Insert"]["cardio_sessions"],
      strength_blocks: log.strengthBlocks as unknown as Database["public"]["Tables"]["daily_logs"]["Insert"]["strength_blocks"],
      day_note: log.dayNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  // Asinhrono prekompozituje skor — ne blokiramo UI ako RPC zaškripi.
  void supabase
    .rpc("recompute_daily_score", { p_user_id: userId, p_date: log.date })
    .then(({ error: rpcErr }) => {
      if (rpcErr) {
        if (typeof window !== "undefined") {
          console.warn("recompute_daily_score:", rpcErr.message);
        }
      }
    });

  return rowToLog(data);
}

export async function deleteDailyLog(userId: string, date: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("daily_logs")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
  if (error) throw error;

  void supabase
    .rpc("recompute_daily_score", { p_user_id: userId, p_date: date })
    .then(({ error: rpcErr }) => {
      if (rpcErr && typeof window !== "undefined") {
        console.warn("recompute_daily_score (delete):", rpcErr.message);
      }
    });
}
