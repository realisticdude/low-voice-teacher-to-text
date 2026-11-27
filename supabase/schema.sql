-- LiveClass Caption — Supabase schema (MVP)
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to run again: it updates an existing setup in place.
--
-- Before running, in the Supabase dashboard:
--   1. Authentication > Sign In / Providers: enable "Anonymous sign-ins".
--   2. Realtime > Settings: disable "Allow public access" so every channel
--      join is checked against the realtime.messages policies below.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Each device signs in anonymously (no visible account), so every row is tied
-- to an auth user id. That lets the policies below tell a classroom's teacher
-- apart from its students and from outsiders holding the public API key.
create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  teacher_name text not null check (char_length(teacher_name) between 1 and 60),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  role text not null check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_classrooms_code on public.classrooms (code);
create index if not exists idx_classrooms_owner_id on public.classrooms (owner_id);
create index if not exists idx_participants_classroom_id on public.participants (classroom_id);
create index if not exists idx_participants_user_id on public.participants (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions
--
-- Kept in a schema the Data API does not expose. SECURITY DEFINER lets the
-- policies check classroom state without granting users read access to
-- other people's rows.
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.owns_active_classroom(p_classroom_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom_id and c.owner_id = auth.uid() and c.active
  );
$$;

create or replace function private.is_active_classroom(p_classroom_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom_id and c.active
  );
$$;

-- Realtime topics are named `classroom:<CODE>`.
create or replace function private.owns_topic(p_topic text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classrooms c
    where 'classroom:' || c.code = p_topic and c.owner_id = auth.uid() and c.active
  );
$$;

create or replace function private.can_join_topic(p_topic text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.classrooms c
    join public.participants p on p.classroom_id = c.id
    where 'classroom:' || c.code = p_topic and c.active and p.user_id = auth.uid()
  ) or private.owns_topic(p_topic);
$$;

revoke all on function private.owns_active_classroom(uuid) from public;
revoke all on function private.is_active_classroom(uuid) from public;
revoke all on function private.owns_topic(text) from public;
revoke all on function private.can_join_topic(text) from public;
grant execute on function private.owns_active_classroom(uuid) to authenticated;
grant execute on function private.is_active_classroom(uuid) to authenticated;
grant execute on function private.owns_topic(text) to authenticated;
grant execute on function private.can_join_topic(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Classroom lookup
--
-- Students find a classroom by its exact code through this function instead
-- of reading the table, so codes and names can't be listed in bulk.
-- ---------------------------------------------------------------------------

create or replace function public.find_classroom_by_code(p_code text)
returns table (id uuid, code text, teacher_name text, created_at timestamptz, active boolean)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.code, c.teacher_name, c.created_at, c.active
  from public.classrooms c
  where c.code = upper(trim(p_code));
$$;

revoke all on function public.find_classroom_by_code(text) from public, anon;
grant execute on function public.find_classroom_by_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- No user accounts are shown in the app: access is still scoped by knowing a
-- classroom code. The anonymous auth user behind each device is what lets us
-- restrict who may change a classroom or send captions.
-- ---------------------------------------------------------------------------

alter table public.classrooms enable row level security;
alter table public.participants enable row level security;

-- Policies from earlier versions of this file, which let the anon role read
-- and write every row. Dropped so re-running this file upgrades cleanly.
drop policy if exists "classrooms_insert" on public.classrooms;
drop policy if exists "classrooms_select" on public.classrooms;
drop policy if exists "classrooms_update" on public.classrooms;
drop policy if exists "participants_insert" on public.participants;
drop policy if exists "participants_select" on public.participants;

-- Classrooms: a signed-in device can create one for itself, see the ones it
-- created, and end them. Nobody else can read, rename or re-code them.
drop policy if exists "classrooms_insert_own" on public.classrooms;
create policy "classrooms_insert_own" on public.classrooms
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "classrooms_select_own" on public.classrooms;
create policy "classrooms_select_own" on public.classrooms
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "classrooms_update_own" on public.classrooms;
create policy "classrooms_update_own" on public.classrooms
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Participants: a device registers only itself. Only a classroom's owner can
-- join it as the teacher, and students can only join active classrooms.
drop policy if exists "participants_insert_self" on public.participants;
create policy "participants_insert_self" on public.participants
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (role = 'teacher' and private.owns_active_classroom(classroom_id))
      or (role = 'student' and private.is_active_classroom(classroom_id))
    )
  );

drop policy if exists "participants_select_self" on public.participants;
create policy "participants_select_self" on public.participants
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants
--
-- Newer Supabase projects don't expose new tables to the Data API by default,
-- so grant exactly what the policies above allow. The anon role (requests
-- with no signed-in user) gets nothing; updates are limited to `active`.
-- ---------------------------------------------------------------------------

revoke all on public.classrooms from anon, authenticated;
revoke all on public.participants from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert on public.classrooms to authenticated;
grant update (active) on public.classrooms to authenticated;
grant select, insert on public.participants to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Live caption text is sent over Supabase Realtime Broadcast on a private
-- per-classroom channel (`classroom:<CODE>`) and is never stored. These
-- policies on realtime.messages decide who may join, send and track presence.
-- ---------------------------------------------------------------------------

-- Teacher and registered students of an active classroom receive its
-- broadcasts and presence.
drop policy if exists "classroom_members_receive" on realtime.messages;
create policy "classroom_members_receive" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and private.can_join_topic((select realtime.topic()))
  );

-- Only the classroom's teacher may broadcast captions.
drop policy if exists "classroom_owner_broadcasts" on realtime.messages;
create policy "classroom_owner_broadcasts" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and private.owns_topic((select realtime.topic()))
  );

-- Members may announce themselves in presence (used for the student count).
drop policy if exists "classroom_members_track_presence" on realtime.messages;
create policy "classroom_members_track_presence" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and private.can_join_topic((select realtime.topic()))
  );

-- ---------------------------------------------------------------------------
-- Transcripts (kept for 24 hours)
--
-- The live broadcast above is never stored. Separately, the teacher's device
-- saves each *finished* sentence here (plus its English translation when it
-- was spoken in Hindi) so the class can download the whole transcript as a
-- PDF or text file. Rows older than 24 hours are hidden by the read policy
-- and deleted hourly by a pg_cron job, so the server never keeps them longer.
-- ---------------------------------------------------------------------------

create table if not exists public.transcript_segments (
  id bigint generated always as identity primary key,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  seq integer not null check (seq > 0),
  lang text not null check (lang in ('en', 'hi')),
  text text not null check (char_length(text) between 1 and 5000),
  text_en text check (text_en is null or char_length(text_en) <= 10000),
  created_at timestamptz not null default now(),
  unique (classroom_id, seq)
);

create index if not exists idx_transcript_segments_created_at
  on public.transcript_segments (created_at);

-- The teacher who created the class, whether or not it has ended (a
-- translation can finish just after the class ends).
create or replace function private.owns_classroom(p_classroom_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom_id and c.owner_id = auth.uid()
  );
$$;

-- The teacher or any student who joined the class.
create or replace function private.is_classroom_member(p_classroom_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.owns_classroom(p_classroom_id) or exists (
    select 1 from public.participants p
    where p.classroom_id = p_classroom_id and p.user_id = auth.uid()
  );
$$;

revoke all on function private.owns_classroom(uuid) from public;
revoke all on function private.is_classroom_member(uuid) from public;
grant execute on function private.owns_classroom(uuid) to authenticated;
grant execute on function private.is_classroom_member(uuid) to authenticated;

alter table public.transcript_segments enable row level security;

-- Only the teacher adds sentences, and only while the class is live.
drop policy if exists "transcript_insert_owner" on public.transcript_segments;
create policy "transcript_insert_owner" on public.transcript_segments
  for insert to authenticated
  with check (private.owns_active_classroom(classroom_id));

-- Only the teacher fills in translations.
drop policy if exists "transcript_update_owner" on public.transcript_segments;
create policy "transcript_update_owner" on public.transcript_segments
  for update to authenticated
  using (private.owns_classroom(classroom_id))
  with check (private.owns_classroom(classroom_id));

-- Class members read it, for 24 hours (even if the cleanup job runs late).
drop policy if exists "transcript_select_members" on public.transcript_segments;
create policy "transcript_select_members" on public.transcript_segments
  for select to authenticated
  using (
    created_at > now() - interval '24 hours'
    and private.is_classroom_member(classroom_id)
  );

revoke all on public.transcript_segments from anon, authenticated;
grant select, insert on public.transcript_segments to authenticated;
grant update (text_en) on public.transcript_segments to authenticated;

-- Hourly cleanup. pg_cron ships with Supabase; this enables it if needed
-- (Database > Extensions shows it too). Re-running reschedules the same job.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'delete-old-transcripts',
  '0 * * * *',
  $$delete from public.transcript_segments where created_at < now() - interval '24 hours'$$
);
