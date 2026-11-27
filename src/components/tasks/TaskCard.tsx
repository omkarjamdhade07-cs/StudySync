import { Check, X, CalendarClock, BookOpen, Lock, RotateCcw, Trash2 } from 'lucide-react'
import WhyThisPopover from './WhyThisPopover'
import Stopwatch from './Stopwatch'

export interface TaskCardData {
  id: string
  topicId: string
  topicName: string
  subjectName: string
  subjectColor: string
  durationMinutes: number
  type: 'study' | 'revision'
  status: 'planned' | 'done' | 'missed' | 'rescheduled'
  reasons: string[]
  priorityScore: number
  locked: boolean
}

interface TaskCardProps {
  task: TaskCardData
  onDone?: (taskId: string) => void
  onNotDone?: (taskId: string) => void
  onMissed?: (taskId: string) => void
  onUndoMissed?: (taskId: string) => void
  onReschedule?: (taskId: string) => void
  onRemove?: (taskId: string) => void
  loading?: boolean
}

export default function TaskCard({
  task, onDone, onNotDone, onMissed, onUndoMissed, onReschedule, onRemove, loading
}: TaskCardProps) {
  const isDone      = task.status === 'done'
  const isMissed    = task.status === 'missed'
  const isPlanned   = task.status === 'planned' || task.status === 'rescheduled'
  const isDisabled  = !!loading

  return (
    <article
      className={`relative flex overflow-hidden transition-all duration-200 border-[2.5px] rounded-brutal`}
      style={{
        borderStyle: isMissed ? 'dashed' : 'solid',
        borderColor: isDone ? 'var(--teal)' : isMissed ? 'var(--red)' : 'var(--ink)',
        background: isDone ? '#2DD4BF18' : isMissed ? '#FF4D4D10' : 'var(--paper)',
        boxShadow: isPlanned ? '4px 4px 0 var(--ink)' : 'none',
        opacity: loading ? 0.7 : 1,
      }}
      aria-label={`${task.topicName} — ${task.subjectName}`}
    >
      {/* Subject colour left block */}
      <div className="w-[6px] shrink-0" style={{ backgroundColor: task.subjectColor }} aria-hidden="true" />

      <div className="flex-1 p-4 min-w-0">

        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Subject chip */}
            <span className="inline-flex items-center gap-1 chip mb-1.5"
              style={{ background: task.subjectColor + '28', borderColor: task.subjectColor, color: task.subjectColor }}>
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              {task.subjectName}
            </span>

            {/* Topic name */}
            <h3 className="font-heading font-bold text-sm leading-snug">{task.topicName}</h3>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="mono-badge">{task.durationMinutes}m</span>
              {task.type === 'study'
                ? <span className="chip chip-study">📖 Study</span>
                : <span className="chip chip-revision">🔁 Revision</span>}
              {task.locked && (
                <span className="chip" style={{ background: 'var(--paper)' }}>
                  <Lock className="h-3 w-3" aria-hidden="true" /> Locked
                </span>
              )}
            </div>
          </div>

          {/* Status badge + Remove button (top-right) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isDone && (
              <span className="chip text-xs" style={{ background: 'var(--teal)', color: 'var(--ink)' }}>
                <Check className="h-3 w-3" aria-hidden="true" /> Done
              </span>
            )}
            {isMissed && (
              <span className="chip text-xs" style={{ background: 'var(--red)', color: '#fff' }}>
                <X className="h-3 w-3" aria-hidden="true" /> Missed
              </span>
            )}
            {/* Remove button — always visible */}
            {onRemove && (
              <button
                onClick={() => onRemove(task.id)}
                disabled={isDisabled}
                className="w-7 h-7 rounded-[6px] border-2 border-ink flex items-center justify-center hover:bg-red hover:text-white hover:border-red transition-colors disabled:opacity-40"
                aria-label={`Remove task ${task.topicName}`}
                title="Remove task"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* ── Action row for PLANNED tasks ── */}
        {isPlanned && (
          <div className="mt-3 space-y-3">
            {/* Stopwatch */}
            <Stopwatch taskId={task.id} targetMinutes={task.durationMinutes} />

            {/* Buttons row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onDone?.(task.id)}
                  disabled={isDisabled}
                  className="btn-brutal btn-done text-xs px-3 min-h-[36px]"
                  aria-label={`Mark ${task.topicName} as done`}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Done
                </button>
                <button
                  onClick={() => onMissed?.(task.id)}
                  disabled={isDisabled}
                  className="btn-brutal btn-missed text-xs px-3 min-h-[36px]"
                  aria-label={`Mark ${task.topicName} as missed`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Not Done
                </button>
                <button
                  onClick={() => onReschedule?.(task.id)}
                  disabled={isDisabled}
                  className="btn-brutal btn-secondary text-xs px-3 min-h-[36px]"
                  aria-label={`Reschedule ${task.topicName}`}
                >
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  Reschedule
                </button>
              </div>
              <WhyThisPopover reasons={task.reasons} />
            </div>
          </div>
        )}

        {/* ── Action row for DONE tasks ── */}
        {isDone && (
          <div className="flex items-center justify-between mt-3 gap-2">
            <button
              onClick={() => onNotDone?.(task.id)}
              disabled={isDisabled}
              className="btn-brutal btn-secondary text-xs px-3 min-h-[36px]"
              style={{ borderColor: 'var(--teal)', boxShadow: '3px 3px 0 var(--teal)' }}
              aria-label={`Undo done for ${task.topicName}`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Undo Done
            </button>
            <WhyThisPopover reasons={task.reasons} />
          </div>
        )}

        {/* ── Action row for MISSED tasks ── */}
        {isMissed && (
          <div className="flex items-center justify-between mt-3 gap-2">
            <button
              onClick={() => onUndoMissed?.(task.id)}
              disabled={isDisabled}
              className="btn-brutal btn-secondary text-xs px-3 min-h-[36px]"
              style={{ borderColor: 'var(--red)', boxShadow: '3px 3px 0 var(--red)' }}
              aria-label={`Undo missed for ${task.topicName}`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Undo Missed
            </button>
            <WhyThisPopover reasons={task.reasons} />
          </div>
        )}
      </div>

      {/* Full-card stamp overlay */}
      {isDone && (
        <div className="stamp stamp-animate" aria-hidden="true">
          <span className="stamp-text stamp-done text-2xl">DONE ✓</span>
        </div>
      )}
      {isMissed && (
        <div className="stamp" aria-hidden="true">
          <span className="stamp-text stamp-missed text-2xl">MISSED</span>
        </div>
      )}
    </article>
  )
}
