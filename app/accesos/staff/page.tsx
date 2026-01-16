'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'

// Componentes
import Header from '@/components/ui/Header'
import PlannerView from '@/components/dashboard/PlannerView'

export default function DashboardStaffPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      // 1️⃣ Sesión
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      // 2️⃣ Perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !profile) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      // 3️⃣ Rol claro y único
      const role = (profile.role || '').toLowerCase().trim()

      if (role !== 'operativo') {
        if (['admin', 'coordinador', 'superadmin'].includes(role)) {
          router.replace('/dashboard')
          return
        }

        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      // 4️⃣ OK
      setUser(profile)
      setLoading(false)
    }

    bootstrap()
  }, [router])

  const handleLogout = async () => {
    if (confirm('¿Cerrar sesión?')) {
      await supabase.auth.signOut()
      router.replace('/login')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-[#00C897]" size={48} />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Cargando perfil operativo...
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] font-sans">
      <Header user={user} currentRole="OPERATIVO" onLogout={handleLogout} />

      <div className="pt-24 px-4 pb-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-sm p-6 min-h-[80vh]">
          <PlannerView currentUser={user} />
        </div>
      </div>
    </main>
  )
}
