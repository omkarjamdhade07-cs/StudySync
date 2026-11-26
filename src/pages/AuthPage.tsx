import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookOpen, Loader2, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const signUpSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(50),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type SignUpData = z.infer<typeof signUpSchema>
type SignInData = z.infer<typeof signInSchema>

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signup')
  const [serverError, setServerError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)
  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()

  const signUpForm = useForm<SignUpData>({ resolver: zodResolver(signUpSchema) })
  const signInForm = useForm<SignInData>({ resolver: zodResolver(signInSchema) })

  const handleSignUp = async (data: SignUpData) => {
    setServerError(null)
    const { error } = await signUp(data.email, data.password, data.displayName)
    if (error) { setServerError(error); return }
    setSignedUp(true)
  }

  const handleSignIn = async (data: SignInData) => {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) { setServerError(error); return }
    navigate('/today')
  }

  /* ── Email verification state ── */
  if (signedUp) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div
          className="brutal-panel w-full max-w-sm text-center space-y-5 p-8 animate-fade-rise"
          style={{ boxShadow: '6px 6px 0 var(--ink)' }}
        >
          <div
            className="w-14 h-14 mx-auto rounded-brutal border-2 border-ink flex items-center justify-center"
            style={{ background: 'var(--yellow)' }}
          >
            <Mail className="h-7 w-7 text-ink" aria-hidden="true" />
          </div>
          <h1 className="font-heading font-bold text-2xl">Check your email</h1>
          <p className="text-sm text-ink/70 leading-relaxed">
            We sent a verification link to your inbox. Click it to activate your account, then come back to sign in.
          </p>
          <button
            onClick={() => { setSignedUp(false); setTab('signin') }}
            className="btn-brutal btn-secondary w-full"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 animate-fade-rise">

        {/* Logo + heading */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-brutal border-2 border-ink flex items-center justify-center"
            style={{ background: 'var(--violet)' }}>
            <BookOpen className="h-6 w-6 text-paper" aria-hidden="true" />
          </div>
          <h1 className="font-heading font-bold text-2xl">
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-ink/60">
            {tab === 'signup' ? 'Start studying smarter today' : 'Sign in to StudySync'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-2 p-1.5 rounded-brutal border-2 border-ink" style={{ background: 'var(--paper)', boxShadow: '4px 4px 0 var(--ink)' }}>
          {(['signup', 'signin'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setServerError(null) }}
              className={`flex-1 py-2 text-sm rounded-[8px] font-heading font-semibold transition-all
                ${tab === t
                  ? 'bg-yellow text-ink border-2 border-ink shadow-brutal-sm'
                  : 'text-ink/60 hover:text-ink border-2 border-transparent'}`}
            >
              {t === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          ))}
        </div>

        {/* Server error */}
        {serverError && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm px-4 py-3 rounded-brutal border-2 border-red"
            style={{ background: 'var(--red)', color: '#fff', boxShadow: '3px 3px 0 var(--ink)' }}
          >
            ⚠ {serverError}
          </div>
        )}

        {/* Glass card wrapping the form */}
        <div
          className="brutal-panel p-6 space-y-4"
          style={{ boxShadow: '6px 6px 0 var(--ink)' }}
        >
          {tab === 'signup' ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4" noValidate>
              <Field label="Your name" error={signUpForm.formState.errors.displayName?.message}>
                <input {...signUpForm.register('displayName')} type="text"
                  placeholder="Alex Kumar" autoComplete="name" className="input-brutal" />
              </Field>
              <Field label="Email" error={signUpForm.formState.errors.email?.message}>
                <input {...signUpForm.register('email')} type="email"
                  placeholder="alex@university.edu" autoComplete="email" className="input-brutal" />
              </Field>
              <Field label="Password" error={signUpForm.formState.errors.password?.message}>
                <input {...signUpForm.register('password')} type="password"
                  placeholder="At least 10 characters" autoComplete="new-password" className="input-brutal" />
              </Field>
              <Field label="Confirm password" error={signUpForm.formState.errors.confirmPassword?.message}>
                <input {...signUpForm.register('confirmPassword')} type="password"
                  placeholder="Repeat your password" autoComplete="new-password" className="input-brutal" />
              </Field>
              <button type="submit" disabled={signUpForm.formState.isSubmitting}
                className="btn-brutal btn-primary w-full mt-2">
                {signUpForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Create account
              </button>
            </form>
          ) : (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4" noValidate>
              <Field label="Email" error={signInForm.formState.errors.email?.message}>
                <input {...signInForm.register('email')} type="email"
                  placeholder="alex@university.edu" autoComplete="email" className="input-brutal" />
              </Field>
              <Field label="Password" error={signInForm.formState.errors.password?.message}>
                <input {...signInForm.register('password')} type="password"
                  placeholder="Your password" autoComplete="current-password" className="input-brutal" />
              </Field>
              <button type="submit" disabled={signInForm.formState.isSubmitting}
                className="btn-brutal btn-primary w-full mt-2">
                {signInForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-heading font-semibold">{label}</label>
      {children}
      {error && (
        <p role="alert" className="text-xs font-medium" style={{ color: 'var(--red)' }}>
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
