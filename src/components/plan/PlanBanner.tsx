import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react'
import type { PlanEventRow } from '@/lib/supabase/types'

interface PlanBannerProps {
  event: PlanEventRow | null
  onDismiss: () => void
}

export default function PlanBanner({ event, onDismiss }: PlanBannerProps) {
  const [expanded, setExpanded] = useState(false)
  if (!event) return null

  const { changes } = event

  return (
    <div
      role="status"
      aria-live="polite"
      className="brutal-panel mb-4 overflow-hidden animate-fade-rise"
      style={{ borderLeft: '5px solid var(--yellow)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--yellow)' }} aria-hidden="true" />
          <p className="text-sm font-semibold font-heading">{event.summary}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-0.5 text-xs font-semibold hover:underline"
            style={{ color: 'var(--violet)' }}
            aria-expanded={expanded}
          >
            {expanded
              ? <><ChevronUp className="h-3 w-3" aria-hidden="true" /> Less</>
              : <><ChevronDown className="h-3 w-3" aria-hidden="true" /> What changed</>}
          </button>
          <button
            onClick={onDismiss}
            className="p-1 ml-1 rounded hover:opacity-70"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Change chips */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t-2" style={{ borderColor: 'var(--ink)' }}>
          <div className="flex flex-wrap gap-2 pt-3">
            {changes.moved.map((m, i) => (
              <span key={i} className="chip" style={{ background: 'var(--paper)' }}>
                📅 {m.topicName}: {m.from} → {m.to}
              </span>
            ))}
            {changes.added.map((a, i) => (
              <span key={i} className="chip" style={{ background: 'var(--teal)', color: 'var(--ink)' }}>
                ➕ {a.type} · {a.topicName} · {a.date}
              </span>
            ))}
            {changes.removed.map((r, i) => (
              <span key={i} className="chip" style={{ background: 'var(--red)', color: '#fff' }}>
                🗑 {r.topicName} · {r.date}
              </span>
            ))}
            {changes.moved.length === 0 && changes.added.length === 0 && changes.removed.length === 0 && (
              <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.6 }}>
                Priorities were recalculated — the order may have changed.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
