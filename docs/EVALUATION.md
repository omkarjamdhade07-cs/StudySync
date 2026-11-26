# StudySync — Evaluation Protocol

## 1. Study Design

**Goal**: Measure whether StudySync reduces weekly planning time and improves task completion rates compared to students' usual self-directed study methods.

**Participants**: 8–10 B.Tech students (Semester I), self-selected, using the app during an active exam preparation period.

**Duration**: 5–7 days of active use, ending with a feedback survey.

---

## 2. Protocol

### Before starting
1. Ask each participant: "How many minutes did you spend planning your study last week?" Record their answer — this is the **manual planning baseline**.
2. Create a StudySync account and complete the onboarding wizard. The wizard automatically records `onboarding_seconds` and `manual_planning_minutes` in `eval_events` (with the participant's consent via the Privacy & Data toggle).

### During the study period (days 1–7)
- Use StudySync as their primary study planner.
- Mark tasks as Done (with an understanding rating) or Missed each day.
- Do not reschedule or manually re-plan unless genuinely needed.
- Try the "Why this?" popover on at least 3 tasks.

### On day 7 (or last day)
- Submit the Feedback page survey (SUS + extra questions).

---

## 3. Metrics

| Metric | Definition | How collected |
|---|---|---|
| Planning time saved | `manual_planning_minutes` − `onboarding_seconds / 60` | `eval_events` |
| Task completion rate | `task_done / (task_done + task_missed)` | `eval_events` |
| Missed-then-recovered rate | Tasks missed then rescheduled and completed | Manual review of `plan_events` + `tasks` |
| Average SUS score | Standard SUS calculation from 10 Likert items | `feedback_responses` |
| Clarity rating | Q11: "How clear were the Why this? explanations?" (1–5) | `feedback_responses` |
| Trust rating | Q12: "How much do you trust the plan?" (1–5) | `feedback_responses` |
| Estimated time saved | Participant's self-report of minutes saved | `feedback_responses` |

### SUS Score Calculation
SUS uses a specific scoring formula:
- For odd questions (1,3,5,7,9): `score - 1`
- For even questions (2,4,6,8,10): `5 - score`
- Sum the adjusted scores, multiply by 2.5 → score out of 100
- SUS ≥ 68 is considered "above average" usability.

---

## 4. SQL Snippets

Run these in the Supabase SQL editor (Table Editor → SQL).

### Overall evaluation summary
```sql
SELECT * FROM evaluation_summary;
```

### SUS and extra question averages
```sql
SELECT
  round(avg((answers->>'clarity')::numeric), 2)    AS avg_clarity,
  round(avg((answers->>'trust')::numeric), 2)       AS avg_trust,
  round(avg((answers->>'time_saved')::numeric), 1)  AS avg_time_saved_min,
  count(*)                                           AS total_responses
FROM feedback_responses;
```

### Per-user planning time comparison
```sql
SELECT
  user_id,
  max(value) filter (where event = 'manual_planning_minutes') AS manual_min,
  round(max(value) filter (where event = 'onboarding_seconds') / 60.0, 1) AS studysync_min
FROM eval_events
GROUP BY user_id
HAVING max(value) filter (where event = 'manual_planning_minutes') IS NOT NULL;
```

### Export full results CSV (run in SQL editor, download as CSV)
```sql
SELECT
  e.user_id,
  max(e.value) filter (where e.event = 'manual_planning_minutes') AS manual_planning_min,
  round(max(e.value) filter (where e.event = 'onboarding_seconds') / 60.0, 1) AS studysync_min,
  count(*) filter (where e.event = 'task_done')   AS tasks_done,
  count(*) filter (where e.event = 'task_missed') AS tasks_missed,
  count(*) filter (where e.event = 'replan_triggered') AS replans,
  f.answers->>'clarity'   AS clarity,
  f.answers->>'trust'     AS trust,
  f.answers->>'time_saved' AS self_reported_time_saved_min,
  f.answers->>'free_text' AS comments
FROM eval_events e
LEFT JOIN feedback_responses f ON f.user_id = e.user_id
GROUP BY e.user_id, f.answers
ORDER BY e.user_id;
```

---

## 5. Limitations

- **Small sample**: 8–10 students is insufficient for statistical significance. Results are preliminary and indicative only.
- **Self-reported data**: Confidence, understanding ratings, and the planning time baseline are all self-reported, introducing recall bias.
- **Short duration**: 5–7 days covers only one exam preparation cycle. Long-term retention effects cannot be measured.
- **Selection bias**: Participants are self-selected (B.Tech students willing to try a new tool), likely more motivated than average.
- **No control group**: There is no randomised control. Comparing against the self-reported baseline is a weak comparison.

These limitations should be stated explicitly in the project report when presenting evaluation results.
