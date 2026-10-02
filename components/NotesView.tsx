"use client";

import { useState } from "react";
import { useStore } from "./Store";
import { timeAgo } from "@/lib/dates";
import type { Note, NoteInput } from "@/lib/types";
import { NAMES } from "@/lib/types";

export default function NotesView() {
  const { data, backend, me } = useStore();
  const [draft, setDraft] = useState<NoteInput | null>(null);
  const [err, setErr] = useState("");

  const notes = [...data.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || (!draft.title.trim() && !draft.body.trim())) return;
    try { await backend.saveNote(draft, me); setDraft(null); setErr(""); } catch (x) { setErr((x as Error).message); }
  }
  const run = async (fn: () => Promise<void>) => { try { await fn(); } catch (x) { setErr((x as Error).message); } };
  const edit = (n: Note) => setDraft({ id: n.id, title: n.title, body: n.body, pinned: n.pinned });

  return (
    <section aria-label="Notes">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl sm:text-3xl">Notes</h1>
        <button className="btn btn-sun" onClick={() => setDraft({ title: "", body: "", pinned: false })}>+ New note</button>
      </header>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

      {draft && (
        <form onSubmit={save} className="mb-5 space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm">
          <input autoFocus className="field font-semibold" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="field min-h-[140px]" placeholder="Write something…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> Pin to top
          </label>
          <div className="flex gap-2">
            <button className="btn btn-sun">Save</button>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
            {draft.id && <button type="button" className="btn btn-ghost ml-auto text-red-600" onClick={() => run(async () => { await backend.deleteNote(draft.id!); setDraft(null); })}>Delete</button>}
          </div>
        </form>
      )}

      {notes.length === 0 && !draft && <p className="rounded-3xl border border-dashed border-line p-8 text-center text-muted">No notes yet — jot down date ideas, groceries, little reminders.</p>}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((n) => (
          <li key={n.id}>
            <button onClick={() => edit(n)} className="h-full w-full rounded-3xl border border-line bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="truncate font-semibold">{n.pinned && "📌 "}{n.title || "Untitled"}</h3>
              </div>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted">{n.body}</p>
              <p className="mt-3 text-xs text-muted">{NAMES[n.author]} · {timeAgo(n.updatedAt)}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
