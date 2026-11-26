import { useState, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { PartyPopper, Plus, X, Check, Loader2, CalendarClock } from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import TaskCard from '@/components/tasks/TaskCard'
import PlanBanner from '@/components/plan/PlanBanner'
import { useAuth } from '@/hooks/useAuth'
import { useDemo } from '@/hooks/useDemo'
import { supabase } from '@/lib/supabase/client'
import {
  getTasksForDate,
  updateTask,
  updateTopic,
  getLatestPlanEvent,
  insertTasks,
  getSubjects,
  getTopics,
} from '@/lib/supabase/queries'
import type { TaskRow, TopicRow, SubjectRow, PlanEventRow } from '@/lib/supabase/types'

type EnrichedTask = TaskRow & { topics: TopicRow & { subjects: SubjectRow } }

export default function TodayPage() {
  const { user } = useAuth()
  const { isDemoMode, enrichedTasks: demoTasks, lastBanner } = useDemo()

  const [tasks,               setTasks]               = useState<EnrichedTask[]>([])
  const [loading,             setLoading]             = useState(true)
  const [actionLoading,       setActionLoading]       = useState<string | null>(null)
  const [latestEvent,         setLatestEvent]         = useState<PlanEventRow | null>(null)
  const [bannerDismissed,     setBannerDismissed]     = useState(false)
  const [understandingPrompt, setUnderstandingPrompt] = useState<string | null>(null)

  /* ── Add Task modal ── */
  const [showAddTask,  setShowAddTask]  = useState(false)
  const [subjects,     setSubjects]     = useState<SubjectRow[]>([])
  const [allTopics,    setAllTopics]    = useState<TopicRow[]>([])
  const [addSubjectId, setAddSubjectId] = useState('')
  const [addTopicId,   setAddTopicId]   = useState('')
  const [addDuration,  setAddDuration]  = useState(45)
  const [addType,      setAddType]      = useState<'study' | 'revision'>('study')
  const [addSaving,    setAddSaving]    = useState(false)
  const [addError,     setAddError]     = useState<string | null>(null)

  /* ── Reschedule modal ── */
  const [rescheduleTaskId,   setRescheduleTaskId]   = useState<string | null>(null)
  const [rescheduleDate,     setRescheduleDate]     = useState('')
  const [rescheduleSaving,   setRescheduleSaving]   = useState(false)
  const [rescheduleError,    setRescheduleError]    = useState<string | null>(null)

  const today    = format(new Date(), 'yyyy-MM-dd')
  const minDate  = format(addDays(new Date(), 1), 'yyyy-MM-dd')   // tomorrow minimum
  const maxDate  = format(addDays(new Date(), 60), 'yyyy-MM-dd')  // 60-day horizon

  /* ── Load tasks + subjects + topics ── */
  useEffect(() => {
    if (isDemoMode) { setLoading(false); return }
    if (!user) return
    const load = async () => {
      setLoading(true)
      const [{ data: taskData }, { data: event }, { data: subs }, { data: tops }] = await Promise.all([
        getTasksForDate(user.id, today),
        getLatestPlanEvent(user.id),
        getSubjects(user.id),
        getTopics(user.id),
      ])
      if (taskData) setTasks(taskData)
      if (event)    setLatestEvent(event)
      if (subs)     { setSubjects(subs); if (subs.length) setAddSubjectId(subs[0].id) }
      if (tops)     setAllTopics(tops)
      setLoading(false)
    }
    load()
  }, [user, today, isDemoMode])

  /* Keep topic dropdown in sync with selected subject */
  const topicsForSubject = allTopics.filter(t => t.subject_id === addSubjectId)
  useEffect(() => {
    setAddTopicId(topicsForSubject.length > 0 ? topicsForSubject[0].id : '')
  }, [addSubjectId, topicsForSubject.length])

  /* ── Reload helper ── */
  const reloadTasks = async () => {
    if (!user) return
    const { data } = await getTasksForDate(user.id, today)
    if (data) setTasks(data)
  }

  /* ── Add Task ── */
  const handleAddTask = async () => {
    if (!user || !addTopicId) { setAddError('Select a subject and topic.'); return }
    setAddSaving(true); setAddError(null)
    const maxOrder = tasks.reduce((m, t) => Math.max(m, t.start_order), -1)
    const { error } = await insertTasks([{
      user_id: user.id, topic_id: addTopicId, date: today,
      start_order: maxOrder + 1, duration_minutes: addDuration,
      type: addType, status: 'planned', priority_score: 0.5,
      reasons: ['Manually added'], locked: true,
      understanding: null, completed_at: null,
    }])
    if (error) { setAddError('Failed to add task. Please try again.'); setAddSaving(false); return }
    await reloadTasks()
    setShowAddTask(false); setAddSaving(false)
  }

  /* ── Done ── */
  const handleDone = (taskId: string) => setUnderstandingPrompt(taskId)

  const handleUnderstandingSubmit = async (taskId: string, understanding: number) => {
    setUnderstandingPrompt(null)
    if (isDemoMode) return
    setActionLoading(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t))
    await updateTask(taskId, { status: 'done', understanding, completed_at: new Date().toISOString() })
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const topic = task.topics
      await updateTopic(topic.id, {
        coverage: Math.min(1, topic.coverage + task.duration_minutes / topic.estimated_minutes),
        confidence: Math.round(0.7 * topic.confidence + 0.3 * understanding),
        last_studied_at: new Date().toISOString(),
      })
    }
    setActionLoading(null)
  }

  /* ── Undo Done ── */
  const handleNotDone = async (taskId: string) => {
    if (isDemoMode) return
    setActionLoading(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'planned' as const, understanding: null } : t))
    await updateTask(taskId, { status: 'planned', understanding: null, completed_at: null })
    setActionLoading(null)
  }

  /* ── Missed ── */
  const handleMissed = async (taskId: string) => {
    if (isDemoMode) return
    setActionLoading(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'missed' as const } : t))
    await updateTask(taskId, { status: 'missed' })
    const task = tasks.find(t => t.id === taskId)
    if (task) await updateTopic(task.topic_id, { missed_count: task.topics.missed_count + 1 })
    setActionLoading(null)
  }

  /* ── Undo Missed ── */
  const handleUndoMissed = async (taskId: string) => {    if (isDemoMode) return
    setActionLoading(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'planned' as const } : t))
    await updateTask(taskId, { status: 'planned' })
    const task = tasks.find(t => t.id === taskId)
    if (task && task.topics.missed_count > 0)
      await updateTopic(task.topic_id, { missed_count: task.topics.missed_count - 1 })
    setActionLoading(null)
  }

  /* ── Remove Task ── */
  const handleRemoveTask = async (taskId: string) => {
    if (isDemoMode) return
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await supabase.from('tasks').delete().eq('id', taskId)
    } catch {
      await reloadTasks()
    }
  }

  /* ── Open Reschedule modal ── */
  const handleReschedule = (taskId: string) => {    setRescheduleTaskId(taskId)
    setRescheduleDate(minDate)   // default to tomorrow
    setRescheduleError(null)
  }

  /* ── Confirm Reschedule ── */
  const handleRescheduleConfirm = async () => {
    if (!user || !rescheduleTaskId || !rescheduleDate) return
    if (rescheduleDate <= today) {
      setRescheduleError('Please pick a future date (tomorrow or later).')
      return
    }
    setRescheduleSaving(true)
    setRescheduleError(null)

    // Optimistic: remove from today's list
    setTasks(prev => prev.filter(t => t.id !== rescheduleTaskId))

    const { error } = await updateTask(rescheduleTaskId, {
      date: rescheduleDate,
      status: 'rescheduled',
      locked: true,
    })

    if (error) {
      // Rollback
      await reloadTasks()
      setRescheduleError('Failed to reschedule. Please try again.')
      setRescheduleSaving(false)
      return
    }

    setRescheduleSaving(false)
    setRescheduleTaskId(null)
    setRescheduleDate('')
  }

  /* ── Display tasks ── */
  const displayTasks = isDemoMode
    ? demoTasks
        .filter(t => format(t.date, 'yyyy-MM-dd') === today)
        .map(t => ({
          id: t.topicId, topicId: t.topicId, topicName: t.topicName,
          subjectName: t.subjectName, subjectColor: t.subjectColor,
          durationMinutes: t.durationMinutes, type: t.type,
          status: 'planned' as const, reasons: t.reasons,
          priorityScore: t.priorityScore, locked: t.locked,
        }))
    : tasks.map(t => ({
        id: t.id, topicId: t.topic_id,
        topicName: t.topics?.name ?? 'Unknown topic',
        subjectName: t.topics?.subjects?.name ?? 'Unknown subject',
        subjectColor: t.topics?.subjects?.color ?? '#6C5CE7',
        durationMinutes: t.duration_minutes, type: t.type, status: t.status,
        reasons: t.reasons, priorityScore: t.priority_score, locked: t.locked,
      }))

  const done  = displayTasks.filter(t => t.status === 'done').length
  const total = displayTasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const circumference = 2 * Math.PI * 20

  /* Rescheduling task details for the modal title */
  const reschedulingTask = tasks.find(t => t.id === rescheduleTaskId)

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="brutal-card p-4 h-24 border-dashed" style={{ opacity: 0.5 }} />
          ))}
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>

      {/* ── Greeting + ring ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-3xl">Today</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink)', opacity: 0.6 }}>
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1" role="img" aria-label={`${pct}% of today's tasks complete`}>
          <svg width="56" height="56" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="20" fill="none" strokeWidth="4.5"
              style={{ stroke: 'var(--ink)', opacity: 0.1 }} />
            <circle cx="26" cy="26" r="20" fill="none" strokeWidth="4.5"
              stroke="var(--violet)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (pct / 100) * circumference}
              strokeLinecap="square" transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 500ms ease' }} />
          </svg>
          <span className="font-mono text-xs font-bold">{pct}%</span>
        </div>
      </div>

      {/* ── Plan banner ── */}
      {!bannerDismissed && (isDemoMode ? lastBanner : latestEvent) && (
        <PlanBanner
          event={isDemoMode
            ? { id: 'demo', user_id: '', created_at: '', trigger: 'demo',
                summary: lastBanner ?? '',
                changes: { moved: [], added: [], removed: [], reason: lastBanner ?? '' } }
            : latestEvent}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ── Task list header ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-base">Tasks — {done}/{total} done</h2>
        {!isDemoMode && (
          <button onClick={() => setShowAddTask(true)} className="btn-brutal btn-primary text-sm px-4 min-h-[38px]">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Task
          </button>
        )}
      </div>

      {/* ── Task list ── */}
      {displayTasks.length === 0 ? (
        <div className="text-center py-16 space-y-3"
          style={{ border: '2.5px dashed var(--ink)', borderRadius: '14px' }}>
          <PartyPopper className="h-10 w-10 mx-auto" style={{ color: 'var(--ink)', opacity: 0.4 }} aria-hidden="true" />
          <p className="font-heading font-bold">No tasks today</p>
          <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.6 }}>Enjoy the break — you've earned it! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onDone={handleDone}
              onNotDone={handleNotDone}
              onUndoMissed={handleUndoMissed}
              onMissed={handleMissed}
              onReschedule={handleReschedule}
              onRemove={handleRemoveTask}
              loading={actionLoading === task.id}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          RESCHEDULE MODAL
      ══════════════════════════════════════ */}
      {rescheduleTaskId && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="reschedule-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(17,17,17,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setRescheduleTaskId(null) }}
        >
          <div className="brutal-panel w-full max-w-sm overflow-hidden animate-fade-rise"
            style={{ boxShadow: '8px 8px 0 var(--ink)' }}>

            {/* Title strip */}
            <div className="title-strip flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-paper" aria-hidden="true" />
                <h2 id="reschedule-title" className="font-heading font-bold text-sm text-paper">
                  Reschedule task
                </h2>
              </div>
              <button
                onClick={() => setRescheduleTaskId(null)}
                className="hover:opacity-70" aria-label="Close"
              >
                <X className="h-4 w-4 text-paper" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Task name */}
              {reschedulingTask && (
                <div className="brutal-card p-3 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm border border-ink shrink-0"
                    style={{ background: reschedulingTask.topics?.subjects?.color ?? 'var(--violet)' }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-heading font-semibold text-sm">{reschedulingTask.topics?.name}</p>
                    <p className="text-xs" style={{ opacity: 0.6 }}>{reschedulingTask.topics?.subjects?.name}</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {rescheduleError && (
                <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2"
                  style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
                  ⚠ {rescheduleError}
                </div>
              )}

              {/* Date picker */}
              <div className="space-y-1.5">
                <label htmlFor="reschedule-date" className="text-xs font-heading font-semibold">
                  Move to date
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="input-brutal font-mono"
                />
                <p className="text-xs" style={{ opacity: 0.5 }}>
                  Task will be locked to this date and won't be moved by auto re-planning.
                </p>
              </div>

              {/* Quick pick buttons */}
              <div className="space-y-1.5">
                <p className="text-xs font-heading font-semibold">Quick pick</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Tomorrow',     offset: 1 },
                    { label: 'In 2 days',    offset: 2 },
                    { label: 'In 3 days',    offset: 3 },
                    { label: 'Next week',    offset: 7 },
                  ].map(({ label, offset }) => {
                    const d = format(addDays(new Date(), offset), 'yyyy-MM-dd')
                    return (
                      <button
                        key={offset}
                        onClick={() => setRescheduleDate(d)}
                        className="chip cursor-pointer transition-all"
                        style={{
                          background: rescheduleDate === d ? 'var(--violet)' : 'var(--paper)',
                          color: rescheduleDate === d ? '#fff' : 'var(--ink)',
                          boxShadow: rescheduleDate === d ? '2px 2px 0 var(--ink)' : 'none',
                        }}
                        aria-pressed={rescheduleDate === d}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRescheduleConfirm}
                  disabled={rescheduleSaving || !rescheduleDate}
                  className="btn-brutal btn-primary flex-1"
                >
                  {rescheduleSaving
                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    : <CalendarClock className="h-4 w-4" aria-hidden="true" />}
                  {rescheduleSaving ? 'Saving…' : `Move to ${rescheduleDate ? format(new Date(rescheduleDate + 'T00:00:00'), 'MMM d') : '…'}`}
                </button>
                <button
                  onClick={() => setRescheduleTaskId(null)}
                  className="btn-brutal btn-secondary px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          UNDERSTANDING MODAL
      ══════════════════════════════════════ */}
      {understandingPrompt && (
        <div role="dialog" aria-modal="true" aria-labelledby="understanding-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(17,17,17,0.6)' }}>
          <div className="brutal-panel w-full max-w-sm overflow-hidden animate-fade-rise"
            style={{ boxShadow: '6px 6px 0 var(--ink)' }}>
            <div className="title-strip">
              <h2 id="understanding-title" className="font-heading font-bold text-sm">
                How well did you understand this?
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n}
                    onClick={() => handleUnderstandingSubmit(understandingPrompt, n)}
                    className="btn-brutal btn-secondary w-11 h-11 min-h-0 p-0 font-mono text-base"
                    aria-label={`Understanding rating ${n} of 5`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center font-mono" style={{ opacity: 0.5 }}>1 = not at all · 5 = fully</p>
              <button onClick={() => setUnderstandingPrompt(null)}
                className="w-full text-sm hover:underline" style={{ opacity: 0.5 }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ADD TASK MODAL
      ══════════════════════════════════════ */}
      {showAddTask && (
        <div role="dialog" aria-modal="true" aria-labelledby="add-task-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(17,17,17,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddTask(false); setAddError(null) } }}>
          <div className="brutal-panel w-full max-w-md overflow-hidden animate-fade-rise"
            style={{ boxShadow: '8px 8px 0 var(--ink)' }}>

            <div className="title-strip flex items-center justify-between">
              <h2 id="add-task-title" className="font-heading font-bold text-sm">Add Task for Today</h2>
              <button onClick={() => { setShowAddTask(false); setAddError(null) }}
                className="hover:opacity-70" aria-label="Close">
                <X className="h-4 w-4 text-paper" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {addError && (
                <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2"
                  style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
                  ⚠ {addError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-heading font-semibold">Subject</label>
                {subjects.length === 0 ? (
                  <p className="text-xs" style={{ opacity: 0.6 }}>No subjects yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(sub => (
                      <button key={sub.id} type="button" onClick={() => setAddSubjectId(sub.id)}
                        className="chip cursor-pointer transition-all"
                        style={{
                          background: addSubjectId === sub.id ? sub.color : 'var(--paper)',
                          borderColor: sub.color,
                          color: addSubjectId === sub.id ? '#fff' : sub.color,
                          boxShadow: addSubjectId === sub.id ? '2px 2px 0 var(--ink)' : 'none',
                        }}
                        aria-pressed={addSubjectId === sub.id}>
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-topic" className="text-xs font-heading font-semibold">Topic</label>
                {topicsForSubject.length === 0 ? (
                  <p className="text-xs" style={{ opacity: 0.6 }}>No topics for this subject.</p>
                ) : (
                  <select id="add-topic" value={addTopicId}
                    onChange={e => setAddTopicId(e.target.value)}
                    className="input-brutal">
                    {topicsForSubject.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-heading font-semibold">Type</label>
                <div className="flex gap-2">
                  {(['study', 'revision'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAddType(t)}
                      className={`chip cursor-pointer ${t === 'study' ? 'chip-study' : 'chip-revision'}`}
                      style={{ opacity: addType === t ? 1 : 0.4, boxShadow: addType === t ? '2px 2px 0 var(--ink)' : 'none' }}
                      aria-pressed={addType === t}>
                      {t === 'study' ? '📖 Study' : '🔁 Revision'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-duration" className="text-xs font-heading font-semibold">
                  Duration (minutes)
                </label>
                <input id="add-duration" type="number" min={5} max={300} value={addDuration}
                  onChange={e => setAddDuration(Number(e.target.value))}
                  className="input-brutal w-28 font-mono" />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={handleAddTask} disabled={addSaving || !addTopicId}
                  className="btn-brutal btn-primary flex-1">
                  {addSaving
                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    : <Check className="h-4 w-4" aria-hidden="true" />}
                  Add task
                </button>
                <button onClick={() => { setShowAddTask(false); setAddError(null) }}
                  className="btn-brutal btn-secondary px-4">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
