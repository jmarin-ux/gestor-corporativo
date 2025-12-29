'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, ChevronDown, Shield, User } from 'lucide-react';

// Importamos las vistas
import ManagementView from '@/components/dashboard/ManagementView';
import CoordinatorView from '@/components/dashboard/CoordinatorView';
import OperativeView from '@/components/dashboard/OperativeView';
import ClientView from '@/components/dashboard/ClientView'; 

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. Estado para manejar el rol de forma segura
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // 2. Lógica de detección de usuario
    const roleParam = searchParams.get('role');
    const sessionData = localStorage.getItem('kiosco_user');

    if (roleParam) {
      // Si la URL dice un rol (ej. ?role=admin), mandamos ese
      setRole(roleParam);
    } else if (sessionData) {
      // ¡AQUÍ ESTÁ EL TRUCO! Si no hay URL pero hay sesión de Kiosco, 
      // forzamos 'client' para que NO intente cargar el ManagementView
      setRole('client');
    } else {
      // Si no hay nada de nada, solo entonces vamos a superadmin
      setRole('superadmin');
    }
  }, [searchParams]);

  const roleConfig: any = {
    superadmin: { label: 'Super Admin', short: 'SU', bg: 'bg-[#E31D1A]' },
    admin:      { label: 'Administrador', short: 'AD', bg: 'bg-blue-600' },
    coordinador:{ label: 'Coordinación',  short: 'CO', bg: 'bg-purple-600' },
    operativo:  { label: 'Operativo',     short: 'OP', bg: 'bg-emerald-600' },
    client:     { label: 'Cliente',       short: 'CL', bg: 'bg-orange-500' },
  };

  // Evitamos que se renderice nada hasta que el useEffect decida el rol
  if (!role) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-[#0a1e3f]">
      Verificando credenciales...
    </div>
  );

  const currentRole = roleConfig[role] || roleConfig.superadmin;

  return (
    <main className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      
      {/* HEADER GLOBAL */}
      <header className="bg-[#0a1e3f] sticky top-0 z-50 shadow-xl shadow-blue-900/20 text-white">
        <div className="max-w-[1920px] mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
          
          <div className="flex items-center gap-3 md:gap-4">
             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                <Shield size={20} className="text-white" fill="currentColor" fillOpacity={0.3}/>
             </div>
             <div className="leading-none">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter">
                  CORP<span className="text-blue-400">OPS</span>
                </h1>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em]">Console</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex relative group">
                <div className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 rounded-full pl-4 pr-3 py-2 flex items-center gap-3 cursor-pointer backdrop-blur-md">
                    <User size={14} className="text-blue-200"/>
                    <span className="text-xs font-bold text-blue-100 uppercase tracking-wide mr-1">
                        VISTA: <span className="text-white">{currentRole.label}</span>
                    </span>
                    <select 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        value={role}
                        onChange={(e) => router.push(`/dashboard?role=${e.target.value}`)}
                    >
                        <option className="text-black bg-white" value="superadmin">Super Admin</option>
                        <option className="text-black bg-white" value="admin">Administrador</option>
                        <option className="text-black bg-white" value="coordinador">Coordinador</option>
                        <option className="text-black bg-white" value="operativo">Operativo</option>
                        <option className="text-black bg-white" value="client">Cliente</option>
                    </select>
                    <ChevronDown size={14} className="text-blue-300"/>
                </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden md:block"></div>

            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 ${currentRole.bg} rounded-full flex items-center justify-center font-black text-xs shadow-lg shadow-black/20 ring-2 ring-[#0a1e3f] ring-offset-2 ring-offset-white/10`}>
                    {currentRole.short}
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem('kiosco_user');
                    router.push('/login');
                  }}
                  className="h-10 w-10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full flex items-center justify-center transition-all border border-transparent hover:border-red-500/30"
                >
                    <LogOut size={18} />
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="w-full">
        {(role === 'superadmin' || role === 'admin') && (
            <ManagementView role={role as 'superadmin' | 'admin'} />
        )}
        {role === 'coordinador' && <CoordinatorView />}
        {role === 'operativo' && <OperativeView />}
        {role === 'client' && <ClientView />}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-[#0a1e3f] font-bold">
            Cargando sistema...
        </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}