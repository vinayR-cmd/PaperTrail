import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 3000)

    supabase.auth.getSession()
      .then(({ data, error }) => {
        clearTimeout(safetyTimer)
        if (error) { setLoading(false); return }

        const s = data?.session ?? null
        setSession(s)
        setUser(s?.user ?? null)

        if (s?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', s.user.id)
            .single()
            .then(({ data: p }) => setProfile(p))
            .catch(() => {})
        }
        setLoading(false)
      })
      .catch(() => {
        clearTimeout(safetyTimer)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        setLoading(false)
        if (s?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', s.user.id)
            .single()
            .then(({ data: p }) => setProfile(p))
            .catch(() => {})
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
    }
  }, [])

  async function signOut() {
    setUser(null)
    setSession(null)
    setProfile(null)
    setLoading(false)
    await supabase.auth.signOut().catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
