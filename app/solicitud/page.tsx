'use client';

import ServiceForm from "@/components/forms/ServiceForm";
import { Zap, X } from "lucide-react";
import Link from "next/link";

export default function SolicitudPage() {
  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      
      <div className="w-full max-w-2xl bg-[#0a0f24] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        
        {/* BOTÓN DE CIERRE / CANCELAR */}
        <Link 
          href="/dashboard?role=client" 
          className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
          title="Cancelar solicitud"
        >
          <X size={24} />
        </Link>

        {/* Decoración Superior */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-8">
          <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/5">
            <Zap className="text-purple-400" size={28} fill="currentColor" fillOpacity={0.2} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
              Nuevo Ticket
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">
              Mesa de Ayuda Técnica
            </p>
          </div>
        </div>

        {/* Formulario de Servicio */}
        <ServiceForm />

      </div>
    </main>
  );
}