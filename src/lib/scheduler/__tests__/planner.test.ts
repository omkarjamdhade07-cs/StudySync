import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import { generatePlan } from '../planner'
import type { DayInput, PlanInput, TopicInput } from '../types'

const today = new Date('2025-01-15T00:00:00.000Z')

function makeDay(offsetDays: number, capacityMinutes = 90): DayInput {
  return {
    date: addDays(today, offsetDays),
    capacityMinutes,
    lockedTasks: [],
  }
}

function makeTopic(overrides: Partial<TopicInput> & Pick<TopicInput, 'id' | 'subjectId'>): TopicInput {
  return {
    subjectName: 'Physics',
    examDate: addDays(today, 10),
    difficulty: 3,
    confidence: 3,
    estimatedMinutes: 60,
    coverage: 0,
    missedCount: 0,
    lastThreeUnderstandings: [],
    revisionStage: 0,
    ...overrides,
  }
}

const defaultPrefs = { blockMinutes: 45, maxConsecutiveSameSubject: 2 }

describe('generatePlan — basic scheduling', () => {
  it('returns no tasks for empty topics', () => {
    const input: PlanInput = {
      today,
      topics: [],
      days: [makeDay(0)],
      preferences: defaultPrefs,
    }
    const { tasks } = generatePlan(input)
    expect(tasks).toHaveLength(0)
  })

  it('schedules a task on a day with capacity', () => {
    const input: PlanInput = {
      today,
      topics: [makeTopic({ id: 't1', subjectId: 's1' })],
      days: [makeDay(0, 90)],
      preferences: defaultPrefs,
    }
    const { tasks } = generatePlan(input)
    expect(tasks.length).toBeGreaterThan(0)
  })

  it('generates no tasks for a zero-availability day', () => {
    const input: PlanInput = {
      today,
      topics: [makeTopic({ id: 't1', subjectId: 's1' })],
      days: [makeDay(0, 0)],
      preferences: defaultPrefs,
    }
    const { tasks } = generatePlan(input)
    expect(tasks).toHaveLength(0)
  })

  it('skips topics whose exam has already passed', () => {
    const input: PlanInput = {
      today,
      topics: [makeTopic({ id: 't1', subjectId: 's1', examDate: addDays(today, -1) })],
      days: [makeDay(0, 90)],
      preferences: defaultPrefs,
    }
    const { tasks } = generatePlan(input)
    expect(tasks).toHaveLength(0)
  })

  it('is deterministic — same input produces same output', () => {
    const input: PlanInput = {
      today,
      topics: [
        makeTopic({ id: 't1', subjectId: 's1', difficulty: 4 }),
        makeTopic({ id: 't2', subjectId: 's2', subjectName: 'Math', difficulty: 2, examDate: addDays(today, 8) }),
      ],
      days: [makeDay(0, 90), makeDay(1, 90), makeDay(2, 90)],
      preferences: defaultPrefs,
    }
    const result1 = generatePlan(input)
    const result2 = generatePlan(input)
    expect(result1.tasks.length).toBe(result2.tasks.length)
    result1.tasks.forEach((task, i) => {
      expect(task.topicId).toBe(result2.tasks[i].topicId)
      expect(task.priorityScore).toBeCloseTo(result2.tasks[i].priorityScore, 5)
    })
  })
})

describe('generatePlan — interleaving', () => {
  it('does not schedule the same subject more than maxConsecutiveSameSubject times in a row when another subject has work', () => {
    const input: PlanInput = {
      today,
      topics: [
        makeTopic({ id: 't1', subjectId: 's1', estimatedMinutes: 200, confidence: 1 }), // very high priority
        makeTopic({ id: 't2', subjectId: 's2', subjectName: 'Math', estimatedMinutes: 200, confidence: 3, examDate: addDays(today, 10) }),
      ],
      days: [makeDay(0, 240)], // 4 × 45 min blocks possible
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { tasks } = generatePlan(input)

    // Count consecutive same-subject blocks
    let maxConsecutive = 0
    let currentConsecutive = 1
    for (let i = 1; i < tasks.length; i++) {
      if (tasks[i].subjectId === tasks[i - 1].subjectId) {
        currentConsecutive++
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
        currentConsecutive = 1
      }
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
    expect(maxConsecutive).toBeLessThanOrEqual(2)
  })
})

describe('generatePlan — final-day rule', () => {
  it('schedules no new study tasks for a subject on the day before its exam', () => {
    // exam is tomorrow (day 1), so today (day 0) is the final day
    const input: PlanInput = {
      today,
      topics: [makeTopic({ id: 't1', subjectId: 's1', examDate: addDays(today, 1), coverage: 0 })],
      days: [makeDay(0, 90)],
      preferences: defaultPrefs,
    }
    const { tasks } = generatePlan(input)
    // The day before the exam allows revision only — but since coverage=0 there's no prior study,
    // the topic should NOT be scheduled on the final day as a new study task
    const studyTasksOnFinalDay = tasks.filter(t => t.type === 'study')
    expect(studyTasksOnFinalDay).toHaveLength(0)
  })
})

describe('generatePlan — overload detection', () => {
  it('detects shortfall when total needed > total available before exam', () => {
    const input: PlanInput = {
      today,
      topics: [
        makeTopic({ id: 't1', subjectId: 's1', estimatedMinutes: 600, coverage: 0, examDate: addDays(today, 2) }),
      ],
      days: [makeDay(0, 60), makeDay(1, 60)], // 120 min total, need 600
      preferences: defaultPrefs,
    }
    const { shortfalls } = generatePlan(input)
    expect(shortfalls.length).toBeGreaterThan(0)
    expect(shortfalls[0].shortHours).toBeGreaterThan(0)
  })

  it('returns no shortfall when there is enough time', () => {
    const input: PlanInput = {
      today,
      topics: [
        makeTopic({ id: 't1', subjectId: 's1', estimatedMinutes: 60, coverage: 0, examDate: addDays(today, 5) }),
      ],
      days: Array.from({ length: 5 }, (_, i) => makeDay(i, 90)),
      preferences: defaultPrefs,
    }
    const { shortfalls } = generatePlan(input)
    expect(shortfalls).toHaveLength(0)
  })
})

describe('generatePlan — priority ordering', () => {
  it('schedules higher-priority topics first on a day', () => {
    // t1 has very low confidence (high priority), t2 has high confidence (lower priority)
    const examDate = addDays(today, 5) // close exam for urgency
    const input: PlanInput = {
      today,
      topics: [
        makeTopic({ id: 't1', subjectId: 's1', confidence: 1, examDate }),
        makeTopic({ id: 't2', subjectId: 's1', confidence: 5, examDate }),
      ],
      days: [makeDay(0, 50)], // only room for one block
      preferences: defaultPrefs,
    }
    const { tasks } = generatePlan(input)
    // The first (and only) task should be for the high-priority topic
    expect(tasks[0].topicId).toBe('t1')
  })
})
