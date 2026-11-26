import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { upsertProfile } from '@/lib/supabase/queries'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface UseAuthReturn extends AuthState {
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signOutEverywhere: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (error) return { error: error.message }

      // Create profile row after sign-up
      if (data.user) {
        await upsertProfile({ id: data.user.id, display_name: displayName })
      }
      return { error: null }
    } catch (err) {
      return { error: String(err) }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err) {
      return { error: String(err) }
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const signOutEverywhere = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' })
  }, [])

  return { ...state, signUp, signIn, signOut, signOutEverywhere }
}
