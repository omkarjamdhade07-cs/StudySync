/**
 * Database setup checker — visit /setup to see which tables exist.
 * Remove or hide this page before going to production.
 */
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Copy } from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import { supabase } from '@/lib/supabase/client'

const TABLES = [
  'profiles', 'subjects', 'topics', 'availability',
  'date_overrides', 'preferences', 'tasks', 'plan_events',
  'eval_events', 'feedback_responses',
]

const MIGRATION_FILES = [
  '001_init.sql', '002_rls.sql', '003_indexes.sql', '004_evaluation_view.sql',
]

interface TableStatus {
  table: string
  exists: boolean
  error: string | null
}

export default function SetupCheckPage() {
  const [results, setResults] = useState<TableStatus[]>([])
  const [checking, setChecking] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const check = async () => {
      setChecking(true)
      const statuses: TableStatus[] = []

      for (const table of TABLES) {
        try {
          const { error: qErr } = await supabase.from(table).select('id').limit(1)
          if (qErr) {
            statuses.push({ table, exists: false, error: qErr.message })
          } else {
            statuses.push({ table, exists: true, error: null })
          }
        } catch (err) {
          statuses.push({ table, exists: false, error: String(err) })
        }
      }

      setResults(statuses)
      setChecking(false)
    }
    check()
  }, [])

  const allGood = results.every(r => r.exists)
  const missing = results.filter(r => !r.exists)

  const instructions = `-- Run these in Supabase SQL Editor in order:
-- 1. Open supabase/migrations/001_init.sql → paste → Run
-- 2. Open supabase/migrations/002_rls.sql  → paste → Run
-- 3. Open supabase/migrations/003_indexes.sql → paste → Run
-- 4. Open supabase/migrations/004_evaluation_view.sql → paste → Run`

  const copyInstructions = () => {
    navigator.clipboard.writeText(instructions)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="brutal-card overflow-hidden">
          <div className="title-strip">🔧 Database Setup Check</div>
          <div className="p-5 space-y-4">

            {checking ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking tables…
              </div>
            ) : (
              <>
                {/* Overall status */}
                <div
                  className="p-3 rounded-brutal border-2 text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: allGood ? 'var(--teal)' : 'var(--red)',
                    borderColor: 'var(--ink)',
                    color: allGood ? 'var(--ink)' : '#fff',
                    boxShadow: '3px 3px 0 var(--ink)',
                  }}
                >
                  {allGood
                    ? <><CheckCircle className="h-4 w-4" /> All tables exist — database is set up correctly!</>
                    : <><XCircle className="h-4 w-4" /> {missing.length} table{missing.length !== 1 ? 's' : ''} missing — run the migrations below</>
                  }
                </div>

                {/* Table list */}
                <div className="divide-y-2 divide-ink/10 border-2 border-ink rounded-brutal overflow-hidden">
                  {results.map(({ table, exists }) => (
                    <div key={table} className="flex items-center justify-between px-4 py-2.5">
                      <span className="font-mono text-sm">{table}</span>
                      <div className="flex items-center gap-2">
                        {exists
                          ? <span className="chip text-xs" style={{ background: 'var(--teal)', color: 'var(--ink)' }}>
                              <CheckCircle className="h-3 w-3" /> exists
                            </span>
                          : <span className="chip text-xs" style={{ background: 'var(--red)', color: '#fff' }}>
                              <XCircle className="h-3 w-3" /> missing
                            </span>
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error details */}
                {missing.length > 0 && (
                  <div className="space-y-3">
                    <div className="brutal-card p-4 space-y-2">
                      <p className="font-heading font-bold text-sm">How to fix</p>
                      <ol className="text-sm space-y-1 list-decimal list-inside text-ink/70">
                        <li>Go to <strong>supabase.com</strong> → your project → <strong>SQL Editor</strong></li>
                        <li>Click <strong>New query</strong></li>
                        {MIGRATION_FILES.map((f) => (
                          <li key={f}>Open <code className="font-mono bg-ink/10 px-1 rounded">supabase/migrations/{f}</code> → copy all → paste → click <strong>Run</strong></li>
                        ))}
                      </ol>
                    </div>

                    <button onClick={copyInstructions} className="btn-brutal btn-secondary w-full text-sm">
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {copied ? 'Copied!' : 'Copy instructions'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Auth check */}
        <AuthCheck />
      </div>
    </PageWrapper>
  )
}

function AuthCheck() {
  const [session, setSession] = useState<string>('checking…')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ? `✅ Logged in as ${session.user.email}` : '❌ Not logged in')
    })
  }, [])

  return (
    <div className="brutal-card overflow-hidden">
      <div className="title-strip">🔑 Auth Status</div>
      <div className="p-4">
        <p className="font-mono text-sm">{session}</p>
      </div>
    </div>
  )
}
