-- Student test results, entered by assigned teachers and visible to parents.
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

alter table assessments enable row level security;
revoke all on assessments from anon, authenticated;
grant all on assessments to service_role;