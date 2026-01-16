'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Send, MapPin, Loader2, ChevronDown, Info, Lock, Phone, User } from 'lucide-react'

const SERVICE_INFO: Record<string, string> = {
  'Correctivo Programado': 'Reparación de un fallo o avería no crítica.',
  'Instalacion/Montaje': 'Puesta en marcha o montaje de equipos o sistemas nuevos.',
  'Configuracion/Ajuste': 'Modificar parámetros o actualizar software.',
  'Visita Tecnica': 'Recorrido por parte de un especialista sin reparación inmediata.',
  'Conservacion Inmueble': 'Electricidad, fontanería, pintura, infraestructura.',
  'Correctivo Emergencia': 'Fallo crítico que requiere atención inmediata.',
}

export default function ServiceForm({ currentUser }: { currentUser: any }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    service_type: '',
    location: '',
    description: '',
    // Intentamos obtener el teléfono de varias propiedades posibles
    phone: currentUser?.phone || currentUser?.phone_number || '', 
    full_name: currentUser?.contact_name || currentUser?.full_name || '',
  })

  const serviceHint = useMemo(() => {
    if (!formData.service_type) return null
    return SERVICE_INFO[formData.service_type] ?? null
  }, [formData.service_type])

  const generateServiceCode = (type: string) => {
    const prefixes: Record<string, string> = {
      'Correctivo Programado': 'CP',
      'Instalacion/Montaje': 'IM',
      'Configuracion/Ajuste': 'CA',
      'Visita Tecnica': 'VT',
      'Conservacion Inmueble': 'CI',
      'Correctivo Emergencia': 'ME',
    }
    const prefix = prefixes[type] || 'SR'
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${year}${month}${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!currentUser?.email || !currentUser?.id) {
      setErrorMsg('No se detectó sesión activa. Por favor, recarga la página.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Validar Coordinador (Regla de negocio crítica)
      if (!currentUser.coordinator_id) {
        throw new Error("Tu cuenta no tiene un Coordinador asignado. Contacta a soporte.");
      }

      // 2. Generar Folio
      const folio = generateServiceCode(formData.service_type)
      
      // 3. Preparar Payload
      const payload = {
        service_type: formData.service_type,
        location: formData.location,
        description: formData.description,
        phone: formData.phone,
        full_name: formData.full_name, // Persona que solicita
        contact_name: formData.full_name, // Contacto en sitio
        codigo_servicio: folio,
        client_email: currentUser.email.trim().toLowerCase(),
        company: currentUser.organization || 'Particular',
        coordinator_id: currentUser.coordinator_id, // Vinculación automática
        status: 'Pendiente', // Estatus inicial correcto
        priority: formData.service_type === 'Correctivo Emergencia' ? 'Urgente' : 'Normal',
        evidence_urls: [], 
      }

      const { error } = await supabase.from('tickets').insert([payload])

      if (error) throw error

      // 🟢 REDIRECCIÓN CORRECTA AL PORTAL DE CLIENTE
      router.push('/accesos/cliente')
      
    } catch (err: any) {
      console.error("Error:", err)
      setErrorMsg(err?.message || 'Error inesperado al guardar el servicio')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Estilos reutilizables
  const labelStyle = 'text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block'
  const inputStyle = 'w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20 placeholder:text-slate-300'
  const lockedStyle = 'w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 outline-none cursor-not-allowed select-none pl-12'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left animate-in fade-in zoom-in duration-500">
      
      {errorMsg && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2 animate-pulse">
          <Info size={16} /> {errorMsg}
        </div>
      )}

      {/* SECCIÓN 1: IDENTIDAD */}
      <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#00C897]/10 text-[#00C897] flex items-center justify-center shadow-sm">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Datos del solicitante</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protegidos por el sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>Solicitante</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input readOnly value={formData.full_name} className={lockedStyle} />
            </div>
          </div>

          <div>
            <label className={labelStyle}>Contacto</label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input readOnly value={formData.phone} className={lockedStyle} />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: DETALLES */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
            <Info size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Detalles del Servicio</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Define tu requerimiento</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className={labelStyle}>Categoría del Mantenimiento *</label>
            <div className="relative group">
              <select
                required
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className={`${inputStyle} appearance-none pr-12 cursor-pointer`}
              >
                <option value="">-- SELECCIONAR CATEGORÍA --</option>
                {Object.keys(SERVICE_INFO).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {serviceHint && (
              <div className="mt-3 p-4 rounded-2xl border border-blue-100 bg-blue-50/50 text-blue-800 text-xs font-medium flex gap-3 animate-in slide-in-from-top-2">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <span>{serviceHint}</span>
              </div>
            )}
          </div>

          <div>
            <label className={labelStyle}>Ubicación Exacta / Área *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ej. Planta Norte, Local 45, Oficina Principal"
                className={`${inputStyle} pl-12`}
              />
            </div>
          </div>

          <div>
            <label className={labelStyle}>Descripción de la Falla *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describa el problema con el mayor detalle posible..."
              className={`${inputStyle} resize-none`}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#0a1e3f] hover:bg-[#00C897] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> GENERAR TICKET</>}
      </button>
    </form>
  )
}