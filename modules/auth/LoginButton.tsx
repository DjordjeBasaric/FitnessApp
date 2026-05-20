"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = { next?: string };

export function LoginButton({ next }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleClick() {
    setErr(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const redirectTo = new URL("/auth/callback", site);
      if (next) redirectTo.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Greška pri prijavi.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-[var(--rounded-md)] border border-hairline-soft bg-canvas px-4 py-3 font-label-md text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        <GoogleLogo />
        <span>{loading ? "Otvaram Google…" : "Prijavi se sa Google-om"}</span>
      </button>
      {err ? (
        <p role="alert" className="font-caption-sm text-coral">
          {err}
        </p>
      ) : null}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.92-2.26c-.81.54-1.84.87-3.03.87-2.33 0-4.31-1.57-5.02-3.68H.96v2.32A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.75A5.4 5.4 0 0 1 3.7 9c0-.61.1-1.21.27-1.75V4.93H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.07l3.02-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .96 4.93l3.02 2.32C4.69 5.15 6.67 3.58 9 3.58z"
      />
    </svg>
  );
}
