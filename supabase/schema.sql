-- qs-fitness schema
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run)
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING throughout.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Locations (gyms)
-- ---------------------------------------------------------------------------
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

insert into locations (name, is_default) values
  ('Sg Long Ark Fitness', true),
  ('TARUMT', false),
  ('AIA', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Body parts (also doubles as the calendar colour legend)
-- ---------------------------------------------------------------------------
create table if not exists body_parts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color_hex text not null,
  sort_order int not null,
  is_cardio boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

insert into body_parts (name, color_hex, sort_order, is_cardio) values
  ('Chest',      '#FF6B4A', 1, false),
  ('Back',       '#4C6FFF', 2, false),
  ('Shoulder',   '#FFB63D', 3, false),
  ('Abs',        '#21B8A6', 4, false),
  ('Arm',        '#A66BFF', 5, false),
  ('Cardio',     '#FF4D79', 6, true),
  ('Lower Body', '#34B37A', 7, false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Exercises (seeded from the user's real gym list; more can be added in-app)
-- ---------------------------------------------------------------------------
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  body_part_id uuid not null references body_parts(id) on delete cascade,
  name text not null,
  is_custom boolean not null default false,
  -- for cardio machines only: which fields to prompt for
  cardio_fields text[], -- e.g. {'speed_kmh','distance_km','duration_min'} or {'steps','speed_level','duration_min'}
  created_at timestamptz not null default now(),
  unique (body_part_id, name)
);

-- Chest
insert into exercises (body_part_id, name)
select id, x.name from body_parts, unnest(array[
  'Seated Iso-Lateral Chest Press (Plate-Loaded)',
  'Seated Iso-Lateral Chest Press (Selectorized)',
  'Dumbbell Chest Press',
  'Incline Barbell Chest Press',
  'Pec Fly Frontward'
]) as x(name)
where body_parts.name = 'Chest'
on conflict do nothing;

-- Back
insert into exercises (body_part_id, name)
select id, x.name from body_parts, unnest(array[
  'High Pully (Wide Grip)',
  'High Pully (Medium Grip)',
  'High Pully (Narrow Grip)',
  'Low Pully',
  'Seated Row',
  'T-Bar Row (Plate-Loaded)',
  'Iso-Lateral Row (Plate-Loaded)',
  'Pec Fly Backward'
]) as x(name)
where body_parts.name = 'Back'
on conflict do nothing;

-- Shoulder
insert into exercises (body_part_id, name)
select id, x.name from body_parts, unnest(array[
  'Seated Iso-Lateral Shoulder Press (Selectorized)',
  'Seated Iso-Lateral Shoulder Press (Plate-Loaded)',
  'Seated Lateral Raise (Plate-Loaded)'
]) as x(name)
where body_parts.name = 'Shoulder'
on conflict do nothing;

-- Abs
insert into exercises (body_part_id, name)
select id, x.name from body_parts, unnest(array[
  'Sit Up (Incline Bench)',
  'Sit Up (Incline Bench, Twist)',
  'Leg Raise (Captain Chair)'
]) as x(name)
where body_parts.name = 'Abs'
on conflict do nothing;

-- Arm
insert into exercises (body_part_id, name)
select id, x.name from body_parts, unnest(array[
  'Bicep Curl (Dumbbell)',
  'Hammer Curl (Dumbbell)',
  'Tricep Press Down (Rope)',
  'Tricep Press Down (Straight Bar)',
  'Overhead Tricep (Dumbbell)'
]) as x(name)
where body_parts.name = 'Arm'
on conflict do nothing;

-- Lower Body
insert into exercises (body_part_id, name)
select id, x.name from body_parts, unnest(array[
  'Leg Press (Selectorized)',
  'Leg Press (Plate-Loaded)',
  'Hack Squat (Plate-Loaded)',
  'Hip Abductor Outer',
  'Hip Abductor Inner',
  'Leg Curl Hamstring (Seated)',
  'Leg Curl Hamstring (Lying)',
  'Leg Extension Quads',
  'Seated Calf Raise (Plate-Loaded)'
]) as x(name)
where body_parts.name = 'Lower Body'
on conflict do nothing;

-- Cardio (each machine prompts different fields)
insert into exercises (body_part_id, name, cardio_fields)
select id, 'Treadmill', array['speed_kmh','incline_level','distance_km','duration_min'] from body_parts where name = 'Cardio'
on conflict do nothing;

insert into exercises (body_part_id, name, cardio_fields)
select id, 'Stair Climber', array['steps','speed_level','duration_min'] from body_parts where name = 'Cardio'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Sessions = one visit to one gym on one date
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  location_id uuid not null references locations(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_date, location_id)
);

create index if not exists idx_sessions_date on sessions (session_date);

-- ---------------------------------------------------------------------------
-- Session exercises = one exercise block within a session
-- ---------------------------------------------------------------------------
create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  body_part_id uuid not null references body_parts(id), -- snapshot for fast calendar colouring
  order_index int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_exercises_session on session_exercises (session_id);
create index if not exists idx_session_exercises_exercise on session_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- Sets = one row per actual set (true set-by-set granularity, since reps
-- often differ set to set). Cardio exercises use the cardio_* columns
-- instead of weight/reps and typically have exactly one "set" row.
-- ---------------------------------------------------------------------------
create table if not exists exercise_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  set_number int not null,
  weight numeric,
  unit text default 'kg',
  reps numeric,
  -- cardio-only fields
  duration_min numeric,
  distance_km numeric,
  speed_kmh numeric,
  incline_level numeric,
  steps numeric,
  speed_level numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_exercise_sets_session_exercise on exercise_sets (session_exercise_id);

-- ---------------------------------------------------------------------------
-- Convenience view: latest set values per exercise, used to prepopulate
-- the logging form with "last time you did this, you lifted..."
-- ---------------------------------------------------------------------------
create or replace view latest_exercise_sets as
select distinct on (se.exercise_id)
  se.exercise_id,
  s.session_date,
  se.id as session_exercise_id,
  se.notes as exercise_notes
from session_exercises se
join sessions s on s.id = se.session_id
order by se.exercise_id, s.session_date desc, se.created_at desc;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- MVP note: this app has no user accounts (see README). RLS is enabled with
-- a permissive "anyone with the anon key can read/write" policy, which is
-- the same trust level as not having RLS at all, but keeps the door open to
-- tighten later (e.g. once Supabase Auth is added) without a schema change.
-- ---------------------------------------------------------------------------
alter table locations enable row level security;
alter table body_parts enable row level security;
alter table exercises enable row level security;
alter table sessions enable row level security;
alter table session_exercises enable row level security;
alter table exercise_sets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_locations') then
    create policy allow_all_locations on locations for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_body_parts') then
    create policy allow_all_body_parts on body_parts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_exercises') then
    create policy allow_all_exercises on exercises for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_sessions') then
    create policy allow_all_sessions on sessions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_session_exercises') then
    create policy allow_all_session_exercises on session_exercises for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_exercise_sets') then
    create policy allow_all_exercise_sets on exercise_sets for all using (true) with check (true);
  end if;
end $$;
