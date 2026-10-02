import type { Backend, Data } from "./types";
import { rpc } from "./supabase/client";

const POLL_MS = 5000;

/** Backend bound to an unlocked session token. Changes from the other person arrive by polling. */
export function makeSupabaseBackend(token: string): Backend {
  return {
    mode: "supabase",
    load: () => rpc<Data>("app_load", { p_token: token }),
    subscribe(cb) {
      const tick = () => { if (document.visibilityState === "visible") cb(); };
      const id = setInterval(tick, POLL_MS);
      document.addEventListener("visibilitychange", tick);
      return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
    },
    async saveEvent(e) {
      await rpc("save_event", { p_token: token, p_event: e });
    },
    async deleteEvent(id) {
      await rpc("delete_event", { p_token: token, p_id: id });
    },
    async saveNote(n) {
      await rpc("save_note", { p_token: token, p_note: n });
    },
    async deleteNote(id) {
      await rpc("delete_note", { p_token: token, p_id: id });
    },
    async addMissYou(_from, message) {
      await rpc("add_miss_you", { p_token: token, p_message: message });
    },
  };
}
