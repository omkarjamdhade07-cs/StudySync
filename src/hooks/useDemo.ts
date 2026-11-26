/**
 * Demo mode hook — all state lives in localStorage, no Supabase calls.
 */
import { useState, useCallback, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { getDemoSeed, DEMO_SUBJECTS, DEMO_TOPIC_NAMES } from '@/lib/scheduler/demoSeed'
import { generatePlan } from '@/lib/scheduler/planner'
import { replan } from '@/lib/scheduler/replanner'
import type { ScheduledTask, TopicInput } from '@/lib/scheduler/types'

const DEMO_KEY = 'studysync_demo'

interface DemoState {
  today: string         // ISO date string
  topics: TopicInput[]
  tasks: ScheduledTask[]
  lastBanner: string | null
}

function initDemoState(today: Date): DemoState {
  const seed = getDemoSeed(today)
  const { tasks } = generatePlan(seed)
  return {
    today: format(today, 'yyyy-MM-dd'),
    topics: seed.topics,
    tasks,
    lastBanner: null,
  }
}

export function useDemo() {
  const isDemoMode = window.location.pathname.startsWith('/demo')

  const [demoState, setDemoState] = useState<DemoState | null>(() => {
    if (!isDemoMode) return null
    const stored = localStorage.getItem(DEMO_KEY)
    if (stored) {
      try {
        return JSON.parse(stored) as DemoState
      } catch {
        // corrupted — reinit
      }
    }
    return initDemoState(new Date())
  })

  // Persist to localStorage on every state change
  useEffect(() => {
    if (demoState) {
      localStorage.setItem(DEMO_KEY, JSON.stringify(demoState))
    }
  }, [demoState])

  const advanceDay = useCallback(() => {
    if (!demoState) return
    const newToday = addDays(new Date(demoState.today), 1)
    const seed = getDemoSeed(newToday)
    // Re-plan from new today
    const { output, summary } = replan({
      today: newToday,
      existingTasks: demoState.tasks.map(t => ({ ...t, date: new Date(t.date) })),
      trigger: { type: 'manual' },
      topics: demoState.topics.map(t => ({ ...t, examDate: new Date(t.examDate) })),
      days: seed.days,
      preferences: seed.preferences,
    })
    setDemoState({
      today: format(newToday, 'yyyy-MM-dd'),
      topics: demoState.topics,
      tasks: output.tasks,
      lastBanner: summary.summary,
    })
  }, [demoState])

  const simulateMissed = useCallback(() => {
    if (!demoState) return
    const today = new Date(demoState.today)
    const todayStr = format(today, 'yyyy-MM-dd')
    // Pick the first planned task today
    const target = demoState.tasks.find(t =>
      format(new Date(t.date), 'yyyy-MM-dd') === todayStr
    )
    if (!target) return

    // Increment missedCount on the topic
    const updatedTopics = demoState.topics.map(t =>
      t.id === target.topicId
        ? { ...t, missedCount: t.missedCount + 1 }
        : t
    )

    const seed = getDemoSeed(today)
    const { output, summary } = replan({
      today,
      existingTasks: demoState.tasks.map(t => ({ ...t, date: new Date(t.date) })),
      trigger: { type: 'missed', topicId: target.topicId },
      topics: updatedTopics.map(t => ({ ...t, examDate: new Date(t.examDate) })),
      days: seed.days,
      preferences: seed.preferences,
    })

    setDemoState({
      ...demoState,
      topics: updatedTopics,
      tasks: output.tasks,
      lastBanner: summary.summary,
    })
  }, [demoState])

  const resetDemo = useCallback(() => {
    localStorage.removeItem(DEMO_KEY)
    const fresh = initDemoState(new Date())
    setDemoState(fresh)
  }, [])

  // Enrich tasks with display names
  const enrichedTasks = demoState?.tasks.map(t => ({
    ...t,
    topicName: DEMO_TOPIC_NAMES[t.topicId] ?? t.topicId,
    subjectName: DEMO_SUBJECTS.find(s => s.id === t.subjectId)?.name ?? t.subjectId,
    subjectColor: DEMO_SUBJECTS.find(s => s.id === t.subjectId)?.color ?? '#6366f1',
    date: new Date(t.date),
  })) ?? []

  return {
    isDemoMode,
    demoState,
    enrichedTasks,
    subjects: DEMO_SUBJECTS,
    advanceDay,
    simulateMissed,
    resetDemo,
    lastBanner: demoState?.lastBanner ?? null,
    today: demoState ? new Date(demoState.today) : new Date(),
  }
}
