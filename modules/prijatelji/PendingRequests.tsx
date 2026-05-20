"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/supabase/queries/friends";
import { useAuth } from "@/lib/supabase/AuthContext";
import { Button } from "@/components/ui/button";

export function PendingRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const incomingQ = useQuery({
    queryKey: ["friends", userId, "incoming"],
    queryFn: () => listIncomingRequests(userId!),
    enabled: !!userId,
  });
  const outgoingQ = useQuery({
    queryKey: ["friends", userId, "outgoing"],
    queryFn: () => listOutgoingRequests(userId!),
    enabled: !!userId,
  });

  const invalidate = () => {
    if (userId) qc.invalidateQueries({ queryKey: ["friends"] });
  };

  const accept = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: invalidate,
  });
  const decline = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: invalidate,
  });

  const incoming = incomingQ.data ?? [];
  const outgoing = outgoingQ.data ?? [];

  if (!incoming.length && !outgoing.length) return null;

  return (
    <div className="space-y-6">
      {incoming.length ? (
        <section className="space-y-2">
          <h3 className="font-heading-sm uppercase text-ink">Zahtjevi za tebe</h3>
          <ul className="divide-y divide-hairline-soft rounded-[var(--rounded-md)] border border-hairline">
            {incoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {r.from_profile?.display_name ?? r.from_profile?.username ?? "Korisnik"}
                  </p>
                  {r.from_profile?.username ? (
                    <p className="truncate font-caption-sm text-mute">
                      @{r.from_profile.username}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={accept.isPending}
                    onClick={() => accept.mutate(r.id)}
                  >
                    <Check className="size-4" aria-hidden />
                    Prihvati
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={decline.isPending}
                    onClick={() => decline.mutate(r.id)}
                  >
                    <X className="size-4" aria-hidden />
                    Odbij
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length ? (
        <section className="space-y-2">
          <h3 className="font-heading-sm uppercase text-ink">Poslano</h3>
          <ul className="divide-y divide-hairline-soft rounded-[var(--rounded-md)] border border-hairline">
            {outgoing.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <p className="truncate font-caption-sm text-mute">
                  Čeka odgovor (od {new Date(r.created_at).toLocaleDateString()}).
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(r.id)}
                >
                  Otkaži
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
