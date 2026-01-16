'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'

// Componentes
import Header from '@/components/ui/Header' 
import PlannerView from '@/components/dashboard/PlannerView' 

export default function DashboardStaffPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      // 1. Verificar Sesión
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        window.location.href = '/login'
        return
      }

      // 2. Obtener Perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
         await supabase.auth.signOut()
         window.location.href = '/login'
         return
      }

      // 3. Normalizar Rol (ESTO ES LO QUE FALTABA) 🔍
      const userRole = (profile.role || '').toLowerCase().trim()

      // 4. Validar Seguridad con el rol en minúsculas
      if (userRole !== 'operativo' && userRole !== 'staff' && userRole !== 'technician') {
         
         // Si es admin, mandarlo a su sitio
         if (['admin', 'coordinador', 'superadmin'].includes(userRole)) {
             window.location.href = '/dashboard'
             return
         }

         // Si no es nada de lo anterior, expulsar
         await supabase.auth.signOut()
         window.location.href = '/login'
         return
      }

      // ✅ Todo en orden
      setUser(profile)
      setLoading(false)
    }

    getSession()
  }, [])

  const handleLogout = async () => {
    if (confirm("¿Cerrar sesión?")) {
        await supabase.auth.signOut()
        localStorage.clear()
        window.location.href = '/login'
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-[#00C897]" size={48}/>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando perfil operativo...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] font-sans">
      <Header 
        user={user} 
        currentRole="OPERATIVO" 
        onLogout={handleLogout} 
      />

      <div className="pt-24 px-4 pb-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-sm p-6 min-h-[80vh]">
            <PlannerView currentUser={user} onBack={handleLogout} />
        </div>
      </div>
    </main>
  )
}