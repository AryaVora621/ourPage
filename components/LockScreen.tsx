"use client";

import { useEffect, useRef, useState } from "react";
import { rpc } from "@/lib/supabase/client";
import { NAMES, PEOPLE, type Person } from "@/lib/types";

/* ---------- PIN keypad ---------- */
function PinPad({ onComplete, disabled, resetKey }: { onComplete: (pin: string) => void; disabled?: boolean; resetKey: number }) {
  const [pin, setPin] = useState("");
  useEffect(() => setPin(""), [resetKey]);

  const press = (d: string) => {
    if (disabled) return;
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 6) onComplete(next);
  };

  return (
    <div className="select-none">
      <div className="mb-6 flex justify-center gap-3" aria-label={`${pin.length} of 6 digits entered`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-white transition ${i < pin.length ? "bg-white scale-110" : "bg-transparent"}`} />
        ))}
      </div>
      <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="aspect-square rounded-full bg-white/20 text-2xl font-semibold text-white backdrop-blur transition active:scale-90 active:bg-white/40">{d}</button>
        ))}
        <span />
        <button type="button" onClick={() => press("0")} className="aspect-square rounded-full bg-white/20 text-2xl font-semibold text-white backdrop-blur transition active:scale-90 active:bg-white/40">0</button>
        <button type="button" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete" className="aspect-square rounded-full text-xl text-white/90 active:scale-90">⌫</button>
      </div>
    </div>
  );
}

/* ---------- drag pattern (3x3) ---------- */
function PatternPad({ onComplete, disabled, resetKey }: { onComplete: (p: string) => void; disabled?: boolean; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const pathRef = useRef<number[]>([]);
  useEffect(() => { setPath([]); pathRef.current = []; }, [resetKey]);

  const center = (i: number) => ({ x: ((i % 3) + 0.5) / 3 * 100, y: (Math.floor(i / 3) + 0.5) / 3 * 100 });

  function local(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }
  function hit(p: { x: number; y: number }) {
    for (let i = 0; i < 9; i++) {
      const c = center(i);
      if (Math.hypot(c.x - p.x, c.y - p.y) < 11) return i;
    }
    return -1;
  }
  function add(i: number) {
    if (i < 0 || pathRef.current.includes(i)) return;
    pathRef.current = [...pathRef.current, i];
    setPath(pathRef.current);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  function down(e: React.PointerEvent) {
    if (disabled) return;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    pathRef.current = [];
    setPath([]);
    const p = local(e);
    setPointer(p);
    add(hit(p));
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const p = local(e);
    setPointer(p);
    add(hit(p));
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setPointer(null);
    const done = pathRef.current;
    if (done.length >= 4) onComplete(done.join("-"));
    else if (done.length > 0) { pathRef.current = []; setTimeout(() => setPath([]), 250); }
  }

  const pts = path.map(center);
  return (
    <div
      ref={ref}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      className="relative mx-auto aspect-square w-full max-w-[280px] touch-none select-none"
      role="application" aria-label="Drag across at least 4 dots to draw your pattern"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
        {pointer && pts.length > 0 && <line x1={pts[pts.length - 1].x} y1={pts[pts.length - 1].y} x2={pointer.x} y2={pointer.y} stroke="white" strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" />}
        {Array.from({ length: 9 }, (_, i) => {
          const c = center(i);
          const on = path.includes(i);
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r={on ? 9 : 5} fill="white" fillOpacity={on ? 0.35 : 0.0} />
              <circle cx={c.x} cy={c.y} r={on ? 4 : 3.2} fill="white" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Frame({ title, sub, msg, children }: { title: string; sub?: string; msg: string; children: React.ReactNode }) {
  return (
    <div className="sky relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-[50%] bg-black/10 blur-2xl" />
      <div className="relative w-full max-w-sm text-center text-white">
        <p className="mb-1 text-5xl" aria-hidden>🌅</p>
        <h1 className="font-display text-3xl drop-shadow">{title}</h1>
        <p className="mb-6 mt-1 min-h-[1.25rem] text-sm text-white/90" role="status">{msg || sub}</p>
        {children}
      </div>
    </div>
  );
}

/* ---------- screens ---------- */
type Status = { setup: boolean; hasPin: boolean; hasPattern: boolean };

export default function LockScreen({ onUnlocked }: { onUnlocked: (token: string, person: Person | null) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<"pin" | "pattern">("pin");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  const [token, setTok] = useState<string | null>(null);

  // setup flow
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [setupPin, setSetupPin] = useState<string | null>(null);
  const [offerPattern, setOfferPattern] = useState(false);
  const [firstPattern, setFirstPattern] = useState<string | null>(null);

  useEffect(() => {
    rpc<Status>("auth_status").then(setStatus).catch((e) => setMsg((e as Error).message));
  }, []);

  const clear = (m: string) => { setMsg(m); setReset((r) => r + 1); };

  async function tryUnlock(kind: "pin" | "pattern", secret: string) {
    setBusy(true);
    try {
      const r = await rpc<{ ok: boolean; token?: string; error?: string; remaining?: number }>("unlock", { p_kind: kind, p_secret: secret });
      if (r.ok && r.token) { setMsg(""); setTok(r.token); }
      else clear(r.error ? `${r.error}${r.remaining != null ? ` · ${r.remaining} tries left` : ""}` : "Try again");
    } catch (e) { clear((e as Error).message); }
    setBusy(false);
  }

  async function finishSetup(kind: "pin" | "pattern", secret: string) {
    setBusy(true);
    try {
      await rpc("set_credential", { p_kind: kind, p_secret: secret, p_token: null });
      return true;
    } catch (e) { clear((e as Error).message); return false; }
    finally { setBusy(false); }
  }

  async function onSetupPin(pin: string) {
    if (!firstPin) { setFirstPin(pin); clear("Enter it again to confirm"); return; }
    if (pin !== firstPin) { setFirstPin(null); clear("Those didn't match — start again"); return; }
    if (await finishSetup("pin", pin)) { setSetupPin(pin); setOfferPattern(true); setMsg(""); setReset((r) => r + 1); }
  }

  async function startSession(pin: string) {
    const r = await rpc<{ ok: boolean; token?: string }>("unlock", { p_kind: "pin", p_secret: pin });
    if (r.ok && r.token) { setMsg(""); setTok(r.token); }
  }

  async function onSetupPattern(p: string) {
    if (!firstPattern) { setFirstPattern(p); clear("Draw it again to confirm"); return; }
    if (p !== firstPattern) { setFirstPattern(null); clear("Didn't match — try again"); return; }
    // need a session to add a second credential
    setBusy(true);
    try {
      const r = await rpc<{ ok: boolean; token?: string }>("unlock", { p_kind: "pin", p_secret: setupPin });
      if (!r.ok || !r.token) throw new Error("Could not continue");
      await rpc("set_credential", { p_kind: "pattern", p_secret: p, p_token: r.token });
      setMsg("");
      setTok(r.token);
    } catch (e) { clear((e as Error).message); }
    setBusy(false);
  }

  if (!status) return <Frame msg={msg} title="ourPage" sub={msg || "Loading…"}>{null}</Frame>;

  /* ----- who are you? ----- */
  if (token) {
    const pick = async (p: Person) => {
      setBusy(true);
      try { await rpc("set_person", { p_token: token, p_person: p }); onUnlocked(token, p); }
      catch (e) { setMsg((e as Error).message); setBusy(false); }
    };
    return (
      <Frame msg="" title="Who's this?" sub="Pick your name">
        <div className="grid grid-cols-2 gap-4">
          {PEOPLE.map((p) => (
            <button key={p} disabled={busy} onClick={() => pick(p)}
              className="rounded-3xl bg-white/25 py-8 text-2xl font-semibold backdrop-blur transition active:scale-95 hover:bg-white/35">
              {NAMES[p]}
            </button>
          ))}
        </div>
      </Frame>
    );
  }

  /* ----- first-time setup ----- */
  if (!status.setup && !offerPattern) {
    return (
      <Frame msg={msg} title="Make it yours" sub={msg || (firstPin ? "Enter it again to confirm" : "Choose a 6-digit PIN for ourPage")}>
        <PinPad onComplete={onSetupPin} disabled={busy} resetKey={reset} />
      </Frame>
    );
  }
  if (offerPattern) {
    return (
      <Frame msg={msg} title="Add a drag pattern?" sub={msg || (firstPattern ? "Draw it again to confirm" : "Optional — draw a pattern through 4+ dots as a shortcut")}>
        <PatternPad onComplete={onSetupPattern} disabled={busy} resetKey={reset} />
        <button className="mt-6 text-sm underline opacity-90" onClick={async () => { setBusy(true); try { await startSession(setupPin!); } finally { setBusy(false); } }}>
          Skip for now
        </button>
      </Frame>
    );
  }

  /* ----- unlock ----- */
  const canPattern = status.hasPattern;
  return (
    <Frame msg={msg} title="ourPage" sub={msg || (mode === "pin" ? "Enter your PIN" : "Draw your pattern")}>
      {mode === "pin"
        ? <PinPad onComplete={(p) => tryUnlock("pin", p)} disabled={busy} resetKey={reset} />
        : <PatternPad onComplete={(p) => tryUnlock("pattern", p)} disabled={busy} resetKey={reset} />}
      {canPattern && (
        <button className="mt-6 text-sm underline opacity-90" onClick={() => { setMode(mode === "pin" ? "pattern" : "pin"); setMsg(""); setReset((r) => r + 1); }}>
          {mode === "pin" ? "Use pattern instead" : "Use PIN instead"}
        </button>
      )}
    </Frame>
  );
}
