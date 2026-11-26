import { Link } from 'react-router-dom'
import { Brain, RefreshCw, Shield, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 gap-7">

        {/* Badge */}
        <span className="chip chip-study text-xs animate-fade-rise">
          ✦ Adaptive · Explainable · Private
        </span>

        {/* Heading with yellow marker */}
        <h1 className="font-heading font-bold text-4xl sm:text-6xl max-w-2xl leading-[1.1] tracking-tight animate-fade-rise">
          Stop guessing{' '}
          <span className="marker-highlight">what to study</span>
          {' '}next
        </h1>

        <p className="text-ink/70 text-lg max-w-lg leading-relaxed animate-fade-rise">
          StudySync builds a personalised schedule around your subjects, exam dates,
          and free time — then adapts it every time life gets in the way.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-1 animate-fade-rise">
          <Link to="/auth" className="btn-brutal btn-primary text-base px-8 py-3 min-h-[52px] gap-2">
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="text-xs text-ink/50 animate-fade-rise">
          🔒 Your data stays yours — export or delete any time
        </p>

        {/* Mock task card hero collage */}
        <div
          className="brutal-card p-5 w-full max-w-sm text-left mt-2 animate-fade-rise"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="chip chip-study text-xs">📖 Study</span>
            <span className="mono-badge">45m</span>
            <span className="chip text-xs ml-auto" style={{ background: 'var(--subject-1)', color: '#fff', borderColor: 'var(--ink)' }}>Physics</span>
          </div>
          <p className="font-heading font-bold text-base">Electromagnetism</p>
          <p className="text-xs text-ink/60 mt-1">Exam in 5 days · Confidence 2/5</p>
          <div className="flex gap-2 mt-3">
            <span className="btn-brutal btn-done text-xs px-3 min-h-[32px] pointer-events-none">✓ Done</span>
            <span className="btn-brutal btn-missed text-xs px-3 min-h-[32px] pointer-events-none">✗ Missed</span>
          </div>
        </div>
      </section>

      {/* ── Feature tiles ── */}
      <section className="py-12 px-4" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Features</h2>
        <div className="container mx-auto max-w-4xl grid gap-6 sm:grid-cols-3">

          {[
            {
              icon: RefreshCw,
              title: 'Adaptive Planning',
              desc: 'Miss a session? The plan rebuilds itself, prioritising what you need most before each exam.',
              accent: 'var(--yellow)',
            },
            {
              icon: Brain,
              title: 'Explainable Priorities',
              desc: 'Every task shows exactly why it\'s on your list — urgency, difficulty, confidence, coverage.',
              accent: 'var(--violet)',
            },
            {
              icon: Shield,
              title: 'Privacy-first',
              desc: 'Your schedule is yours. Export as JSON or delete your account completely — any time.',
              accent: 'var(--teal)',
            },
          ].map(({ icon: Icon, title, desc, accent }) => (
            <div key={title} className="brutal-card p-6 space-y-3">
              <div
                className="w-11 h-11 rounded-brutal flex items-center justify-center border-2 border-ink"
                style={{ background: accent }}
              >
                <Icon className="h-5 w-5 text-ink" aria-hidden="true" />
              </div>
              <h3 className="font-heading font-bold">{title}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-ink/10 py-6 text-center text-xs text-ink/50">
        StudySync — built for students, by a student · B.Tech Cyber Security project
      </footer>
    </div>
  )
}
