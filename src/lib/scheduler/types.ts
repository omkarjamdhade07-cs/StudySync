/**
 * All input/output types for the scheduler module.
 * These are pure data shapes — no Supabase Row types here.
 */

export interface TopicInput {
  id: string
  subjectId: string
  subjectName: string
  examDate: Date
  difficulty: number      // 1–5
  confidence: number      // 1–5
  estimatedMinutes: number
  coverage: number        // 0–1
  missedCount: number
  /** Last 3 post-session understanding ratings (1–5). May be empty. */
  lastThreeUnderstandings: number[]
  revisionStage: number
}

export interface LockedTask {
  topicId: string
  date: Date
  durationMinutes: number
  type: 'study' | 'revision'
}

export interface DayInput {
  date: Date
  capacityMinutes: number
  /** Tasks that are locked and must remain on this day. */
  lockedTasks: LockedTask[]
}

export interface PlannerPreferences {
  blockMinutes: number
  maxConsecutiveSameSubject: number
}

export interface PlanInput {
  today: Date
  topics: TopicInput[]
  days: DayInput[]
  preferences: PlannerPreferences
}

export interface ScheduledTask {
  topicId: string
  subjectId: string
  date: Date
  startOrder: number
  durationMinutes: number
  type: 'study' | 'revision'
  priorityScore: number
  reasons: string[]
  /** Locked tasks cannot be moved by re-planning. */
  locked: boolean
}

export interface Shortfall {
  subjectId: string
  subjectName: string
  /** Hours short before the exam date. */
  shortHours: number
}

export interface PlanOutput {
  tasks: ScheduledTask[]
  shortfalls: Shortfall[]
}

export interface ReplanTrigger {
  type: 'missed' | 'reschedule' | 'low_understanding' | 'availability_change' | 'exam_date_change' | 'manual'
  taskId?: string
  topicId?: string
}

export interface ReplanParams {
  today: Date
  existingTasks: ScheduledTask[]
  trigger: ReplanTrigger
  /** Updated topic state (after applying the event mutation externally). */
  topics: TopicInput[]
  days: DayInput[]
  preferences: PlannerPreferences
}

export interface PlanEventSummary {
  trigger: string
  summary: string
  changes: {
    moved: Array<{ topicName: string; from: string; to: string }>
    added: Array<{ topicName: string; date: string; type: string }>
    removed: Array<{ topicName: string; date: string }>
    reason: string
  }
}
