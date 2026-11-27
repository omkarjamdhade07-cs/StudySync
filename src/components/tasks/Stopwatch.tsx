/**
 * Per-task stopwatch component.
 * Counts up from 0. Start / Pause / Reset.
 * Shows elapsed time in mm:ss format using JetBrains Mono.
 */
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Timer } from 'lucide-react'

interface StopwatchProps {
  taskId: string
  targetMinutes?: number   // task duration — used to show a progress fill
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Stopwatch({ taskId, targetMinutes = 45 }: StopwatchProps) {
  const [elapsed,  setElapsed]  = useState(0)       // seconds
  const [running,  setRunning]  = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist elapsed per task in sessionStorage so a re-render doesn't reset it
  const storageKey = `sw_${taskId}`

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) setElapsed(parseInt(stored, 10))
  }, [storageKey])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1
          sessionStorage.setItem(storageKey, String(next))
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, storageKey])

  // Flash green when target is reached
  useEffect(() => {
    if (elapsed >= targetMinutes * 60 && !finished) {
      setFinished(true)
      setRunning(false)
    }
  }, [elapsed, targetMinutes, finished])

  const handleReset = () => {
    setRunning(false)
    setElapsed(0)
    setFinished(false)
    sessionStorage.removeItem(storageKey)
  }

  const targetSeconds = targetMinutes * 60
  const progress = Math.min(elapsed / targetSeconds, 1)
  const pct = Math.round(progress * 100)

  const timeColor = finished
    ? 'var(--teal)'
    : elapsed > targetSeconds * 0.9
    ? 'var(--yellow)'
    : 'var(--ink)'

  return (
    <div
      className="rounded-brutal border-2 border-ink overflow-hidden"
      style={{ boxShadow: '3px 3px 0 var(--ink)' }}
      aria-label="Study session stopwatch"
    >
      {/* Progress bar */}
      <div className="h-1.5" style={{ background: 'var(--paper)' }}>
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: finished ? 'var(--teal)' : 'var(--violet)',
          }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% of target time elapsed`}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--paper)' }}>
        {/* Timer icon */}
        <Timer className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--violet)', opacity: 0.7 }} aria-hidden="true" />

        {/* Elapsed time */}
        <span
          className="font-mono font-bold text-base tabular-nums"
          style={{ color: timeColor, minWidth: '3.5rem' }}
          aria-live="polite"
          aria-label={`Elapsed time: ${formatTime(elapsed)}`}
        >
          {formatTime(elapsed)}
        </span>

        {/* Target */}
        <span className="font-mono text-xs" style={{ opacity: 0.4 }}>
          / {String(targetMinutes).padStart(2, '0')}:00
        </span>

        {finished && (
          <span className="chip text-xs ml-1" style={{ background: 'var(--teal)', color: 'var(--ink)', borderColor: 'var(--ink)' }}>
            ✓ Done!
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setRunning(r => !r)}
            disabled={finished}
            className="w-7 h-7 rounded-[6px] border-2 border-ink flex items-center justify-center transition-colors disabled:opacity-40"
            style={{
              background: running ? 'var(--yellow)' : 'var(--teal)',
              boxShadow: '1.5px 1.5px 0 var(--ink)',
            }}
            aria-label={running ? 'Pause stopwatch' : 'Start stopwatch'}
          >
            {running
              ? <Pause className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
              : <Play  className="h-3.5 w-3.5 text-ink" aria-hidden="true" />}
          </button>

          <button
            onClick={handleReset}
            className="w-7 h-7 rounded-[6px] border-2 border-ink flex items-center justify-center hover:bg-red hover:text-white transition-colors"
            style={{ background: 'var(--paper)', boxShadow: '1.5px 1.5px 0 var(--ink)' }}
            aria-label="Reset stopwatch"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
