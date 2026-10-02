-- ourPage: shared couples calendar
create table couples (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  person text not null check (person in ('arya', 'teju')),
  unique (couple_id, person)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  all_day boolean not null default true,
  owner text not null check (owner in ('arya', 'teju', 'both')),
  notes text not null default '',
  source text not null default 'manual',   -- reserved: 'google' | 'apple'
  external_id text,                        -- reserved for calendar sync
  created_at timestamptz not null default now()
);
create index events_couple_date on events (couple_id, date);

create table notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references profiles(id),
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  updated_at timestamptz not null default now()
);

create table miss_you (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  from_profile uuid not null references profiles(id),
  message text not null default '',
  created_at timestamptz not null default now()
);
create index miss_you_couple on miss_you (couple_id, created_at desc);

-- helper: the caller's couple
create function my_couple() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from profiles where id = auth.uid()
$$;

-- join (or create) a couple with a shared secret code, claiming 'arya' or 'teju'
create function join_couple(p_code text, p_person text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_person not in ('arya', 'teju') then raise exception 'invalid person'; end if;
  if length(trim(p_code)) < 6 then raise exception 'code must be at least 6 characters'; end if;
  insert into couples (code) values (trim(p_code)) on conflict (code) do nothing;
  select id into cid from couples where code = trim(p_code);
  insert into profiles (id, couple_id, person) values (auth.uid(), cid, p_person);
  return cid;
exception when unique_violation then
  raise exception 'that person is already claimed in this couple';
end $$;
revoke all on function join_couple(text, text) from public, anon;
grant execute on function join_couple(text, text) to authenticated;

alter table couples enable row level security;
alter table profiles enable row level security;
alter table events enable row level security;
alter table notes enable row level security;
alter table miss_you enable row level security;

create policy "own couple" on couples for select using (id = my_couple());
create policy "couple profiles" on profiles for select using (couple_id = my_couple());

create policy "couple events" on events for all
  using (couple_id = my_couple()) with check (couple_id = my_couple());
create policy "couple notes" on notes for all
  using (couple_id = my_couple()) with check (couple_id = my_couple());
create policy "read miss_you" on miss_you for select using (couple_id = my_couple());
create policy "send miss_you" on miss_you for insert
  with check (couple_id = my_couple() and from_profile = auth.uid());

alter publication supabase_realtime add table events, notes, miss_you;
