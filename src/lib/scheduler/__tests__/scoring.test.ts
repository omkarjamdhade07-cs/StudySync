import { describe, it, expect } from 'vitest'
import { addDays, subDays } from 'date-fns'
import { computeUrgency, computeWeakness, computePriority } from '../scoring'
import type { TopicInput } from '../types'

const baseDate = new Date('2025-01-15T00:00:00.000Z')

function makeTopic(overrides: Partial<TopicInput> = {}): TopicInput {
  return {
    id: 'topic-1',
    subjectId: 'sub-1',
    subjectName: 'Physics',
    examDate: addDays(baseDate, 14),
    difficulty: 3,
    confidence: 3,
    estimatedMinutes: 60,
    coverage: 0.5,
    missedCount: 0,
    lastThreeUnderstandings: [],
    revisionStage: 0,
    ...overrides,
  }
}

describe('computeUrgency', () => {
  it('returns 1.0 on the exam day (daysLeft = 0)', () => {
    const result = computeUrgency(baseDate, baseDate)
    expect(result).toBeCloseTo(1.0, 5)
  })

  it('returns ~0.5 when 7 days remain', () => {
    const result = computeUrgency(addDays(baseDate, 7), baseDate)
    expect(result).toBeCloseTo(0.5, 2)
  })

  it('returns ~0.2 when 28 days remain', () => {
    const result = computeUrgency(addDays(baseDate, 28), baseDate)
    // 1 / (1 + 28/7) = 1/5 = 0.2
    expect(result).toBeCloseTo(0.2, 2)
  })

  it('returns 1.0 when exam is in the past (daysLeft clamped to 0)', () => {
    const result = computeUrgency(subDays(baseDate, 3), baseDate)
    expect(result).toBeCloseTo(1.0, 5)
  })
})

describe('computeWeakness', () => {
  it('returns higher weakness for low confidence (1) than high confidence (5)', () => {
    const weak = computeWeakness(makeTopic({ confidence: 1 }))
    const strong = computeWeakness(makeTopic({ confidence: 5 }))
    expect(weak).toBeGreaterThan(strong)
  })

  it('increases weakness with missed count', () => {
    const noMiss = computeWeakness(makeTopic({ missedCount: 0 }))
    const missed = computeWeakness(makeTopic({ missedCount: 3 }))
    expect(missed).toBeGreaterThan(noMiss)
  })

  it('caps weakness contribution at 5 missed sessions', () => {
    const five = computeWeakness(makeTopic({ missedCount: 5 }))
    const ten = computeWeakness(makeTopic({ missedCount: 10 }))
    expect(five).toBeCloseTo(ten, 5)
  })

  it('increases weakness when understanding is low', () => {
    const highUnderstanding = computeWeakness(makeTopic({ lastThreeUnderstandings: [5, 5, 5] }))
    const lowUnderstanding = computeWeakness(makeTopic({ lastThreeUnderstandings: [1, 1, 1] }))
    expect(lowUnderstanding).toBeGreaterThan(highUnderstanding)
  })
})

describe('computePriority', () => {
  it('returns score = 0 for a topic whose exam has already passed', () => {
    const topic = makeTopic({ examDate: subDays(baseDate, 1) })
    const { score } = computePriority(topic, baseDate)
    expect(score).toBe(0)
  })

  it('weak topic (confidence=1, missed=3) outranks strong topic (confidence=5, missed=0) with equal urgency', () => {
    const examDate = addDays(baseDate, 7) // same urgency for both
    const weakTopic = makeTopic({ confidence: 1, missedCount: 3, examDate })
    const strongTopic = makeTopic({ id: 'topic-2', confidence: 5, missedCount: 0, examDate })
    const { score: weakScore } = computePriority(weakTopic, baseDate)
    const { score: strongScore } = computePriority(strongTopic, baseDate)
    expect(weakScore).toBeGreaterThan(strongScore)
  })

  it('returns a score between 0 and 1 for a normal topic', () => {
    const { score } = computePriority(makeTopic(), baseDate)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('returns reasons array with at least one entry', () => {
    const { reasons } = computePriority(makeTopic(), baseDate)
    expect(reasons.length).toBeGreaterThan(0)
  })

  it('is deterministic — same input produces same output', () => {
    const topic = makeTopic()
    const result1 = computePriority(topic, baseDate)
    const result2 = computePriority(topic, baseDate)
    expect(result1.score).toBe(result2.score)
    expect(result1.reasons).toEqual(result2.reasons)
  })
})

describe('buildReasons', () => {
  it('includes "Exam in N days" when urgency is high', () => {
    const topic = makeTopic({ examDate: addDays(baseDate, 3) })
    const { reasons } = computePriority(topic, baseDate)
    expect(reasons.some(r => r.includes('3 days'))).toBe(true)
  })

  it('includes missed sessions when missedCount > 0', () => {
    const topic = makeTopic({ missedCount: 2 })
    const { reasons } = computePriority(topic, baseDate)
    expect(reasons.some(r => r.toLowerCase().includes('miss'))).toBe(true)
  })

  it('includes confidence rating when confidence <= 2', () => {
    const topic = makeTopic({ confidence: 1 })
    const { reasons } = computePriority(topic, baseDate)
    expect(reasons.some(r => r.includes('confidence'))).toBe(true)
  })

  it('returns no more than 3 reasons', () => {
    const topic = makeTopic({ confidence: 1, missedCount: 3, difficulty: 5 })
    const { reasons } = computePriority(topic, baseDate)
    expect(reasons.length).toBeLessThanOrEqual(3)
  })
})
