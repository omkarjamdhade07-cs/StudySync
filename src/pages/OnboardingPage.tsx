import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { upsertSubject, upsertTopic, upsertAvailability, upsertPreferences, insertTasks, recordEval } from '@/lib/supabase/queries'
import { generatePlan, buildDayList } from '@/lib/scheduler/planner'
import { format, addDays } from 'date-fns'

const STEP_NAMES = ['Subjects', 'Topics', 'Availability', 'Preferences']
const SUBJECT_COLORS = ['#6C5CE7', '#FF6B9D', '#2DD4BF', '#FFD43B', '#FF7043', '#00B4D8', '#8B5CF6', '#EC4899']

interface SubjectDraft  { name: string; color: string; examDate: string }
interface TopicDraft    { name: string; difficulty: number; confidence: number; estimatedMinutes: number }
interface AvailDraft    { [weekday: number]: number }
interface PrefsDraft    { blockMinutes: number; breakMinutes: number; maxConsecutive: number; preferredTime: string; manualPlanningMinutes: string }

export default function OnboardingPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [step, setStep]              = useState(0)
  const [submitting, setSubmitting]  = useState(false)
  const [error, setError]            = useState<string | null>(null)
  const [debugLog, setDebugLog]      = useState<string[]>([])

  const [subjects, setSubjects] = useState<SubjectDraft[]>([
    { name: '', color: SUBJECT_COLORS[0], examDate: '' },
  ])
  const [topicsBySubject, setTopicsBySubject] = useState<TopicDraft[][]>([[
    { name: '', difficulty: 3, confidence: 3, estimatedMinutes: 60 },
  ]])
  const [availability, setAvailability] = useState<AvailDraft>({
    0: 90, 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 90,
  })
  const [prefs, setPrefs] = useState<PrefsDraft>({
    blockMinutes: 45, breakMinutes: 10, maxConsecutive: 2,
    preferredTime: 'no_preference', manualPlanningMinutes: '',
  })

  const startTime = useState(() => Date.now())[0]

  const log = (msg: string) => {
    console.log('[Onboarding]', msg)
    setDebugLog(prev => [...prev, msg])
  }

  const validateStep = (): boolean => {
    if (step === 0) {
      if (subjects.some(s => !s.name.trim()))
        { setError('All subjects need a name.'); return false }
      if (subjects.some(s => !s.examDate || new Date(s.examDate) <= new Date()))
        { setError('All exam dates must be in the future.'); return false }
    }
    if (step === 1) {
      if (topicsBySubject.some(ts => ts.some(t => !t.name.trim())))
        { setError('All topics need a name.'); return false }
      if (topicsBySubject.some(ts => ts.length === 0))
        { setError('Each subject needs at least one topic.'); return false }
    }
    setError(null)
    return true
  }

  const handleNext = () => { if (!validateStep()) return; setStep(s => s + 1) }

  const handleGenerate = async () => {
    if (!validateStep() || !user) return
    setSubmitting(true)
    setError(null)
    setDebugLog([])

    try {
      // ── Step 1: Save subjects ──────────────────────────────────────
      log(`Saving ${subjects.length} subject(s)…`)
      const savedSubjects: Array<{ id: string; name: string; _index: number }> = []

      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i]
        log(`  Inserting subject: "${s.name}"`)
        const { data, error: subErr } = await upsertSubject({
          user_id: user.id,
          name: s.name,
          color: s.color,
          exam_date: s.examDate,
        })
        if (subErr || !data) {
          const msg = subErr ? JSON.stringify(subErr) : 'No data returned'
          throw new Error(`Failed to save subject "${s.name}": ${msg}`)
        }
        log(`  ✓ Subject saved: id=${data.id}`)
        savedSubjects.push({ id: data.id, name: data.name, _index: i })
      }

      // ── Step 2: Save topics ───────────────────────────────────────
      log(`Saving topics…`)
      const savedTopics: Array<{ id: string; subjectId: string; estimatedMinutes: number; examDate: Date }> = []

      for (let i = 0; i < subjects.length; i++) {
        const subId = savedSubjects[i].id
        const topicsForSub = topicsBySubject[i] ?? []
        log(`  Subject "${savedSubjects[i].name}": ${topicsForSub.length} topic(s)`)

        for (const topic of topicsForSub) {
          log(`    Inserting topic: "${topic.name}"`)
          const { data: tData, error: topErr } = await upsertTopic({
            user_id: user.id,
            subject_id: subId,
            name: topic.name,
            difficulty: topic.difficulty,
            confidence: topic.confidence,
            estimated_minutes: topic.estimatedMinutes,
            coverage: 0,
            missed_count: 0,
            last_studied_at: null,
            revision_stage: 0,
          })
          if (topErr || !tData) {
            const msg = topErr ? JSON.stringify(topErr) : 'No data returned'
            throw new Error(`Failed to save topic "${topic.name}": ${msg}`)
          }
          log(`    ✓ Topic saved: id=${tData.id}`)
          savedTopics.push({
            id: tData.id,
            subjectId: subId,
            estimatedMinutes: topic.estimatedMinutes,
            examDate: new Date(subjects[i].examDate),
          })
        }
      }

      // ── Step 3: Save availability ─────────────────────────────────
      log('Saving availability…')
      for (const [weekday, minutes] of Object.entries(availability)) {
        const { error: avErr } = await upsertAvailability({
          user_id: user.id,
          weekday: Number(weekday),
          minutes,
        })
        if (avErr) throw new Error(`Failed to save availability: ${JSON.stringify(avErr)}`)
      }
      log('✓ Availability saved')

      // ── Step 4: Save preferences ──────────────────────────────────
      log('Saving preferences…')
      const { error: prefErr } = await upsertPreferences({
        user_id: user.id,
        block_minutes: prefs.blockMinutes,
        break_minutes: prefs.breakMinutes,
        max_consecutive_same_subject: prefs.maxConsecutive,
        preferred_time: prefs.preferredTime,
        eval_sharing_enabled: false,
      })
      if (prefErr) throw new Error(`Failed to save preferences: ${JSON.stringify(prefErr)}`)
      log('✓ Preferences saved')

      // ── Step 5: Generate plan ──────────────────────────────────────
      log(`Generating plan for ${savedTopics.length} topic(s)…`)
      const topicInputs = savedTopics.map(t => {
        const sub = savedSubjects.find(s => s.id === t.subjectId)!
        return {
          id: t.id,
          subjectId: t.subjectId,
          subjectName: sub.name,
          examDate: t.examDate,
          difficulty: 3,
          confidence: 3,
          estimatedMinutes: t.estimatedMinutes,
          coverage: 0,
          missedCount: 0,
          lastThreeUnderstandings: [],
          revisionStage: 0,
        }
      })

      const avMap = new Map(Object.entries(availability).map(([k, v]) => [Number(k), v]))
      const days  = buildDayList(new Date(), topicInputs, avMap, new Map())
      const { tasks } = generatePlan({
        today: new Date(),
        topics: topicInputs,
        days,
        preferences: { blockMinutes: prefs.blockMinutes, maxConsecutiveSameSubject: prefs.maxConsecutive },
      })
      log(`✓ Scheduler generated ${tasks.length} task(s)`)

      // ── Step 6: Insert tasks ───────────────────────────────────────
      if (tasks.length > 0) {
        log(`Inserting ${tasks.length} tasks into DB…`)
        const { error: taskErr } = await insertTasks(tasks.map(t => ({
          user_id: user.id,
          topic_id: t.topicId,
          date: format(t.date, 'yyyy-MM-dd'),
          start_order: t.startOrder,
          duration_minutes: t.durationMinutes,
          type: t.type,
          status: 'planned' as const,
          priority_score: t.priorityScore,
          reasons: t.reasons,
          locked: t.locked,
          understanding: null,
          completed_at: null,
        })))
        if (taskErr) throw new Error(`Failed to insert tasks: ${JSON.stringify(taskErr)}`)
        log(`✓ Tasks inserted`)
      } else {
        log('⚠ No tasks generated (check availability — 0 minutes?)')
      }

      // ── Step 7: Record eval events ────────────────────────────────
      const seconds = Math.round((Date.now() - startTime) / 1000)
      await recordEval(user.id, 'onboarding_seconds', seconds)
      await recordEval(user.id, 'plan_generated', savedTopics.length)
      if (prefs.manualPlanningMinutes) {
        await recordEval(user.id, 'manual_planning_minutes', Number(prefs.manualPlanningMinutes))
      }

      log('✅ Done! Navigating to Today…')
      navigate('/today')

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      log(`❌ Error: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'input-brutal'

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="font-semibold">Step {step + 1} of 4 — {STEP_NAMES[step]}</span>
            <span style={{ opacity: 0.5 }}>{Math.round(((step + 1) / 4) * 100)}%</span>
          </div>
          <div className="h-3 rounded-[4px] border-2 border-ink overflow-hidden"
            style={{ background: 'var(--paper)', boxShadow: '2px 2px 0 var(--ink)' }}>
            <div className="h-full transition-all duration-300"
              style={{ width: `${((step + 1) / 4) * 100}%`, background: 'var(--violet)' }} />
          </div>
        </div>

        {/* Error with detail */}
        {error && (
          <div role="alert" className="rounded-brutal border-2 border-ink mb-4 overflow-hidden"
            style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
            <div className="px-4 py-2 flex items-center gap-2 font-heading font-bold text-sm"
              style={{ background: 'var(--red)', color: '#fff' }}>
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Error — see details below
            </div>
            <div className="px-4 py-3 text-xs font-mono break-all" style={{ background: 'var(--paper)' }}>
              {error}
            </div>
            {/* Debug log */}
            {debugLog.length > 0 && (
              <div className="px-4 pb-3 space-y-0.5 border-t-2 border-ink/10">
                {debugLog.map((line, i) => (
                  <p key={i} className="text-xs font-mono text-ink/60">{line}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 0: Subjects ── */}
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="font-heading font-bold text-2xl">Your subjects</h1>
            <p className="text-sm" style={{ opacity: 0.6 }}>Add every subject you're studying and its exam date.</p>
            {subjects.map((sub, i) => (
              <div key={i} className="brutal-card p-4 space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[140px] space-y-1.5">
                    <label className="text-xs font-heading font-semibold">Subject name</label>
                    <input
                      value={sub.name}
                      onChange={e => { const u = [...subjects]; u[i] = { ...u[i], name: e.target.value }; setSubjects(u) }}
                      placeholder="e.g. Physics"
                      className={inp}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-heading font-semibold">Exam date</label>
                    <input
                      type="date"
                      value={sub.examDate}
                      min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                      onChange={e => { const u = [...subjects]; u[i] = { ...u[i], examDate: e.target.value }; setSubjects(u) }}
                      className={inp}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-heading font-semibold mb-2">Colour</p>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { const u = [...subjects]; u[i] = { ...u[i], color: c }; setSubjects(u) }}
                        className="w-7 h-7 rounded-[6px] border-2 transition-transform"
                        style={{
                          backgroundColor: c,
                          borderColor: sub.color === c ? 'var(--ink)' : 'transparent',
                          transform: sub.color === c ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: sub.color === c ? '2px 2px 0 var(--ink)' : 'none',
                        }}
                        aria-label={`Select colour ${c}`}
                        aria-pressed={sub.color === c}
                      />
                    ))}
                  </div>
                </div>
                {/* Allow removing a subject if more than one */}
                {subjects.length > 1 && (
                  <button
                    onClick={() => {
                      setSubjects(s => s.filter((_, idx) => idx !== i))
                      setTopicsBySubject(t => t.filter((_, idx) => idx !== i))
                    }}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: 'var(--red)' }}
                  >
                    Remove subject
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                setSubjects(s => [...s, { name: '', color: SUBJECT_COLORS[subjects.length % 8], examDate: '' }])
                setTopicsBySubject(t => [...t, [{ name: '', difficulty: 3, confidence: 3, estimatedMinutes: 60 }]])
              }}
              className="btn-brutal btn-secondary text-sm px-4 min-h-[40px]"
            >
              + Add another subject
            </button>
          </div>
        )}

        {/* ── Step 1: Topics ── */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="font-heading font-bold text-2xl">Topics</h1>
            <p className="text-sm" style={{ opacity: 0.6 }}>List every topic for each subject. Diff = difficulty, Conf = your confidence (both 1–5).</p>
            {subjects.map((sub, si) => (
              <div key={si} className="brutal-card overflow-hidden">
                <div className="px-4 py-2.5 flex items-center gap-2 border-b-2 border-ink"
                  style={{ background: sub.color }}>
                  <span className="font-heading font-bold text-sm text-paper">
                    {sub.name || `Subject ${si + 1}`}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-heading font-semibold px-1" style={{ opacity: 0.5 }}>
                    <span className="col-span-5">Topic name</span>
                    <span className="col-span-2 text-center">Diff</span>
                    <span className="col-span-2 text-center">Conf</span>
                    <span className="col-span-2 text-center">Mins</span>
                    <span className="col-span-1" />
                  </div>
                  {(topicsBySubject[si] ?? []).map((topic, ti) => (
                    <div key={ti} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          value={topic.name}
                          onChange={e => {
                            const u = topicsBySubject.map((ts, i) => i === si ? ts.map((t, j) => j === ti ? { ...t, name: e.target.value } : t) : ts)
                            setTopicsBySubject(u)
                          }}
                          placeholder="e.g. Mechanics"
                          className={inp}
                        />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={1} max={5} value={topic.difficulty}
                          onChange={e => { const u = topicsBySubject.map((ts, i) => i === si ? ts.map((t, j) => j === ti ? { ...t, difficulty: Number(e.target.value) } : t) : ts); setTopicsBySubject(u) }}
                          className={`${inp} text-center font-mono`} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={1} max={5} value={topic.confidence}
                          onChange={e => { const u = topicsBySubject.map((ts, i) => i === si ? ts.map((t, j) => j === ti ? { ...t, confidence: Number(e.target.value) } : t) : ts); setTopicsBySubject(u) }}
                          className={`${inp} text-center font-mono`} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={15} max={600} value={topic.estimatedMinutes}
                          onChange={e => { const u = topicsBySubject.map((ts, i) => i === si ? ts.map((t, j) => j === ti ? { ...t, estimatedMinutes: Number(e.target.value) } : t) : ts); setTopicsBySubject(u) }}
                          className={`${inp} text-center font-mono`} />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {ti > 0 && (
                          <button
                            onClick={() => { const u = topicsBySubject.map((ts, i) => i === si ? ts.filter((_, j) => j !== ti) : ts); setTopicsBySubject(u) }}
                            className="w-7 h-7 rounded-[6px] border-2 border-ink font-bold flex items-center justify-center hover:bg-red hover:text-white transition-colors"
                            aria-label="Remove topic"
                          >×</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => { const u = topicsBySubject.map((ts, i) => i === si ? [...ts, { name: '', difficulty: 3, confidence: 3, estimatedMinutes: 60 }] : ts); setTopicsBySubject(u) }}
                    className="btn-brutal btn-secondary text-xs px-3 min-h-[34px]"
                  >
                    + Add topic
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 2: Availability ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h1 className="font-heading font-bold text-2xl">Your availability</h1>
            <p className="text-sm" style={{ opacity: 0.6 }}>How many minutes can you study each day of the week?</p>
            <div className="brutal-card overflow-hidden divide-y-2 divide-ink/10">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <label htmlFor={`avail-${i}`} className="text-sm font-heading font-semibold w-28">{day}</label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`avail-${i}`}
                      type="number" min={0} max={1440}
                      value={availability[i] ?? 0}
                      onChange={e => setAvailability(a => ({ ...a, [i]: Number(e.target.value) }))}
                      className="input-brutal w-20 text-right font-mono"
                    />
                    <span className="text-xs font-mono" style={{ opacity: 0.5 }}>min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Preferences ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h1 className="font-heading font-bold text-2xl">Preferences</h1>
            <p className="text-sm" style={{ opacity: 0.6 }}>Fine-tune how your plan is built.</p>
            <div className="brutal-card overflow-hidden divide-y-2 divide-ink/10">
              <PrefRow label="Study block length (minutes)">
                <input type="number" min={15} max={180} value={prefs.blockMinutes}
                  onChange={e => setPrefs(p => ({ ...p, blockMinutes: Number(e.target.value) }))}
                  className="input-brutal w-20 text-right font-mono" />
              </PrefRow>
              <PrefRow label="Max same subject in a row">
                <input type="number" min={1} max={5} value={prefs.maxConsecutive}
                  onChange={e => setPrefs(p => ({ ...p, maxConsecutive: Number(e.target.value) }))}
                  className="input-brutal w-20 text-right font-mono" />
              </PrefRow>
            </div>
            <div className="brutal-card p-4 space-y-2" style={{ borderStyle: 'dashed' }}>
              <label htmlFor="manual-time" className="text-sm font-heading font-semibold">
                (Optional) How long did you spend planning last week? (minutes)
              </label>
              <input id="manual-time" type="number" min={0} max={600}
                value={prefs.manualPlanningMinutes}
                onChange={e => setPrefs(p => ({ ...p, manualPlanningMinutes: e.target.value }))}
                placeholder="e.g. 30"
                className="input-brutal w-28 font-mono" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="btn-brutal btn-secondary text-sm px-4 min-h-[44px]">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
              </button>
            : <div />}

          {step < 3
            ? <button onClick={handleNext} className="btn-brutal btn-primary text-sm px-6 min-h-[44px]">
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            : <button onClick={handleGenerate} disabled={submitting} className="btn-brutal btn-primary text-sm px-6 min-h-[44px]">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {submitting ? 'Saving…' : 'Generate my plan →'}
              </button>}
        </div>

        {/* Progress log while submitting */}
        {submitting && debugLog.length > 0 && (
          <div className="mt-4 brutal-card p-4 space-y-1">
            <p className="text-xs font-heading font-bold mb-2">Progress</p>
            {debugLog.map((line, i) => (
              <p key={i} className="text-xs font-mono" style={{ opacity: 0.7 }}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <span className="text-sm font-heading font-semibold">{label}</span>
      {children}
    </div>
  )
}
