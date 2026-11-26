import { useState, useEffect, useRef } from 'react'
import {
  Download, Trash2, LogOut, Loader2, Shield, Eye,
  RotateCcw, AlertTriangle, Sun, Moon, User,
  Camera, Save, GraduationCap, MapPin, Hash, BookOpen,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { exportUserData, resetAllUserData, getProfile, upsertProfile } from '@/lib/supabase/queries'
import type { ProfileRow } from '@/lib/supabase/types'

/* ── Toggle switch component ── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="w-12 h-6 rounded-full border-2 border-ink relative transition-colors shrink-0"
      style={{ background: checked ? 'var(--violet)' : 'rgba(17,17,17,0.15)', boxShadow: '2px 2px 0 var(--ink)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full border-2 border-ink bg-paper transition-transform"
        style={{ transform: checked ? 'translateX(1.5rem)' : 'translateX(0.125rem)' }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </button>
  )
}

/* ── Section wrapper ── */
function Section({ id, title, icon, children, accent }: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string
}) {
  return (
    <section className="brutal-card mb-5 overflow-hidden" aria-labelledby={id}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: accent ?? 'var(--ink)' }}>
        <span style={{ color: 'var(--paper)' }}>{icon}</span>
        <h2 id={id} className="font-heading font-bold text-sm" style={{ color: 'var(--paper)' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { user, signOutEverywhere } = useAuth()
  const { darkMode, toggle: toggleDark } = useDarkMode()
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)

  /* ── Profile state ── */
  const [profile,        setProfile]        = useState<Partial<ProfileRow>>({})
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving,  setProfileSaving]  = useState(false)
  const [profileSaved,   setProfileSaved]   = useState(false)
  const [profileError,   setProfileError]   = useState<string | null>(null)
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null)

  /* ── Other state ── */
  const [exporting,      setExporting]      = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState(false)
  const [deleteInput,    setDeleteInput]    = useState('')
  const [resetConfirm,   setResetConfirm]   = useState(false)
  const [resetInput,     setResetInput]     = useState('')
  const [resetting,      setResetting]      = useState(false)
  const [resetDone,      setResetDone]      = useState(false)
  const [resetError,     setResetError]     = useState<string | null>(null)
  const [reduceBlur,     setReduceBlur]     = useState(
    () => localStorage.getItem('studysync_reduce_transparency') === 'true'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-transparency', reduceBlur)
    localStorage.setItem('studysync_reduce_transparency', String(reduceBlur))
  }, [reduceBlur])

  /* Load profile */
  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(({ data }) => {
      if (data) {
        setProfile(data)
        setAvatarPreview(data.avatar_url ?? null)
        // Cache display name for Header
        if (data.display_name) localStorage.setItem('studysync_display_name', data.display_name)
      }
      setProfileLoading(false)
    })
  }, [user])

  /* Avatar file pick */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setProfile(p => ({ ...p, avatar_url: result }))
    }
    reader.readAsDataURL(file)
  }

  /* Save profile */
  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true); setProfileError(null); setProfileSaved(false)
    const { error } = await upsertProfile({
      id: user.id,
      display_name: profile.display_name ?? user.email?.split('@')[0] ?? 'Student',
      avatar_url:   profile.avatar_url ?? null,
      bio:          profile.bio ?? null,
      grade:        profile.grade ?? null,
      school_name:  profile.school_name ?? null,
      college_name: profile.college_name ?? null,
      department:   profile.department ?? null,
      semester:     profile.semester ?? null,
      roll_number:  profile.roll_number ?? null,
      city:         profile.city ?? null,
    })
    if (error) {
      setProfileError(`Failed to save: ${JSON.stringify(error)}`)
    } else {
      setProfileSaved(true)
      if (profile.display_name) localStorage.setItem('studysync_display_name', profile.display_name)
      setTimeout(() => setProfileSaved(false), 2500)
    }
    setProfileSaving(false)
  }

  const handleExport = async () => {
    if (!user) return
    setExporting(true)
    try {
      const data = await exportUserData(user.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `studysync-export-${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  const handleReset = async () => {
    if (!user || resetInput !== 'RESET') return
    setResetting(true); setResetError(null)
    const { error } = await resetAllUserData(user.id)
    if (error) { setResetError(`Reset failed: ${JSON.stringify(error)}`); setResetting(false); return }
    setResetting(false); setResetDone(true)
    setTimeout(() => navigate('/onboarding'), 1500)
  }

  const f = (key: keyof ProfileRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile(p => ({ ...p, [key]: e.target.value }))

  const avatarLetter = (profile.display_name ?? user?.email ?? '?')[0]?.toUpperCase()

  return (
    <PageWrapper>
      <h1 className="font-heading font-bold text-3xl mb-6">Settings</h1>

      {/* ══════════════════════════════════════
          PROFILE
      ══════════════════════════════════════ */}
      <Section id="profile-heading" title="Profile" icon={<User className="h-4 w-4" />} accent="var(--violet)">
        {profileLoading ? (
          <div className="p-5 flex items-center gap-2 text-sm" style={{ opacity: 0.6 }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
          </div>
        ) : (
          <div className="p-5 space-y-5">

            {/* Success / error */}
            {profileSaved && (
              <div className="text-xs px-3 py-2 rounded-brutal border-2 font-semibold"
                style={{ background: 'var(--teal)', borderColor: 'var(--ink)', color: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
                ✓ Profile saved!
              </div>
            )}
            {profileError && (
              <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2"
                style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)' }}>
                ⚠ {profileError}
              </div>
            )}

            {/* Avatar + name row */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-20 h-20 rounded-brutal border-2 border-ink overflow-hidden flex items-center justify-center cursor-pointer"
                  style={{ background: avatarPreview ? 'transparent' : 'var(--violet)', boxShadow: '3px 3px 0 var(--ink)' }}
                  onClick={() => fileRef.current?.click()}
                  title="Click to change profile picture"
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    : <span className="font-heading font-bold text-3xl" style={{ color: 'var(--paper)' }}>{avatarLetter}</span>
                  }
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full border-2 border-ink flex items-center justify-center"
                  style={{ background: 'var(--yellow)', boxShadow: '1.5px 1.5px 0 var(--ink)' }}
                  aria-label="Change profile picture"
                >
                  <Camera className="h-3.5 w-3.5" style={{ color: 'var(--ink)' }} aria-hidden="true" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={handleAvatarChange} aria-label="Upload profile picture" />
              </div>

              {/* Display name + email */}
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-heading font-semibold">Display name</label>
                  <input value={profile.display_name ?? ''} onChange={f('display_name')}
                    placeholder="Your name" className="input-brutal" />
                </div>
                <div>
                  <p className="text-xs font-heading font-semibold mb-0.5">Email</p>
                  <p className="font-mono text-sm px-3 py-2 rounded-brutal border-2 border-ink/30"
                    style={{ background: 'var(--paper)', opacity: 0.6 }}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-xs font-heading font-semibold">Bio (optional)</label>
              <textarea value={profile.bio ?? ''} onChange={f('bio')}
                placeholder="A short description about yourself…"
                rows={2} className="input-brutal resize-none" maxLength={300} />
              <p className="text-xs text-right font-mono" style={{ opacity: 0.4 }}>{(profile.bio ?? '').length}/300</p>
            </div>

            {/* Academic info grid */}
            <div>
              <p className="text-xs font-heading font-bold mb-3 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Academic Info
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'school_name'  as keyof ProfileRow, label: 'School name',    icon: <BookOpen className="h-3.5 w-3.5" />, placeholder: 'e.g. DPS School' },
                  { key: 'college_name' as keyof ProfileRow, label: 'College / University', icon: <GraduationCap className="h-3.5 w-3.5" />, placeholder: 'e.g. BITS Pilani' },
                  { key: 'department'   as keyof ProfileRow, label: 'Department / Stream', icon: <BookOpen className="h-3.5 w-3.5" />, placeholder: 'e.g. Cyber Security' },
                  { key: 'grade'        as keyof ProfileRow, label: 'Class / Year',   icon: <Hash className="h-3.5 w-3.5" />, placeholder: 'e.g. B.Tech 1st Year' },
                  { key: 'semester'     as keyof ProfileRow, label: 'Semester',       icon: <Hash className="h-3.5 w-3.5" />, placeholder: 'e.g. Semester I' },
                  { key: 'roll_number'  as keyof ProfileRow, label: 'Roll number',    icon: <Hash className="h-3.5 w-3.5" />, placeholder: 'e.g. 2023CS001' },
                  { key: 'city'         as keyof ProfileRow, label: 'City',           icon: <MapPin className="h-3.5 w-3.5" />, placeholder: 'e.g. Mumbai' },
                ].map(({ key, label, icon, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-heading font-semibold flex items-center gap-1">
                      {icon} {label}
                    </label>
                    <input
                      value={(profile[key] as string) ?? ''}
                      onChange={f(key)}
                      placeholder={placeholder}
                      className="input-brutal"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button onClick={handleSaveProfile} disabled={profileSaving}
              className="btn-brutal btn-primary w-full">
              {profileSaving
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Save className="h-4 w-4" aria-hidden="true" />}
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        )}
      </Section>

      {/* ══════════════════════════════════════
          APPEARANCE
      ══════════════════════════════════════ */}
      <Section id="appearance-heading" title="Appearance" icon={<Sun className="h-4 w-4" />}>
        <div className="divide-y-2 divide-ink/10">

          {/* Dark mode */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-brutal border-2 border-ink flex items-center justify-center shrink-0"
                style={{ background: darkMode ? '#1e1e2e' : 'var(--yellow)', boxShadow: '2px 2px 0 var(--ink)' }}>
                {darkMode
                  ? <Moon className="h-4 w-4" style={{ color: 'var(--paper)' }} aria-hidden="true" />
                  : <Sun  className="h-4 w-4" style={{ color: 'var(--ink)' }}   aria-hidden="true" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{darkMode ? 'Dark mode' : 'Light mode'}</p>
                <p className="text-xs" style={{ opacity: 0.6 }}>
                  {darkMode ? 'Switch to light for a brighter look' : 'Switch to dark for night studying'}
                </p>
              </div>
            </div>
            <Toggle checked={darkMode} onChange={toggleDark} label="Toggle dark mode" />
          </div>

          {/* Reduce transparency */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-brutal border-2 border-ink flex items-center justify-center shrink-0"
                style={{ background: 'var(--paper)', boxShadow: '2px 2px 0 var(--ink)' }}>
                <Eye className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-sm">Reduce transparency</p>
                <p className="text-xs" style={{ opacity: 0.6 }}>Use solid backgrounds instead of glass effects</p>
              </div>
            </div>
            <Toggle checked={reduceBlur} onChange={() => setReduceBlur(v => !v)} label="Reduce transparency" />
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════
          ACCOUNT
      ══════════════════════════════════════ */}
      <Section id="account-heading" title="Account" icon={<User className="h-4 w-4" />}>
        <div className="divide-y-2 divide-ink/10">
          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ opacity: 0.5 }}>Signed in as</p>
            <p className="font-mono text-sm">{user?.email}</p>
          </div>
          <div className="px-5 py-4">
            <button onClick={signOutEverywhere} className="btn-brutal btn-secondary text-sm px-4 min-h-[40px]">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out everywhere
            </button>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════
          PRIVACY & DATA
      ══════════════════════════════════════ */}
      <Section id="privacy-heading" title="Privacy & Data" icon={<Shield className="h-4 w-4" />}>
        <div className="divide-y-2 divide-ink/10">
          <div className="px-5 py-4 space-y-2">
            <p className="font-heading font-semibold text-sm">What we store</p>
            <ul className="text-xs space-y-1 list-disc list-inside" style={{ opacity: 0.7 }}>
              <li><strong>Profile</strong> — name, avatar, academic info you enter</li>
              <li><strong>Subjects & topics</strong> — names, difficulty, confidence</li>
              <li><strong>Availability</strong> — your weekly study time</li>
              <li><strong>Tasks</strong> — scheduled sessions and your done/missed status</li>
              <li><strong>Plan events</strong> — a log of every re-plan</li>
              <li><strong>Eval events</strong> — anonymous usage metrics (only if you opt in)</li>
            </ul>
          </div>
          <div className="px-5 py-4">
            <button onClick={handleExport} disabled={exporting}
              className="btn-brutal btn-secondary text-sm px-4 min-h-[40px]">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export my data (JSON)
            </button>
          </div>
          <div className="px-5 py-4">
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="btn-brutal btn-missed text-sm px-4 min-h-[40px]">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete my account and all data
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-brutal border-2 border-dashed" style={{ borderColor: 'var(--red)' }}
                role="dialog" aria-labelledby="delete-title">
                <p id="delete-title" className="text-sm font-heading font-bold" style={{ color: 'var(--red)' }}>
                  ⚠ Permanently deletes your account. Type DELETE to confirm.
                </p>
                <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE" className="input-brutal"
                  style={deleteInput === 'DELETE' ? { borderColor: 'var(--red)', boxShadow: '4px 4px 0 var(--red)' } : {}} />
                <div className="flex gap-2">
                  <button disabled={deleteInput !== 'DELETE'} className="btn-brutal btn-missed text-sm px-4 min-h-[40px]">
                    Permanently delete
                  </button>
                  <button onClick={() => { setDeleteConfirm(false); setDeleteInput('') }}
                    className="btn-brutal btn-secondary text-sm px-4 min-h-[40px]">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════
          RESET ALL DATA
      ══════════════════════════════════════ */}
      <Section id="reset-heading" title="Reset All Data" icon={<RotateCcw className="h-4 w-4" />} accent="var(--red)">
        <div className="p-5 space-y-4">
          {resetDone && (
            <div className="text-sm font-semibold px-3 py-2 rounded-brutal border-2"
              style={{ background: 'var(--teal)', borderColor: 'var(--ink)', color: 'var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}>
              ✓ All data reset. Redirecting to onboarding…
            </div>
          )}
          {resetError && (
            <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2"
              style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)' }}>⚠ {resetError}</div>
          )}
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--red)' }} aria-hidden="true" />
            <p className="text-sm" style={{ opacity: 0.7 }}>
              Deletes all subjects, topics, tasks, and history. Your account stays — you'll go back to onboarding. <strong>Cannot be undone.</strong>
            </p>
          </div>
          {!resetConfirm ? (
            <button onClick={() => setResetConfirm(true)}
              className="btn-brutal text-sm px-4 min-h-[40px]"
              style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset all my data
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-brutal border-2 border-dashed" style={{ borderColor: 'var(--red)' }}
              role="dialog" aria-labelledby="reset-confirm-title">
              <p id="reset-confirm-title" className="text-sm font-heading font-bold" style={{ color: 'var(--red)' }}>
                ⚠ Type RESET to confirm.
              </p>
              <input type="text" value={resetInput} onChange={e => setResetInput(e.target.value)}
                placeholder="Type RESET" className="input-brutal"
                style={resetInput === 'RESET' ? { borderColor: 'var(--red)', boxShadow: '4px 4px 0 var(--red)' } : {}} />
              <div className="flex gap-2">
                <button onClick={handleReset} disabled={resetInput !== 'RESET' || resetting}
                  className="btn-brutal btn-missed text-sm px-4 min-h-[40px]">
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  {resetting ? 'Resetting…' : 'Reset everything'}
                </button>
                <button onClick={() => { setResetConfirm(false); setResetInput('') }}
                  className="btn-brutal btn-secondary text-sm px-4 min-h-[40px]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </PageWrapper>
  )
}
