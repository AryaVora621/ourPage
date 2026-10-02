# ourPage 🌅

A shared calendar, notes, and "I miss you" counter for Arya and Teju. Next.js + Tailwind + Supabase, sunset-beach theme.

- **ourPage** – combined calendar (Arya = orange, Teju = pink, Both = gold)
- **Arya / Teju** – each person's calendar
- **Notes** – shared, pinnable notes
- **Miss You** – running count of who said "I miss you" + history
- Click any day to add/edit/delete events. Layout adapts: bottom tabs + bottom sheet on phone, icon rail on tablet, full sidebar on desktop. Light/night mode.

## Run it

```bash
npm install
npm run dev
```

With no env vars it runs in **demo mode** (data saved in this browser only; switch between Arya/Teju in the sidebar).

## Share between two devices (Supabase)

1. Create a Supabase project and apply `supabase/migrations/0001_init.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL + publishable (anon) key.
3. Open the site: the first visitor sets a **6-digit PIN** (and optionally a **drag pattern**). After that, unlock with either, then tap **Arya** or **Teju**.
4. Deploy on Vercel with the same two env vars.

How it's locked: the browser only holds the publishable key. Tables have row-level security with no public policies; all reads/writes go through database functions that require a session token issued by `unlock()`. PIN/pattern are stored bcrypt-hashed, and 5 wrong tries lock attempts for 15 minutes. Changes from the other person show up within ~5 seconds.

## Later

Google/Apple calendar sync: `events.source` / `events.external_id` are reserved for it.
