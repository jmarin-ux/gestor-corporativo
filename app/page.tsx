'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, LayoutGrid, ShieldCheck, Zap, Globe, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // 🟢 CONFIGURACIÓN DE SOPORTE WHATSAPP ACTUALIZADA
  // Formato limpio: Código país (52) + 1 + Número (10 dígitos)
  const supportPhone = "5215610720919" 
  const supportMessage = "Hola Wuotto Systems, requiero asistencia técnica en el Portal Corporativo."

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const role = (profile?.role || '').toLowerCase().trim()

        if (['admin', 'coordinador', 'superadmin'].includes(role)) {
            router.replace('/dashboard')
        } else if (['operativo', 'staff', 'technician'].includes(role)) {
            router.replace('/dashboard-staff')
        } else if (['client', 'cliente'].includes(role)) {
            router.replace('/accesos/cliente')
        } else {
            setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  const handleSupportClick = () => {
      const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(supportMessage)}`
      window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a1e3f]">
        <div className="relative">
            <div className="absolute inset-0 bg-[#00C897] blur-xl opacity-20 rounded-full animate-pulse"></div>
            <Loader2 className="h-12 w-12 animate-spin text-[#00C897] relative z-10"/>
        </div>
        <p className="text-white/60 font-black tracking-[0.3em] text-[10px] uppercase mt-6 animate-pulse">
            Autenticando Credenciales
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-hidden selection:bg-[#00C897] selection:text-[#0a1e3f]">
      
      {/* Fondo Decorativo */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00C897]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Barra Superior */}
      <nav className="p-6 md:p-8 flex justify-between items-center max-w-7xl mx-auto w-full relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl shadow-lg shadow-blue-900/5 border border-slate-100">
                <LayoutGrid className="text-[#0a1e3f]" size={22} strokeWidth={2.5}/>
            </div>
            <div className="flex flex-col">
                <span className="font-black text-[#0a1e3f] text-lg tracking-tight leading-none">WUOTTO</span>
                <span className="font-bold text-[#00C897] text-[10px] tracking-[0.2em] uppercase leading-none">Systems</span>
            </div>
        </div>
        
        <button 
            onClick={() => router.push('/login')}
            className="hidden md:flex items-center gap-2 font-bold text-slate-500 text-xs hover:text-[#0a1e3f] transition-colors uppercase tracking-widest group"
        >
            Portal de Acceso <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
        </button>
      </nav>

      {/* Centro Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10">
        
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 fade-in duration-700 delay-100">
            
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-default">
                <span className="w-2 h-2 rounded-full bg-[#00C897] animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portal Corporativo v2.0</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-[#0a1e3f] tracking-tight leading-[1.1]">
                Control Operativo <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C897] to-emerald-600">Inteligente & Ágil</span>
            </h1>

            <p className="text-slate-500 font-medium text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Centralizamos la gestión de servicios técnicos, control de activos y asignación de personal en una plataforma unificada.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
                <button 
                    onClick={() => router.push('/login')}
                    className="w-full md:w-auto bg-[#0a1e3f] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-900 hover:shadow-xl hover:shadow-blue-900/20 hover:-translate-y-1 transition-all active:scale-95 group"
                >
                    Iniciar Sesión 
                    <div className="bg-white/10 p-1 rounded-lg group-hover:bg-[#00C897] group-hover:text-[#0a1e3f] transition-colors">
                        <ArrowRight size={18}/>
                    </div>
                </button>
                
                {/* 🟢 BOTÓN DE SOPORTE (WHATSAPP) */}
                <button 
                    onClick={handleSupportClick}
                    className="w-full md:w-auto bg-white border-2 border-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group"
                >
                    <MessageCircle size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors"/> Soporte
                </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-3 rounded-xl shadow-sm"><Zap size={20} className="text-amber-500"/></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo Real</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-3 rounded-xl shadow-sm"><Globe size={20} className="text-blue-500"/></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Acceso Global</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-3 rounded-xl shadow-sm"><ShieldCheck size={20} className="text-emerald-500"/></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Seguridad</span>
                </div>
            </div>

        </div>
      </div>

      <footer className="p-6 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            © 2026 Wuotto Systems • Todos los derechos reservados
        </p>
      </footer>
    </div>
  )
}