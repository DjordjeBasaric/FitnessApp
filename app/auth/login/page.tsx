import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginButton } from "@/modules/auth/LoginButton";
import { getAuthenticatedUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Prijava — FAIT",
};

type SearchParams = { next?: string | string[] };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getAuthenticatedUserOrNull();
  if (user) {
    const next = typeof params.next === "string" ? params.next : "/unos";
    redirect(next.startsWith("/") ? next : "/unos");
  }

  const nextParam = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-6 py-12 text-ink">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="font-display-xl uppercase tracking-tight text-ink">FAIT</h1>
          <p className="font-body-md text-mute">
            Dnevnik ishrane i treninga koji razumije slobodan tekst.
          </p>
        </div>

        <div className="rounded-[var(--rounded-lg)] border border-hairline-soft bg-surface p-8 shadow-sm">
          <h2 className="font-heading-md uppercase text-ink">Prijavi se</h2>
          <p className="mt-2 font-body-sm text-mute">
            Sinhronizuj dnevnik kroz uređaje i pridruži se prijateljima u
            takmičenju.
          </p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <LoginButton next={nextParam} />
            </Suspense>
          </div>
        </div>

        <p className="font-caption-sm text-mute">
          Tvoj dnevnik je privatan po default-u. Prijatelji vide samo bodove,
          ne i unose hrane.
        </p>
      </div>
    </main>
  );
}
