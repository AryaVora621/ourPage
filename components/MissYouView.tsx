"use client";

import { useState } from "react";
import { useStore } from "./Store";
import { timeAgo } from "@/lib/dates";
import { NAMES, PEOPLE, type Person } from "@/lib/types";

export default function MissYouView() {
  const { data, backend, me } = useStore();
  const [message, setMessage] = useState("");
  const [hearts, setHearts] = useState<number[]>([]);
  const [err, setErr] = useState("");

  const counts: Record<Person, number> = { arya: 0, teju: 0 };
  for (const m of data.missYou) counts[m.from]++;
  const other: Person = me === "arya" ? "teju" : "arya";
  const recent = [...data.missYou].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);

  async function send() {
    const id = Date.now();
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1200);
    try {
      await backend.addMissYou(me, message.trim());
      setMessage("");
      setErr("");
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  return (
    <section aria-label="Miss you">
      <h1 className="mb-1 font-display text-2xl sm:text-3xl">Miss You 💛</h1>
      <p className="mb-5 text-sm text-muted">Every time we say it, it counts.</p>

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {PEOPLE.map((p) => (
          <div key={p} className={`sky rounded-3xl p-4 text-center text-white shadow sm:p-8 ${p === me ? "ring-4 ring-sun/40" : ""}`}>
            <p className="text-sm font-semibold uppercase tracking-wide opacity-90">{NAMES[p]}</p>
            <p className="my-2 font-display text-5xl drop-shadow sm:text-7xl" aria-live="polite">{counts[p]}</p>
            <p className="text-xs opacity-90 sm:text-sm">times said &ldquo;I miss you&rdquo;</p>
          </div>
        ))}
      </div>

      <div className="relative mt-5 rounded-3xl border border-line bg-card p-4 sm:p-6">
        <p className="mb-3 text-sm text-muted">Sending to {NAMES[other]} as {NAMES[me]}</p>
        <input className="field mb-3" placeholder="Add a sweet note (optional)" value={message} maxLength={140} onChange={(e) => setMessage(e.target.value)} />
        <div className="relative">
          <button onClick={send} className="btn btn-sun w-full !py-3 text-base">I miss you 🧡</button>
          {hearts.map((id, i) => (
            <span key={id} className="heart-float absolute bottom-8 text-3xl" style={{ left: `${35 + ((i * 17) % 30)}%` }} aria-hidden>🧡</span>
          ))}
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>

      <h2 className="mb-2 mt-6 font-display text-lg">Recent</h2>
      {recent.length === 0 && <p className="text-sm text-muted">No miss-yous yet. Be the first!</p>}
      <ul className="space-y-2">
        {recent.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${m.from === "arya" ? "bg-arya" : "bg-teju"}`}>{NAMES[m.from][0]}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm"><b>{NAMES[m.from]}</b> missed {NAMES[m.from === "arya" ? "teju" : "arya"]}</span>
              {m.message && <span className="block truncate text-sm text-muted">&ldquo;{m.message}&rdquo;</span>}
            </span>
            <span className="text-xs text-muted">{timeAgo(m.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
