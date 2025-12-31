'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ServiceForm from "@/components/forms/ServiceForm";
import { Zap, X, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SolicitudPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificación de seguridad: solo usuarios logueados pueden ver esto
    const sessionData = localStorage.getItem('kiosco_user');
    if (sessionData) {
      setUser(JSON.parse(sessionData));
      setIsLoading(false);
    } else {
      router.push('/login');
    }
  }, [router]);

  if (isLoading) return (
    // Pantalla de carga oscura mientras verifica sesión
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-purple-500" size={32} />
    </div>
  );

  return (
    // FORZAMOS el fondo oscuro (bg-[#020617]) y el texto claro en este contenedor principal
    <main className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-4 relative z-0 overflow-hidden">
      
      {/* Decoración de fondo sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-purple-900/20 blur-[120px] rounded-full -z-10"></div>

      <div className="w-full max-w-2xl bg-[#0a0f24]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        
        {/* BOTÓN DE CIERRE */}
        <Link 
          href="/dashboard?role=client" 
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
          title="Cancelar solicitud"
        >
          <X size={24} />
        </Link>

        {/* Encabezado Profesional */}
        <div className="flex items-center gap-5 mb-10 border-b border-white/10 pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
            <Zap className="text-purple-400" size={32} strokeWidth={1.5} />
          </div>
          <div className="text-left space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-none">
              Nuevo Ticket
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="bg-purple-500 w-2 h-2 rounded-full inline-block"></span>
              Mesa de Ayuda Técnica
            </p>
          </div>
        </div>

        {/* Pasamos el usuario al formulario para el vínculo de base de datos */}
        <ServiceForm currentUser={user} />

      </div>
    </main>
  );
}