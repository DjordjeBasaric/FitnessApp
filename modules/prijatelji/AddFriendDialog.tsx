"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/lib/supabase/queries/profiles";
import { searchProfiles } from "@/lib/supabase/queries/profiles";
import { sendFriendRequest } from "@/lib/supabase/queries/friends";
import { useAuth } from "@/lib/supabase/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  onAdded?: () => void;
};

export function AddFriendDialog({ onAdded }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const found = await searchProfiles(q);
        if (!cancelled) {
          setResults(found.filter((p) => p.id !== user?.id));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Greška");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, user?.id]);

  const send = useMutation({
    mutationFn: async (toId: string) => {
      if (!user) throw new Error("Niste prijavljeni.");
      await sendFriendRequest(user.id, toId);
    },
    onSuccess: () => {
      setQuery("");
      setResults([]);
      qc.invalidateQueries({ queryKey: ["friends"] });
      onAdded?.();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Greška"),
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Korisničko ime…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {searching ? (
        <p className="text-sm text-mute">Tražim…</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}

      {results.length ? (
        <ul className="divide-y divide-hairline-soft rounded-[var(--rounded-md)] border border-hairline">
          {results.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {p.display_name ?? p.username}
                </p>
                <p className="truncate font-caption-sm text-mute">@{p.username}</p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={send.isPending}
                onClick={() => send.mutate(p.id)}
              >
                Pošalji
              </Button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !searching ? (
        <p className="text-sm text-mute">Nema rezultata.</p>
      ) : null}
    </div>
  );
}
