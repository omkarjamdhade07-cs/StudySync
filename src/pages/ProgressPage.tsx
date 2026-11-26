import { useState, useEffect } from 'react'
import { subDays, addDays, format, differenceInCalendarDays } from 'date-fns'
import { Flame, TrendingUp, BookOpen, Calendar, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { getTasksForDateRange, getSubjects, getTopics } from '@/lib/supabase/queries'
import type { SubjectRow, TopicRow, TaskRow } from '@/lib/supabase/types'

function BrutalTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="brutal-card px-3 py-2 text-xs font-mono space-y-0.5" style={{ minWidth: 90 }}>
      <p className="font-heading font-semibold">{label}</p>
      {payload.map((p, i) => <p key={i}>{p.name}: {p.value}m</p>)}
    </div>
  )
}

export default function ProgressPage() {
  const { user } = useAuth()
  const [loading,   setLoading]   = useState(true)
  const [allTasks,  setAllTasks]  = useState<TaskRow[]>([])
  const [subjects,  setSubjects]  = useState<SubjectRow[]>([])
  const [topics,    setTopics]    = useState<TopicRow[]>([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      // Fetch wide range: 60 days back and 60 days forward to cover all tasks
      const from = format(subDays(new Date(), 60), 'yyyy-MM-dd')
      const to   = format(addDays(new Date(), 60), 'yyyy-MM-dd')
      const [tasksRes, subsRes, topicsRes] = await Promise.all([
        getTasksForDateRange(user.id, from, to),
        getSubjects(user.id),
        getTopics(user.id),
      ])
      if (tasksRes.data)  setAllTasks(tasksRes.data as unknown as TaskRow[])
      if (subsRes.data)   setSubjects(subsRes.data)
      if (topicsRes.data) setTopics(topicsRes.data)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-4 mt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="brutal-card h-28 border-dashed" style={{ opacity: 0.4 }} />
          ))}
        </div>
      </PageWrapper>
    )
  }

  const todayStr  = format(new Date(), 'yyyy-MM-dd')
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const pastTasks = allTasks.filter(t => t.date <= todayStr)
  const futureTasks = allTasks.filter(t => t.date > todayStr && t.status === 'planned')

  /* ── Summary stats ── */
  const completionRate = pastTasks.length > 0
    ? Math.round((doneTasks.length / pastTasks.length) * 100) : 0
  const totalDoneMins = doneTasks.reduce((s, t) => s + t.duration_minutes, 0)
  const totalPlannedMins = futureTasks.reduce((s, t) => s + t.duration_minutes, 0)

  /* Streak */
  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (doneTasks.some(t => t.date === d)) streak++
    else break
  }

  /* ── Chart: last 14 days by subject ── */
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d    = subDays(new Date(), 13 - i)
    const dStr = format(d, 'yyyy-MM-dd')
    const entry: Record<string, number | string> = { date: format(d, 'MMM d') }
    subjects.forEach(sub => {
      const subTopicIds = topics.filter(t => t.subject_id === sub.id).map(t => t.id)
      entry[sub.name] = doneTasks
        .filter(t => t.date === dStr && subTopicIds.includes(t.topic_id))
        .reduce((s, t) => s + t.duration_minutes, 0)
    })
    return entry
  })

  /* ── Per-subject stats ── */
  const subjectStats = subjects.map(sub => {
    const subTopics = topics.filter(t => t.subject_id === sub.id)
    const subTopicIds = subTopics.map(t => t.id)

    const doneSub   = doneTasks.filter(t => subTopicIds.includes(t.topic_id))
    const plannedSub = futureTasks.filter(t => subTopicIds.includes(t.topic_id))
    const missedSub = allTasks.filter(t => subTopicIds.includes(t.topic_id) && t.status === 'missed')

    // Coverage: weighted average across topics
    const totalWeight  = subTopics.reduce((s, t) => s + t.estimated_minutes, 0)
    const weightedCov  = totalWeight > 0
      ? subTopics.reduce((s, t) => s + t.coverage * t.estimated_minutes, 0) / totalWeight
      : 0

    // Average understanding from done tasks
    const understandings = doneSub.filter(t => t.understanding).map(t => t.understanding!)
    const avgUnderstanding = understandings.length
      ? understandings.reduce((a, b) => a + b, 0) / understandings.length : 3

    // Readiness = coverage × (avgUnderstanding / 5)
    const readiness = Math.round(weightedCov * (avgUnderstanding / 5) * 100)

    // Days until exam
    const daysToExam = differenceInCalendarDays(new Date(sub.exam_date), new Date())

    return {
      ...sub,
      topicCount:    subTopics.length,
      doneCount:     doneSub.length,
      missedCount:   missedSub.length,
      plannedCount:  plannedSub.length,
      coverage:      Math.round(weightedCov * 100),
      readiness,
      daysToExam,
      doneMins:      doneSub.reduce((s, t) => s + t.duration_minutes, 0),
      plannedMins:   plannedSub.reduce((s, t) => s + t.duration_minutes, 0),
    }
  }).sort((a, b) => a.daysToExam - b.daysToExam) // sort by soonest exam

  /* ── All topics: weak ones first ── */
  const topicsWithSubject = topics.map(t => ({
    ...t,
    subjectName:  subjects.find(s => s.id === t.subject_id)?.name ?? '—',
    subjectColor: subjects.find(s => s.id === t.subject_id)?.color ?? '#6C5CE7',
    tasksDone:    doneTasks.filter(d => d.topic_id === t.id).length,
  }))
  const weakTopics = [...topicsWithSubject]
    .sort((a, b) => (5 - a.confidence + a.missed_count) - (5 - b.confidence + b.missed_count))
    .reverse()
    .slice(0, 8)

  /* ── Upcoming tasks (next 7 days) ── */
  const upcomingByDay = Array.from({ length: 7 }, (_, i) => {
    const d    = addDays(new Date(), i)
    const dStr = format(d, 'yyyy-MM-dd')
    return {
      date: d,
      tasks: allTasks.filter(t => t.date === dStr && t.status === 'planned'),
    }
  }).filter(d => d.tasks.length > 0)

  const readinessColor = (r: number) =>
    r >= 70 ? 'var(--teal)' : r >= 40 ? 'var(--yellow)' : 'var(--red)'

  const urgencyColor = (days: number) =>
    days <= 3 ? 'var(--red)' : days <= 7 ? 'var(--yellow)' : 'var(--teal)'

  return (
    <PageWrapper>
      <h1 className="font-heading font-bold text-3xl mb-6">Progress</h1>

      {/* ── Empty state ── */}
      {subjects.length === 0 && (
        <div className="brutal-card p-8 text-center space-y-3">
          <BookOpen className="h-10 w-10 mx-auto" style={{ opacity: 0.3 }} />
          <p className="font-heading font-bold">No data yet</p>
          <p className="text-sm" style={{ opacity: 0.6 }}>Complete onboarding and start studying to see your progress here.</p>
        </div>
      )}

      {subjects.length > 0 && (
        <>
          {/* ── Summary stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Completion',     value: `${completionRate}%`,         icon: <TrendingUp className="h-4 w-4" />, accent: 'var(--violet)' },
              { label: 'Minutes studied', value: String(totalDoneMins),        icon: <span>⏱</span>,                    accent: 'var(--yellow)' },
              { label: 'Day streak',      value: `${streak} day${streak !== 1 ? 's' : ''}`, icon: <Flame className="h-4 w-4" />, accent: 'var(--red)' },
              { label: 'Planned ahead',   value: `${totalPlannedMins}m`,       icon: <Calendar className="h-4 w-4" />, accent: 'var(--teal)' },
            ].map(({ label, value, icon, accent }) => (
              <div key={label} className="brutal-card p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: accent, opacity: 0.8 }}>
                  {icon} {label}
                </div>
                <p className="font-mono font-bold text-xl">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Subject cards ── */}
          <section className="mb-6" aria-labelledby="subjects-heading">
            <h2 id="subjects-heading" className="font-heading font-bold text-lg mb-3">Subjects</h2>
            <div className="space-y-3">
              {subjectStats.map(sub => (
                <div key={sub.id} className="brutal-card overflow-hidden">
                  {/* Subject header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink"
                    style={{ background: sub.color }}>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-paper">{sub.name}</span>
                      <span className="chip text-xs" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
                        {sub.topicCount} topic{sub.topicCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Exam countdown */}
                      <span className="chip text-xs font-mono"
                        style={{ background: urgencyColor(sub.daysToExam), borderColor: 'var(--ink)', color: sub.daysToExam <= 3 ? '#fff' : 'var(--ink)' }}>
                        {sub.daysToExam <= 0 ? 'Exam passed' : `${sub.daysToExam}d to exam`}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Coverage bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-heading font-semibold">Coverage</span>
                        <span className="font-mono text-xs">{sub.coverage}%</span>
                      </div>
                      <div className="h-4 rounded-[4px] border-2 border-ink overflow-hidden" style={{ background: 'var(--paper)' }}
                        role="progressbar" aria-valuenow={sub.coverage} aria-valuemin={0} aria-valuemax={100}
                        aria-label={`${sub.name} coverage ${sub.coverage}%`}>
                        <div className="h-full transition-all duration-500" style={{ width: `${sub.coverage}%`, background: sub.color }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Done',    value: sub.doneCount,    color: 'var(--teal)' },
                        { label: 'Missed',  value: sub.missedCount,  color: 'var(--red)' },
                        { label: 'Planned', value: sub.plannedCount, color: 'var(--violet)' },
                        { label: 'Readiness', value: `${sub.readiness}%`, color: readinessColor(sub.readiness) },
                      ].map(stat => (
                        <div key={stat.label} className="rounded-brutal border-2 border-ink py-1.5"
                          style={{ background: 'var(--paper)' }}>
                          <p className="font-mono font-bold text-sm" style={{ color: stat.color }}>{stat.value}</p>
                          <p className="text-[10px] font-medium" style={{ opacity: 0.6 }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Exam date */}
                    <p className="text-xs font-mono" style={{ opacity: 0.5 }}>
                      Exam: {format(new Date(sub.exam_date), 'EEEE, MMMM d yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Study minutes chart ── */}
          <section className="brutal-card p-5 mb-6" aria-labelledby="chart-heading">
            <h2 id="chart-heading" className="font-heading font-bold mb-1">Study minutes — last 14 days</h2>
            <p className="text-xs mb-4" style={{ opacity: 0.5 }}>Colour-coded by subject</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: 'var(--ink)', strokeWidth: 2 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: 'var(--ink)', strokeWidth: 2 }} tickLine={false} />
                  <Tooltip content={<BrutalTooltip />} cursor={{ fill: 'rgba(108,92,231,0.06)' }} />
                  {subjects.map(sub => (
                    <Bar key={sub.id} dataKey={sub.name} stackId="a" radius={0} maxBarSize={40}
                      fill={sub.color} stroke="var(--ink)" strokeWidth={1} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {subjects.map(sub => (
                <span key={sub.id} className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="w-3 h-3 rounded-sm border border-ink inline-block" style={{ background: sub.color }} />
                  {sub.name}
                </span>
              ))}
            </div>
          </section>

          {/* ── Upcoming 7 days ── */}
          {upcomingByDay.length > 0 && (
            <section className="brutal-card overflow-hidden mb-6" aria-labelledby="upcoming-heading">
              <div className="title-strip">
                <h2 id="upcoming-heading" className="font-heading font-bold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Upcoming — next 7 days
                </h2>
              </div>
              <div className="divide-y-2 divide-ink/10">
                {upcomingByDay.map(({ date, tasks: dayTasks }) => (
                  <div key={format(date, 'yyyy-MM-dd')} className="px-4 py-3 flex items-start gap-3">
                    <div className="text-center min-w-[42px]">
                      <p className="font-mono font-bold text-lg leading-none">{format(date, 'd')}</p>
                      <p className="text-xs font-medium" style={{ opacity: 0.5 }}>{format(date, 'EEE')}</p>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {dayTasks.map((task, i) => {
                        const topic   = topics.find(t => t.id === task.topic_id)
                        const subject = subjects.find(s => s.id === topic?.subject_id)
                        return (
                          <span key={i} className="chip text-xs"
                            style={{ background: subject?.color ?? 'var(--violet)', borderColor: 'var(--ink)', color: '#fff' }}>
                            {topic?.name ?? '—'} · {task.duration_minutes}m
                          </span>
                        )
                      })}
                    </div>
                    <span className="font-mono text-xs shrink-0" style={{ opacity: 0.5 }}>
                      {dayTasks.reduce((s, t) => s + t.duration_minutes, 0)}m
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Weak topics ── */}
          {weakTopics.length > 0 && (
            <section aria-labelledby="weak-heading">
              <h2 id="weak-heading" className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--red)' }} aria-hidden="true" />
                Topics needing attention
              </h2>
              <div className="brutal-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
                    <tr>
                      <th className="text-left px-4 py-2.5 font-heading">Topic</th>
                      <th className="text-left px-4 py-2.5 font-heading hidden sm:table-cell">Subject</th>
                      <th className="text-center px-3 py-2.5 font-heading">Conf.</th>
                      <th className="text-center px-3 py-2.5 font-heading">Missed</th>
                      <th className="text-center px-3 py-2.5 font-heading hidden sm:table-cell">Done</th>
                      <th className="text-center px-3 py-2.5 font-heading hidden sm:table-cell">Cover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weakTopics.map((t, i) => (
                      <tr key={t.id} style={{ borderTop: i > 0 ? '2px solid rgba(17,17,17,0.08)' : 'none' }}>
                        <td className="px-4 py-2.5 font-medium">{t.name}</td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className="chip text-xs" style={{ background: t.subjectColor, color: '#fff', borderColor: 'var(--ink)' }}>
                            {t.subjectName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="chip text-xs"
                            style={{ background: t.confidence <= 2 ? 'var(--red)' : t.confidence <= 3 ? 'var(--yellow)' : 'var(--teal)', color: t.confidence <= 2 ? '#fff' : 'var(--ink)', borderColor: 'var(--ink)' }}>
                            {t.confidence}/5
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          {t.missed_count > 0
                            ? <span className="chip text-xs" style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)' }}>{t.missed_count}×</span>
                            : <span style={{ opacity: 0.3 }}>—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono hidden sm:table-cell">{t.tasksDone}</td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-16 h-2 rounded-sm border border-ink overflow-hidden" style={{ background: 'var(--paper)' }}>
                              <div className="h-full" style={{ width: `${Math.round(t.coverage * 100)}%`, background: t.subjectColor }} />
                            </div>
                            <span className="font-mono text-xs">{Math.round(t.coverage * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </PageWrapper>
  )
}
