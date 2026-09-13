-- Run this in your existing Supabase project's SQL Editor.
-- Adds a treadmill incline field. Safe to run once; re-running is harmless.

alter table exercise_sets add column if not exists incline_level numeric;

update exercises
set cardio_fields = array['speed_kmh','incline_level','distance_km','duration_min']
where name = 'Treadmill';
