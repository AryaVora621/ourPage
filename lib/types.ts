export type Person = "arya" | "teju";
export type Owner = Person | "both";

export const PEOPLE: Person[] = ["arya", "teju"];
export const NAMES: Record<Person, string> = { arya: "Arya", teju: "Teju" };

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null;
  allDay: boolean;
  owner: Owner;
  notes: string;
  source: string; // 'manual' now; 'google' | 'apple' reserved for future sync
  externalId: string | null;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  author: Person;
  pinned: boolean;
  updatedAt: string;
}

export interface MissYouEntry {
  id: string;
  from: Person;
  message: string;
  createdAt: string;
}

export interface Data {
  events: CalEvent[];
  notes: Note[];
  missYou: MissYouEntry[];
}

export type EventInput = Omit<CalEvent, "id" | "source" | "externalId"> & { id?: string };
export type NoteInput = Pick<Note, "title" | "body" | "pinned"> & { id?: string };

export interface Backend {
  mode: "local" | "supabase";
  load(): Promise<Data>;
  subscribe(cb: () => void): () => void;
  saveEvent(e: EventInput, me: Person): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  saveNote(n: NoteInput, me: Person): Promise<void>;
  deleteNote(id: string): Promise<void>;
  addMissYou(from: Person, message: string): Promise<void>;
}
