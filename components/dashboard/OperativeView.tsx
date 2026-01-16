'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, CheckCircle2, X, MessageSquareText, LogOut } from 'lucide-react'

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

      // 1) assignments de la semana, donde yo soy líder o auxiliar
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
      alert(e?.message || 'Error cargando asignaciones')
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
    ;['kiosk_device_user', 'client_user', 'kiosco_user', 'kiosk_user', 'kiosk_session'].forEach((k) =>
      localStorage.removeItem(k)
    )
    router.replace('/accesos/kiosk')
  }

  function openFinish(t: TicketRow) {
    setFinishTicket(t)
    setFinishComment('')
    setFinishOpen(true)
  }

  async function confirmFinish() {
    if (!finishTicket?.id) return
    setSavingFinish(true)

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'Ejecutado',
          service_done_at: new Date().toISOString(),
          service_done_by: userId,
          service_done_comment: finishComment?.trim() || null,
        })
        .eq('id', finishTicket.id)

      if (error) throw error

      setFinishOpen(false)
      setFinishTicket(null)
      setFinishComment('')
      await fetchWeek()
    } catch (e: any) {
      alert(e?.message || 'Error al finalizar servicio')
    } finally {
      setSavingFinish(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#0a1e3f] text-white">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panel Operativo</p>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase leading-tight">
              {currentUser?.full_name || currentUser?.email || 'Operativo'}
            </h2>
            <p className="text-xs font-bold text-slate-500">
              Semana: {monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} –{' '}
              {sunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} •{' '}
              <span className="text-slate-800">{totalWeek}</span> servicios
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1">
              <span className={`px-3 py-1 rounded-full ${isLeader ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                {isLeader ? 'LÍDER' : 'AUXILIAR'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekBase(new Date(weekBase.setDate(weekBase.getDate() - 7)))}
            className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-white"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setWeekBase(new Date(weekBase.setDate(weekBase.getDate() + 7)))}
            className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-white"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={fetchWeek}
            className="px-6 py-3 rounded-2xl bg-[#0a1e3f] text-white font-black text-[10px] uppercase tracking-widest hover:opacity-95"
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>

          <button
            onClick={logout}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Calendario (solo lectura)
          </p>
          {loading && (
            <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> sincronizando
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1100px] grid grid-cols-7 gap-4 p-6">
            {weekDays.map((d) => {
              const date = new Date(monday)
              date.setDate(monday.getDate() + d.idx)
              const ymd = toYMD(date)
              const cards = board[ymd] || []

              return (
                <div key={d.label} className="bg-slate-50/60 rounded-[2rem] border border-slate-100 overflow-hidden">
                  <div className="p-4 bg-white border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{d.label}</p>
                    <p className="text-sm font-black text-slate-800">{date.getDate()}</p>
                  </div>

                  <div className="p-3 space-y-3 min-h-[220px]">
                    {cards.length === 0 ? (
                      <div className="text-center text-slate-300 text-[10px] font-black uppercase py-8">
                        Sin servicios
                      </div>
                    ) : (
                      cards.map((c: any) => {
                        const t = c.ticket as TicketRow | null
                        const s = c.site as SiteRow | null
                        const status = (t?.status || '').toString().toLowerCase()

                        return (
                          <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-blue-600 uppercase truncate">
                                  {t?.codigo_servicio ? `#${t.codigo_servicio}` : `#${t?.id ?? 'SIN TICKET'}`}
                                </p>
                                <p className="text-xs font-black text-slate-800 uppercase truncate">
                                  {s?.name || t?.company || 'Servicio'}
                                </p>
                                <p className="text-[11px] font-bold text-slate-500 truncate">
                                  {c.service_type || t?.service_type || '—'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">
                                  {t?.location || '—'}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                  status === 'ejecutado'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : status === 'en proceso'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {t?.status || 'ASIGNADO'}
                              </span>
                            </div>

                            {isLeader && t?.id && status !== 'ejecutado' && (
                              <button
                                onClick={() => openFinish(t)}
                                className="mt-3 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 size={16} /> Marcar ejecutado
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
      </div>

      {/* Modal finalizar */}
      {finishOpen && finishTicket && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="bg-[#0a1e3f] text-white p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#00C897]">Finalizar servicio</p>
                <p className="font-black uppercase">{finishTicket.codigo_servicio || finishTicket.id}</p>
              </div>
              <button onClick={() => setFinishOpen(false)} className="text-white/70 hover:text-white">
                <X />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 inline-flex items-center gap-2">
                <MessageSquareText size={14} /> Comentario del líder (opcional)
              </label>
              <textarea
                value={finishComment}
                onChange={(e) => setFinishComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-200 min-h-[120px]"
                placeholder="Ej: Se realizó servicio, se cambió pieza X, recomendaciones..."
              />

              <button
                disabled={savingFinish}
                onClick={confirmFinish}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest disabled:opacity-60"
              >
                {savingFinish ? 'Guardando...' : 'Confirmar finalización'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
