-- LiveClass Caption — Supabase schema (MVP)
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  teacher_name text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  name text not null,
  role text not null check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_classrooms_code on public.classrooms (code);
create index if not exists idx_participants_classroom_id on public.participants (classroom_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- This MVP has no user accounts — access is scoped only by knowing a
-- classroom code, which is intentional per the product spec. Policies below
-- deliberately allow the anon key to read/write ONLY these two tables, and
-- only in the ways the app needs (no delete, no arbitrary table access).
-- ---------------------------------------------------------------------------

alter table public.classrooms enable row level security;
alter table public.participants enable row level security;

-- Classrooms: anyone can create one, look one up (to join/validate a code),
-- or mark their own classroom inactive when captions end. No public delete.
create policy "classrooms_insert" on public.classrooms
  for insert to anon
  with check (true);

create policy "classrooms_select" on public.classrooms
  for select to anon
  using (true);

create policy "classrooms_update" on public.classrooms
  for update to anon
  using (true)
  with check (true);

-- Participants: anyone can register themselves as joining a classroom, and
-- read the participant list (used for presence/debugging). No public delete.
create policy "participants_insert" on public.participants
  for insert to anon
  with check (true);

create policy "participants_select" on public.participants
  for select to anon
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Live caption text itself is sent over Supabase Realtime Broadcast on a
-- per-classroom channel (`classroom:<CODE>`), which requires no table and
-- no extra config. Adding these tables to the realtime publication is
-- optional for this MVP (e.g. if you later want the teacher's student list
-- to update live via Postgres Changes instead of presence), but harmless.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classrooms'
  ) then
    alter publication supabase_realtime add table public.classrooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;
end $$;
