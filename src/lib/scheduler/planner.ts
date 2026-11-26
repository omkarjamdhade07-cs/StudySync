/**
 * Core plan generation algorithm.
 * generatePlan is a pure function: same input → same output, no I/O.
 */
import { addDays, differenceInCalendarDays, format, isBefore, isEqual } from 'date-fns'
import { MAX_HORIZON_DAYS } from './config'
import { computePriority } from './scoring'
import type { DayInput, PlanInput, PlanOutput, ScheduledTask, Shortfall, TopicInput } from './types'

/**
 * Generates a full study plan from today to the latest exam date.
 * Returns scheduled tasks and any detected shortfalls (overload warnings).
 */
export function generatePlan(input: PlanInput): PlanOutput {
  const { today, topics, days, preferences } = input

  if (topics.length === 0) return { tasks: [], shortfalls: [] }

  // Build topic remaining-need map (minutes still needed per topic)
  const remainingNeed = new Map<string, number>()
  for (const topic of topics) {
    const needed = Math.max(0, (1 - topic.coverage) * topic.estimatedMinutes)
    remainingNeed.set(topic.id, needed)
  }

  const allTasks: ScheduledTask[] = []

  // ── Pass 1: greedy fill each day ──────────────────────────────────────────
  for (const day of days) {
    // Deduct locked tasks from capacity
    const lockedMinutes = day.lockedTasks.reduce((sum, t) => sum + t.durationMinutes, 0)
    let capacityLeft = Math.max(0, day.capacityMinutes - lockedMinutes)

    if (capacityLeft <= 0) continue

    // Topics available today: exam not passed, still have remaining need
    const availableTopics = topics.filter(t => {
      const daysToExam = differenceInCalendarDays(t.examDate, day.date)
      return daysToExam >= 0 && (remainingNeed.get(t.id) ?? 0) > 0
    })

    if (availableTopics.length === 0) continue

    // Final-day rule: the day before an exam → revision-only for that subject
    const finalDaySubjectIds = topics
      .filter(t => differenceInCalendarDays(t.examDate, day.date) === 1)
      .map(t => t.subjectId)

    let startOrder = 0
    let consecutiveSameSubject = 0
    let lastSubjectId: string | null = null

    while (capacityLeft >= Math.min(preferences.blockMinutes, 20)) {
      // Recompute priorities for today
      const scored = availableTopics
        .filter(t => (remainingNeed.get(t.id) ?? 0) > 0)
        .filter(t => {
          // Final-day rule: skip new study topics for the exam-day subject
          if (finalDaySubjectIds.includes(t.subjectId)) return false
          return true
        })
        .map(t => ({ topic: t, ...computePriority(t, day.date) }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)

      if (scored.length === 0) break

      // Interleaving: skip the top subject if we've hit the consecutive limit
      let chosenEntry = scored[0]
      if (
        lastSubjectId !== null &&
        chosenEntry.topic.subjectId === lastSubjectId &&
        consecutiveSameSubject >= preferences.maxConsecutiveSameSubject
      ) {
        // Find the first topic from a different subject
        const alternate = scored.find(s => s.topic.subjectId !== lastSubjectId)
        if (alternate) {
          chosenEntry = alternate
        } else {
          // No other subject available — allow same subject to continue
        }
      }

      const topic = chosenEntry.topic
      const need = remainingNeed.get(topic.id) ?? 0
      const blockSize = Math.min(preferences.blockMinutes, need, capacityLeft)

      if (blockSize < 10) break  // blocks shorter than 10 min aren't worth scheduling

      const task: ScheduledTask = {
        topicId: topic.id,
        subjectId: topic.subjectId,
        date: day.date,
        startOrder: startOrder++,
        durationMinutes: blockSize,
        type: 'study',
        priorityScore: chosenEntry.score,
        reasons: chosenEntry.reasons,
        locked: false,
      }

      allTasks.push(task)
      remainingNeed.set(topic.id, need - blockSize)
      capacityLeft -= blockSize

      // Track consecutive same-subject blocks
      if (topic.subjectId === lastSubjectId) {
        consecutiveSameSubject++
      } else {
        consecutiveSameSubject = 1
        lastSubjectId = topic.subjectId
      }
    }
  }

  // ── Pass 2: shortfall detection ───────────────────────────────────────────
  const shortfalls = detectShortfalls(topics, days, today)

  return { tasks: allTasks, shortfalls }
}

/**
 * Detects subjects where total required minutes exceed available minutes
 * before the exam date.
 */
function detectShortfalls(
  topics: TopicInput[],
  days: DayInput[],
  today: Date
): Shortfall[] {
  // Group topics by subject
  const subjectMap = new Map<string, { name: string; examDate: Date; neededMinutes: number }>()

  for (const topic of topics) {
    const needed = Math.max(0, (1 - topic.coverage) * topic.estimatedMinutes)
    if (needed === 0) continue

    const existing = subjectMap.get(topic.subjectId)
    if (existing) {
      existing.neededMinutes += needed
    } else {
      subjectMap.set(topic.subjectId, {
        name: topic.subjectName,
        examDate: topic.examDate,
        neededMinutes: needed,
      })
    }
  }

  const shortfalls: Shortfall[] = []

  for (const [subjectId, { name, examDate, neededMinutes }] of subjectMap) {
    // Available minutes = sum of day capacities from today up to (but not including) exam day
    const availableMinutes = days
      .filter(d => !isBefore(d.date, today) && isBefore(d.date, examDate))
      .reduce((sum, d) => sum + d.capacityMinutes, 0)

    if (neededMinutes > availableMinutes) {
      shortfalls.push({
        subjectId,
        subjectName: name,
        shortHours: Math.round(((neededMinutes - availableMinutes) / 60) * 10) / 10,
      })
    }
  }

  return shortfalls
}

/**
 * Builds the list of DayInput objects from today to the latest exam date,
 * capped at MAX_HORIZON_DAYS. Called by the UI before invoking generatePlan.
 */
export function buildDayList(
  today: Date,
  topics: TopicInput[],
  weekdayAvailability: Map<number, number>,  // weekday (0-6) → minutes
  dateOverrides: Map<string, number>          // 'yyyy-MM-dd' → minutes
): DayInput[] {
  if (topics.length === 0) return []

  const latestExam = topics.reduce((latest, t) =>
    t.examDate > latest ? t.examDate : latest, topics[0].examDate
  )

  const horizonEnd = addDays(today, MAX_HORIZON_DAYS)
  const endDate = isBefore(latestExam, horizonEnd) ? latestExam : horizonEnd

  const days: DayInput[] = []
  let current = today

  while (
    isBefore(current, endDate) ||
    isEqual(current, endDate)
  ) {
    const dateStr = format(current, 'yyyy-MM-dd')
    const override = dateOverrides.get(dateStr)
    const weekdayMinutes = weekdayAvailability.get(current.getDay()) ?? 0
    const capacityMinutes = override !== undefined ? override : weekdayMinutes

    days.push({
      date: new Date(current),
      capacityMinutes,
      lockedTasks: [],
    })

    current = addDays(current, 1)
  }

  return days
}
