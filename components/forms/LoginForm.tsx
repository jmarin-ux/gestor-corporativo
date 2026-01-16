'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  UserRound,
  Building2,
  Phone,
  MessageSquareText,
  ShieldCheck,
  X,
} from 'lucide-react'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  status?: string | null
  is_locked?: boolean | null
  failed_attempts?: number | null
}

type RequestPayload = {
  full_name: string
  email: string
  phone: string
  company: string
  message: string
  password: string
  confirmPassword: string
}

export default function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal solicitud cliente
  const [openRequest, setOpenRequest] = useState(false)
  const [req, setReq] = useState<RequestPayload>({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    password: '',
    confirmPassword: '',
  })
  const [reqSending, setReqSending] = useState(false)
  const [reqOk, setReqOk] = useState<string | null>(null)
  const [reqErr, setReqErr] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 5 && password.length >= 6 && !submitting
  }, [email, password, submitting])

  const normalizeRole = (role: string | null | undefined) =>
    (role || '').toString().toLowerCase().trim()

  const normalizeStatus = (status: string | null | undefined) =>
    (status || 'active').toString().toLowerCase().trim()

  // ✅ RUTAS REALES según tu estructura
  const routeByRole = (role: string) => {
    if (role === 'kiosco' || role === 'kiosk') return '/accesos/kiosk'
    if (role === 'client' || role === 'cliente') return '/dashboard/client'
    if (role === 'operativo') return '/dashboard-staff'
    return '/dashboard' // admin/superadmin/coordinador/staff
  }

  const clearKnownLocals = () => {
    ;['client_user', 'kiosco_user', 'kiosk_user', 'kiosk_device_user', 'staff_user'].forEach((k) =>
      localStorage.removeItem(k)
    )
  }

  const saveLocalSessionByRole = (base: { id: string; email: string; full_name: string; role: string }) => {
    const role = normalizeRole(base.role)

    clearKnownLocals()

    if (role === 'kiosco' || role === 'kiosk') {
      // Dispositivo kiosco (login por correo/contraseña)
      localStorage.setItem('kiosk_device_user', JSON.stringify(base))
      return
    }

    if (role === 'client' || role === 'cliente') {
      localStorage.setItem('client_user', JSON.stringify(base))
      return
    }

    // staff/admin/superadmin/coordinador/operativo
    localStorage.setItem('kiosco_user', JSON.stringify(base))
  }

  const validateReq = () => {
    const e = req.email.trim().toLowerCase()
    const okEmail = e.includes('@') && e.includes('.')
    const okName = req.full_name.trim().length >= 3
    const okCompany = req.company.trim().length >= 2
    const okPhone = req.phone.trim().length >= 7
    const okPass = req.password.length >= 6 && req.password === req.confirmPassword
    return okEmail && okName && okCompany && okPhone && okPass
  }

  const submitRequest = async () => {
    setReqErr(null)
    setReqOk(null)

    if (!validateReq()) {
      setReqErr('Completa nombre, empresa, teléfono, correo válido y contraseñas (mín 6 y deben coincidir).')
      return
    }

    setReqSending(true)
    try {
      // ✅ TU ENDPOINT REAL (ya lo tienes)
      const res = await fetch('/api/client/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          full_name: req.full_name.trim(),
          email: req.email.trim().toLowerCase(),
          phone: req.phone.trim(),
          company: req.company.trim(),
          message: req.message.trim(),
          password: req.password,
        }),
      })

      const raw = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(raw)
      } catch {
        json = { error: raw?.slice(0, 250) }
      }

      if (!res.ok) {
        setReqErr(json?.error || `Error ${res.status}: no se pudo enviar tu solicitud.`)
        setReqSending(false)
        return
      }

      setReqOk('Solicitud enviada. Un administrador aprobará tu acceso.')
      setReq({
        full_name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
        password: '',
        confirmPassword: '',
      })
    } catch (e: any) {
      setReqErr(e?.message || 'No se pudo enviar la solicitud.')
    } finally {
      setReqSending(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)

    try {
      const cleanEmail = email.trim().toLowerCase()

      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (authErr || !auth?.session?.user) {
        setErrorMsg(authErr?.message || 'No se pudo iniciar sesión.')
        return
      }

      const userId = auth.session.user.id

      // =========================================
      // ✅ 1) Intento normal: leer profile por ID
      // =========================================
      let profile: Profile | null = null

      const { data: p1, error: p1Err } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, is_locked, failed_attempts')
        .eq('id', userId)
        .maybeSingle()

      if (!p1Err && p1) {
        profile = p1 as any
      } else {
        // =========================================
        // ✅ 2) Fallback: buscar por email (cuando RLS o datos cambian)
        // =========================================
        const { data: p2, error: p2Err } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, status, is_locked, failed_attempts')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (!p2Err && p2) {
          profile = p2 as any
        }
      }

      // =========================================
      // ✅ 3) Si NO se pudo leer profiles -> fallback metadata (NO te bloquea)
      // =========================================
      const metaRole = normalizeRole(auth.session.user.user_metadata?.role)
      const metaName = (auth.session.user.user_metadata?.full_name || '').toString().trim()

      if (!profile) {
        if (!metaRole) {
          // si ni profile ni metadata, cerramos para evitar sesión “fantasma”
          await supabase.auth.signOut()
          clearKnownLocals()
          setErrorMsg('No se pudo leer tu perfil (profiles) y no hay rol en metadata. Contacta a soporte.')
          return
        }

        const base = {
          id: userId,
          email: cleanEmail,
          full_name: metaName || 'Usuario',
          role: metaRole,
        }

        saveLocalSessionByRole(base)
        router.replace(routeByRole(metaRole))
        return
      }

      // =========================================
      // ✅ 4) Validaciones status (si las usas)
      // =========================================
      const status = normalizeStatus(profile.status)
      if (status === 'pending') {
        await supabase.auth.signOut()
        clearKnownLocals()
        setErrorMsg('Tu cuenta está pendiente de aprobación.')
        return
      }

      if (status === 'blocked') {
        await supabase.auth.signOut()
        clearKnownLocals()
        setErrorMsg('Tu cuenta está bloqueada. Contacta a soporte.')
        return
      }

      // =========================================
      // ✅ 5) Guardar local + redirigir por rol
      // =========================================
      const role = normalizeRole(profile.role) || metaRole || 'staff'
      const base = {
        id: userId, // ✅ SIEMPRE el id real de Auth
        email: (profile.email || cleanEmail).toLowerCase(),
        full_name: profile.full_name || metaName || 'Usuario',
        role,
      }

      saveLocalSessionByRole(base)
      router.replace(routeByRole(role))
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado en login.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Encabezado */}
      <div className="text-center">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
          Acceso
        </h1>
        <p className="mt-2 text-slate-400 font-bold text-sm">
          Ingresa tus credenciales. Te enviaremos automáticamente según tu rol.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div className="relative">
          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="email"
            autoComplete="email"
            placeholder="Correo"
            className="w-full rounded-2xl bg-[#EEF4FF] border border-slate-200 py-4 pl-12 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            className="w-full rounded-2xl bg-[#EEF4FF] border border-slate-200 py-4 pl-12 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition flex items-center justify-center gap-2
            ${canSubmit ? 'bg-[#0a1e3f] text-white hover:opacity-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
          `}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Validando...
            </>
          ) : (
            <>
              Entrar <ArrowRight size={14} />
            </>
          )}
        </button>

        {/* Bloque para clientes sin cuenta */}
        <div className="mt-6 rounded-[1.75rem] border border-slate-100 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#00C897]/10 flex items-center justify-center">
              <ShieldCheck className="text-[#00C897]" size={18} />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-black uppercase text-sm">
                ¿Eres cliente y no tienes cuenta?
              </p>
              <p className="text-slate-400 font-bold text-sm mt-1">
                Envía tu solicitud y un administrador aprobará tu acceso.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReqErr(null)
                    setReqOk(null)
                    setOpenRequest(true)
                    if (email.trim()) setReq((r) => ({ ...r, email: email.trim().toLowerCase() }))
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 bg-[#00C897] text-white font-black uppercase tracking-widest text-[10px] hover:opacity-95 transition"
                >
                  Solicitar acceso
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/solicitud')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:border-[#00C897]/40 transition"
                >
                  Ya envié solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Modal Solicitar Acceso */}
      {openRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
            <div className="px-8 py-6 bg-[#0a1e3f] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <ShieldCheck className="text-[#00C897]" size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00C897]">
                    Solicitud de acceso
                  </p>
                  <p className="font-black uppercase">Cliente</p>
                </div>
              </div>

              <button
                onClick={() => setOpenRequest(false)}
                className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15 transition"
                aria-label="Cerrar"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8">
              <p className="text-slate-400 font-bold text-sm">
                Completa tus datos. El administrador aprobará tu acceso.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Nombre completo"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.full_name}
                    onChange={(e) => setReq((r) => ({ ...r, full_name: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Correo"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.email}
                    onChange={(e) => setReq((r) => ({ ...r, email: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Teléfono"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.phone}
                    onChange={(e) => setReq((r) => ({ ...r, phone: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Empresa"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.company}
                    onChange={(e) => setReq((r) => ({ ...r, company: e.target.value }))}
                  />
                </div>

                <div className="relative md:col-span-2">
                  <MessageSquareText className="absolute left-4 top-5 text-slate-300" size={18} />
                  <textarea
                    placeholder="Mensaje (opcional)"
                    className="w-full min-h-[120px] rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.message}
                    onChange={(e) => setReq((r) => ({ ...r, message: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="password"
                    placeholder="Contraseña (mín 6)"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.password}
                    onChange={(e) => setReq((r) => ({ ...r, password: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="password"
                    placeholder="Confirmar contraseña"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-4 pl-11 pr-4 font-bold text-slate-800 outline-none focus:border-[#00C897]"
                    value={req.confirmPassword}
                    onChange={(e) => setReq((r) => ({ ...r, confirmPassword: e.target.value }))}
                  />
                </div>
              </div>

              {reqErr && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {reqErr}
                </div>
              )}

              {reqOk && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {reqOk}
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => setOpenRequest(false)}
                  type="button"
                  className="rounded-2xl px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition"
                >
                  Cancelar
                </button>

                <button
                  disabled={reqSending}
                  onClick={submitRequest}
                  type="button"
                  className="rounded-2xl px-6 py-3 bg-[#0a1e3f] text-white font-black uppercase tracking-widest text-[10px] hover:opacity-95 transition inline-flex items-center justify-center gap-2"
                >
                  {reqSending ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar solicitud
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 text-center">
                WUOTTO SYSTEMS • ACCESO PROTEGIDO
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
