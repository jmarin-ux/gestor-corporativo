'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Zap, Lock, ChevronRight, Activity, Cpu, HardHat } from 'lucide-react';
// Importamos tu nuevo componente
import OperativeAccessModal from '@/components/auth/OperativeAccessModal';

export default function CentralAccessPanel() {
  const [showPinPad, setShowPinPad] = useState(false);

  return (
    <main className="min-h-screen bg-[#020617] text-white relative font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-6 md:px-12 border-b border-white/5">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20">
             <Cpu size={18} />
           </div>
           <span className="font-black tracking-tight text-lg">CORP<span className="text-blue-500">OPS</span></span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
            <Activity size={12} /> Portal Activo
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
        
        <div className="text-center mb-16 space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                Panel de <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">Ingreso Central</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg">Seleccione la operación que desea realizar para continuar.</p>
        </div>

        {/* GRID DE OPCIONES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
            
            {/* 1. Nuevo Cliente */}
            <div className="group bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-cyan-500/30 rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-cyan-950/30 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                    <UserPlus size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Nuevo Cliente</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Registro inicial para darse de alta en nuestra red operativa.</p>
                <Link href="/register" className="inline-flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                    Crear Cuenta <ChevronRight size={14}/>
                </Link>
            </div>

            {/* 2. Solicitar Servicio */}
            <div className="group bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-purple-500/30 rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-purple-950/30 text-purple-400 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                    <Zap size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Solicitar Servicio</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Levantar un requerimiento o ticket técnico inmediato.</p>
                <Link href="/tickets/new" className="inline-flex items-center gap-2 text-purple-400 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                    Generar Ticket <ChevronRight size={14}/>
                </Link>
            </div>

            {/* 3. Consola Staff (Admin) */}
            <div className="group bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-blue-950/30 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <Lock size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Consola Staff</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Acceso exclusivo para gestión y administración del sistema.</p>
                <Link href="/login" className="inline-flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                    Entrar al Panel <ChevronRight size={14}/>
                </Link>
            </div>
        </div>

        {/* BOTÓN DISCRETO OPERATIVO */}
        <div className="mt-16 opacity-30 hover:opacity-100 transition-opacity duration-300">
            <button 
                onClick={() => setShowPinPad(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-colors"
            >
                <HardHat size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Acceso Operativo</span>
            </button>
        </div>
      </div>

      {/* --- AQUÍ RENDERIZAMOS EL MODAL SI ESTÁ ACTIVO --- */}
      {showPinPad && (
        <OperativeAccessModal onClose={() => setShowPinPad(false)} />
      )}

    </main>
  );
}