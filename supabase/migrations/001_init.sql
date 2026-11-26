-- ============================================================
-- Migration 001: Initial schema
-- Creates all application tables with constraints and FKs.
-- Every table has user_id referencing auth.users ON DELETE CASCADE
-- so deleting a user removes all their data automatically.
-- ============================================================

-- Profiles: one row per user, created on sign-up
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) <= 100),
  created_at  timestamptz not null default now()
);

-- Subjects: a subject the student is studying
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null check (char_length(name) <= 100),
  color      text not null check (char_length(color) <= 20),
  exam_date  date not null
);

-- Topics: individual study topics within a subject
create table if not exists public.topics (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users on delete cascade,
  subject_id         uuid not null references public.subjects on delete cascade,
  name               text not null check (char_length(name) <= 200),
  difficulty         int  not null check (difficulty between 1 and 5),
  confidence         int  not null check (confidence between 1 and 5),
  estimated_minutes  int  not null check (estimated_minutes > 0),
  coverage           numeric not null default 0 check (coverage between 0 and 1),
  missed_count       int  not null default 0 check (missed_count >= 0),
  last_studied_at    timestamptz,
  revision_stage     int  not null default 0 check (revision_stage >= 0)
);

-- Availability: minutes available per weekday
create table if not exists public.availability (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  weekday  int  not null check (weekday between 0 and 6),
  minutes  int  not null check (minutes between 0 and 1440),
  unique (user_id, weekday)
);

-- Date overrides: override availability for a specific date
create table if not exists public.date_overrides (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  date     date not null,
  minutes  int  not null check (minutes between 0 and 1440)
);

-- Preferences: per-user scheduler settings (one row per user)
create table if not exists public.preferences (
  user_id                      uuid primary key references auth.users on delete cascade,
  block_minutes                int  not null default 45 check (block_minutes between 10 and 240),
  break_minutes                int  not null default 10 check (break_minutes between 0 and 60),
  max_consecutive_same_subject int  not null default 2 check (max_consecutive_same_subject between 1 and 10),
  preferred_time               text check (char_length(preferred_time) <= 50),
  eval_sharing_enabled         boolean not null default false
);

-- Tasks: individual scheduled study/revision blocks
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  topic_id         uuid not null references public.topics on delete cascade,
  date             date not null,
  start_order      int  not null default 0,
  duration_minutes int  not null check (duration_minutes > 0),
  type             text not null check (type in ('study', 'revision')),
  status           text not null default 'planned' check (status in ('planned', 'done', 'missed', 'rescheduled')),
  priority_score   numeric not null default 0,
  reasons          jsonb not null default '[]',
  locked           boolean not null default false,
  understanding    int check (understanding between 1 and 5),
  completed_at     timestamptz
);

-- Plan events: history of every re-plan (shown in the "Plan updated" banner)
create table if not exists public.plan_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  trigger    text not null check (char_length(trigger) <= 100),
  summary    text not null check (char_length(summary) <= 1000),
  changes    jsonb not null default '{}'
);

-- Eval events: anonymised usage metrics (only written with user consent)
create table if not exists public.eval_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  event      text not null check (char_length(event) <= 100),
  value      numeric,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- Feedback responses: SUS + extra questions (one per user)
create table if not exists public.feedback_responses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade unique,
  answers    jsonb not null,
  created_at timestamptz not null default now()
);
