import Link from 'next/link';
import { UserPlus, Zap, Lock, ChevronRight, Activity, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30">
      
      {/* Navbar: Simple y limpio */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <Cpu size={20} className="text-cyan-400" />
          </div>
          <span className="text-lg font-black tracking-tighter uppercase italic">
            CORP<span className="text-cyan-400 font-light">OPS</span>
          </span>
        </div>
        
        {/* Indicador de estado */}
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Activity size={12} className="text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            Portal Activo
          </span>
        </div>
      </nav>

      {/* Contenido Principal */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-20 text-center">
        
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-tight">
          PANEL DE <br /> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
            INGRESO CENTRAL
          </span>
        </h1>
        
        <p className="text-slate-400 text-lg mb-16 max-w-2xl mx-auto">
          Seleccione la operación que desea realizar para continuar.
        </p>

        {/* GRID DE 3 TARJETAS */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
          
          {/* 1. TARJETA: REGISTRO DE CLIENTES */}
          <div className="group bg-white/[0.03] border border-white/10 p-8 rounded-3xl hover:border-cyan-500/50 hover:bg-white/[0.05] transition-all duration-300">
            <div className="bg-cyan-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UserPlus className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Nuevo Cliente</h3>
            <p className="text-slate-500 text-sm mb-8 h-10">
              Registro inicial para darse de alta en nuestra red operativa.
            </p>
            <Link href="/registro" className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
              Crear Cuenta <ChevronRight size={16} />
            </Link>
          </div>

          {/* 2. TARJETA: SOLICITAR SERVICIOS (Con Modo Ticket) */}
          <div className="group bg-white/[0.03] border border-white/10 p-8 rounded-3xl hover:border-purple-500/50 hover:bg-white/[0.05] transition-all duration-300">
            <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="text-purple-400" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Solicitar Servicio</h3>
            <p className="text-slate-500 text-sm mb-8 h-10">
              Levantar un requerimiento o ticket técnico inmediato.
            </p>
            {/* CORRECCIÓN: Agregamos ?mode=ticket */}
            <Link href="/login?mode=ticket" className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
              Generar Ticket <ChevronRight size={16} />
            </Link>
          </div>

          {/* 3. TARJETA: CONSOLA STAFF (Con Modo Admin) */}
          <div className="group bg-white/[0.03] border border-white/10 p-8 rounded-3xl hover:border-blue-500/50 hover:bg-white/[0.05] transition-all duration-300">
            <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Lock className="text-blue-500" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Consola Staff</h3>
            <p className="text-slate-500 text-sm mb-8 h-10">
              Acceso exclusivo para gestión y administración del sistema.
            </p>
            {/* CORRECCIÓN: Agregamos ?mode=admin */}
            <Link href="/login?mode=admin" className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
              Entrar al Panel <ChevronRight size={16} />
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}