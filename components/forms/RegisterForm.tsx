'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function RegisterForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Intenta crear/actualizar fila en clients. Si faltan columnas (status/role),
  // reintenta con un payload mínimo para que no truene.
  const upsertClient = async (userId: string) => {
    const basePayload: any = {
      id: userId, // UUID de Auth
      full_name: fullName.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      organization: organization.trim().toUpperCase(),
      phone: phone.trim(),
    }

    // Payload extendido (tu flujo ideal)
    const extendedPayload: any = {
      ...basePayload,
      status: 'pending',
      role: 'client',
    }

    // 1) Intento extendido
    let res = await supabase.from('clients').upsert([extendedPayload], { onConflict: 'id' })

    if (!res.error) return

    // 2) Si falla por columnas faltantes, intentamos mínimo
    const msg = (res.error.message || '').toLowerCase()
    const missingColumn =
      msg.includes('column') && (msg.includes('status') || msg.includes('role') || msg.includes('coordinator'))

    if (missingColumn) {
      res = await supabase.from('clients').upsert([basePayload], { onConflict: 'id' })
    }

    if (res.error) throw res.error
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validaciones
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      // 1) Intentar SIGNUP normal
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            organization: organization.trim(),
          },
        },
      })

      // Si ya está registrado en Auth, NO abortamos: hacemos el flujo B (sign in + upsert)
      if (signUpError) {
        const msg = (signUpError.message || '').toLowerCase()

        // “User already registered” / “already exists”
        if (msg.includes('already registered') || msg.includes('already exists')) {
          // Intentar iniciar sesión con la contraseña que está poniendo en el registro
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

          if (signInError || !signInData.user) {
            // No podemos “re-registrar” en Auth. Debe ir a login o recuperar contraseña.
            throw new Error(
              'Este correo ya está registrado. Ve a INICIAR SESIÓN o usa “recuperar contraseña”. ' +
                'Si no recuerdas la contraseña, restablécela desde Login.'
            )
          }

          // Ya tenemos userId válido → reparar/crear fila en clients
          await upsertClient(signInData.user.id)

          setSuccess(true)
          setTimeout(() => router.push('/login'), 2500)
          return
        }

        // Otro error real de Auth
        throw signUpError
      }

      if (!signUpData.user) throw new Error('No se pudo crear el usuario en Auth.')

      // 2) Crear fila en clients (pending)
      await upsertClient(signUpData.user.id)

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el registro')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-[#00C897]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-[#00C897]" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase italic">¡Solicitud recibida!</h2>
        <p className="text-slate-500 text-sm mt-2">
          Ya quedó tu solicitud. Inicia sesión; si tu cuenta está en revisión, se te indicará.
        </p>
        <p className="text-slate-400 text-[10px] mt-4 uppercase font-bold">Redirigiendo al login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Empresa</label>
          <input
            required
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Nombre de la compañía"
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Responsable</label>
          <input
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email corporativo</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@empresa.com"
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Teléfono</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10 dígitos"
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20 transition"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Crear contraseña</label>
        <div className="relative">
          <input
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-sm font-medium text-slate-800 outline-none transition focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00C897] transition-colors"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar contraseña</label>
        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repite la contraseña"
          className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#00C897] focus:ring-2 focus:ring-[#00C897]/20"
        />
      </div>

      <button
        disabled={loading}
        className="w-full bg-[#0a1e3f] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-[#00C897] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={18} /> Procesando...
          </span>
        ) : (
          'Solicitar alta de acceso'
        )}
      </button>
    </form>
  )
}
