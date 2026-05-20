"use client";

import type { WeightEntry } from "@/lib/schemas/weightEntry";
import { weightEntrySchema } from "@/lib/schemas/weightEntry";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["weight_entries"]["Row"];

function rowToEntry(row: Row): WeightEntry {
  return weightEntrySchema.parse({
    id: row.id,
    date: row.date,
    kg: Number(row.kg),
    goalPlanId: row.goal_plan_id ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  });
}

export async function listWeightEntries(userId: string): Promise<WeightEntry[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

export async function upsertWeightEntry(
  userId: string,
  entry: WeightEntry,
): Promise<WeightEntry> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .upsert(
      {
        id: entry.id,
        user_id: userId,
        date: entry.date,
        kg: entry.kg,
        goal_plan_id: entry.goalPlanId ?? null,
      },
      { onConflict: "user_id,date" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function deleteWeightEntry(userId: string, id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("weight_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
