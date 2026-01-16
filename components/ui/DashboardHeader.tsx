'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function DashboardHeader({ user }: { user: any }) {
  const router = useRouter();

  const handleLogout = () => {
    // 1. Limpiamos todas las posibles sesiones
    localStorage.removeItem('staff_user');
    localStorage.removeItem('client_user');
    localStorage.removeItem('kiosk_user');
    
    // 2. Redirigimos al login
    router.push('/login');
  };

  // Obtenemos iniciales para el avatar de forma segura
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 px-6 flex items-center justify-between shadow-sm transition-all">
      
      {/* --- IZQUIERDA: LOGO / BRAND --- */}
      <div className="flex items-center gap-3">
        {/* Logo Wuotto (Simulado o Imagen) */}
        <div className="w-8 h-8 bg-[#00C897] rounded-lg flex items-center justify-center shadow-lg shadow-[#00C897]/20">
            <span className="text-white font-black text-xs">W</span>
        </div>
        <div className="hidden md:block">
            <span className="text-sm font-black tracking-[0.2em] text-slate-700 uppercase block leading-none">
                WUOTTO
            </span>
            <span className="text-[9px] font-bold text-[#00C897] tracking-widest uppercase block leading-none mt-0.5">
                SERVICES
            </span>
        </div>
      </div>

      {/* --- DERECHA: PERFIL Y ACCIONES --- */}
      <div className="flex items-center gap-6">
        
        {/* Info del Usuario */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 h-8">
            <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-700 leading-none">
                    {user?.full_name || 'Usuario'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    {user?.role === 'superadmin' ? 'Super Administrador' : user?.role}
                </p>
            </div>
            
            {/* Avatar con Iniciales */}
            <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-black text-xs uppercase">
                {initials}
            </div>
        </div>

        {/* Botón Cerrar Sesión */}
        <button 
            onClick={handleLogout}
            className="group flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Cerrar Sesión"
        >
            <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                <LogOut size={18} strokeWidth={2.5} />
            </div>
        </button>
      </div>

    </header>
  );
}