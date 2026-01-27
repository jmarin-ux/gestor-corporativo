'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Loader2, Calendar, Clock, MapPin, Eye, Fingerprint, 
  CheckCircle2, AlertCircle 
} from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'

// Componentes
import Header from '@/components/ui/Header' 
import PlannerView from '@/components/dashboard/PlannerView' 
import AttendanceModal from '@/components/dashboard/AttendanceModal' 

export default function DashboardStaffPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados para la vista
  const [activeTab, setActiveTab] = useState<'planner' | 'history'>('planner')
  const [groupedLogs, setGroupedLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Estado para el modal
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  // 2. FUNCIÓN DE CARGA Y AGRUPACIÓN
  const fetchMyAttendance = async () => {
    if (!user) return
    setLoadingLogs(true)
    
    // Traemos los logs planos
    const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) 

    const rawLogs = data || []
    const groups: Record<string, any> = {}

    // Agrupamos por fecha local
    rawLogs.forEach((log) => {
        const logDateObj = new Date(log.created_at)
        const logDate = logDateObj.toLocaleDateString('en-CA') 
        
        if (!groups[logDate]) {
            groups[logDate] = {
                id: logDate,
                date: logDate,
                entrada: null,
                salida: null
            }
        }

        if (log.check_type === 'ENTRADA') {
            if (!groups[logDate].entrada) groups[logDate].entrada = log
        } 
        else if (log.check_type.includes('SALIDA')) {
            if (!groups[logDate].salida) groups[logDate].salida = log
        }
    })

    const sortedGroups = Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date))
    setGroupedLogs(sortedGroups)
    setLoadingLogs(false)
  }

  // 3. EFECTO AL CAMBIAR TAB
  useEffect(() => {
    if (activeTab === 'history' && user) {
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

  // Callback exitoso: Cierra modal y refresca
  const handleSuccess = () => {
      setIsModalOpen(false)
      // Si estamos en historial, refrescamos. Si no, cambiamos a historial.
      if (activeTab === 'history') {
          fetchMyAttendance()
      } else {
          setActiveTab('history')
      }
  }

  // Helper para celda de hora
  const TimeInfo = ({ log, type }: { log: any, type: string }) => {
      if (!log) return <div className="h-full flex items-center text-slate-300 font-medium text-sm italic">-- : --</div>
      
      const time = new Date(log.created_at).toLocaleTimeString('es-MX', {
          hour: '2-digit', minute: '2-digit', hour12: true
      })

      const isAuto = log.check_type === 'SALIDA_AUTO'
      const isManual = log.check_type === 'SALIDA_MANUAL'

      return (
          <div className="flex flex-col justify-center h-full">
              <span className={`text-sm font-black tracking-tight ${type === 'ENTRADA' ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {time}
              </span>
              <div className="flex items-center gap-2 mt-1">
                {isAuto && <span className="text-[9px] font-bold text-white bg-rose-400 px-1.5 rounded uppercase">Auto</span>}
                {isManual && <span className="text-[9px] font-bold text-white bg-indigo-400 px-1.5 rounded uppercase">Editado</span>}
                
                {log.photo_url && (
                    <button onClick={() => window.open(log.photo_url, '_blank')} className="text-[10px] font-bold text-blue-400 hover:text-blue-600 flex items-center gap-0.5 transition-colors">
                        <Eye size={12}/>
                    </button>
                )}
              </div>
          </div>
      )
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

      <div className="pt-24 px-4 pb-8 max-w-6xl mx-auto">
        
        {/* ENCABEZADO Y BOTONES */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm inline-flex gap-1 border border-slate-100">
                <button onClick={() => setActiveTab('planner')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'planner' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                    <Calendar size={16} strokeWidth={2.5}/> Mis Tareas
                </button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'history' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                    <Clock size={16} strokeWidth={2.5}/> Historial
                </button>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-transform active:scale-95 border border-[#00C897]">
                <Fingerprint size={20} /> Registrar Asistencia
            </button>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 min-h-[600px] overflow-hidden border border-slate-100 relative">
            
            {activeTab === 'planner' && (
                <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PlannerView currentUser={user} onBack={handleLogout} />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-8 pl-2">
                        <div>
                            <h2 className="text-xl font-black text-[#0a1e3f] uppercase tracking-tight">Historial de Checadas</h2>
                            <p className="text-xs font-medium text-slate-400 mt-1">Resumen de tus entradas y salidas</p>
                        </div>
                        <button onClick={fetchMyAttendance} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                            <Clock size={14}/>
                        </button>
                    </div>

                    {loadingLogs ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-50">
                            <Loader2 className="animate-spin text-[#00C897] mb-2" size={32}/>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando registros...</span>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100/80">
                                        <th className="pb-4 pl-4 w-1/4">Fecha</th>
                                        <th className="pb-4 w-1/4">Entrada</th>
                                        <th className="pb-4 w-1/4">Salida</th>
                                        <th className="pb-4 pr-4 w-1/4 text-center">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {groupedLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center text-slate-300">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Calendar size={40} strokeWidth={1} className="opacity-50"/>
                                                    <p className="text-xs font-bold uppercase">Sin registros recientes</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        groupedLogs.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50/60 transition-colors group">
                                                
                                                {/* FECHA */}
                                                <td className="py-5 pl-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-[#0a1e3f] capitalize">
                                                            {new Date(row.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric'})}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                            {new Date(row.date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* ENTRADA */}
                                                <td className="py-5">
                                                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50 w-full max-w-[140px]">
                                                        <TimeInfo log={row.entrada} type="ENTRADA" />
                                                    </div>
                                                </td>

                                                {/* SALIDA */}
                                                <td className="py-5">
                                                    <div className="bg-white rounded-xl p-3 border border-slate-100 w-full max-w-[140px] group-hover:border-slate-200 transition-colors">
                                                        <TimeInfo log={row.salida} type="SALIDA" />
                                                    </div>
                                                </td>

                                                {/* ESTATUS */}
                                                <td className="py-5 pr-4 text-center">
                                                    {row.entrada && row.salida ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                            <CheckCircle2 size={12}/> Completa
                                                        </span>
                                                    ) : row.entrada ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                            <Clock size={12}/> En Curso
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                            <AlertCircle size={12}/> Incompleta
                                                        </span>
                                                    )}
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

      {user && (
        <AttendanceModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)} // Cierra sin refrescar
            currentUser={user}
            onSuccess={handleSuccess} // Cierra Y refresca (CORRECCIÓN)
        />
      )}
    </main>
  )
}