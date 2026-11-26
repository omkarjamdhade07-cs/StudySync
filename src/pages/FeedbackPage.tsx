import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { insertFeedbackResponse } from '@/lib/supabase/queries'

const SUS_QUESTIONS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
]

const schema = z.object({
  sus:        z.array(z.number().min(1).max(5)).length(10),
  clarity:    z.number().min(1).max(5),
  trust:      z.number().min(1).max(5),
  time_saved: z.number().min(0),
  free_text:  z.string().max(1000).optional(),
})

type FormData = z.infer<typeof schema>

export default function FeedbackPage() {
  const { user } = useAuth()
  const [submitted,    setSubmitted]    = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { sus: Array(10).fill(0), clarity: 0, trust: 0, time_saved: 0, free_text: '' },
    })

  const susValues  = watch('sus')
  const clarityVal = watch('clarity')
  const trustVal   = watch('trust')

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setServerError(null)
    const { error } = await insertFeedbackResponse(user.id, {
      sus: data.sus, clarity: data.clarity, trust: data.trust,
      time_saved: data.time_saved, free_text: data.free_text ?? '',
    })
    if (error) { setServerError('Failed to submit. Please try again.'); return }
    setSubmitted(true)
  }

  /* ── Thank-you state ── */
  if (submitted) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div
            className="w-16 h-16 rounded-brutal border-2 border-ink flex items-center justify-center"
            style={{ background: 'var(--teal)', boxShadow: '4px 4px 0 var(--ink)' }}
          >
            <CheckCircle className="h-8 w-8 text-ink" aria-hidden="true" />
          </div>
          <h1 className="font-heading font-bold text-2xl">Thank you!</h1>
          <p className="text-ink/70 max-w-md text-sm leading-relaxed">
            Your feedback helps improve StudySync and contributes to the evaluation study. We appreciate your time.
          </p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl">
        <h1 className="font-heading font-bold text-3xl mb-1">Feedback</h1>
        <p className="text-sm text-ink/60 mb-6">This short survey helps evaluate StudySync. All responses are anonymous.</p>

        {serverError && (
          <div role="alert"
            className="text-sm px-4 py-3 rounded-brutal border-2 border-red mb-6"
            style={{ background: 'var(--red)', color: '#fff', boxShadow: '3px 3px 0 var(--ink)' }}>
            ⚠ {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>

          {/* ── SUS questions ── */}
          <section className="brutal-card overflow-hidden" aria-labelledby="sus-heading">
            <div className="px-5 py-3" style={{ background: 'var(--ink)' }}>
              <h2 id="sus-heading" className="font-heading font-bold text-sm" style={{ color: 'var(--paper)' }}>
                System Usability Scale
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <p className="text-xs text-ink/60">Rate each statement from 1 (Strongly disagree) to 5 (Strongly agree).</p>
              {SUS_QUESTIONS.map((q, i) => (
                <div key={i}>
                  <p className="text-sm font-medium mb-2">
                    <span className="font-mono text-ink/40 mr-2">{i + 1}.</span>{q}
                  </p>
                  <LikertScale
                    value={susValues[i]}
                    onChange={v => {
                      const updated = [...susValues]; updated[i] = v
                      setValue('sus', updated, { shouldValidate: true })
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Extra questions ── */}
          <section className="brutal-card overflow-hidden" aria-labelledby="extra-heading">
            <div className="px-5 py-3" style={{ background: 'var(--ink)' }}>
              <h2 id="extra-heading" className="font-heading font-bold text-sm" style={{ color: 'var(--paper)' }}>
                Additional Questions
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <p className="text-sm font-medium mb-2">How clear were the "Why this?" explanations?</p>
                <LikertScale value={clarityVal} onChange={v => setValue('clarity', v, { shouldValidate: true })} />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">How much do you trust the plan StudySync generated?</p>
                <LikertScale value={trustVal} onChange={v => setValue('trust', v, { shouldValidate: true })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  How many minutes per week did StudySync save vs planning manually? (optional)
                </label>
                <input
                  {...register('time_saved', { valueAsNumber: true })}
                  type="number" min="0" max="600"
                  className="input-brutal w-28"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Any other comments? (optional)</label>
                <textarea
                  {...register('free_text')}
                  rows={3}
                  className="input-brutal resize-none"
                  placeholder="Tell us anything that would help improve StudySync…"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isSubmitting || susValues.some(v => v === 0) || clarityVal === 0 || trustVal === 0}
            className="btn-brutal btn-primary px-8"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Submit feedback
          </button>
        </form>
      </div>
    </PageWrapper>
  )
}

function LikertScale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Rating 1 to 5">
      {[1,2,3,4,5].map(n => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          aria-label={`${n}`} aria-pressed={value === n}
          className={`btn-brutal w-10 h-10 min-h-0 p-0 font-mono text-sm
            ${value === n ? 'btn-primary' : 'btn-secondary'}`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
