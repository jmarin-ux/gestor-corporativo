import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import LoginForm from '@/components/forms/LoginForm';
import { Suspense } from 'react'; // Necesario para leer parámetros de URL

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Fondo Ambiental Neutro */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/20 blur-[130px] rounded-full -z-10" />

      <div className="w-full max-w-md">
        
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-8">
            <ChevronLeft size={14} /> Cancelar y Volver
          </Link>
        </div>

        {/* Tarjeta de Login */}
        <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
          
          {/* Suspense protege la carga de los parámetros de URL */}
          <Suspense fallback={<div className="text-center text-slate-500">Cargando panel...</div>}>
            <LoginForm />
          </Suspense>

        </div>

      </div>
    </main>
  );
}