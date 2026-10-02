"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Backend, Data, Person } from "@/lib/types";
import { localBackend } from "@/lib/localBackend";
import { makeSupabaseBackend } from "@/lib/supabaseBackend";
import { getToken, rpc, setToken, supabaseConfigured } from "@/lib/supabase/client";
import LockScreen from "./LockScreen";

interface Ctx {
  me: Person;
  setMe: (p: Person) => void;
  data: Data;
  backend: Backend;
  error: string | null;
  signOut?: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
};

const emptyData: Data = { events: [], notes: [], missYou: [] };

function Live({ backend, me, setMe, signOut, onAuthError, children }: {
  backend: Backend; me: Person; setMe: (p: Person) => void; signOut?: () => void; onAuthError?: () => void; children: React.ReactNode;
}) {
  const [data, setData] = useState<Data>(emptyData);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await backend.load());
      setError(null);
    } catch (e) {
      if ((e as Error).message === "locked") onAuthError?.();
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, [backend, onAuthError]);

  useEffect(() => {
    refresh();
    return backend.subscribe(refresh);
  }, [backend, refresh]);

  const value = useMemo(() => ({ me, setMe, data, backend, error, signOut }), [me, setMe, data, backend, error, signOut]);
  if (!ready) return <Splash text="Warming up the sunset…" />;
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function Splash({ text }: { text: string }) {
  return (
    <div className="sky grid min-h-screen place-items-center text-white">
      <p className="font-display text-2xl drop-shadow">{text}</p>
    </div>
  );
}

function LocalProvider({ children }: { children: React.ReactNode }) {
  const [me, setMeState] = useState<Person>("arya");
  useEffect(() => {
    try {
      const v = localStorage.getItem("ourpage:me");
      if (v === "arya" || v === "teju") setMeState(v);
    } catch {}
  }, []);
  const setMe = useCallback((p: Person) => {
    setMeState(p);
    try { localStorage.setItem("ourpage:me", p); } catch {}
  }, []);
  return <Live backend={localBackend} me={me} setMe={setMe}>{children}</Live>;
}

type Session = { token: string; me: Person } | "loading" | "locked";

function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Session>("loading");

  useEffect(() => {
    const token = getToken();
    if (!token) { setState("locked"); return; }
    rpc<Person | null>("whoami", { p_token: token })
      .then((p) => setState(p ? { token, me: p } : "locked"))
      .catch(() => { setToken(null); setState("locked"); });
  }, []);

  const backend = useMemo(() => (typeof state === "object" ? makeSupabaseBackend(state.token) : null), [state]);

  const lock = useCallback(async () => {
    const t = getToken();
    setToken(null);
    setState("locked");
    if (t) rpc("lock_session", { p_token: t }).catch(() => {});
  }, []);

  const setMe = useCallback(async (p: Person) => {
    if (typeof state !== "object") return;
    await rpc("set_person", { p_token: state.token, p_person: p });
    setState({ token: state.token, me: p });
  }, [state]);

  if (state === "loading") return <Splash text="Warming up the sunset…" />;
  if (state === "locked" || !backend) {
    return <LockScreen onUnlocked={(token, p) => { setToken(token); if (p) setState({ token, me: p }); }} />;
  }
  return <Live backend={backend} me={state.me} setMe={setMe} signOut={lock} onAuthError={lock}>{children}</Live>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return supabaseConfigured ? <SupabaseProvider>{children}</SupabaseProvider> : <LocalProvider>{children}</LocalProvider>;
}
