import type { Backend, Data } from "./types";

const KEY = "ourpage:data:v1";
const empty: Data = { events: [], notes: [], missYou: [] };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

function read(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty };
  } catch {
    return { ...empty };
  }
}
function write(d: Data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
  window.dispatchEvent(new Event("ourpage:change"));
}

/** Demo mode: data lives in this browser only. Used when Supabase isn't configured. */
export const localBackend: Backend = {
  mode: "local",
  async load() {
    return read();
  },
  subscribe(cb) {
    window.addEventListener("ourpage:change", cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener("ourpage:change", cb);
      window.removeEventListener("storage", cb);
    };
  },
  async saveEvent(e) {
    const d = read();
    if (e.id) d.events = d.events.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x));
    else d.events.push({ ...e, id: uid(), source: "manual", externalId: null });
    write(d);
  },
  async deleteEvent(id) {
    const d = read();
    d.events = d.events.filter((x) => x.id !== id);
    write(d);
  },
  async saveNote(n, me) {
    const d = read();
    const now = new Date().toISOString();
    if (n.id) d.notes = d.notes.map((x) => (x.id === n.id ? { ...x, ...n, id: x.id, updatedAt: now } : x));
    else d.notes.push({ ...n, id: uid(), author: me, updatedAt: now });
    write(d);
  },
  async deleteNote(id) {
    const d = read();
    d.notes = d.notes.filter((x) => x.id !== id);
    write(d);
  },
  async addMissYou(from, message) {
    const d = read();
    d.missYou.push({ id: uid(), from, message, createdAt: new Date().toISOString() });
    write(d);
  },
};
