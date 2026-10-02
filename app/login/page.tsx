"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!supabaseConfigured) {
    return (
      <div className="sky grid min-h-screen place-items-center p-4 text-center text-white">
        <div>
          <p className="font-display text-2xl">Demo mode</p>
          <p className="mt-2">Supabase isn&apos;t configured, so no login is needed.</p>
          <button className="btn btn-sun mt-4" onClick={() => router.push("/")}>Open ourPage</button>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const sb = getSupabase();
    const { data, error } = mode === "in"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) return setMsg("Check your email to confirm, then sign in.");
    router.replace("/");
  }

  return (
    <div className="sky grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 shadow-xl">
        <h1 className="font-display text-3xl">ourPage <span aria-hidden>🌅</span></h1>
        <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <button className="btn btn-sun w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="w-full text-sm text-muted underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
