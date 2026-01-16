'use client';

import { useState } from 'react';
import { Menu, LogOut, LayoutGrid } from 'lucide-react';
import { supabase } from '../../../lib/supabase'

interface Props {
  children: React.ReactNode;
  currentUser: any;
  currentView: string;
  onViewChange: (view: string) => void;
}

// Configuración de permisos de navegación
const NAV_ITEMS = [
  { id: 'control', label: 'CONTROL', allowedRoles: ['superadmin'] },
  { id: 'staff',   label: 'STAFF',   allowedRoles: ['superadmin'] },
  { id: 'clients', label: 'CLIENTES', allowedRoles: ['superadmin'] },
  { id: 'coord',   label: 'COORD.',   allowedRoles: ['superadmin', 'coordinador'] },
  { id: 'operative', label: 'OPERATIVA', allowedRoles: ['superadmin', 'coordinador', 'operativo'] },
  { id: 'plan',    label: 'PLAN',    allowedRoles: ['superadmin', 'coordinador'] },
  { id: 'kiosk',   label: 'KIOSCO',  allowedRoles: ['superadmin'] },
];

export default function SuperAdminLayout({ children, currentUser, currentView, onViewChange }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Normalizamos el rol para evitar errores (si es null, usamos string vacío)
  const userRole = (currentUser?.role || '').toLowerCase();

  // Filtramos los botones según el rol del usuario
  const visibleItems = NAV_ITEMS.filter(item => item.allowedRoles.includes(userRole));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- HEADER (ENCABEZADO) --- */}
      <header className="bg-[#0a1e3f] text-white sticky top-0 z-50 shadow-xl border-b border-white/10">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* IZQUIERDA: Menú Móvil + Identidad */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <div>
               <h1 className="text-lg font-black tracking-widest leading-none flex items-center gap-2">
                 <LayoutGrid size={20} className="text-emerald-400"/>
                 PANEL MAESTRO
               </h1>
               <div className="flex items-center gap-2 mt-1">
                 {/* Si currentUser es null, mostramos 'Cargando...' para no dejar huecos */}
                 <span className="text-[10px] text-blue-200 font-medium tracking-wide">
                   {currentUser?.full_name || 'Cargando usuario...'}
                 </span>
                 
                 {userRole && (
                   <span className="text-[9px] font-bold px-1.5 rounded uppercase bg-white/10 text-slate-300">
                     {userRole}
                   </span>
                 )}
               </div>
            </div>
          </div>

          {/* CENTRO: Navegación de Pestañas (Solo Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#051125]/50 p-1 rounded-full border border-white/5">
            {visibleItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#0a1e3f] text-white shadow-lg shadow-black/20 scale-105 border border-white/10' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* DERECHA: Botón Salir */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* --- MENÚ DESPLEGABLE (Solo Móvil) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0a1e3f] border-b border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-5">
           {visibleItems.map((item) => (
             <button
               key={item.id}
               onClick={() => { onViewChange(item.id); setIsMobileMenuOpen(false); }}
               className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest ${
                 currentView === item.id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-white/5'
               }`}
             >
               {item.label}
             </button>
           ))}
        </div>
      )}

      {/* --- CONTENIDO PRINCIPAL (Las Vistas) --- */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full p-4 md:p-6 animate-in fade-in duration-500">
        {children}
      </main>

    </div>
  );
}