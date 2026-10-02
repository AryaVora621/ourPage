"use client";

import { useEffect, useState } from "react";
import { useStore } from "./Store";
import { ownerBg } from "./CalendarView";
import { fmtTime, parseYmd } from "@/lib/dates";
import type { CalEvent, EventInput, Owner } from "@/lib/types";
import { NAMES } from "@/lib/types";

const blank = (date: string, owner: Owner): EventInput => ({
  title: "", date, startTime: "09:00", endTime: "10:00", allDay: true, owner, notes: "",
});

export default function DayPanel({ date, events, defaultOwner, onClose }: {
  date: string; events: CalEvent[]; defaultOwner: Owner; onClose: () => void;
}) {
  const { backend, me } = useStore();
  const [form, setForm] = useState<EventInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !form.title.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await backend.saveEvent({ ...form, title: form.title.trim() }, me);
      setForm(null);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try { await backend.deleteEvent(id); setForm(null); } catch (x) { setErr((x as Error).message); }
  }

  const edit = (ev: CalEvent) =>
    setForm({ id: ev.id, title: ev.title, date: ev.date, startTime: ev.startTime ?? "09:00", endTime: ev.endTime ?? "10:00", allDay: ev.allDay, owner: ev.owner, notes: ev.notes });

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={parseYmd(date).toDateString()}
        onClick={(e) => e.stopPropagation()}
        className="sheet max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl md:max-w-lg md:rounded-3xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl">{parseYmd(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2>
            <p className="text-sm text-muted">{events.length ? `${events.length} thing${events.length > 1 ? "s" : ""} planned` : "Nothing planned yet"}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-3" aria-label="Close">✕</button>
        </div>

        {!form && (
          <>
            <ul className="space-y-2">
              {events.map((ev) => (
                <li key={ev.id}>
                  <button onClick={() => edit(ev)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left hover:bg-sand">
                    <span className={`h-10 w-1.5 rounded-full ${ownerBg[ev.owner]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{ev.title}</span>
                      <span className="block text-xs text-muted">
                        {ev.allDay ? "All day" : `${fmtTime(ev.startTime)}${ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ""}`} · {ev.owner === "both" ? "Both" : NAMES[ev.owner]}
                      </span>
                    </span>
                    <span className="text-xs text-muted">Edit</span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn btn-sun mt-4 w-full" onClick={() => setForm(blank(date, defaultOwner))}>+ Add event</button>
          </>
        )}

        {form && (
          <form onSubmit={save} className="space-y-3">
            <input autoFocus className="field" placeholder="What's happening?" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Whose is it?">
              {(["arya", "teju", "both"] as const).map((o) => (
                <button type="button" key={o} onClick={() => set("owner", o)}
                  className={`btn flex-1 ${form.owner === o ? `${ownerBg[o]} text-white` : "btn-ghost"}`}>
                  {o === "both" ? "Both" : NAMES[o]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={form.allDay} onChange={(e) => set("allDay", e.target.checked)} /> All day
            </label>
            {!form.allDay && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted">Start<input type="time" className="field mt-1" value={form.startTime ?? ""} onChange={(e) => set("startTime", e.target.value)} /></label>
                <label className="text-xs text-muted">End<input type="time" className="field mt-1" value={form.endTime ?? ""} onChange={(e) => set("endTime", e.target.value)} /></label>
              </div>
            )}
            <input type="date" className="field" value={form.date} onChange={(e) => set("date", e.target.value)} aria-label="Date" required />
            <textarea className="field min-h-[80px]" placeholder="Notes (optional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button className="btn btn-sun flex-1" disabled={busy}>{form.id ? "Save" : "Add"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              {form.id && <button type="button" className="btn btn-ghost text-red-600" onClick={() => remove(form.id!)}>Delete</button>}
            </div>
          </form>
        )}
        {!form && err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
