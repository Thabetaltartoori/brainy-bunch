-- ============================================================
--  Brainy Bunch — School Management System
--  PostgreSQL / Supabase schema
--  Run this once in the Supabase SQL Editor (dashboard > SQL > New query)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- people / accounts ----------
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  full_name     text not null,
  role          text not null check (role in ('admin', 'teacher', 'parent')),
  job_title     text,                       -- e.g. "Mathematics Teacher"
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- login sessions (revocable, HttpOnly cookie holds only the token)
create table if not exists sessions (
  token      text primary key,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

-- ---------- students ----------
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  grade         text not null,               -- e.g. "Grade 4"
  section       text,                        -- e.g. "A"
  monthly_fee   numeric(10, 2) not null default 0,
  photo_url     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists students_grade_idx on students (grade);

-- which teachers cover which classes (a teacher may hold several)
create table if not exists teacher_sections (
  teacher_id uuid not null references profiles (id) on delete cascade,
  grade      text not null,
  section    text not null,
  primary key (teacher_id, grade, section)
);
create index if not exists teacher_sections_class_idx on teacher_sections (grade, section);

-- which teachers are linked to which students (many-to-many)
create table if not exists teacher_students (
  teacher_id uuid not null references profiles (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  subject    text,
  primary key (teacher_id, student_id)
);

-- which parent/guardian sees which student (many-to-many)
create table if not exists guardians (
  parent_id uuid not null references profiles (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  relation  text,                            -- father | mother | uncle ...
  primary key (parent_id, student_id)
);

-- ---------- teacher notes / recommendations ----------
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  teacher_id uuid not null references profiles (id) on delete cascade,
  kind       text not null check (kind in ('recommendation', 'praise', 'concern')),
  body       text not null,
  is_shared  boolean not null default true,  -- false = internal, hidden from parents
  created_at timestamptz not null default now()
);
create index if not exists notes_student_idx on notes (student_id, created_at desc);

-- ---------- student test results ----------
create table if not exists assessments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students (id) on delete cascade,
  teacher_id  uuid not null references profiles (id) on delete cascade,
  subject     text not null,
  test_name   text not null,
  test_date   date not null default current_date,
  score       numeric(7, 2) not null check (score >= 0),
  max_score   numeric(7, 2) not null check (max_score > 0 and score <= max_score),
  created_at  timestamptz not null default now()
);
create index if not exists assessments_student_date_idx
  on assessments (student_id, test_date desc, created_at desc);

-- ---------- monthly tuition payments ----------
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students (id) on delete cascade,
  period      text not null,                 -- 'YYYY-MM'  e.g. '2026-10'
  amount      numeric(10, 2) not null,
  method      text check (method in ('cash', 'transfer', 'online', 'cheque')),
  paid_on     date,
  note        text,
  recorded_by uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (student_id, period)                -- one payment row per student per month
);
create index if not exists payments_student_idx on payments (student_id);

-- ---------- rotating banner messages (the dynamic top label) ----------
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  body_ar    text not null,
  body_en    text not null,
  tone       text not null default 'green' check (tone in ('green', 'red', 'neutral')),
  is_active  boolean not null default true,
  sort_order int not null default 0
);

-- ============================================================
--  Lock the data down
-- ============================================================
--  Supabase auto-generates a REST endpoint for every table in the public
--  schema. A table with Row Level Security *off* is readable and writable
--  by any role holding a grant on it -- including the publishable key,
--  which is designed to be visible to the public. Without these two blocks
--  the entire school database is one curl away.
--
--  This app never talks to Supabase from the browser. The client is a
--  plain fetch() against our own Express API, and the server holds a
--  secret key, which maps to the service_role Postgres role and carries
--  BYPASSRLS. So RLS costs the app nothing and locks the tables for good.
--
--  Two separate layers, because enabling RLS alone leaves the grants in
--  place: enable RLS *and* revoke the client grants.
-- ============================================================

alter table profiles        enable row level security;
alter table sessions        enable row level security;
alter table students        enable row level security;
alter table teacher_sections enable row level security;
alter table teacher_students enable row level security;
alter table guardians       enable row level security;
alter table notes           enable row level security;
alter table assessments     enable row level security;
alter table payments        enable row level security;
alter table announcements   enable row level security;

revoke all on profiles         from anon, authenticated;
revoke all on sessions         from anon, authenticated;
revoke all on students         from anon, authenticated;
revoke all on teacher_sections from anon, authenticated;
revoke all on teacher_students from anon, authenticated;
revoke all on guardians        from anon, authenticated;
revoke all on notes            from anon, authenticated;
revoke all on assessments      from anon, authenticated;
revoke all on payments         from anon, authenticated;
revoke all on announcements    from anon, authenticated;

grant all on assessments to service_role;
grant all on teacher_sections to service_role;

-- No policies are created on purpose. With RLS enabled and zero policies,
-- anon and authenticated match no rows -- which is the correct answer here,
-- because this database is only ever reached through our own API, where
-- access.js decides what each role may see.

