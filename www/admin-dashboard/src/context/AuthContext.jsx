import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// adminStatus is tri-state so we never flash the "access denied" screen while
// the check is still in flight: 'unknown' → 'yes' | 'no'.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [adminStatus, setAdminStatus] = useState('unknown')
  const [loading, setLoading] = useState(true) // resolving the initial session

  // Ask the DB whether the signed-in user is an admin. RLS on public.admins
  // only lets a user see their OWN row, so a returned row is authoritative and
  // cannot be forged client-side.
  async function refreshAdmin(currentSession) {
    if (!currentSession) {
      setAdminStatus('no')
      return
    }
    setAdminStatus('unknown')
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', currentSession.user.id)
      .maybeSingle()
    setAdminStatus(!error && !!data ? 'yes' : 'no')
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await refreshAdmin(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAdminStatus('unknown')
      refreshAdmin(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const logout = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    isAdmin: adminStatus === 'yes',
    adminResolved: adminStatus !== 'unknown',
    loading,
    signInWithPassword,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
