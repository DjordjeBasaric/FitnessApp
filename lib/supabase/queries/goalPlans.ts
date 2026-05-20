"use client";

import type { GoalPlan } from "@/lib/schemas/goalPlan";
import { goalPlanSchema } from "@/lib/schemas/goalPlan";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["goal_plans"]["Row"];

const PROGRAM_TYPES = [
  "mršavljenje",
  "održavanje_težine",
  "nabacivanje_mišića",
  "rekompozicija",
] as const;

function rowToPlan(row: Row): GoalPlan {
  return goalPlanSchema.parse({
    id: row.id,
    name: row.name,
    programType: (PROGRAM_TYPES as readonly string[]).includes(row.program_type)
      ? row.program_type
      : "održavanje_težine",
    startDate: row.start_date ?? undefined,
    targetDailyKcal: row.target_daily_kcal ?? undefined,
    targetProteinG: row.target_protein_g != null ? Number(row.target_protein_g) : undefined,
    targetCarbsG: row.target_carbs_g != null ? Number(row.target_carbs_g) : undefined,
    targetFatG: row.target_fat_g != null ? Number(row.target_fat_g) : undefined,
    targetWeeklyWeightDeltaKg:
      row.target_weekly_weight_delta_kg != null
        ? Number(row.target_weekly_weight_delta_kg)
        : undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  });
}

export async function listGoalPlans(userId: string): Promise<GoalPlan[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("goal_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToPlan);
}

export async function getActivePlan(userId: string): Promise<GoalPlan | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("goal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPlan(data) : null;
}

export async function upsertGoalPlan(userId: string, plan: GoalPlan): Promise<GoalPlan> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("goal_plans")
    .upsert({
      id: plan.id,
      user_id: userId,
      name: plan.name,
      program_type: plan.programType,
      start_date: plan.startDate ?? null,
      target_daily_kcal: plan.targetDailyKcal ?? null,
      target_protein_g: plan.targetProteinG ?? null,
      target_carbs_g: plan.targetCarbsG ?? null,
      target_fat_g: plan.targetFatG ?? null,
      target_weekly_weight_delta_kg: plan.targetWeeklyWeightDeltaKg ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToPlan(data);
}

export async function setActivePlanId(
  userId: string,
  planId: string | null,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error: deactivateErr } = await supabase
    .from("goal_plans")
    .update({ is_active: false })
    .eq("user_id", userId);
  if (deactivateErr) throw deactivateErr;
  if (planId) {
    const { error } = await supabase
      .from("goal_plans")
      .update({ is_active: true })
      .eq("user_id", userId)
      .eq("id", planId);
    if (error) throw error;
  }
}

export async function deleteGoalPlan(userId: string, id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("goal_plans")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
