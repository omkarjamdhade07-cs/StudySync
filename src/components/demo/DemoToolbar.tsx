import { Link } from 'react-router-dom'
import { FastForward, XCircle, RotateCcw } from 'lucide-react'
import { useDemo } from '@/hooks/useDemo'

export default function DemoToolbar() {
  const { isDemoMode, advanceDay, simulateMissed, resetDemo } = useDemo()
  if (!isDemoMode) return null

  return (
    <>
      {/* Top notice strip */}
      <div
        className="fixed top-14 left-0 right-0 z-30 flex items-center justify-center gap-3 py-2 px-4 border-b-[2.5px]"
        style={{ background: 'var(--yellow)', borderColor: 'var(--ink)' }}
        role="status"
        aria-live="polite"
      >
        <span
          className="chip chip-study text-xs"
          style={{ transform: 'rotate(-2deg)', display: 'inline-block' }}
          aria-hidden="true"
        >
          👀 DEMO MODE
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
          No data is saved
        </span>
      </div>

      {/* Bottom toolbar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t-[2.5px]"
        style={{
          background: 'var(--paper)',
          borderColor: 'var(--ink)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="container mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={advanceDay} className="btn-brutal btn-secondary text-sm px-3 min-h-[38px]">
              <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
              Advance 1 day
            </button>
            <button onClick={simulateMissed} className="btn-brutal btn-missed text-sm px-3 min-h-[38px]">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Simulate missed
            </button>
            <button onClick={resetDemo} className="btn-brutal btn-secondary text-sm px-3 min-h-[38px]">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset demo
            </button>
          </div>
          <Link to="/auth" className="btn-brutal btn-primary text-sm px-4 min-h-[38px]">
            Sign up to save →
          </Link>
        </div>
      </div>
    </>
  )
}
