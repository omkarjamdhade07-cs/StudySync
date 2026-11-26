/**
 * Priority scoring for the adaptive scheduler.
 * All functions are pure — no side effects, no I/O.
 */
import { differenceInCalendarDays } from 'date-fns'
import {
  WEIGHTS,
  WEAKNESS_WEIGHTS,
  DEFAULT_UNDERSTANDING_N,
  MAX_MISSED_FOR_WEAKNESS,
} from './config'
import type { TopicInput } from './types'

/**
 * Urgency score: 1.0 on the exam day, ~0.5 at 7 days out, ~0.2 at 28 days out.
 * Formula: 1 / (1 + daysLeft / 7)
 */
export function computeUrgency(examDate: Date, planningDay: Date): number {
  const daysLeft = Math.max(0, differenceInCalendarDays(examDate, planningDay))
  return 1 / (1 + daysLeft / 7)
}

/**
 * Normalised understanding average from the last 3 post-session ratings.
 * Returns DEFAULT_UNDERSTANDING_N if no ratings exist.
 * Ratings are 1–5; normalised to 0–1.
 */
function computeUnderstandingAvgN(lastThree: number[]): number {
  if (lastThree.length === 0) return DEFAULT_UNDERSTANDING_N
  const avg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length
  return (avg - 1) / 4  // maps 1→0, 5→1
}

/**
 * Weakness score: composite of confidence deficit, missed sessions, and low understanding.
 * Returns a value in [0, 1].
 */
export function computeWeakness(topic: TopicInput): number {
  const confidenceWeakness = (5 - topic.confidence) / 4   // low confidence → high weakness
  const missedWeakness = Math.min(topic.missedCount, MAX_MISSED_FOR_WEAKNESS) / MAX_MISSED_FOR_WEAKNESS
  const understandingAvgN = computeUnderstandingAvgN(topic.lastThreeUnderstandings)
  const understandingWeakness = 1 - understandingAvgN    // low understanding → high weakness

  return (
    WEAKNESS_WEIGHTS.CONFIDENCE * confidenceWeakness +
    WEAKNESS_WEIGHTS.MISSED * missedWeakness +
    WEAKNESS_WEIGHTS.UNDERSTANDING * understandingWeakness
  )
}

/**
 * Full priority score for a topic on a given planning day.
 * Returns 0 if the topic's exam has already passed.
 */
export function computePriority(
  topic: TopicInput,
  planningDay: Date
): { score: number; reasons: string[] } {
  // Topics whose exam has passed contribute nothing — skip them
  if (differenceInCalendarDays(topic.examDate, planningDay) < 0) {
    return { score: 0, reasons: [] }
  }

  const urgency = computeUrgency(topic.examDate, planningDay)
  const difficultyN = (topic.difficulty - 1) / 4   // maps 1→0, 5→1
  const weakness = computeWeakness(topic)
  const remaining = 1 - topic.coverage

  const score =
    WEIGHTS.URGENCY * urgency +
    WEIGHTS.DIFFICULTY * difficultyN +
    WEIGHTS.WEAKNESS * weakness +
    WEIGHTS.REMAINING * remaining

  const reasons = buildReasons(topic, planningDay, urgency, difficultyN, weakness, remaining)

  return { score, reasons }
}

/**
 * Builds plain-English reason strings explaining the top contributing factors.
 * Always returns at least one reason.
 */
export function buildReasons(
  topic: TopicInput,
  planningDay: Date,
  urgency: number,
  difficultyN: number,
  weakness: number,
  remaining: number
): string[] {
  const reasons: string[] = []
  const daysLeft = Math.max(0, differenceInCalendarDays(topic.examDate, planningDay))

  // Urgency reason
  if (daysLeft === 0) {
    reasons.push(`Exam today — ${topic.subjectName}`)
  } else if (daysLeft === 1) {
    reasons.push(`Exam tomorrow — ${topic.subjectName}`)
  } else if (urgency > 0.4) {
    reasons.push(`Exam in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${topic.subjectName})`)
  }

  // Confidence reason
  if (topic.confidence <= 2) {
    reasons.push(`You rated confidence ${topic.confidence}/5`)
  } else if (topic.confidence === 3) {
    reasons.push(`Confidence is average (${topic.confidence}/5)`)
  }

  // Missed sessions reason
  if (topic.missedCount > 0) {
    reasons.push(
      `Missed ${topic.missedCount} session${topic.missedCount !== 1 ? 's' : ''} — moved up`
    )
  }

  // Difficulty reason
  if (difficultyN >= 0.75) {
    reasons.push(`High difficulty topic (${topic.difficulty}/5)`)
  }

  // Remaining coverage reason
  if (remaining >= 0.9) {
    reasons.push(`Not started yet`)
  } else if (remaining >= 0.5) {
    reasons.push(`${Math.round(remaining * 100)}% still to cover`)
  }

  // Fallback: always have at least one reason
  if (reasons.length === 0) {
    const dominantFactor = getDominantFactor(urgency, difficultyN, weakness, remaining)
    reasons.push(dominantFactor)
  }

  // Return the top 3 reasons
  return reasons.slice(0, 3)
}

function getDominantFactor(
  urgency: number,
  difficultyN: number,
  weakness: number,
  remaining: number
): string {
  const factors = [
    { label: 'Exam approaching soon', value: WEIGHTS.URGENCY * urgency },
    { label: 'Challenging topic', value: WEIGHTS.DIFFICULTY * difficultyN },
    { label: 'Needs more practice', value: WEIGHTS.WEAKNESS * weakness },
    { label: 'Coverage needed', value: WEIGHTS.REMAINING * remaining },
  ]
  factors.sort((a, b) => b.value - a.value)
  return factors[0].label
}

/**
 * Computes each factor's percentage contribution to the total score.
 * Used by the WhyThisPopover bar chart.
 */
export function computeFactorContributions(
  topic: TopicInput,
  planningDay: Date
): { urgency: number; difficulty: number; weakness: number; remaining: number } {
  const urgency = computeUrgency(topic.examDate, planningDay)
  const difficultyN = (topic.difficulty - 1) / 4
  const weakness = computeWeakness(topic)
  const remaining = 1 - topic.coverage

  const total =
    WEIGHTS.URGENCY * urgency +
    WEIGHTS.DIFFICULTY * difficultyN +
    WEIGHTS.WEAKNESS * weakness +
    WEIGHTS.REMAINING * remaining

  if (total === 0) return { urgency: 25, difficulty: 25, weakness: 25, remaining: 25 }

  return {
    urgency: Math.round((WEIGHTS.URGENCY * urgency / total) * 100),
    difficulty: Math.round((WEIGHTS.DIFFICULTY * difficultyN / total) * 100),
    weakness: Math.round((WEIGHTS.WEAKNESS * weakness / total) * 100),
    remaining: Math.round((WEIGHTS.REMAINING * remaining / total) * 100),
  }
}
