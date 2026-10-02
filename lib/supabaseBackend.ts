import type { Backend, CalEvent, Data, MissYouEntry, Note } from "./types";
import { getSupabase } from "./supabase/client";

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** Returns a Backend scoped to the signed-in user's couple. */
export function makeSupabaseBackend(coupleId: string, me: { id: string }): Backend {
  const sb = getSupabase();
  const fail = (error: { message: string } | null) => {
    if (error) throw new Error(error.message);
  };

  return {
    mode: "supabase",
    async load() {
      const [ev, no, mi, pr] = await Promise.all([
        sb.from("events").select("*").order("date"),
        sb.from("notes").select("*").order("updated_at", { ascending: false }),
        sb.from("miss_you").select("*").order("created_at", { ascending: false }),
        sb.from("profiles").select("id, person"),
      ]);
      fail(ev.error); fail(no.error); fail(mi.error); fail(pr.error);
      const personOf = new Map((pr.data ?? []).map((p) => [p.id as string, p.person as "arya" | "teju"]));
      const events: CalEvent[] = (ev.data ?? []).map((r) => ({
        id: r.id, title: r.title, date: r.date,
        startTime: hhmm(r.start_time), endTime: hhmm(r.end_time),
        allDay: r.all_day, owner: r.owner, notes: r.notes ?? "",
        source: r.source, externalId: r.external_id,
      }));
      const notes: Note[] = (no.data ?? []).map((r) => ({
        id: r.id, title: r.title, body: r.body ?? "", pinned: r.pinned,
        author: personOf.get(r.author_id) ?? "arya", updatedAt: r.updated_at,
      }));
      const missYou: MissYouEntry[] = (mi.data ?? []).map((r) => ({
        id: r.id, from: personOf.get(r.from_profile) ?? "arya",
        message: r.message ?? "", createdAt: r.created_at,
      }));
      return { events, notes, missYou } satisfies Data;
    },
    subscribe(cb) {
      const ch = sb.channel(`couple-${coupleId}`);
      for (const table of ["events", "notes", "miss_you"]) {
        ch.on("postgres_changes", { event: "*", schema: "public", table }, cb);
      }
      ch.subscribe();
      return () => { sb.removeChannel(ch); };
    },
    async saveEvent(e) {
      const row = {
        title: e.title, date: e.date, start_time: e.allDay ? null : e.startTime,
        end_time: e.allDay ? null : e.endTime, all_day: e.allDay, owner: e.owner, notes: e.notes,
      };
      const { error } = e.id
        ? await sb.from("events").update(row).eq("id", e.id)
        : await sb.from("events").insert({ ...row, couple_id: coupleId });
      fail(error);
    },
    async deleteEvent(id) {
      fail((await sb.from("events").delete().eq("id", id)).error);
    },
    async saveNote(n) {
      const row = { title: n.title, body: n.body, pinned: n.pinned, updated_at: new Date().toISOString() };
      const { error } = n.id
        ? await sb.from("notes").update(row).eq("id", n.id)
        : await sb.from("notes").insert({ ...row, couple_id: coupleId, author_id: me.id });
      fail(error);
    },
    async deleteNote(id) {
      fail((await sb.from("notes").delete().eq("id", id)).error);
    },
    async addMissYou(_from, message) {
      fail((await sb.from("miss_you").insert({ couple_id: coupleId, from_profile: me.id, message })).error);
    },
  };
}
