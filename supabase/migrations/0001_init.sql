-- ourPage: one shared couple, unlocked with a 6-digit PIN and/or a drag pattern.
-- Tables are not directly reachable by the public API (RLS on, no policies);
-- everything goes through SECURITY DEFINER functions that check a session token.

create extension if not exists pgcrypto with schema extensions;

create table credentials (
  kind text primary key check (kind in ('pin', 'pattern')),
  hash text not null,
  updated_at timestamptz not null default now()
);

create table sessions (
  token_hash text primary key,
  person text check (person in ('arya', 'teju')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table attempts (
  id bigserial primary key,
  at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
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
create index events_date on events (date);

create table notes (
  id uuid primary key default gen_random_uuid(),
  author text not null check (author in ('arya', 'teju')),
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  updated_at timestamptz not null default now()
);

create table miss_you (
  id uuid primary key default gen_random_uuid(),
  from_person text not null check (from_person in ('arya', 'teju')),
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table credentials enable row level security;
alter table sessions enable row level security;
alter table attempts enable row level security;
alter table events enable row level security;
alter table notes enable row level security;
alter table miss_you enable row level security;
revoke all on credentials, sessions, attempts, events, notes, miss_you from anon, authenticated;

-- ---------- internal helper ----------
create function _session_person(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare s sessions;
begin
  select * into s from sessions
   where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and expires_at > now();
  if not found then raise exception 'locked' using errcode = '28000'; end if;
  return coalesce(s.person, '');
end $$;
revoke all on function _session_person(text) from public, anon, authenticated;

-- ---------- auth ----------
create function auth_status() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'setup', exists (select 1 from credentials),
    'hasPin', exists (select 1 from credentials where kind = 'pin'),
    'hasPattern', exists (select 1 from credentials where kind = 'pattern'));
$$;

-- First call (nothing set yet) needs no token; afterwards a valid session is required to change.
create function set_credential(p_kind text, p_secret text, p_token text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare parts text[];
begin
  if exists (select 1 from credentials) then perform _session_person(p_token); end if;
  if p_kind = 'pin' then
    if p_secret !~ '^[0-9]{6}$' then raise exception 'PIN must be 6 digits'; end if;
  elsif p_kind = 'pattern' then
    if p_secret !~ '^[0-8](-[0-8]){3,8}$' then raise exception 'Pattern must connect at least 4 dots'; end if;
    parts := string_to_array(p_secret, '-');
    if (select count(distinct x) from unnest(parts) x) <> array_length(parts, 1) then
      raise exception 'Pattern cannot reuse a dot';
    end if;
  else
    raise exception 'unknown kind';
  end if;
  insert into credentials (kind, hash) values (p_kind, crypt(p_secret, gen_salt('bf', 8)))
  on conflict (kind) do update set hash = excluded.hash, updated_at = now();
end $$;

create function unlock(p_kind text, p_secret text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h text; tok text; recent int;
begin
  delete from attempts where at < now() - interval '15 minutes';
  delete from sessions where expires_at < now();
  select count(*) into recent from attempts;
  if recent >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many tries. Wait a few minutes.');
  end if;
  select hash into h from credentials where kind = p_kind;
  if h is null or crypt(coalesce(p_secret, ''), h) <> h then
    insert into attempts default values;
    return jsonb_build_object('ok', false, 'error', 'Wrong ' || p_kind, 'remaining', 4 - recent);
  end if;
  delete from attempts;
  tok := encode(gen_random_bytes(24), 'hex');
  insert into sessions (token_hash, expires_at)
  values (encode(digest(tok, 'sha256'), 'hex'), now() + interval '90 days');
  return jsonb_build_object('ok', true, 'token', tok);
end $$;

create function whoami(p_token text) returns text
language sql security definer set search_path = public, extensions as $$
  select nullif(_session_person(p_token), '');
$$;

create function set_person(p_token text, p_person text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _session_person(p_token);
  if p_person not in ('arya', 'teju') then raise exception 'invalid person'; end if;
  update sessions set person = p_person
   where token_hash = encode(digest(p_token, 'sha256'), 'hex');
end $$;

create function lock_session(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- ---------- data ----------
create function app_load(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _session_person(p_token);
  return jsonb_build_object(
    'events', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'date', date,
        'startTime', to_char(start_time, 'HH24:MI'), 'endTime', to_char(end_time, 'HH24:MI'),
        'allDay', all_day, 'owner', owner, 'notes', notes, 'source', source, 'externalId', external_id))
      from events), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'body', body, 'author', author, 'pinned', pinned, 'updatedAt', updated_at))
      from notes), '[]'::jsonb),
    'missYou', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'from', from_person, 'message', message, 'createdAt', created_at))
      from (select * from miss_you order by created_at desc limit 500) m), '[]'::jsonb));
end $$;

create function save_event(p_token text, p_event jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_all boolean := coalesce((p_event->>'allDay')::boolean, true);
  v_start time := case when v_all then null else nullif(p_event->>'startTime', '')::time end;
  v_end time := case when v_all then null else nullif(p_event->>'endTime', '')::time end;
begin
  perform _session_person(p_token);
  if nullif(btrim(p_event->>'title'), '') is null then raise exception 'title required'; end if;
  if nullif(p_event->>'id', '') is null then
    insert into events (title, date, start_time, end_time, all_day, owner, notes)
    values (btrim(p_event->>'title'), (p_event->>'date')::date, v_start, v_end, v_all,
            p_event->>'owner', coalesce(p_event->>'notes', ''));
  else
    update events set title = btrim(p_event->>'title'), date = (p_event->>'date')::date,
      start_time = v_start, end_time = v_end, all_day = v_all,
      owner = p_event->>'owner', notes = coalesce(p_event->>'notes', '')
    where id = (p_event->>'id')::uuid;
  end if;
end $$;

create function delete_event(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _session_person(p_token);
  delete from events where id = p_id;
end $$;

create function save_note(p_token text, p_note jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me text := _session_person(p_token);
begin
  if me = '' then raise exception 'choose who you are first'; end if;
  if nullif(p_note->>'id', '') is null then
    insert into notes (author, title, body, pinned)
    values (me, coalesce(p_note->>'title', ''), coalesce(p_note->>'body', ''), coalesce((p_note->>'pinned')::boolean, false));
  else
    update notes set title = coalesce(p_note->>'title', ''), body = coalesce(p_note->>'body', ''),
      pinned = coalesce((p_note->>'pinned')::boolean, false), updated_at = now()
    where id = (p_note->>'id')::uuid;
  end if;
end $$;

create function delete_note(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _session_person(p_token);
  delete from notes where id = p_id;
end $$;

create function add_miss_you(p_token text, p_message text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me text := _session_person(p_token);
begin
  if me = '' then raise exception 'choose who you are first'; end if;
  insert into miss_you (from_person, message) values (me, left(coalesce(p_message, ''), 140));
end $$;

grant execute on function
  auth_status(), set_credential(text, text, text), unlock(text, text), whoami(text),
  set_person(text, text), lock_session(text), app_load(text), save_event(text, jsonb),
  delete_event(text, uuid), save_note(text, jsonb), delete_note(text, uuid), add_miss_you(text, text)
to anon, authenticated;
