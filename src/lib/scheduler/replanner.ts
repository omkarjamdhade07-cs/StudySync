/**
 * Re-planning logic: triggered when a task is missed, rescheduled,
 * understanding is low, or availability/exam date changes.
 */
import { format, isBefore, startOfDay } from 'date-fns'
import { generatePlan } from './planner'
import type {
  PlanOutput,
  PlanEventSummary,
  ReplanParams,
  ScheduledTask,
} from './types'

/**
 * Re-plans the schedule from today forward.
 * Preserves done tasks and locked tasks.
 * Drops all future planned tasks and regenerates them.
 */
export function replan(params: ReplanParams): {
  output: PlanOutput
  summary: PlanEventSummary
} {
  const { today, existingTasks, trigger, topics, days, preferences } = params

  const todayStart = startOfDay(today)

  // Partition tasks: keep done and locked, drop future planned
  const keptTasks = existingTasks.filter(t => {
    // Always keep done tasks
    if (t.type === 'study' && t.locked) return true
    // Keep locked tasks regardless of date
    if (t.locked) return true
    // For non-locked planned tasks before today, keep them (they're in the past)
    const taskDay = startOfDay(t.date)
    if (isBefore(taskDay, todayStart)) return true
    // Drop future planned tasks — they'll be regenerated
    return false
  })

  // Run the planner with updated topic state
  const output = generatePlan({
    today,
    topics,
    days,
    preferences,
  })

  // Build a diff summary comparing what changed
  const previousFutureTasks = existingTasks.filter(t => {
    const taskDay = startOfDay(t.date)
    return !isBefore(taskDay, todayStart) && !t.locked
  })

  const summary = buildPlanEventSummary(trigger.type, previousFutureTasks, output.tasks, topics)

  // Add back the kept tasks into output (they were kept, not regenerated)
  const keptTaskSet = new Set(keptTasks.map(t => t.topicId + format(t.date, 'yyyy-MM-dd')))
  const newTasks = output.tasks.filter(t => {
    const key = t.topicId + format(t.date, 'yyyy-MM-dd')
    return !keptTaskSet.has(key)
  })

  return {
    output: {
      tasks: [...keptTasks, ...newTasks],
      shortfalls: output.shortfalls,
    },
    summary,
  }
}

function buildPlanEventSummary(
  triggerType: string,
  oldTasks: ScheduledTask[],
  newTasks: ScheduledTask[],
  topics: Array<{ id: string; subjectName: string; name?: string }>
): PlanEventSummary {
  const topicNames = new Map(topics.map(t => [t.id, t.subjectName]))

  // Find moved tasks (same topic, different date)
  const oldByTopic = new Map<string, ScheduledTask[]>()
  for (const task of oldTasks) {
    const list = oldByTopic.get(task.topicId) ?? []
    list.push(task)
    oldByTopic.set(task.topicId, list)
  }

  const moved: PlanEventSummary['changes']['moved'] = []
  const added: PlanEventSummary['changes']['added'] = []
  const removed: PlanEventSummary['changes']['removed'] = []

  for (const newTask of newTasks) {
    const oldForTopic = oldByTopic.get(newTask.topicId) ?? []
    const matchingOld = oldForTopic.find(
      o => format(o.date, 'yyyy-MM-dd') !== format(newTask.date, 'yyyy-MM-dd')
    )
    if (matchingOld) {
      moved.push({
        topicName: topicNames.get(newTask.topicId) ?? 'Unknown topic',
        from: format(matchingOld.date, 'EEE MMM d'),
        to: format(newTask.date, 'EEE MMM d'),
      })
    } else {
      const wasInOld = oldTasks.some(o =>
        o.topicId === newTask.topicId &&
        format(o.date, 'yyyy-MM-dd') === format(newTask.date, 'yyyy-MM-dd')
      )
      if (!wasInOld) {
        added.push({
          topicName: topicNames.get(newTask.topicId) ?? 'Unknown topic',
          date: format(newTask.date, 'EEE MMM d'),
          type: newTask.type,
        })
      }
    }
  }

  for (const oldTask of oldTasks) {
    const stillExists = newTasks.some(n =>
      n.topicId === oldTask.topicId &&
      format(n.date, 'yyyy-MM-dd') === format(oldTask.date, 'yyyy-MM-dd')
    )
    if (!stillExists) {
      removed.push({
        topicName: topicNames.get(oldTask.topicId) ?? 'Unknown topic',
        date: format(oldTask.date, 'EEE MMM d'),
      })
    }
  }

  const triggerMessages: Record<string, string> = {
    missed: 'You missed a session — the topic has been prioritised and rescheduled',
    reschedule: 'You moved a task — the plan has been adjusted around it',
    low_understanding: 'You rated understanding 1–2 — extra sessions added for this topic',
    availability_change: 'Your availability changed — the plan has been redistributed',
    exam_date_change: 'An exam date changed — urgency scores have been recalculated',
    manual: 'You requested a re-plan — the schedule has been regenerated',
  }

  const reason = triggerMessages[triggerType] ?? 'Plan updated'

  const totalChanges = moved.length + added.length + removed.length
  const summary =
    totalChanges === 0
      ? reason
      : `${reason}. ${moved.length > 0 ? `${moved.length} session${moved.length !== 1 ? 's' : ''} moved. ` : ''}${added.length > 0 ? `${added.length} session${added.length !== 1 ? 's' : ''} added. ` : ''}${removed.length > 0 ? `${removed.length} session${removed.length !== 1 ? 's' : ''} removed.` : ''}`.trim()

  return {
    trigger: triggerType,
    summary,
    changes: { moved, added, removed, reason },
  }
}
