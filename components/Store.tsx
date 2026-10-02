"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Backend, Data, Person } from "@/lib/types";
import { localBackend } from "@/lib/localBackend";
import { makeSupabaseBackend } from "@/lib/supabaseBackend";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

interface Ctx {
  me: Person;
  setMe: (p: Person) => void; // demo mode only
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

function Live({ backend, me, setMe, signOut, children }: {
  backend: Backend; me: Person; setMe: (p: Person) => void; signOut?: () => void; children: React.ReactNode;
}) {
  const [data, setData] = useState<Data>(emptyData);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await backend.load());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, [backend]);

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

type Session = { backend: Backend; me: Person } | "loading" | "needs-profile";

function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<Session>("loading");

  const resolve = useCallback(async () => {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: prof } = await sb.from("profiles").select("couple_id, person").eq("id", session.user.id).maybeSingle();
    if (!prof) { setState("needs-profile"); return; }
    setState({ backend: makeSupabaseBackend(prof.couple_id, session.user), me: prof.person });
  }, [router]);

  useEffect(() => { resolve(); }, [resolve]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  }, [router]);

  if (state === "loading") return <Splash text="Warming up the sunset…" />;
  if (state === "needs-profile") return <ProfileSetup onDone={resolve} signOut={signOut} />;
  return <Live backend={state.backend} me={state.me} setMe={() => {}} signOut={signOut}>{children}</Live>;
}

function ProfileSetup({ onDone, signOut }: { onDone: () => void; signOut: () => void }) {
  const [person, setPerson] = useState<Person>("arya");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await getSupabase().rpc("join_couple", { p_code: code, p_person: person });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <div className="sky grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 shadow-xl">
        <h1 className="font-display text-2xl">Who are you?</h1>
        <div className="grid grid-cols-2 gap-2">
          {(["arya", "teju"] as const).map((p) => (
            <button type="button" key={p} onClick={() => setPerson(p)}
              className={`btn ${person === p ? "btn-sun" : "btn-ghost"}`}>{p === "arya" ? "Arya" : "Teju"}</button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Our secret code (pick one together, 6+ characters)</label>
          <input className="field" value={code} onChange={(e) => setCode(e.target.value)} required minLength={6} />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn btn-sun w-full" disabled={busy}>{busy ? "Joining…" : "Join ourPage"}</button>
        <button type="button" onClick={signOut} className="w-full text-sm text-muted underline">Sign out</button>
      </form>
    </div>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return supabaseConfigured ? <SupabaseProvider>{children}</SupabaseProvider> : <LocalProvider>{children}</LocalProvider>;
}
