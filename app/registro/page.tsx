'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import RegisterForm from '@/components/forms/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 🌌 Fondo decorativo (Orbes de luz) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#00C897]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        
        {/* 🏷️ Pill Superior */}
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-white/50 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00C897] animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.3em] text-slate-700 uppercase">
              Alta de <span className="text-[#00C897]">Cliente</span>
            </span>
          </div>
        </div>

        {/* 💳 Tarjeta Principal (Card) */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] p-8 md:p-12 w-full border border-slate-100 animate-in zoom-in-95 duration-500">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
              Registro Nuevo
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Ingresa los datos corporativos para la solicitud
            </p>
          </div>

          {/* ✅ COMPONENTE DE FORMULARIO: Centraliza la lógica Auth y DB */}
          <RegisterForm />

        </div>

        {/* 🔙 Botón para Cancelar / Volver */}
        <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#00C897] transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
          >
            <ChevronLeft size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
            Cancelar y volver
          </Link>
        </div>

      </div>
    </main>
  );
}