'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // IMPORTANTE: Para poder redirigir
import { 
  Shield, ShieldCheck, Users, HardHat, 
  Building2, ChevronDown, LogOut 
} from 'lucide-react';

export default function Header({ user, currentRole, onChangeRole }: any) {
  const router = useRouter(); // Inicializamos el router
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cierra el menú si haces clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FUNCIÓN PARA CERRAR SESIÓN
  const handleLogout = () => {
    // 1. Borramos la "cookie" o dato de sesión local
    localStorage.removeItem('kiosco_user');
    // 2. Redirigimos al Login
    router.push('/login');
  };

  const roles = [
    { id: 'superadmin', label: 'SUPER ADMINISTRADOR', icon: ShieldCheck, color: 'text-red-600' },
    { id: 'admin', label: 'ADMINISTRADOR', icon: Shield, color: 'text-blue-600' },
    { id: 'coordinador', label: 'COORDINADOR', icon: Users, color: 'text-slate-600' },
    { id: 'operativo', label: 'OPERATIVO', icon: HardHat, color: 'text-slate-600' },
    { id: 'client', label: 'CLIENTE', icon: Building2, color: 'text-slate-600' },
  ];

  return (
    <header className="bg-[#0a1e3f] text-white p-4 px-10 flex justify-between items-center shadow-xl sticky top-0 z-[500] border-b border-white/10">
      <div className="flex items-center gap-4">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-900/50">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-tighter m-0 leading-none">CORPOPS</h1>
          <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">Control Console</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black uppercase tracking-tight m-0 leading-none">
            {user?.full_name || 'USUARIO'}
          </p>
          <p className="text-[9px] opacity-60 mt-1">{user?.email || 'Sesión Activa'}</p>
        </div>

        {/* SELECTOR DE MANDO */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 transition-all active:scale-95 ${isOpen ? 'bg-white text-[#0a1e3f]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <div className={`p-1 rounded-md ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-blue-500 text-white'}`}>
              <Shield size={12} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
              MODO: {currentRole?.toUpperCase()}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 mt-4 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-black/5">
              <div className="p-5 bg-slate-50 border-b border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center m-0">Seleccionar Nivel</p>
              </div>
              <div className="p-2 space-y-1">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { onChangeRole(r.id); setIsOpen(false); }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${currentRole === r.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <r.icon size={18} className={`${currentRole === r.id ? 'text-blue-600' : r.color} ${currentRole !== r.id && 'opacity-50 group-hover:opacity-100 group-hover:scale-110'} transition-all`} />
                    <span className={`text-[10px] font-black uppercase tracking-tight ${currentRole === r.id ? 'text-blue-600' : 'text-slate-600'}`}>
                      {r.label}
                    </span>
                    {currentRole === r.id && <div className="ml-auto w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN SALIR (AHORA CON FUNCIÓN) */}
        <button 
          onClick={handleLogout}
          className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-200 border border-red-500/20"
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}