import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AdminLoginPage } from '../../pages/AdminLoginPage'
import { Loader2 } from 'lucide-react'

export function AdminProtectedRoute() {
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setIsAdmin(data?.role === 'admin')
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) await checkAdmin(session.user.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) await checkAdmin(session.user.id)
      else setIsAdmin(false)
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

  if (!session || !isAdmin) {
    return <AdminLoginPage />
  }

  return <Outlet />
}
