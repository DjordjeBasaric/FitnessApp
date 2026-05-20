"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

type AuthState = {
  user: User | null;
  session: Session | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

type Props = {
  initialUser: User | null;
  initialSession?: Session | null;
  children: ReactNode;
};

export function AuthProvider({ initialUser, initialSession = null, children }: Props) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [ready, setReady] = useState(initialUser != null || initialSession != null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Initial fetch in case the server-supplied user is stale.
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      ready,
      signOut: async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        if (typeof window !== "undefined") window.location.href = "/auth/login";
      },
    }),
    [user, session, ready],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth mora biti unutar <AuthProvider />");
  return v;
}
