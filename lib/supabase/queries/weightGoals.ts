"use client";

import type { WeightGoal } from "@/lib/schemas/weightGoal";
import { weightGoalSchema } from "@/lib/schemas/weightGoal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["weight_goals"]["Row"];

const ACTIVITY_VALUES = [
  "sedentaran",
  "lagan",
  "umjeren",
  "aktivan",
  "vrlo_aktivan",
] as const;
const SEX_VALUES = ["muski", "zenski"] as const;

function rowToGoal(row: Row): WeightGoal {
  return weightGoalSchema.parse({
    startDate: row.start_date,
    endDate: row.end_date,
    startKg: Number(row.start_kg),
    targetKg: Number(row.target_kg),
    sex: (row.sex && (SEX_VALUES as readonly string[]).includes(row.sex)
      ? row.sex
      : undefined) as WeightGoal["sex"],
    ageYears: row.age_years ?? undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    activityLevel: (row.activity_level &&
    (ACTIVITY_VALUES as readonly string[]).includes(row.activity_level)
      ? row.activity_level
      : undefined) as WeightGoal["activityLevel"],
  });
}

export async function getWeightGoal(userId: string): Promise<WeightGoal | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("weight_goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGoal(data) : null;
}

export async function setWeightGoal(
  userId: string,
  goal: WeightGoal | null,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!goal) {
    const { error } = await supabase.from("weight_goals").delete().eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("weight_goals").upsert({
    user_id: userId,
    start_date: goal.startDate,
    end_date: goal.endDate,
    start_kg: goal.startKg,
    target_kg: goal.targetKg,
    sex: goal.sex ?? null,
    age_years: goal.ageYears ?? null,
    height_cm: goal.heightCm ?? null,
    activity_level: goal.activityLevel ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
