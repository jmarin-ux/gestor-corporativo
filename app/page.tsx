'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, LayoutGrid } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      // 1. Verificar si ya hay sesión iniciada
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Si hay usuario, consultamos su rol para redirigirlo
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const role = (profile?.role || '').toLowerCase().trim()

        // Redirección inteligente
        if (['admin', 'coordinador', 'superadmin'].includes(role)) {
            router.replace('/dashboard')
        } else if (['operativo', 'staff', 'technician'].includes(role)) {
            router.replace('/dashboard-staff')
        } else if (['client', 'cliente'].includes(role)) {
            router.replace('/accesos/cliente')
        } else {
            setLoading(false) // Rol raro, mostramos portada
        }
      } else {
        setLoading(false) // No hay sesión, mostramos portada
      }
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a1e3f]">
        <Loader2 className="h-10 w-10 animate-spin text-[#00C897] mb-4"/>
        <p className="text-white font-bold tracking-widest text-xs uppercase">Verificando...</p>
      </div>
    )
  }

  // --- VISTA DE PORTADA ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Barra Superior */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
            <div className="bg-[#0a1e3f] p-2 rounded-lg">
                <LayoutGrid className="text-[#00C897]" size={20}/>
            </div>
            <span className="font-black text-[#0a1e3f] text-lg tracking-tight">WUOTTO<span className="text-[#00C897]">SYSTEMS</span></span>
        </div>
        <button 
            onClick={() => router.push('/login')}
            className="font-bold text-[#0a1e3f] text-sm hover:text-[#00C897] transition-colors uppercase tracking-widest"
        >
            Iniciar Sesión
        </button>
      </nav>

      {/* Centro */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-3xl w-full animate-in zoom-in-95 duration-500">
            <div className="inline-block bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                Portal Corporativo v2.0
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-[#0a1e3f] mb-6 tracking-tight leading-tight">
                GESTIÓN <span className="text-[#00C897]">OPERATIVA</span> INTEGRAL
            </h1>
            <p className="text-slate-400 font-medium text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                Plataforma centralizada para el control de tickets, asignación de personal técnico y administración de activos.
            </p>

            <button 
                onClick={() => router.push('/login')}
                className="bg-[#0a1e3f] text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 mx-auto hover:bg-[#00C897] hover:scale-105 transition-all shadow-xl shadow-blue-900/20"
            >
                Acceder al Sistema <ArrowRight size={20}/>
            </button>
        </div>

        <p className="mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            © 2026 Wuotto Systems • Acceso Autorizado Únicamente
        </p>
      </div>
    </div>
  )
}