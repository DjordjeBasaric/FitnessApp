"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateUsername } from "@/lib/supabase/queries/profiles";
import { useAuth } from "@/lib/supabase/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsernameSetup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getMyProfile(userId!),
    enabled: !!userId,
  });

  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (profileQ.data?.username) setUsername(profileQ.data.username);
  }, [profileQ.data?.username]);

  if (!profileQ.data) return null;

  const current = profileQ.data.username;
  const looksAuto = /^user_[a-f0-9]{6,}$/.test(current);

  async function save() {
    if (!userId) return;
    setBusy(true);
    setMsg(null);
    try {
      await updateUsername(userId, username);
      setMsg("Korisničko ime ažurirano.");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Greška");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-[var(--rounded-md)] border border-hairline bg-surface p-4">
        <p className="font-caption-sm text-mute">Tvoje korisničko ime</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading-md text-ink">@{current}</p>
          <Button
            type="button"
            size="sm"
            variant={looksAuto ? "default" : "outline"}
            onClick={() => setEditing(true)}
          >
            {looksAuto ? "Postavi ime" : "Promijeni"}
          </Button>
        </div>
        {looksAuto ? (
          <p className="mt-2 text-sm text-mute">
            Postavi prepoznatljivo korisničko ime da te prijatelji pronađu.
          </p>
        ) : null}
        {msg ? <p className="mt-2 text-sm text-mute">{msg}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--rounded-md)] border border-hairline bg-surface p-4">
      <Label htmlFor="username">Korisničko ime</Label>
      <Input
        id="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="npr. nina_runner"
        autoCapitalize="off"
        autoCorrect="off"
        className="mt-1"
      />
      <p className="mt-1 font-caption-sm text-mute">
        3–24 znaka. Mala slova, brojevi, _.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
          Sačuvaj
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setUsername(current);
            setEditing(false);
            setMsg(null);
          }}
        >
          Otkaži
        </Button>
      </div>
      {msg ? <p className="mt-2 text-sm text-mute">{msg}</p> : null}
    </div>
  );
}
