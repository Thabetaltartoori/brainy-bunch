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
