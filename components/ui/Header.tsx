'use client'

import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, Camera } from 'lucide-react' // ✅ Camera importada
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AttendanceModal from '@/components/dashboard/AttendanceModal' // ✅ Importar Modal

interface UserSession {
  id: string
  email?: string
  role: string
  full_name?: string
}

interface HeaderProps {
  user?: UserSession
  currentRole?: string
  onChangeRole?: (role: string) => void
  onLogout?: () => void | Promise<void>
  logoutRedirectTo?: string
}

export default function Header({
  user: propUser,
  currentRole: propRole,
  onChangeRole,
  onLogout,
  logoutRedirectTo = '/login',
}: HeaderProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter() 
  const [localUser, setLocalUser] = useState<UserSession | null>(null)
  
  // ✅ Estado para controlar el modal de asistencia
  const [showAttendance, setShowAttendance] = useState(false)

  // 🔐 BOOT DE IDENTIDAD — Recuperación de sesión local
  useEffect(() => {
    if (propUser) return

    // 1️⃣ Si hay operativo activo (staff_user), tiene prioridad
    const staffRaw = localStorage.getItem('staff_user')
    if (staffRaw) {
      try {
        setLocalUser(JSON.parse(staffRaw))
        return
      } catch {
        localStorage.removeItem('staff_user')
      }
    }

    // 2️⃣ Si no hay staff, buscamos otros tipos de sesión
    const keys = ['kiosk_device_user', 'kiosco_user', 'client_user', 'kiosk_user']

    for (const k of keys) {
      const stored = localStorage.getItem(k)
      if (stored) {
        try {
          setLocalUser(JSON.parse(stored))
          return
        } catch {
          localStorage.removeItem(k)
        }
      }
    }
  }, [propUser])

  // --- LÓGICA DE LOGOUT ROBUSTA ---
  const handleLogout = async () => {
    if (!window.confirm("¿Estás seguro de que deseas cerrar sesión?")) return

    try {
      if (onLogout) {
        await onLogout()
      }
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error al cerrar sesión en Supabase:", error)
    } finally {
      localStorage.clear()
      sessionStorage.clear() 
      window.location.href = logoutRedirectTo
    }
  }

  // --- RENDERIZADO ---

  const activeUser = propUser || localUser

  if (!activeUser) {
    return (
      <header className="fixed left-0 right-0 top-0 z-[100] flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md shadow-sm" />
    )
  }

  const normalizedRole = (activeUser.role || '').toLowerCase()

  const isClient = useMemo(
    () => normalizedRole === 'client' || normalizedRole === 'cliente',
    [normalizedRole]
  )

  const isPrivileged = useMemo(
    () => normalizedRole === 'superadmin' || normalizedRole === 'admin',
    [normalizedRole]
  )

  const roleKey = ((propRole || activeUser.role || 'invitado') as string).toLowerCase()

  const initials =
    activeUser.full_name
      ?.split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'

  const availableRoles = [
    { key: 'superadmin', label: 'Super Admin' },
    { key: 'admin', label: 'Administrador' },
    { key: 'coordinador', label: 'Coordinador' },
    { key: 'operativo', label: 'Operativo' },
    { key: 'client', label: 'Cliente' },
  ]

  return (
    <>
        <header className="fixed left-0 right-0 top-0 z-[100] flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md shadow-sm">
        {/* LOGO */}
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C897] shadow-lg shadow-[#00C897]/20">
            <span className="text-xs font-black text-white">W</span>
            </div>
            <div className="hidden md:block leading-none">
            <span className="block text-sm font-black uppercase tracking-[0.2em] text-slate-700">
                WUOTTO
            </span>
            <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-[#00C897]">
                SERVICES
            </span>
            </div>
        </div>

        <div className="flex items-center gap-6">
            
            {/* 👇 BOTÓN DE ASISTENCIA (NUEVO) */}
            {!isClient && (
                <button 
                    onClick={() => setShowAttendance(true)}
                    className="hidden sm:flex items-center gap-2 bg-[#0a1e3f] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                >
                    <Camera size={14} /> Asistencia
                </button>
            )}

            {/* Selector de rol */}
            {!isClient && isPrivileged && onChangeRole ? (
            <div className="relative hidden sm:flex items-center">
                <select
                value={roleKey}
                onChange={(e) => onChangeRole(e.target.value)}
                className="appearance-none rounded-full border border-slate-200 bg-slate-50 pl-4 pr-8 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none hover:border-[#00C897] cursor-pointer"
                >
                {availableRoles.map((r) => (
                    <option key={r.key} value={r.key}>
                    {r.label}
                    </option>
                ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 text-slate-400 pointer-events-none" />
            </div>
            ) : (
            <div className="hidden sm:flex items-center">
                <span className="inline-block text-[9px] font-black uppercase tracking-widest text-[#00C897] bg-[#00C897]/10 px-3 py-1 rounded-full">
                {(isClient ? 'CLIENTE' : roleKey).toUpperCase()}
                </span>
            </div>
            )}

            {/* Información del Usuario */}
            <div className="flex h-8 items-center gap-3 border-l border-slate-200 pl-6">
            <div className="hidden text-right sm:block">
                <p className="text-xs font-bold leading-none text-slate-700 truncate max-w-[150px]">
                {activeUser.full_name}
                </p>
                {/* Botón móvil de asistencia (solo visible en pantallas pequeñas) */}
                <button 
                    onClick={() => setShowAttendance(true)}
                    className="sm:hidden mt-1 text-[9px] font-black uppercase tracking-widest text-[#00C897] flex items-center justify-end gap-1"
                >
                    <Camera size={10} /> Marcar Asistencia
                </button>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600 shadow-sm border border-slate-100">
                {initials}
            </div>
            </div>

            {/* Botón de Logout */}
            <button
            onClick={handleLogout}
            className="group flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Cerrar Sesión"
            >
            <div className="rounded-full p-2 group-hover:bg-red-50 transition-colors">
                <LogOut size={18} strokeWidth={2.5} />
            </div>
            </button>
        </div>
        </header>

        {/* 👇 MODAL DE ASISTENCIA RENDERIZADO AQUÍ */}
        {showAttendance && (
            <AttendanceModal
                isOpen={true}
                onClose={() => setShowAttendance(false)}
                currentUser={activeUser}
                type="ENTRADA" // Puedes personalizar esto o dejar que el modal decida
            />
        )}
    </>
  )
}