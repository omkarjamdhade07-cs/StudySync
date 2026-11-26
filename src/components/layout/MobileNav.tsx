import { Link, useLocation } from 'react-router-dom'
import { CheckSquare, CalendarDays, BarChart2, Settings, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { to: '/today',    icon: CheckSquare,  label: 'Today' },
  { to: '/plan',     icon: CalendarDays, label: 'Plan' },
  { to: '/syllabus', icon: FileText,     label: 'Syllabus' },
  { to: '/progress', icon: BarChart2,    label: 'Progress' },
  { to: '/settings', icon: Settings,     label: 'Settings' },
]

export default function MobileNav() {
  const { user }   = useAuth()
  const location   = useLocation()
  if (!user) return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t-[2.5px]"
      style={{ background: 'var(--paper)', borderColor: 'var(--ink)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium min-h-[52px] transition-colors"
              style={{ color: active ? 'var(--violet)' : 'var(--ink)', opacity: active ? 1 : 0.5 }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" style={{ strokeWidth: active ? 2.5 : 2 }} aria-hidden="true" />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
              {/* yellow dot = active indicator (not colour alone — also bold + stroke) */}
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full border border-ink"
                  style={{ background: 'var(--yellow)' }}
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
