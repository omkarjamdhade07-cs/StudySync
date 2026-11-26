// Hand-written TypeScript types mirroring the Supabase Postgres schema.
// All DB row types are suffixed Row.

export interface ProfileRow {
  id: string
  display_name: string
  created_at: string
  avatar_url: string | null
  bio: string | null
  grade: string | null
  school_name: string | null
  college_name: string | null
  department: string | null
  semester: string | null
  roll_number: string | null
  city: string | null
  updated_at: string | null
}

export interface SubjectRow {
  id: string
  user_id: string
  name: string
  color: string
  exam_date: string // ISO date string YYYY-MM-DD
}

export interface TopicRow {
  id: string
  user_id: string
  subject_id: string
  name: string
  difficulty: number       // 1–5
  confidence: number       // 1–5
  estimated_minutes: number
  coverage: number         // 0–1
  missed_count: number
  last_studied_at: string | null
  revision_stage: number
}

export interface AvailabilityRow {
  id: string
  user_id: string
  weekday: number  // 0 = Sunday … 6 = Saturday
  minutes: number  // 0–1440
}

export interface DateOverrideRow {
  id: string
  user_id: string
  date: string   // YYYY-MM-DD
  minutes: number
}

export interface PreferencesRow {
  user_id: string
  block_minutes: number
  break_minutes: number
  max_consecutive_same_subject: number
  preferred_time: string | null
  eval_sharing_enabled: boolean
}

export interface TaskRow {
  id: string
  user_id: string
  topic_id: string
  date: string            // YYYY-MM-DD
  start_order: number
  duration_minutes: number
  type: 'study' | 'revision'
  status: 'planned' | 'done' | 'missed' | 'rescheduled'
  priority_score: number
  reasons: string[]
  locked: boolean
  understanding: number | null  // 1–5
  completed_at: string | null
}

export interface PlanEventRow {
  id: string
  user_id: string
  created_at: string
  trigger: string
  summary: string
  changes: PlanEventChanges
}

export interface PlanEventChanges {
  moved: Array<{ topicName: string; from: string; to: string }>
  added: Array<{ topicName: string; date: string; type: string }>
  removed: Array<{ topicName: string; date: string }>
  reason: string
}

export interface EvalEventRow {
  id: string
  user_id: string
  event: string
  value: number | null
  meta: Record<string, unknown> | null
  created_at: string
}

export interface FeedbackResponseRow {
  id: string
  user_id: string
  answers: FeedbackAnswers
  created_at: string
}

export interface FeedbackAnswers {
  sus: number[]        // 10 items, 1–5
  clarity: number      // 1–5
  trust: number        // 1–5
  time_saved: number   // minutes
  free_text: string
}
