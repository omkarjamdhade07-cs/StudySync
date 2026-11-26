-- ============================================================
-- Migration 003: Performance indexes
-- ============================================================

-- Primary query pattern: fetch tasks for a user on a specific date
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);

-- Secondary patterns
create index if not exists topics_subject_idx on public.topics (subject_id);
create index if not exists plan_events_user_created_idx on public.plan_events (user_id, created_at desc);
create index if not exists eval_events_user_event_idx on public.eval_events (user_id, event);
