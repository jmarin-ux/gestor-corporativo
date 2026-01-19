'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, Clock, MapPin, Eye, ArrowDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Componentes existentes
import Header from '@/components/ui/Header' 
import PlannerView from '@/components/dashboard/PlannerView' 

export default function DashboardStaffPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados para la vista de asistencia
  const [activeTab, setActiveTab] = useState<'planner' | 'history'>('planner')
  const [myLogs, setMyLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // 1. CARGA DE SESIÓN
  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        window.location.href = '/login'
        return
      }

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

      // Validación de Rol (Permitimos que entren operativos y coordinadores si lo deseas en esta vista)
      const userRole = (profile.role || '').toLowerCase().trim()
      if (!['operativo', 'staff', 'technician', 'coordinador', 'admin', 'superadmin'].includes(userRole)) {
         await supabase.auth.signOut()
         window.location.href = '/login'
         return
      }

      setUser(profile)
      setLoading(false)
    }

    getSession()
  }, [])

  // 2. CARGAR MIS REGISTROS (SOLO LOS DEL USUARIO ACTUAL)
  useEffect(() => {
    if (activeTab === 'history' && user) {
        const fetchMyAttendance = async () => {
            setLoadingLogs(true)
            const { data } = await supabase
                .from('attendance_logs')
                .select('*')
                .eq('user_id', user.id) // 🔒 FILTRO DE SEGURIDAD: Solo mis registros
                .order('created_at', { ascending: false }) // Del más reciente al más antiguo
                .limit(50) // Traemos los últimos 50 para no saturar

            setMyLogs(data || [])
            setLoadingLogs(false)
        }
        fetchMyAttendance()
    }
  }, [activeTab, user])

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
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] font-sans">
      <Header 
        user={user} 
        currentRole={user.role?.toUpperCase()} 
        onLogout={handleLogout} 
      />

      <div className="pt-24 px-4 pb-8 max-w-7xl mx-auto">
        
        {/* BOTONES DE NAVEGACIÓN (TABS) */}
        <div className="flex justify-center md:justify-start mb-6">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm inline-flex gap-1 border border-slate-100">
                <button 
                    onClick={() => setActiveTab('planner')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        activeTab === 'planner' 
                        ? 'bg-[#0a1e3f] text-white shadow-md' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                >
                    <Calendar size={14} strokeWidth={2.5}/> Mis Tareas
                </button>

                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        activeTab === 'history' 
                        ? 'bg-[#0a1e3f] text-white shadow-md' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                >
                    <Clock size={14} strokeWidth={2.5}/> Historial Asistencia
                </button>
            </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-[2rem] shadow-sm min-h-[80vh] overflow-hidden border border-slate-100/50">
            
            {/* VISTA 1: PLANIFICADOR (Tareas) */}
            {activeTab === 'planner' && (
                <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <PlannerView currentUser={user} onBack={handleLogout} />
                </div>
            )}

            {/* VISTA 2: TABLA DE HISTORIAL (Espejo simple) */}
            {activeTab === 'history' && (
                <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-black text-[#0a1e3f] uppercase">Mis Registros Recientes</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
                            Mostrando últimos 50
                        </span>
                    </div>

                    {loadingLogs ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#00C897]"/></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Hora</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4 text-center">Evidencia</th>
                                        <th className="p-4 text-center">Ubicación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {myLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center text-slate-400 text-xs font-bold uppercase">
                                                No tienes registros aún.
                                            </td>
                                        </tr>
                                    ) : (
                                        myLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 text-xs font-bold text-slate-700">
                                                    {new Date(log.created_at).toLocaleDateString('es-MX', {
                                                        weekday: 'short', day: 'numeric', month: 'long'
                                                    })}
                                                </td>
                                                <td className="p-4 text-xs font-black text-[#0a1e3f]">
                                                    {new Date(log.created_at).toLocaleTimeString('es-MX', {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        log.check_type === 'ENTRADA' 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                        : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    }`}>
                                                        {log.check_type}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => window.open(log.photo_url, '_blank')}
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline"
                                                    >
                                                        <Eye size={12}/> Ver Foto
                                                    </button>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <a 
                                                        href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-500 transition-colors"
                                                    >
                                                        <MapPin size={12}/> Mapa
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </main>
  )
}