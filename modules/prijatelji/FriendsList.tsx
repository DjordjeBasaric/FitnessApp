"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserMinus } from "lucide-react";
import { listFriends, removeFriendship } from "@/lib/supabase/queries/friends";
import { useAuth } from "@/lib/supabase/AuthContext";
import { Button } from "@/components/ui/button";

export function FriendsList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const q = useQuery({
    queryKey: ["friends", userId, "list"],
    queryFn: () => listFriends(userId!),
    enabled: !!userId,
  });

  const remove = useMutation({
    mutationFn: (friendId: string) => {
      if (!userId) throw new Error("Niste prijavljeni.");
      return removeFriendship(userId, friendId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });

  if (q.isLoading) return <p className="text-sm text-mute">Učitavam…</p>;
  const entries = q.data ?? [];
  if (!entries.length) {
    return (
      <p className="text-sm text-mute">
        Još nemaš prijatelja. Dodaj nekoga po korisničkom imenu da podijelite napredak.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-hairline-soft rounded-[var(--rounded-md)] border border-hairline">
      {entries.map(({ friend }) => (
        <li key={friend.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {friend.display_name ?? friend.username}
            </p>
            <p className="truncate font-caption-sm text-mute">@{friend.username}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Ukloniti ${friend.display_name ?? friend.username}?`)) {
                remove.mutate(friend.id);
              }
            }}
          >
            <UserMinus className="size-4" aria-hidden />
            Ukloni
          </Button>
        </li>
      ))}
    </ul>
  );
}
