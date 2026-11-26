import { useState, useEffect, useCallback } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, X, BookOpen, Clock } from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { useDemo } from '@/hooks/useDemo'
import { getTasksForDateRange, getSubjects } from '@/lib/supabase/queries'
import type { TaskRow, TopicRow, SubjectRow } from '@/lib/supabase/types'

type EnrichedTask = TaskRow & { topics: TopicRow & { subjects: SubjectRow } }

type ViewMode = 'week' | 'full'

interface DayTask {
  id: string
  topicName: string
  subjectName: string
  subjectColor: string
  durationMinutes: number
  type: 'study' | 'revision'
  status: 'planned' | 'done' | 'missed' | 'rescheduled'
  reasons: string[]
  locked: boolean
}

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  done:        { bg: 'var(--teal)',   label: '✓ Done' },
  missed:      { bg: 'var(--red)',    label: '✗ Missed' },
  rescheduled: { bg: 'var(--yellow)', label: '↷ Rescheduled' },
  planned:     { bg: '',              label: 'Planned' },
}

export default function WeeklyPlanPage() {
  const { user } = useAuth()
  const { isDemoMode, enrichedTasks: demoTasks } = useDemo()

  const [tasks,       setTasks]       = useState<EnrichedTask[]>([])
  const [subjects,    setSubjects]    = useState<SubjectRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [viewMode,    setViewMode]    = useState<ViewMode>('week')
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selected,    setSelected]    = useState<DayTask | null>(null)
  const [filterSubId, setFilterSubId] = useState<string>('all')

  /* For full plan: show today → latest exam */
  const today = new Date()

  const days = viewMode === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : Array.from({ length: 60 }, (_, i) => addDays(today, i))

  const load = useCallback(async () => {
    if (isDemoMode) { setLoading(false); return }
    if (!user) return
    setLoading(true)
    const from = format(days[0], 'yyyy-MM-dd')
    const to   = format(days[days.length - 1], 'yyyy-MM-dd')
    const [{ data: taskData }, { data: subData }] = await Promise.all([
      getTasksForDateRange(user.id, from, to),
      getSubjects(user.id),
    ])
    if (taskData) setTasks(taskData)
    if (subData)  setSubjects(subData)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, viewMode, weekStart, isDemoMode])

  useEffect(() => { load() }, [load])

  const getTasksForDay = (date: Date): DayTask[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (isDemoMode) {
      return demoTasks
        .filter(t => format(t.date, 'yyyy-MM-dd') === dateStr)
        .filter(t => filterSubId === 'all' || t.subjectId === filterSubId)
        .map(t => ({
          id: t.topicId, topicName: t.topicName, subjectName: t.subjectName,
          subjectColor: t.subjectColor, durationMinutes: t.durationMinutes,
          type: t.type, status: 'planned' as const, reasons: t.reasons, locked: t.locked,
        }))
    }
    return tasks
      .filter(t => t.date === dateStr)
      .filter(t => filterSubId === 'all' || t.topics?.subjects?.id === filterSubId)
      .map(t => ({
        id: t.id,
        topicName:      t.topics?.name ?? '(deleted topic)',
        subjectName:    t.topics?.subjects?.name ?? '(deleted subject)',
        subjectColor:   t.topics?.subjects?.color ?? '#6C5CE7',
        durationMinutes: t.duration_minutes,
        type:    t.type,
        status:  t.status,
        reasons: Array.isArray(t.reasons) ? t.reasons : [],
        locked:  t.locked,
      }))
  }

  /* Stats */
  const allDisplayed = days.flatMap(d => getTasksForDay(d))
  const totalTasks   = allDisplayed.length
  const doneTasks    = allDisplayed.filter(t => t.status === 'done').length
  const missedTasks  = allDisplayed.filter(t => t.status === 'missed').length
  const totalMins    = allDisplayed.filter(t => t.status === 'done').reduce((s, t) => s + t.durationMinutes, 0)

  if (loading) {
    return (
      <PageWrapper>
        <div className="grid grid-cols-7 gap-2 mt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="brutal-card h-48 border-dashed" style={{ opacity: 0.4 }} />
          ))}
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="font-heading font-bold text-3xl">Plan</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-brutal border-2 border-ink overflow-hidden" style={{ boxShadow: '3px 3px 0 var(--ink)' }}>
            {(['week', 'full'] as ViewMode[]).map(mode => (
              <button key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-xs font-heading font-semibold transition-colors"
                style={{
                  background: viewMode === mode ? 'var(--violet)' : 'var(--paper)',
                  color: viewMode === mode ? '#fff' : 'var(--ink)',
                }}
                aria-pressed={viewMode === mode}
              >
                {mode === 'week' ? '7 days' : 'Full plan'}
              </button>
            ))}
          </div>

          {/* Week nav (week mode only) */}
          {viewMode === 'week' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekStart(d => addDays(d, -7))}
                className="btn-brutal btn-secondary w-8 h-8 min-h-0 p-0" aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs font-semibold px-1">
                {format(days[0], 'MMM d')} – {format(days[6], 'MMM d')}
              </span>
              <button onClick={() => setWeekStart(d => addDays(d, 7))}
                className="btn-brutal btn-secondary w-8 h-8 min-h-0 p-0" aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Subject filter ── */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterSubId('all')}
            className="chip cursor-pointer text-xs"
            style={{
              background: filterSubId === 'all' ? 'var(--ink)' : 'var(--paper)',
              color: filterSubId === 'all' ? 'var(--paper)' : 'var(--ink)',
              boxShadow: filterSubId === 'all' ? '2px 2px 0 var(--ink)' : 'none',
            }}
            aria-pressed={filterSubId === 'all'}
          >
            All subjects
          </button>
          {subjects.map(sub => (
            <button key={sub.id}
              onClick={() => setFilterSubId(filterSubId === sub.id ? 'all' : sub.id)}
              className="chip cursor-pointer text-xs"
              style={{
                background: filterSubId === sub.id ? sub.color : 'var(--paper)',
                borderColor: sub.color,
                color: filterSubId === sub.id ? '#fff' : sub.color,
                boxShadow: filterSubId === sub.id ? '2px 2px 0 var(--ink)' : 'none',
              }}
              aria-pressed={filterSubId === sub.id}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total',   value: totalTasks,  color: 'var(--violet)' },
          { label: 'Done',    value: doneTasks,   color: 'var(--teal)' },
          { label: 'Missed',  value: missedTasks, color: 'var(--red)' },
          { label: 'Min done', value: totalMins,  color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} className="brutal-card p-2 text-center">
            <p className="font-mono font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-medium" style={{ opacity: 0.6 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      {viewMode === 'week' ? (
        <div className="grid grid-cols-7 gap-1.5 overflow-x-auto pb-2">
          {days.map(day => <DayColumn key={format(day,'yyyy-MM-dd')} day={day} tasks={getTasksForDay(day)} onSelect={setSelected} />)}
        </div>
      ) : (
        /* Full plan: group by week rows */
        <div className="space-y-6">
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, wi) => {
            const weekDays = days.slice(wi * 7, wi * 7 + 7)
            return (
              <div key={wi}>
                <p className="font-heading font-semibold text-xs mb-2 opacity-50 uppercase tracking-wide">
                  Week of {format(weekDays[0], 'MMM d')}
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map(day => <DayColumn key={format(day,'yyyy-MM-dd')} day={day} tasks={getTasksForDay(day)} onSelect={setSelected} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {totalTasks === 0 && (
        <div className="text-center py-12 mt-4" style={{ border: '2.5px dashed var(--ink)', borderRadius: 14 }}>
          <CalendarDays className="h-10 w-10 mx-auto mb-3" style={{ opacity: 0.3 }} />
          <p className="font-heading font-bold">No tasks scheduled</p>
          <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
            Complete onboarding to generate your plan, or add tasks manually on the Today page.
          </p>
        </div>
      )}

      {/* ── Task detail panel ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(17,17,17,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="brutal-panel w-full max-w-sm overflow-hidden animate-fade-rise"
            style={{ boxShadow: '8px 8px 0 var(--ink)' }}>
            {/* Colour title strip */}
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ background: selected.subjectColor }}>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-paper" aria-hidden="true" />
                <span className="font-heading font-bold text-sm text-paper">{selected.subjectName}</span>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close">
                <X className="h-4 w-4 text-paper" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="font-heading font-bold text-lg">{selected.topicName}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="mono-badge flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" /> {selected.durationMinutes}m
                  </span>
                  {selected.type === 'study'
                    ? <span className="chip chip-study text-xs">📖 Study</span>
                    : <span className="chip chip-revision text-xs">🔁 Revision</span>
                  }
                  {selected.status !== 'planned' && (
                    <span className="chip text-xs"
                      style={{ background: STATUS_STYLES[selected.status]?.bg ?? 'var(--paper)', color: selected.status === 'missed' ? '#fff' : 'var(--ink)' }}>
                      {STATUS_STYLES[selected.status]?.label}
                    </span>
                  )}
                  {selected.locked && (
                    <span className="chip text-xs" style={{ background: 'var(--paper)' }}>🔒 Locked</span>
                  )}
                </div>
              </div>

              {/* Reasons */}
              {selected.reasons.length > 0 && (
                <div>
                  <p className="text-xs font-heading font-bold mb-2">Why this task?</p>
                  <ul className="space-y-1">
                    {selected.reasons.map((r, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span style={{ color: 'var(--violet)', fontWeight: 700 }}>▸</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => setSelected(null)} className="btn-brutal btn-secondary w-full text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

/* ── Day column sub-component ── */
function DayColumn({ day, tasks, onSelect }: {
  day: Date
  tasks: DayTask[]
  onSelect: (t: DayTask) => void
}) {
  const isToday   = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const isPast    = day < new Date() && !isToday
  const totalMins = tasks.reduce((s, t) => s + t.durationMinutes, 0)

  return (
    <div className="min-w-[70px]">
      {/* Day header */}
      <div className={`text-center mb-1.5 py-1.5 rounded-brutal border-2 border-ink ${isToday ? '' : ''}`}
        style={{ background: isToday ? 'var(--yellow)' : isPast ? 'var(--ink)' : 'var(--paper)', color: isPast ? 'var(--paper)' : 'var(--ink)' }}>
        <p className="text-[10px] font-heading font-semibold">{format(day, 'EEE')}</p>
        <p className="font-mono font-bold text-base leading-none">{format(day, 'd')}</p>
        {totalMins > 0 && (
          <p className="text-[9px] font-mono opacity-70">{totalMins}m</p>
        )}
      </div>

      {/* Task blocks */}
      <div className="space-y-1 min-h-[80px]">
        {tasks.map((task, i) => {
          const statusBg =
            task.status === 'done'   ? 'var(--teal)' :
            task.status === 'missed' ? 'var(--red)'  : task.subjectColor

          return (
            <button
              key={i}
              onClick={() => onSelect(task)}
              className="w-full text-left rounded-[6px] px-1.5 py-1 transition-all hover:scale-[1.03]"
              style={{
                background: statusBg,
                border: '2px solid var(--ink)',
                boxShadow: '1.5px 1.5px 0 var(--ink)',
                opacity: task.status === 'missed' ? 0.75 : 1,
              }}
              title={`${task.topicName} · ${task.durationMinutes}m`}
            >
              <p className="font-heading font-bold text-[9px] text-paper leading-tight truncate">{task.topicName}</p>
              <p className="font-mono text-[8px] text-paper/80">{task.durationMinutes}m</p>
            </button>
          )
        })}
        {tasks.length === 0 && (
          <p className="text-center text-[10px] pt-3" style={{ opacity: 0.25 }}>—</p>
        )}
      </div>
    </div>
  )
}
