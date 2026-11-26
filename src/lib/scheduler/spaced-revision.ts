/**
 * Spaced repetition revision task generation.
 * When a study task is marked Done, revision tasks are created at +1, +3, +7, +14 days.
 */
import { addDays, differenceInCalendarDays, format, isEqual } from 'date-fns'
import { REVISION_DURATION, REVISION_OFFSETS, REVISION_PRIORITY_BOOST } from './config'
import { computePriority } from './scoring'
import type { DayInput, ScheduledTask, TopicInput } from './types'

/**
 * Creates revision tasks for a completed study task.
 * Skips any revision that falls after the topic's exam date.
 * Falls back to the nearest earlier available day if the target day is full.
 */
export function createRevisionTasks(
  completedTask: ScheduledTask,
  topic: TopicInput,
  allDays: DayInput[],
  existingTasks: ScheduledTask[]
): ScheduledTask[] {
  const revisionTasks: ScheduledTask[] = []

  // Build a map of used capacity per day
  const usedMinutes = new Map<string, number>()
  for (const task of existingTasks) {
    const key = format(task.date, 'yyyy-MM-dd')
    usedMinutes.set(key, (usedMinutes.get(key) ?? 0) + task.durationMinutes)
  }

  let revisionStage = topic.revisionStage + 1

  for (const offset of REVISION_OFFSETS) {
    const targetDate = addDays(completedTask.date, offset)

    // Skip if target is after exam date
    if (differenceInCalendarDays(targetDate, topic.examDate) > 0) continue

    // Find a day with available capacity, starting from targetDate and going backwards
    const targetDay = findAvailableDay(targetDate, allDays, usedMinutes)
    if (!targetDay) continue

    const dayKey = format(targetDay, 'yyyy-MM-dd')
    const baseScore = computePriority(topic, targetDay).score
    const boostedScore = Math.min(1, baseScore + REVISION_PRIORITY_BOOST)

    // Determine start order: how many tasks are already on this day
    const tasksOnDay = existingTasks.filter(t =>
      format(t.date, 'yyyy-MM-dd') === dayKey
    ).length + revisionTasks.filter(t =>
      format(t.date, 'yyyy-MM-dd') === dayKey
    ).length

    const revisionTask: ScheduledTask = {
      topicId: topic.id,
      subjectId: topic.subjectId,
      date: targetDay,
      startOrder: tasksOnDay,
      durationMinutes: REVISION_DURATION,
      type: 'revision',
      priorityScore: boostedScore,
      reasons: [
        `Spaced revision #${revisionStage} (${offset} day${offset !== 1 ? 's' : ''} after first study)`,
        `Strengthens long-term recall of ${topic.subjectName}`,
      ],
      locked: false,
    }

    revisionTasks.push(revisionTask)
    usedMinutes.set(dayKey, (usedMinutes.get(dayKey) ?? 0) + REVISION_DURATION)
    revisionStage++
  }

  return revisionTasks
}

/**
 * Finds an available day for a revision task.
 * Tries targetDate first, then looks backwards for a day with spare capacity.
 */
function findAvailableDay(
  targetDate: Date,
  allDays: DayInput[],
  usedMinutes: Map<string, number>
): Date | null {
  // Try the target date and then up to 3 days before it
  for (let offset = 0; offset <= 3; offset++) {
    const candidate = addDays(targetDate, -offset)

    // Don't go before today relative to the planning context
    const dayData = allDays.find(d => isEqual(d.date, candidate))
    if (!dayData) continue

    const used = usedMinutes.get(format(candidate, 'yyyy-MM-dd')) ?? 0
    const remaining = dayData.capacityMinutes - used

    if (remaining >= REVISION_DURATION) return candidate
  }

  return null
}
