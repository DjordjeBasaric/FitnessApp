import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-side Supabase klijent koji čita/piše Next.js cookies.
 * Koristi se u route handlerima i server komponentama.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Nedostaje NEXT_PUBLIC_SUPABASE_URL ili NEXT_PUBLIC_SUPABASE_ANON_KEY u .env.local",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server komponenta — set se može pozvati samo iz Server Action ili route handlera.
          // Middleware refresh-uje cookies, pa je ovaj fallback bezbjedan.
        }
      },
    },
  });
}

/**
 * Service-role klijent — koristi ga isključivo za interne RPC pozive
 * koji moraju da zaobiđu RLS (npr. migracija Dexie podataka). NIKAD na klijentu.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Nedostaje NEXT_PUBLIC_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY u .env.local",
    );
  }
  // Service role ne koristi cookies — direktan klijent.
  return createServerClient<Database>(url, serviceRole, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/** Pomoć: učitaj autenticiranog korisnika ili null. */
export async function getAuthenticatedUserOrNull() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
