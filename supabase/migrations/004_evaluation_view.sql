-- ============================================================
-- Migration 004: Evaluation summary view
-- Aggregates anonymised usage metrics for the project evaluation.
-- Only includes users who have opted in (eval_sharing_enabled = true).
-- ============================================================

create or replace view public.evaluation_summary as
select
  -- Total opted-in users who have generated a plan
  count(distinct user_id) filter (where event = 'plan_generated')
    as total_users,

  -- Average manual planning time (baseline, minutes)
  round(avg(value) filter (where event = 'manual_planning_minutes'), 1)
    as avg_manual_planning_min,

  -- Average onboarding time (StudySync planning time, converted to minutes)
  round(avg(value) filter (where event = 'onboarding_seconds') / 60.0, 1)
    as avg_studysync_planning_min,

  -- Task completion rate
  round(
    count(*) filter (where event = 'task_done')::numeric /
    nullif(count(*) filter (where event in ('task_done', 'task_missed')), 0) * 100,
    1
  ) as task_completion_rate_pct,

  -- Total re-plans triggered
  count(*) filter (where event = 'replan_triggered')
    as total_replans,

  -- Missed-then-recovered rate would require joining plan_events; approximate here
  count(*) filter (where event = 'task_missed')
    as total_missed_tasks,

  count(*) filter (where event = 'task_done')
    as total_done_tasks

from public.eval_events;

-- ============================================================
-- To export a results CSV from the Supabase dashboard:
--
--   SELECT * FROM evaluation_summary;
--
-- For SUS scores, run:
--   SELECT
--     avg((answers->>'clarity')::numeric) as avg_clarity,
--     avg((answers->>'trust')::numeric)   as avg_trust,
--     avg((answers->>'time_saved')::numeric) as avg_time_saved_min,
--     count(*) as total_responses
--   FROM feedback_responses;
-- ============================================================
