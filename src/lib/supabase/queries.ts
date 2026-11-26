/**
 * Typed query helpers for every Supabase table.
 * All functions return { data, error } and wrap calls in try/catch.
 * Never import the supabase client directly outside this file and hooks/.
 */
import { supabase } from './client'
import type {
  ProfileRow,
  SubjectRow,
  TopicRow,
  AvailabilityRow,
  DateOverrideRow,
  PreferencesRow,
  TaskRow,
  PlanEventRow,
  EvalEventRow,
  FeedbackResponseRow,
  FeedbackAnswers,
  PlanEventChanges,
} from './types'

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data: data as ProfileRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function upsertProfile(profile: Partial<ProfileRow> & { id: string }) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single()
    return { data: data as ProfileRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export async function getSubjects(userId: string) {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('exam_date', { ascending: true })
    return { data: data as SubjectRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function upsertSubject(subject: Omit<SubjectRow, 'id'> & { id?: string }) {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .upsert(subject)
      .select()
      .single()
    return { data: data as SubjectRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteSubject(id: string) {
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export async function getTopics(userId: string) {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', userId)
    return { data: data as TopicRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteTopicsBySubject(subjectId: string) {
  try {
    const { error } = await supabase.from('topics').delete().eq('subject_id', subjectId)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

export async function deleteSubjectWithTopics(subjectId: string) {
  // Topics cascade-delete with the subject via FK, but we also delete tasks
  try {
    // Delete tasks linked to topics of this subject first
    const { data: topics } = await supabase.from('topics').select('id').eq('subject_id', subjectId)
    if (topics && topics.length > 0) {
      const topicIds = topics.map((t: { id: string }) => t.id)
      await supabase.from('tasks').delete().in('topic_id', topicIds)
    }
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

export async function resetAllUserData(userId: string) {
  // Delete in dependency order: tasks → topics → subjects → availability → preferences → plan_events → eval_events
  try {
    await supabase.from('tasks').delete().eq('user_id', userId)
    await supabase.from('topics').delete().eq('user_id', userId)
    await supabase.from('subjects').delete().eq('user_id', userId)
    await supabase.from('availability').delete().eq('user_id', userId)
    await supabase.from('preferences').delete().eq('user_id', userId)
    await supabase.from('plan_events').delete().eq('user_id', userId)
    await supabase.from('eval_events').delete().eq('user_id', userId)
    await supabase.from('feedback_responses').delete().eq('user_id', userId)
    return { error: null }
  } catch (err) {
    return { error: err }
  }
}

export async function getTopicsBySubject(subjectId: string) {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
    return { data: data as TopicRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function upsertTopic(topic: Omit<TopicRow, 'id'> & { id?: string }) {
  try {
    const { data, error } = await supabase
      .from('topics')
      .upsert(topic)
      .select()
      .single()
    return { data: data as TopicRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function updateTopic(id: string, updates: Partial<TopicRow>) {
  try {
    const { data, error } = await supabase
      .from('topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data: data as TopicRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteTopic(id: string) {
  try {
    const { error } = await supabase.from('topics').delete().eq('id', id)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getAvailability(userId: string) {
  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId)
    return { data: data as AvailabilityRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function upsertAvailability(row: Omit<AvailabilityRow, 'id'> & { id?: string }) {
  try {
    const { data, error } = await supabase
      .from('availability')
      .upsert(row, { onConflict: 'user_id,weekday' })
      .select()
      .single()
    return { data: data as AvailabilityRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Date Overrides ───────────────────────────────────────────────────────────

export async function getDateOverrides(userId: string) {
  try {
    const { data, error } = await supabase
      .from('date_overrides')
      .select('*')
      .eq('user_id', userId)
    return { data: data as DateOverrideRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function upsertDateOverride(row: Omit<DateOverrideRow, 'id'> & { id?: string }) {
  try {
    const { data, error } = await supabase
      .from('date_overrides')
      .upsert(row)
      .select()
      .single()
    return { data: data as DateOverrideRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteDateOverride(id: string) {
  try {
    const { error } = await supabase.from('date_overrides').delete().eq('id', id)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data: data as PreferencesRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function upsertPreferences(prefs: PreferencesRow) {
  try {
    const { data, error } = await supabase
      .from('preferences')
      .upsert(prefs)
      .select()
      .single()
    return { data: data as PreferencesRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasksForDate(userId: string, date: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, topics(*, subjects(*))')
      .eq('user_id', userId)
      .eq('date', date)
      .order('start_order', { ascending: true })
    return { data: data as (TaskRow & { topics: TopicRow & { subjects: SubjectRow } })[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getTasksForDateRange(userId: string, fromDate: string, toDate: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, topics(*, subjects(*))')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true })
      .order('start_order', { ascending: true })
    return { data: data as (TaskRow & { topics: TopicRow & { subjects: SubjectRow } })[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getFuturePlannedTasks(userId: string, fromDate: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'planned')
      .gte('date', fromDate)
    return { data: data as TaskRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function insertTasks(tasks: Omit<TaskRow, 'id'>[]) {
  try {
    const { data, error } = await supabase.from('tasks').insert(tasks).select()
    return { data: data as TaskRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function updateTask(id: string, updates: Partial<TaskRow>) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data: data as TaskRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteFuturePlannedTasks(userId: string, fromDate: string) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'planned')
      .gte('date', fromDate)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

// ─── Plan Events ──────────────────────────────────────────────────────────────

export async function insertPlanEvent(event: Omit<PlanEventRow, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('plan_events')
      .insert(event)
      .select()
      .single()
    return { data: data as PlanEventRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getRecentPlanEvents(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('plan_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data as PlanEventRow[] | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getLatestPlanEvent(userId: string) {
  try {
    const { data, error } = await supabase
      .from('plan_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    return { data: data as PlanEventRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Eval Events ──────────────────────────────────────────────────────────────

/**
 * Records an evaluation event only if the user has opted in to eval sharing.
 * Always check the eval_sharing_enabled preference before calling this.
 */
export async function recordEval(
  userId: string,
  event: string,
  value?: number,
  meta?: Record<string, unknown>
) {
  try {
    const { data: prefs } = await getPreferences(userId)
    if (!prefs?.eval_sharing_enabled) return { error: null }

    const { data, error } = await supabase
      .from('eval_events')
      .insert({ user_id: userId, event, value: value ?? null, meta: meta ?? null })
      .select()
      .single()
    return { data: data as EvalEventRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function getFeedbackResponse(userId: string) {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data: data as FeedbackResponseRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function insertFeedbackResponse(userId: string, answers: FeedbackAnswers) {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .insert({ user_id: userId, answers })
      .select()
      .single()
    return { data: data as FeedbackResponseRow | null, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Data Export ──────────────────────────────────────────────────────────────

export async function exportUserData(userId: string) {
  try {
    const [
      { data: profile },
      { data: subjects },
      { data: topics },
      { data: availability },
      { data: dateOverrides },
      { data: preferences },
      { data: tasks },
      { data: planEvents },
    ] = await Promise.all([
      getProfile(userId),
      getSubjects(userId),
      getTopics(userId),
      getAvailability(userId),
      getDateOverrides(userId),
      getPreferences(userId),
      supabase.from('tasks').select('*').eq('user_id', userId).then(r => r),
      getRecentPlanEvents(userId, 1000),
    ])

    return {
      exportedAt: new Date().toISOString(),
      userId,
      data: {
        profile,
        subjects,
        topics,
        availability,
        dateOverrides,
        preferences,
        tasks,
        planEvents,
      },
    }
  } catch (err) {
    throw new Error(`Export failed: ${String(err)}`)
  }
}

// Re-export PlanEventChanges so callers don't need to import from types directly
export type { PlanEventChanges }
