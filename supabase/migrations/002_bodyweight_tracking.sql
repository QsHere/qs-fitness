-- Run this in your existing Supabase project's SQL Editor.
-- Adds bodyweight-exercise support for accurate progress tracking.

alter table exercises add column if not exists is_bodyweight boolean not null default false;

update exercises set is_bodyweight = true
where name in ('Sit Up (Incline Bench)', 'Sit Up (Incline Bench, Twist)', 'Leg Raise (Captain Chair)');

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_app_settings') then
    create policy allow_all_app_settings on app_settings for all using (true) with check (true);
  end if;
end $$;
