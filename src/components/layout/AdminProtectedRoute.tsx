import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AdminLoginPage } from '../../pages/AdminLoginPage'
import { Loader2 } from 'lucide-react'

export function AdminProtectedRoute() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return <AdminLoginPage />
  }

  return <Outlet />
}
