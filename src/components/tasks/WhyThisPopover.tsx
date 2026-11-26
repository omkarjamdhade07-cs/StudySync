import { HelpCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface FactorContributions {
  urgency: number
  difficulty: number
  weakness: number
  remaining: number
}

interface WhyThisPopoverProps {
  reasons: string[]
  contributions?: FactorContributions
}

const FACTORS: { key: keyof FactorContributions; label: string; color: string }[] = [
  { key: 'urgency',    label: 'Urgency',    color: '#6C5CE7' },
  { key: 'difficulty', label: 'Difficulty', color: '#FFD43B' },
  { key: 'weakness',   label: 'Weakness',   color: '#FF4D4D' },
  { key: 'remaining',  label: 'Remaining',  color: '#2DD4BF' },
]

export default function WhyThisPopover({ reasons, contributions }: WhyThisPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 text-xs font-semibold hover:underline transition-colors"
          style={{ color: 'var(--violet)' }}
          aria-label="Why is this task scheduled?"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Why this?
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0 overflow-hidden"
        side="top"
        style={{
          background: 'var(--paper)',
          border: '2.5px solid var(--ink)',
          borderRadius: '12px',
          boxShadow: '6px 6px 0 var(--ink)',
        }}
      >
        {/* Ink title strip */}
        <div className="title-strip">Why this task?</div>

        <div className="p-4 space-y-4">
          {/* Reasons list */}
          <ul className="space-y-2" aria-label="Scheduling reasons">
            {reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-bold mt-0.5 shrink-0" style={{ color: 'var(--violet)' }} aria-hidden="true">▸</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          {/* Factor breakdown bars */}
          {contributions && (
            <div>
              <p className="text-xs font-heading font-bold mb-2">Priority breakdown</p>

              {/* Stacked flat bar */}
              <div
                className="factor-bar-track mb-3"
                role="img"
                aria-label={`Priority factors: Urgency ${contributions.urgency}%, Difficulty ${contributions.difficulty}%, Weakness ${contributions.weakness}%, Remaining ${contributions.remaining}%`}
              >
                {FACTORS.map(({ key, label, color }) =>
                  contributions[key] > 0 ? (
                    <div
                      key={key}
                      className="factor-bar-segment"
                      style={{ width: `${contributions[key]}%`, background: color }}
                      title={`${label}: ${contributions[key]}%`}
                    />
                  ) : null
                )}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {FACTORS.map(({ key, label, color }) => (
                  <span key={key} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="inline-block w-3 h-3 border-2 shrink-0"
                      style={{ background: color, borderColor: 'var(--ink)' }}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{label}</span>
                    <span className="font-mono ml-auto">{contributions[key]}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
