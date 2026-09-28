-- ============================================================
--  002 — teacher sections
--  Run after 001 (schema.sql) in the Supabase SQL Editor.
-- ============================================================
--  Lets a teacher be given whole classes at once, instead of linking
--  students one by one. A teacher may hold several sections; access.js
--  combines these with the individual teacher_students links.
-- ============================================================

create table if not exists teacher_sections (
  teacher_id uuid not null references profiles (id) on delete cascade,
  grade      text not null,
  section    text not null,
  primary key (teacher_id, grade, section)
);

create index if not exists teacher_sections_class_idx on teacher_sections (grade, section);

-- Same lockdown as every other table: unreachable through the public Data
-- API, readable only by the server's secret key.

alter table teacher_sections enable row level security;

revoke all on teacher_sections from anon, authenticated;
