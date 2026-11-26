import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen, LogOut, Settings,
  BarChart2, CalendarDays, CheckSquare, FileText,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isActive  = (path: string) => location.pathname === path

  const handleSignOut = async () => { await signOut(); navigate('/') }

  // Profile avatar: use stored avatar initial from localStorage if available
  const storedName  = localStorage.getItem('studysync_display_name') ?? ''
  const avatarLetter = storedName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const displayName  = storedName || user?.email?.split('@')[0] || 'Profile'

  return (
    <header
      className="sticky top-0 z-40 w-full border-b-[2.5px]"
      style={{ background: 'var(--paper)', borderColor: 'var(--ink)' }}
    >
      <div className="container flex h-16 items-center justify-between px-4 max-w-5xl mx-auto gap-3">

        {/* ── Logo ── */}
        <Link to={user ? '/today' : '/'} className="flex items-center gap-2 shrink-0" aria-label="StudySync home">
          <div className="w-9 h-9 rounded-[10px] border-2 flex items-center justify-center"
            style={{ background: 'var(--violet)', borderColor: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
            <BookOpen className="h-5 w-5" style={{ color: 'var(--paper)' }} aria-hidden="true" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight hidden sm:block">StudySync</span>
        </Link>

        {/* ── Desktop nav ── */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center" aria-label="Main navigation">
            {[
              { to: '/today',    icon: CheckSquare,  label: 'Today' },
              { to: '/plan',     icon: CalendarDays, label: 'Plan' },
              { to: '/progress', icon: BarChart2,    label: 'Progress' },
              { to: '/syllabus', icon: FileText,     label: 'Syllabus' },
            ].map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-sm font-medium border-2 transition-all
                  ${isActive(to) ? 'font-semibold' : 'border-transparent hover:border-ink'}`}
                style={isActive(to)
                  ? { background: 'var(--yellow)', borderColor: 'var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }
                  : {}}
                aria-current={isActive(to) ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* ── Right controls ── */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {/* Profile avatar button → Settings */}
              <Link to="/settings"
                className="btn-brutal flex items-center gap-2 px-3 min-h-[40px]"
                style={{ background: 'var(--violet)', color: '#fff' }}
                aria-label={`Profile — ${user.email}`}
              >
                <span
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-heading font-bold text-sm shrink-0 overflow-hidden"
                  style={{ background: 'var(--yellow)', borderColor: 'var(--ink)', color: 'var(--ink)' }}
                  aria-hidden="true"
                >
                  {avatarLetter}
                </span>
                <span className="hidden md:block text-xs font-semibold truncate max-w-[90px]">{displayName}</span>
                <Settings className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
              </Link>

              {/* Sign out */}
              <button onClick={handleSignOut}
                className="btn-brutal btn-missed flex items-center gap-1.5 px-3 min-h-[40px]"
                aria-label="Sign out">
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:block text-xs font-semibold">Sign out</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-brutal btn-primary flex items-center gap-1.5 px-4 min-h-[40px]">
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold">Get Started</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
