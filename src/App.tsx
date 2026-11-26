import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import DemoToolbar from '@/components/demo/DemoToolbar'
import MobileNav from '@/components/layout/MobileNav'
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import OnboardingPage from '@/pages/OnboardingPage'
import TodayPage from '@/pages/TodayPage'
import WeeklyPlanPage from '@/pages/WeeklyPlanPage'
import ProgressPage from '@/pages/ProgressPage'
import SettingsPage from '@/pages/SettingsPage'
import FeedbackPage from '@/pages/FeedbackPage'
import SyllabusPage from '@/pages/SyllabusPage'
import SetupCheckPage from '@/pages/SetupCheckPage'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="brutal-card px-8 py-6 text-center space-y-2 animate-fade-rise">
          <div className="w-8 h-8 border-4 border-ink border-t-violet rounded-full animate-spin mx-auto" />
          <p className="font-heading font-semibold text-sm">Loading…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/"           element={user ? <Navigate to="/today" replace /> : <LandingPage />} />
      <Route path="/auth"       element={user ? <Navigate to="/today" replace /> : <AuthPage />} />
      <Route path="/demo"       element={<TodayPage />} />
      <Route path="/today"      element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
      <Route path="/plan"       element={<ProtectedRoute><WeeklyPlanPage /></ProtectedRoute>} />
      <Route path="/progress"   element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/feedback"   element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
      <Route path="/syllabus"   element={<ProtectedRoute><SyllabusPage /></ProtectedRoute>} />
      <Route path="/setup"      element={<SetupCheckPage />} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  // Dark mode is managed by the hook — Settings page reads/writes the same localStorage key
  useDarkMode()

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
        <Header />
        <DemoToolbar />
        <AppRoutes />
        <MobileNav />
      </div>
    </BrowserRouter>
  )
}
