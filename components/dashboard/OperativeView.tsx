'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, CheckCircle2, X, MessageSquareText, LogOut, MapPin, Hash } from 'lucide-react'

type AssignmentRow = {
  id: string
  work_date: string // YYYY-MM-DD
  leader_id: string | null
  auxiliary_id: string | null
  ticket_id: number | null
  site_id: number | null
  service_type: string | null
  details: string | null
}

type TicketRow = {
  id: number
  codigo_servicio: string | null
  status: string | null
  priority: string | null
  description: string | null
  location: string | null
  service_type: string | null
  company: string | null
  scheduled_date: string | null
}

type SiteRow = {
  id: number
  name: string | null
  state: string | null
  client_id: string | null
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = x.getDate() - day + (day === 0 ? -6 : 1)
  x.setDate(diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function OperativeView({ currentUser }: { currentUser: any }) {
  const router = useRouter()

  const userId = (currentUser?.id || '').toString()
  
  // Verificación de Líder (Role o Position)
  const isLeader =
    (currentUser?.crew_role || '').toString().toLowerCase().trim() === 'lider' ||
    (currentUser?.position || '').toString().toUpperCase().includes('LIDER')

  const [weekBase, setWeekBase] = useState<Date>(() => new Date())
  const monday = useMemo(() => startOfWeekMonday(weekBase), [weekBase])
  const sunday = useMemo(() => {
    const s = new Date(monday)
    s.setDate(monday.getDate() + 6)
    return s
  }, [monday])

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<
    Array<
      AssignmentRow & {
        ticket?: TicketRow | null
        site?: SiteRow | null
      }
    >
  >([])

  // Modal finalizar
  const [finishOpen, setFinishOpen] = useState(false)
  const [finishTicket, setFinishTicket] = useState<TicketRow | null>(null)
  const [finishComment, setFinishComment] = useState('')
  const [savingFinish, setSavingFinish] = useState(false)

  const weekDays = useMemo(
    () => [
      { label: 'LUN', idx: 0 },
      { label: 'MAR', idx: 1 },
      { label: 'MIE', idx: 2 },
      { label: 'JUE', idx: 3 },
      { label: 'VIE', idx: 4 },
      { label: 'SAB', idx: 5 },
      { label: 'DOM', idx: 6 },
    ],
    []
  )

  const board = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      map[toYMD(d)] = []
    }
    rows.forEach((r) => {
      if (!map[r.work_date]) map[r.work_date] = []
      map[r.work_date].push(r)
    })
    return map
  }, [rows, monday])

  const totalWeek = useMemo(() => rows.length, [rows])

  async function fetchWeek() {
    if (!userId) return
    setLoading(true)

    try {
      const start = toYMD(monday)
      const end = toYMD(sunday)

      // 1) assignments de la semana
      const { data: aData, error: aErr } = await supabase
        .from('assignments')
        .select('id, work_date, leader_id, auxiliary_id, ticket_id, site_id, service_type, details')
        .gte('work_date', start)
        .lte('work_date', end)
        .or(`leader_id.eq.${userId},auxiliary_id.eq.${userId}`)
        .order('work_date', { ascending: true })

      if (aErr) throw aErr

      const assignments = (aData || []) as AssignmentRow[]

      const ticketIds = Array.from(new Set(assignments.map((x) => x.ticket_id).filter(Boolean))) as number[]
      const siteIds = Array.from(new Set(assignments.map((x) => x.site_id).filter(Boolean))) as number[]

      // 2) tickets relacionados
      let ticketsById = new Map<number, TicketRow>()
      if (ticketIds.length) {
        const { data: tData, error: tErr } = await supabase
          .from('tickets')
          .select('id, codigo_servicio, status, priority, description, location, service_type, company, scheduled_date')
          .in('id', ticketIds)

        if (tErr) throw tErr
        ;(tData || []).forEach((t: any) => ticketsById.set(Number(t.id), t as TicketRow))
      }

      // 3) sites relacionados
      let sitesById = new Map<number, SiteRow>()
      if (siteIds.length) {
        const { data: sData, error: sErr } = await supabase
          .from('sites')
          .select('id, name, state, client_id')
          .in('id', siteIds)

        if (sErr) throw sErr
        ;(sData || []).forEach((s: any) => sitesById.set(Number(s.id), s as SiteRow))
      }

      const merged = assignments.map((a) => ({
        ...a,
        ticket: a.ticket_id ? ticketsById.get(a.ticket_id) || null : null,
        site: a.site_id ? sitesById.get(a.site_id) || null : null,
      }))

      setRows(merged)
    } catch (e: any) {
      console.error('OperativeView fetchWeek error:', e?.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, monday.getTime()])

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch {}
    router.replace('/login')
  }

  function openFinish(t: TicketRow) {
    setFinishTicket(t)
    setFinishComment('')
    setFinishOpen(true)
  }

  // --- FINALIZAR TICKET (CORREGIDO A 'realizado') ---
  async function confirmFinish() {
    if (!finishTicket?.id) return
    setSavingFinish(true)

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'realizado', // 🟢 UNIFICADO: Minúsculas para coincidir con Admin
          service_done_at: new Date().toISOString(),
          service_done_by: userId,
          service_done_comment: finishComment?.trim() || null,
        })
        .eq('id', finishTicket.id)

      if (error) throw error

      setFinishOpen(false)
      setFinishTicket(null)
      setFinishComment('')
      await fetchWeek() // Recargar para ver el cambio
    } catch (e: any) {
      alert(e?.message || 'Error al finalizar servicio')
    } finally {
      setSavingFinish(false)
    }
  }

  // Helper de Estatus Visual
  const getStatusBadge = (statusRaw: string | null) => {
      const s = (statusRaw || '').toLowerCase();
      
      if (['realizado', 'ejecutado'].includes(s)) 
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">REALIZADO</span>;
      
      if (['revision_interna'].includes(s)) 
        return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">EN REVISIÓN</span>;
      
      if (['cerrado'].includes(s)) 
        return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">CERRADO</span>;

      // Por defecto
      return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">EN PROCESO</span>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#0a1e3f] text-white shadow-lg shadow-blue-900/20">
            <CalendarDays size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panel Operativo</p>
            <h2 className="text-xl font-black text-[#0a1e3f] uppercase leading-tight">
              {currentUser?.full_name || 'Técnico'}
            </h2>
            <div className="flex gap-2 mt-1">
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isLeader ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isLeader ? 'LÍDER DE CUADRILLA' : 'AUXILIAR TÉCNICO'}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                    {totalWeek} SERVICIOS
                </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl w-full md:w-auto">
          <button onClick={() => setWeekBase(new Date(weekBase.setDate(weekBase.getDate() - 7)))} className="p-3 rounded-xl bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all"><ChevronLeft size={16} /></button>
          <div className="flex-1 text-center px-4">
             <p className="text-[10px] font-black text-slate-400 uppercase">SEMANA</p>
             <p className="text-xs font-black text-[#0a1e3f] uppercase whitespace-nowrap">
                {monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {sunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
             </p>
          </div>
          <button onClick={() => setWeekBase(new Date(weekBase.setDate(weekBase.getDate() + 7)))} className="p-3 rounded-xl bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all"><ChevronRight size={16} /></button>
        </div>
        
        <button onClick={logout} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><LogOut size={20}/></button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[1000px] grid grid-cols-7 gap-4">
            {weekDays.map((d) => {
              const date = new Date(monday)
              date.setDate(monday.getDate() + d.idx)
              const ymd = toYMD(date)
              const cards = board[ymd] || []
              const isToday = toYMD(new Date()) === ymd;

              return (
                <div key={d.label} className={`rounded-[2rem] border overflow-hidden flex flex-col h-full min-h-[300px] ${isToday ? 'bg-white border-blue-200 ring-2 ring-blue-100' : 'bg-slate-50/50 border-slate-200'}`}>
                  
                  {/* Header Día */}
                  <div className={`p-3 text-center border-b ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{d.label}</p>
                    <p className={`text-lg font-black ${isToday ? 'text-blue-800' : 'text-slate-700'}`}>{date.getDate()}</p>
                  </div>

                  {/* Tarjetas */}
                  <div className="p-2 space-y-3 flex-1">
                    {cards.length === 0 ? (
                      <div className="h-full flex items-center justify-center opacity-30">
                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                      </div>
                    ) : (
                      cards.map((c: any) => {
                        const t = c.ticket as TicketRow | null
                        const s = c.site as SiteRow | null
                        const status = (t?.status || '').toLowerCase()
                        const isDone = ['realizado', 'ejecutado', 'revision_interna', 'cerrado'].includes(status);

                        return (
                          <div key={c.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md flex flex-col gap-3 ${isDone ? 'border-emerald-100 opacity-80' : 'border-slate-200'}`}>
                            
                            {/* Cabecera Tarjeta */}
                            <div className="flex justify-between items-start">
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                                    <Hash size={10}/> {t?.codigo_servicio || '---'}
                                </span>
                                {getStatusBadge(status)}
                            </div>

                            {/* Contenido */}
                            <div>
                                <p className="text-[11px] font-black text-[#0a1e3f] uppercase leading-tight line-clamp-2">
                                    {s?.name || t?.company || 'CLIENTE'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-1">
                                    <MapPin size={10}/> {t?.location || 'Sitio'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic border-t border-slate-50 pt-2">
                                    "{t?.description || c.details}"
                                </p>
                            </div>

                            {/* Botón Acción (Solo Líder y No Realizado) */}
                            {isLeader && t?.id && !isDone && (
                              <button
                                onClick={() => openFinish(t)}
                                className="w-full py-2.5 rounded-xl bg-[#0a1e3f] hover:bg-blue-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                              >
                                <CheckCircle2 size={14} className="text-[#00C897]" /> Finalizar
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Modal Finalizar */}
      {finishOpen && finishTicket && (
        <div className="fixed inset-0 z-[200] bg-[#0a1e3f]/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-50 border-b border-slate-100 p-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#00C897]">Finalizar Servicio</p>
                <h3 className="text-xl font-black text-[#0a1e3f] uppercase">{finishTicket.codigo_servicio}</h3>
              </div>
              <button onClick={() => setFinishOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
                    <MessageSquareText size={14} /> Comentarios del Líder
                  </label>
                  <textarea
                    value={finishComment}
                    onChange={(e) => setFinishComment(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-bold text-[#0a1e3f] outline-none focus:border-[#00C897] min-h-[150px] resize-none uppercase"
                    placeholder="DESCRIBE BREVEMENTE EL TRABAJO REALIZADO..."
                  />
              </div>

              <button
                disabled={savingFinish}
                onClick={confirmFinish}
                className="w-full bg-[#0a1e3f] hover:bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 transition-all"
              >
                {savingFinish ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>}
                {savingFinish ? 'Guardando...' : 'Confirmar Trabajo Realizado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}