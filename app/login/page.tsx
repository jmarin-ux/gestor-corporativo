'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { 
  Loader2, Eye, EyeOff, LayoutGrid, ArrowRight, 
  UserPlus, Building2, Phone, User, ArrowLeft 
} from 'lucide-react'

type ViewState = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewState>('login')
  const [showPassword, setShowPassword] = useState(false)
  
  // Login Data
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register Data
  const [regData, setRegData] = useState({
    organization: '',
    contactName: '',
    email: '',
    phone: '',
    password: ''
  })

  // --- 1. LÓGICA DE LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError || !user) throw new Error('Credenciales incorrectas o usuario no registrado.')

      // A. Buscar en Personal (profiles)
      const { data: staff } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (staff) {
        const role = (staff.role || '').toLowerCase().trim()
        router.push(['operativo', 'staff', 'technician'].includes(role) ? '/dashboard-staff' : '/dashboard')
        return
      }

      // B. Buscar en Clientes (clients)
      const { data: client } = await supabase.from('clients').select('*').eq('id', user.id).maybeSingle()
      if (client) {
        router.push('/accesos/cliente')
        return
      }

      // C. Si no está en ninguno (Caso Zombie)
      await supabase.auth.signOut()
      throw new Error('Tu usuario existe pero no tiene perfil asignado. Contacta a soporte.')

    } catch (error: any) {
      alert(error.message)
      setLoading(false)
    }
  }

  // --- 2. LÓGICA DE REGISTRO (SOLICITUD DE ACCESO) ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // A. Crear Usuario en Auth CON METADATA
      // Esta metadata es CLAVE para que tu Trigger de base de datos sepa ignorarlo en 'profiles'
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regData.email,
        password: regData.password,
        options: {
          data: {
            role: 'client', // ¡Esto le avisa al Trigger que es cliente!
            full_name: regData.contactName,
            organization: regData.organization
          }
        }
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
            throw new Error("Este correo ya está registrado. Por favor inicia sesión.");
        }
        throw authError
      }

      if (!authData.user) throw new Error("No se pudo crear el usuario.")

      // B. Insertar en tabla Clients
      const { error: dbError } = await supabase.from('clients').insert([{
        id: authData.user.id, 
        organization: regData.organization,
        full_name: regData.contactName, // Usamos la columna correcta
        email: regData.email,
        phone: regData.phone,
        role: 'client', 
        // coordinator_id queda null intencionalmente
      }])

      if (dbError) {
        throw new Error("Error al guardar datos del cliente: " + dbError.message)
      }

      alert("✅ Cuenta creada exitosamente. Bienvenido.")
      
      // Auto-login y redirigir
      router.push('/accesos/cliente')

    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Error al registrarse')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* HEADER */}
        <div className="bg-[#0a1e3f] p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-[#00C897] p-4 rounded-3xl shadow-lg shadow-emerald-500/20 mb-4">
                <LayoutGrid size={32} className="text-white"/>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              {view === 'login' ? 'Acceso Wuotto' : 'Registro Clientes'}
            </h1>
            <p className="text-[#00C897] text-xs font-bold uppercase tracking-widest mt-1">
              {view === 'login' ? 'Ingreso al Sistema' : 'Solicitud de Acceso'}
            </p>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-8 md:p-10">
          
          {/* --- VISTA: LOGIN --- */}
          {view === 'login' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Correo Electrónico</label>
                  <input 
                    type="email" required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-[#00C897] focus:bg-white transition-all"
                    placeholder="usuario@empresa.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Contraseña</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} required
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-[#00C897] focus:bg-white transition-all pr-12"
                      placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00C897]">
                      {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                  </div>
                </div>
                
                <button type="submit" disabled={loading} className="w-full bg-[#0a1e3f] hover:bg-[#112a55] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20}/> : <>Ingresar <ArrowRight size={18}/></>}
                </button>
              </form>
              
              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">¿Eres cliente nuevo?</p>
                <button 
                  onClick={() => setView('register')} 
                  className="text-[#00C897] font-black text-xs uppercase hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <UserPlus size={14}/> Solicitar Acceso Aquí
                </button>
              </div>
            </div>
          )}

          {/* --- VISTA: REGISTRO --- */}
          {view === 'register' && (
            <div className="space-y-5 animate-in slide-in-from-left duration-300">
              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* Empresa */}
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Empresa / Organización</label>
                    <div className="relative">
                        <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="text" required placeholder="Nombre de tu empresa" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#00C897] uppercase"
                            value={regData.organization} onChange={e => setRegData({...regData, organization: e.target.value})} />
                    </div>
                </div>

                {/* Contacto */}
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre de Contacto</label>
                    <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="text" required placeholder="Tu nombre completo" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#00C897] uppercase"
                            value={regData.contactName} onChange={e => setRegData({...regData, contactName: e.target.value})} />
                    </div>
                </div>

                {/* Teléfono y Email */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Teléfono</label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input type="tel" required placeholder="55..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#00C897]"
                                value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Email</label>
                        <input type="email" required placeholder="@email.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#00C897]"
                            value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
                    </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Crear Contraseña</label>
                    <input type="password" required placeholder="Mínimo 6 caracteres" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#00C897]"
                        value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#00C897] hover:bg-[#00a07a] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg mt-2 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={16}/> : 'Crear Cuenta'}
                </button>
              </form>

              <button 
                onClick={() => setView('login')} 
                className="w-full py-2 text-slate-400 hover:text-[#0a1e3f] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-slate-200 rounded-xl"
              >
                <ArrowLeft size={12}/> Ya tengo cuenta
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}