'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'

type Props = {
  isOpen: boolean
  user: any
  currentUser: any
  canEditSensitiveData?: boolean
  onClose: () => void
  onUpdate?: () => void
}

type Mode = 'staff' | 'client' | 'approve'

export default function GlobalAdminModal({
  isOpen,
  user,
  currentUser,
  canEditSensitiveData = false,
  onClose,
  onUpdate,
}: Props) {
  const mode: Mode = useMemo(() => {
    if (user?.type === 'staff') return 'staff'
    if (user?.type === 'client') return 'client'
    return 'approve'
  }, [user])

  const [saving, setSaving] = useState(false)

  // ✅ Controla si se crea/usa Supabase Auth (correo/contraseña)
  const [createAuth, setCreateAuth] = useState(false)

  const [staffForm, setStaffForm] = useState({
    id: 'new',
    full_name: '',
    email: '',
    role: 'operativo',
    status: 'active',
    position: 'AUXILIAR', // LIDER | AUXILIAR | N/A
    kiosk_pin: '',
    password: '',
  })

  const [clientForm, setClientForm] = useState({
    id: '',
    full_name: '',
    email: '',
    organization: '',
    status: 'active',
    coordinator_id: '',
  })

  const coordinators = useMemo(() => {
    const list = user?.availableCoordinators || []
    return Array.isArray(list) ? list : []
  }, [user])

  // Helpers
  const roleLower = (staffForm.role || '').toString().toLowerCase().trim()
  const isNewStaff = staffForm.id === 'new' || !staffForm.id
  const isKiosco = roleLower === 'kiosco'
  const isManagement = ['admin', 'superadmin', 'coordinador'].includes(roleLower)

  // ✅ Regla: Kiosco y Management SIEMPRE requieren Auth
  useEffect(() => {
    if (mode !== 'staff') return
    if (!isNewStaff) return

    setCreateAuth(isManagement || isKiosco)
  }, [mode, isNewStaff, isManagement, isKiosco])

  // Cargar datos al abrir modal
  useEffect(() => {
    if (!user) return

    if (mode === 'staff') {
      const isNew = user?.id === 'new' || !user?.id

      const incomingRole = (user?.role || 'operativo').toString().toLowerCase().trim()
      const incomingIsKiosco = incomingRole === 'kiosco'
      const incomingIsManagement = ['admin', 'superadmin', 'coordinador'].includes(incomingRole)

      setStaffForm({
        id: user?.id || 'new',
        full_name: user?.full_name || '',
        email: user?.email || '',
        role: incomingRole,
        status: (user?.status || 'active').toString().toLowerCase(),
        position: user?.position || 'AUXILIAR',
        kiosk_pin: user?.kiosk_pin ? String(user.kiosk_pin) : '',
        password: '',
      })

      // ✅ Si ya existe:
      // - si es kiosco/management => Auth ON
      // - si trae email => Auth ON
      // - si NO trae email => Auth OFF (kiosco+pin)
      if (!isNew) {
        const hasEmail = !!(user?.email && String(user.email).includes('@'))
        setCreateAuth(incomingIsKiosco || incomingIsManagement || hasEmail)
      }
    }

    if (mode === 'client') {
      setClientForm({
        id: user?.id || '',
        full_name: user?.full_name || '',
        email: user?.email || '',
        organization: user?.organization || '',
        status: (user?.status || 'active').toString().toLowerCase(),
        coordinator_id: user?.coordinator_id || user?.coordinador_id || '',
      })
    }
  }, [user, mode])

  if (!isOpen) return null

  const close = () => onClose?.()

  // ✅ Mostrar campos de Auth SOLO si createAuth está activo
  const showAuthFields = createAuth

  const saveStaff = async () => {
    if (!staffForm.full_name.trim()) return alert('Falta el nombre.')

    // ✅ Validaciones Auth
    if (showAuthFields) {
      if (!staffForm.email.trim()) return alert('El email es obligatorio cuando hay acceso al portal.')
      if (isNewStaff && !staffForm.password.trim()) return alert('La contraseña es obligatoria para nuevos accesos.')
    }

    // ✅ Validación PIN para operativos (si quieres que todos los operativos entren por kiosco)
    // Si no quieres obligarlo, comenta este bloque.
    if (!showAuthFields && !isKiosco) {
      if (!staffForm.kiosk_pin || String(staffForm.kiosk_pin).trim().length < 4) {
        return alert('Para personal operativo por kiosco, el PIN (mínimo 4 dígitos) es obligatorio.')
      }
    }

    setSaving(true)
    try {
      const emailTrim = staffForm.email.trim().toLowerCase()

      // ✅ Si NO hay Auth => mandamos email NULL (evita '' repetido)
      const finalEmail = showAuthFields ? emailTrim : null

      const payload: any = {
        id: staffForm.id,
        full_name: staffForm.full_name.trim(),
        email: finalEmail, // ✅ null si no hay auth
        role: staffForm.role.toLowerCase().trim(),
        status: staffForm.status.toLowerCase().trim(),
        position: isKiosco ? 'N/A' : (staffForm.position || 'N/A').toString().toUpperCase(),
        kiosk_pin: isKiosco ? null : (staffForm.kiosk_pin ? String(staffForm.kiosk_pin) : null),
        password: showAuthFields ? staffForm.password : '',
        isUpdate: !isNewStaff,
      }

      // ✅ Endpoint:
      // - con Auth => create-user (crea en Auth + profiles)
      // - sin Auth => create-staff-kiosk (solo profiles)
      const endpoint = showAuthFields ? '/api/admin/create-user' : '/api/admin/create-staff-kiosk'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el usuario.')

      await onUpdate?.()
      close()
    } catch (e: any) {
      alert('❌ Error: ' + (e?.message || 'desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const saveClient = async () => {
    if (!clientForm.id) return alert('Cliente inválido.')
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: clientForm.full_name.trim(),
          email: clientForm.email.trim().toLowerCase(),
          organization: clientForm.organization,
          status: clientForm.status,
          coordinator_id: clientForm.coordinator_id || null,
        })
        .eq('id', clientForm.id)

      if (error) throw error
      await onUpdate?.()
      close()
    } catch (e: any) {
      alert('❌ Error: ' + (e?.message || 'desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const title =
    mode === 'staff'
      ? isNewStaff
        ? 'Alta de Personal'
        : 'Editar Personal'
      : mode === 'client'
      ? 'Editar Cliente'
      : 'Aprobar Acceso'

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Módulo Administrativo Global
            </p>
          </div>
          <button
            onClick={close}
            className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-rose-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {mode === 'staff' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rol Sistema</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black uppercase outline-none focus:ring-2 ring-[#00C897]/20"
                  >
                    <option value="operativo">OPERATIVO</option>
                    <option value="coordinador">COORDINADOR</option>
                    <option value="admin">ADMIN</option>
                    <option value="superadmin">SUPERADMIN</option>
                    {currentUser?.role === 'superadmin' && <option value="kiosco">KIOSCO (DISPOSITIVO)</option>}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black uppercase outline-none"
                  >
                    <option value="active">ACTIVO</option>
                    <option value="pending">PENDIENTE</option>
                    <option value="blocked">BLOQUEADO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Colaborador</label>
                <input
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white transition-all"
                  placeholder="Ej. NOMBRE APELLIDO"
                />
              </div>

              {/* Switch de Acceso Auth (solo si es NUEVO y NO es kiosco) */}
              {isNewStaff && !isKiosco && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${createAuth ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase leading-none">Acceso al Portal</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-1">
                        Habilitar login con correo y contraseña
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setCreateAuth(!createAuth)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${createAuth ? 'bg-[#00C897]' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${createAuth ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              )}

              {/* Campos Auth */}
              {showAuthFields && (
                <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo Electrónico</label>
                    <input
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none"
                      placeholder="usuario@cmw.com.mx"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Contraseña {isNewStaff ? '(Requerida)' : '(Dejar vacío para no cambiar)'}
                    </label>
                    <input
                      type="password"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Posición y PIN (NO aplica al kiosco dispositivo) */}
              {!isKiosco && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jerarquía / Posición</label>
                    <select
                      value={staffForm.position}
                      onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black uppercase outline-none"
                    >
                      <option value="LIDER">LÍDER</option>
                      <option value="AUXILIAR">AUXILIAR</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">PIN Personal (Kiosco)</label>
                    <input
                      value={staffForm.kiosk_pin}
                      maxLength={6}
                      onChange={(e) => setStaffForm({ ...staffForm, kiosk_pin: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-center tracking-[0.5em] outline-none"
                      placeholder="0000"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={close}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  onClick={saveStaff}
                  className="flex-[2] py-4 rounded-2xl bg-[#0a1e3f] text-[#00C897] font-black text-[10px] uppercase disabled:opacity-60 shadow-lg shadow-slate-200 transition-all hover:scale-[1.02]"
                >
                  {saving ? 'Procesando...' : isNewStaff ? 'Crear Colaborador' : 'Actualizar Datos'}
                </button>
              </div>
            </>
          )}

          {mode === 'client' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de Contacto</label>
                <input
                  value={clientForm.full_name}
                  onChange={(e) => setClientForm({ ...clientForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo Corporativo</label>
                <input
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empresa / Organización</label>
                <input
                  value={clientForm.organization}
                  onChange={(e) => setClientForm({ ...clientForm, organization: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coordinador Asignado</label>
                <select
                  value={clientForm.coordinator_id}
                  onChange={(e) => setClientForm({ ...clientForm, coordinator_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black uppercase outline-none"
                >
                  <option value="">-- Sin coordinador --</option>
                  {coordinators.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={close} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase">
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  onClick={saveClient}
                  className="flex-[2] py-4 rounded-2xl bg-[#0a1e3f] text-white font-black text-[10px] uppercase disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          )}

          {mode === 'approve' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck size={40} />
              </div>
              <p className="text-sm font-bold text-slate-600 px-6 leading-relaxed">
                Este perfil requiere una revisión manual de sus atributos antes de ser procesado.
              </p>
              <button
                onClick={close}
                className="w-full py-4 rounded-2xl bg-[#0a1e3f] text-white font-black text-[10px] uppercase shadow-lg transition-transform active:scale-95"
              >
                Regresar al Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
