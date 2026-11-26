import { describe, it, expect } from 'vitest'
import { addDays, format } from 'date-fns'
import { replan } from '../replanner'
import type { DayInput, ReplanParams, ScheduledTask, TopicInput } from '../types'

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

function makeTask(overrides: Partial<ScheduledTask> & Pick<ScheduledTask, 'topicId' | 'date'>): ScheduledTask {
  return {
    subjectId: 's1',
    startOrder: 0,
    durationMinutes: 45,
    type: 'study',
    priorityScore: 0.5,
    reasons: ['Test reason'],
    locked: false,
    ...overrides,
  }
}

describe('replan — task preservation', () => {
  it('preserves done (locked) tasks after re-plan', () => {
    const doneTask = makeTask({
      topicId: 't1',
      date: addDays(today, -1), // yesterday — in the past
      locked: true,
    })
    const params: ReplanParams = {
      today,
      existingTasks: [doneTask],
      trigger: { type: 'missed' },
      topics: [makeTopic({ id: 't1', subjectId: 's1', coverage: 0.5 })],
      days: [makeDay(0), makeDay(1)],
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { output } = replan(params)
    // The past locked task should be in the output
    const preserved = output.tasks.find(
      t => t.topicId === 't1' && format(t.date, 'yyyy-MM-dd') === format(addDays(today, -1), 'yyyy-MM-dd')
    )
    expect(preserved).toBeDefined()
    expect(preserved?.locked).toBe(true)
  })

  it('does not move a locked future task', () => {
    const lockedFutureTask = makeTask({
      topicId: 't1',
      date: addDays(today, 2),
      locked: true,
    })
    const params: ReplanParams = {
      today,
      existingTasks: [lockedFutureTask],
      trigger: { type: 'manual' },
      topics: [makeTopic({ id: 't1', subjectId: 's1' })],
      days: [makeDay(0), makeDay(1), makeDay(2), makeDay(3)],
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { output } = replan(params)
    const lockedTask = output.tasks.find(t => t.locked && t.topicId === 't1')
    expect(lockedTask).toBeDefined()
    expect(format(lockedTask!.date, 'yyyy-MM-dd')).toBe(format(addDays(today, 2), 'yyyy-MM-dd'))
  })
})

describe('replan — missed task handling', () => {
  it('re-schedules a topic that was missed (after missed_count increment)', () => {
    const missedTask = makeTask({
      topicId: 't1',
      date: today,
      locked: false,
    })
    // After missed, missedCount is incremented by the caller before replan
    const updatedTopic = makeTopic({ id: 't1', subjectId: 's1', missedCount: 1, coverage: 0 })
    const params: ReplanParams = {
      today,
      existingTasks: [missedTask],
      trigger: { type: 'missed', topicId: 't1' },
      topics: [updatedTopic],
      days: [makeDay(0), makeDay(1), makeDay(2)],
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { output } = replan(params)
    // The topic should appear in future tasks
    const rescheduled = output.tasks.find(t => t.topicId === 't1')
    expect(rescheduled).toBeDefined()
  })

  it('provides a summary with the missed trigger text', () => {
    const params: ReplanParams = {
      today,
      existingTasks: [],
      trigger: { type: 'missed' },
      topics: [makeTopic({ id: 't1', subjectId: 's1', missedCount: 1 })],
      days: [makeDay(0), makeDay(1)],
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { summary } = replan(params)
    expect(summary.trigger).toBe('missed')
    expect(summary.summary.toLowerCase()).toContain('miss')
  })
})

describe('replan — low understanding', () => {
  it('schedules extra sessions when understanding is low (passed in via updated topic state)', () => {
    // Simulate: topic with low understanding → higher weakness → higher priority
    const weakTopic = makeTopic({
      id: 't1', subjectId: 's1',
      lastThreeUnderstandings: [1, 2, 1], // very low
      confidence: 2,
      coverage: 0.3,
    })
    const params: ReplanParams = {
      today,
      existingTasks: [],
      trigger: { type: 'low_understanding', topicId: 't1' },
      topics: [weakTopic],
      days: Array.from({ length: 5 }, (_, i) => makeDay(i)),
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { output } = replan(params)
    const sessionsForTopic = output.tasks.filter(t => t.topicId === 't1')
    expect(sessionsForTopic.length).toBeGreaterThan(0)
  })
})

describe('replan — summary diff', () => {
  it('summary changes.added contains newly added tasks', () => {
    const params: ReplanParams = {
      today,
      existingTasks: [], // no existing tasks
      trigger: { type: 'manual' },
      topics: [makeTopic({ id: 't1', subjectId: 's1', coverage: 0 })],
      days: [makeDay(0), makeDay(1)],
      preferences: { blockMinutes: 45, maxConsecutiveSameSubject: 2 },
    }
    const { summary } = replan(params)
    expect(summary.changes.added.length).toBeGreaterThan(0)
  })
})
