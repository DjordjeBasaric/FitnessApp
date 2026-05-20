"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateUsername(
  userId: string,
  username: string,
): Promise<Profile> {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleaned.length < 3 || cleaned.length > 24) {
    throw new Error("Korisničko ime mora imati 3–24 znaka (slova, brojevi, _).");
  }
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ username: cleaned })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function searchProfiles(query: string, limit = 10): Promise<Profile[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `${q}%`)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
