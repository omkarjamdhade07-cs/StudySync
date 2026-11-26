-- ============================================================
-- Migration 002: Row Level Security policies
-- Every table gets RLS enabled + four policies (select/insert/update/delete)
-- scoped to auth.uid() so users can only access their own rows.
-- To verify isolation: run as user A, attempt to SELECT user B's rows — expect 0 rows.
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles: users read own"   on public.profiles for select using (id = auth.uid());
create policy "profiles: users insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: users update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: users delete own" on public.profiles for delete using (id = auth.uid());

-- ── subjects ────────────────────────────────────────────────
alter table public.subjects enable row level security;

create policy "subjects: users read own"   on public.subjects for select using (user_id = auth.uid());
create policy "subjects: users insert own" on public.subjects for insert with check (user_id = auth.uid());
create policy "subjects: users update own" on public.subjects for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subjects: users delete own" on public.subjects for delete using (user_id = auth.uid());

-- ── topics ──────────────────────────────────────────────────
alter table public.topics enable row level security;

create policy "topics: users read own"   on public.topics for select using (user_id = auth.uid());
create policy "topics: users insert own" on public.topics for insert with check (user_id = auth.uid());
create policy "topics: users update own" on public.topics for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "topics: users delete own" on public.topics for delete using (user_id = auth.uid());

-- ── availability ────────────────────────────────────────────
alter table public.availability enable row level security;

create policy "availability: users read own"   on public.availability for select using (user_id = auth.uid());
create policy "availability: users insert own" on public.availability for insert with check (user_id = auth.uid());
create policy "availability: users update own" on public.availability for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "availability: users delete own" on public.availability for delete using (user_id = auth.uid());

-- ── date_overrides ──────────────────────────────────────────
alter table public.date_overrides enable row level security;

create policy "date_overrides: users read own"   on public.date_overrides for select using (user_id = auth.uid());
create policy "date_overrides: users insert own" on public.date_overrides for insert with check (user_id = auth.uid());
create policy "date_overrides: users update own" on public.date_overrides for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "date_overrides: users delete own" on public.date_overrides for delete using (user_id = auth.uid());

-- ── preferences ─────────────────────────────────────────────
alter table public.preferences enable row level security;

create policy "preferences: users read own"   on public.preferences for select using (user_id = auth.uid());
create policy "preferences: users insert own" on public.preferences for insert with check (user_id = auth.uid());
create policy "preferences: users update own" on public.preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "preferences: users delete own" on public.preferences for delete using (user_id = auth.uid());

-- ── tasks ───────────────────────────────────────────────────
alter table public.tasks enable row level security;

create policy "tasks: users read own"   on public.tasks for select using (user_id = auth.uid());
create policy "tasks: users insert own" on public.tasks for insert with check (user_id = auth.uid());
create policy "tasks: users update own" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks: users delete own" on public.tasks for delete using (user_id = auth.uid());

-- ── plan_events ─────────────────────────────────────────────
alter table public.plan_events enable row level security;

create policy "plan_events: users read own"   on public.plan_events for select using (user_id = auth.uid());
create policy "plan_events: users insert own" on public.plan_events for insert with check (user_id = auth.uid());
create policy "plan_events: users update own" on public.plan_events for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plan_events: users delete own" on public.plan_events for delete using (user_id = auth.uid());

-- ── eval_events ─────────────────────────────────────────────
alter table public.eval_events enable row level security;

create policy "eval_events: users read own"   on public.eval_events for select using (user_id = auth.uid());
create policy "eval_events: users insert own" on public.eval_events for insert with check (user_id = auth.uid());
create policy "eval_events: users update own" on public.eval_events for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eval_events: users delete own" on public.eval_events for delete using (user_id = auth.uid());

-- ── feedback_responses ──────────────────────────────────────
alter table public.feedback_responses enable row level security;

create policy "feedback_responses: users read own"   on public.feedback_responses for select using (user_id = auth.uid());
create policy "feedback_responses: users insert own" on public.feedback_responses for insert with check (user_id = auth.uid());
create policy "feedback_responses: users update own" on public.feedback_responses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "feedback_responses: users delete own" on public.feedback_responses for delete using (user_id = auth.uid());

-- ============================================================
-- RLS verification queries (run in Supabase SQL editor as a user)
-- These should return 0 rows when run as user A with user B's id:
--
--   select count(*) from public.tasks where user_id = '<user_b_id>';
--   select count(*) from public.subjects where user_id = '<user_b_id>';
--
-- Expected result: 0 — proves cross-user isolation.
-- ============================================================
