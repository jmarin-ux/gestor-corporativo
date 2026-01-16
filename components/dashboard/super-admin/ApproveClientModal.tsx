'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { X, AlertTriangle, Users, Building2, Loader2 } from 'lucide-react'

// Tipos para los datos
type CoordinatorRow = { id: string; full_name: string; role?: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  client: any
  currentUser: any
}

export default function ApproveClientModal({ isOpen, onClose, onUpdate, client, currentUser }: Props) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [coordinators, setCoordinators] = useState<CoordinatorRow[]>([])

  // Validaciones de rol y estado
  const isSuperAdmin = (currentUser?.role || '').toLowerCase() === 'superadmin'
  const isPending = (client?.status || '').toLowerCase() === 'pending'

  // Estado del formulario
  const [form, setForm] = useState({
    organization: '',
    full_name: '',
    email: '',
    phone: '',
    position: '',
    coordinator_id: '' as string, // ✅ Nombre correcto para la BD
    status: 'active' as 'pending' | 'active' | 'blocked',
    blocked_until: '' as string,
    block_reason: '' as string,
  })

  // 1. Cargar lista de coordinadores al abrir
  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['coordinador', 'admin'])
        .order('full_name', { ascending: true })

      if (!error && data) setCoordinators(data as any)
    })()
  }, [isOpen])

  // 2. Sincronizar datos del cliente al abrir el modal
  useEffect(() => {
    if (!isOpen || !client) return
    setErrorMsg(null)

    setForm({
      organization: client.organization ?? '',
      full_name: client.full_name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      position: client.position ?? '',
      coordinator_id: client.coordinator_id ?? '', // ✅ Mapeo exacto
      status: (client.status ?? (isPending ? 'pending' : 'active')).toLowerCase(),
      blocked_until: client.blocked_until ? toDatetimeLocal(client.blocked_until) : '',
      block_reason: client.block_reason ?? '',
    })
  }, [isOpen, client, isPending])

  // Helper para mostrar nombre del coordinador seleccionado
  const selectedCoordinator = useMemo(
    () => coordinators.find((c) => c.id === form.coordinator_id),
    [coordinators, form.coordinator_id]
  )

  if (!isOpen) return null

  // 3. Guardar cambios
  const handleSave = async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      if (!isSuperAdmin) throw new Error('Solo SuperAdmin puede editar clientes.')

      // Validación: Si está pendiente, exigir coordinador para aprobar
      if (isPending && !form.coordinator_id) {
        throw new Error('Debes asignar un coordinador para aprobar la cuenta.')
      }

      // Lógica de limpieza para bloqueos
      const finalBlockedUntil = form.status === 'blocked' ? fromDatetimeLocal(form.blocked_until) : null
      const finalReason = form.status === 'blocked' ? (form.block_reason || null) : null

      // A. Actualizar tabla CLIENTS
      const { error: updErr } = await supabase
        .from('clients')
        .update({
          organization: form.organization?.toUpperCase() ?? null,
          full_name: form.full_name?.toUpperCase() ?? null,
          phone: form.phone ?? null,
          position: form.position ?? null,
          coordinator_id: form.coordinator_id || null, // ✅ UUID o null
          status: form.status,
          blocked_until: finalBlockedUntil,
          block_reason: finalReason,
        })
        .eq('id', client.id)

      if (updErr) throw updErr

      // B. Actualizar tabla PROFILES (Fuente de verdad para Auth)
      await supabase
        .from('profiles')
        .update({
          role: 'client',
          // Mantenemos el perfil activo a menos que esté pendiente, para que el Login maneje el bloqueo detallado
          status: form.status === 'pending' ? 'pending' : 'active', 
          full_name: form.full_name?.toUpperCase() ?? null,
        })
        .eq('id', client.id)

      onUpdate()
      onClose()
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-[#0a1e3f] uppercase tracking-tight">
              {isPending ? 'APROBAR CLIENTE' : 'EDITAR CLIENTE'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Gestión de cuenta y asignación
            </p>
          </div>
          <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-pulse">
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          {/* Grid de Datos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Empresa">
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#00C897]/20 focus:border-[#00C897] transition-all"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
              />
            </Field>

            <Field label="Responsable">
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#00C897]/20 focus:border-[#00C897] transition-all"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>

            <Field label="Email (Solo Lectura)">
              <input
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 outline-none cursor-not-allowed select-none"
                value={form.email}
              />
            </Field>

            <Field label="Teléfono">
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#00C897]/20 focus:border-[#00C897] transition-all"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>

            <Field label="Puesto (Opcional)">
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#00C897]/20 focus:border-[#00C897] transition-all"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </Field>

            <Field label="Asignar Coordinador">
              <div className="relative group">
                <select
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-200 transition-all"
                  value={form.coordinator_id}
                  onChange={(e) => setForm({ ...form, coordinator_id: e.target.value })}
                >
                  <option value="">-- SELECCIONAR --</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
                <Users size={18} className="absolute right-4 top-3.5 text-emerald-500 pointer-events-none group-hover:scale-110 transition-transform" />
              </div>
              <p className="mt-2 text-[9px] font-bold text-emerald-600 uppercase tracking-wide ml-1">
                {form.coordinator_id
                  ? `✅ Asignado a: ${selectedCoordinator?.full_name || 'Desconocido'}`
                  : '⚠️ Pendiente de asignación'}
              </p>
            </Field>
          </div>

          {/* Sección de Seguridad */}
          <div className="rounded-[2rem] border border-slate-200 p-6 bg-slate-50 space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-black uppercase text-xs tracking-widest">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm">
                <Building2 size={14} />
              </span>
              Control de Acceso
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Estatus de la Cuenta">
                <div className="relative">
                    <select
                    className={`w-full border rounded-xl px-4 py-3 text-sm font-black outline-none appearance-none cursor-pointer transition-all ${
                        form.status === 'active' ? 'bg-white border-slate-200 text-slate-800' : 
                        form.status === 'blocked' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'
                    }`}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    >
                    <option value="active">ACTIVO (Permitir Acceso)</option>
                    <option value="pending">PENDIENTE (Revisión)</option>
                    <option value="blocked">BLOQUEADO (Restringir)</option>
                    </select>
                </div>
              </Field>

              <Field label="Bloqueo Temporal Hasta (Opcional)">
                <input
                  type="datetime-local"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  value={form.blocked_until}
                  onChange={(e) => setForm({ ...form, blocked_until: e.target.value })}
                  disabled={form.status !== 'blocked'}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Motivo del Bloqueo">
                  <textarea
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none min-h-[80px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    value={form.block_reason}
                    onChange={(e) => setForm({ ...form, block_reason: e.target.value })}
                    disabled={form.status !== 'blocked'}
                    placeholder="Especifique la razón para suspender el acceso..."
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Botón de Acción */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#0a1e3f] hover:bg-[#00C897] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={18} /> Procesando...
                </>
            ) : isPending ? (
                'APROBAR Y ACTIVAR CUENTA'
            ) : (
                'GUARDAR CAMBIOS'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Componentes Auxiliares ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      {children}
    </div>
  )
}

function toDatetimeLocal(value: string) {
  try {
    const d = new Date(value)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function fromDatetimeLocal(value: string) {
  if (!value) return null
  const d = new Date(value)
  return d.toISOString()
}