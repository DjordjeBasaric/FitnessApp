import type { ReactNode } from "react";
import { JournalChatProvider } from "@/hooks/JournalChatContext";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { AuthProvider } from "@/lib/supabase/AuthContext";
import { DesktopShell } from "@/components/layout/DesktopShell";
import { MobileShell } from "@/components/layout/MobileShell";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { DexieMigrationBanner } from "@/components/migration/DexieMigrationBanner";
import { getAuthenticatedUserOrNull } from "@/lib/supabase/server";

/**
 * Server komponenta — preuzima auth user iz cookies-a i prosljeđuje
 * provajderima. Klijentski providers (`AuthProvider`, `QueryProvider`,
 * `LocaleProvider`, `JournalChatProvider`) idu unutar.
 */
export async function FitnessShell({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUserOrNull();
  return (
    <AuthProvider initialUser={user}>
      <QueryProvider>
        <LocaleProvider>
          <JournalChatProvider>
            <DesktopShell>
              <DexieMigrationBanner />
              {children}
            </DesktopShell>
            <MobileShell>
              <DexieMigrationBanner />
              {children}
            </MobileShell>
          </JournalChatProvider>
        </LocaleProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
