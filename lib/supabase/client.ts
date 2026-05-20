"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cached: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Nedostaje NEXT_PUBLIC_SUPABASE_URL ili NEXT_PUBLIC_SUPABASE_ANON_KEY u .env.local",
    );
  }
  cached = createBrowserClient<Database>(url, anon);
  return cached;
}
