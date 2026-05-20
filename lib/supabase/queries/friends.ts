"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/supabase/queries/profiles";

export type FriendRequest = Database["public"]["Tables"]["friend_requests"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];

export type IncomingFriendRequest = FriendRequest & {
  from_profile: Profile | null;
};

export type FriendListEntry = {
  friendship: Friendship;
  friend: Profile;
};

export async function listFriends(userId: string): Promise<FriendListEntry[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const friendIds = Array.from(
    new Set(rows.map((r) => (r.user_a === userId ? r.user_b : r.user_a))),
  );
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", friendIds);
  if (pErr) throw pErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const out: FriendListEntry[] = [];
  for (const f of rows) {
    const otherId = f.user_a === userId ? f.user_b : f.user_a;
    const profile = byId.get(otherId);
    if (profile) out.push({ friendship: f, friend: profile });
  }
  return out.sort((a, b) =>
    (a.friend.display_name ?? a.friend.username).localeCompare(
      b.friend.display_name ?? b.friend.username,
      undefined,
      { sensitivity: "base" },
    ),
  );
}

export async function listIncomingRequests(
  userId: string,
): Promise<IncomingFriendRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("to_user", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const ids = Array.from(new Set(rows.map((r) => r.from_user)));
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (pErr) throw pErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, from_profile: byId.get(r.from_user) ?? null }));
}

export async function listOutgoingRequests(userId: string): Promise<FriendRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("from_user", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string,
): Promise<FriendRequest> {
  if (fromUserId === toUserId) {
    throw new Error("Ne možeš dodati sebe za prijatelja.");
  }
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .upsert(
      {
        from_user: fromUserId,
        to_user: toUserId,
        status: "pending",
        responded_at: null,
      },
      { onConflict: "from_user,to_user" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("accept_friend_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
  if (error) throw error;
}

export async function removeFriendship(
  userId: string,
  friendId: string,
): Promise<void> {
  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId];
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_a", a)
    .eq("user_b", b);
  if (error) throw error;
}
