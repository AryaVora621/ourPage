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

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL + anon key.
3. Each of you signs up at `/login`, picks Arya/Teju, and enters the same secret code to join one shared couple. Row-level security keeps everything private to you two.
4. Deploy on Vercel with the same two env vars.

## Later

Google/Apple calendar sync: `events.source` / `events.external_id` are reserved for it.
