"use client";

import { defaultUserContext, type UserContext } from "@/lib/schemas/userContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["user_context"]["Row"];

const SEX_VALUES = ["muški", "ženski", "ne navodim"] as const;

function rowToContext(row: Row): UserContext {
  const sex = SEX_VALUES.includes(row.sex as (typeof SEX_VALUES)[number])
    ? (row.sex as UserContext["sex"])
    : undefined;
  return {
    id: "me",
    allergiesOrAvoid: row.allergies_or_avoid ?? undefined,
    dietaryNote: row.dietary_note ?? undefined,
    ageYears: row.age_years ?? undefined,
    sex,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    sportNote: row.sport_note ?? undefined,
  };
}

export async function getUserContext(userId: string): Promise<UserContext> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_context")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToContext(data) : { ...defaultUserContext };
}

export async function setUserContext(
  userId: string,
  ctx: Partial<UserContext>,
): Promise<UserContext> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_context")
    .upsert({
      user_id: userId,
      allergies_or_avoid: ctx.allergiesOrAvoid ?? null,
      dietary_note: ctx.dietaryNote ?? null,
      age_years: ctx.ageYears ?? null,
      sex: ctx.sex ?? null,
      height_cm: ctx.heightCm ?? null,
      sport_note: ctx.sportNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToContext(data);
}
