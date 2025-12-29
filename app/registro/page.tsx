import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
// IMPORTANTE: Esta línea conecta con el archivo que creamos en el Paso 1
import RegisterForm from '@/components/forms/RegisterForm'; 

export default function RegistroPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Fondo Ambiental */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/20 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-lg">
        {/* Botón Volver */}
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-xs font-bold uppercase tracking-widest">
            <ChevronLeft size={16} /> Volver al Panel
          </Link>
        </div>

        {/* Tarjeta Principal */}
        <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <ShieldCheck className="text-cyan-400" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Alta de Cliente</h1>
              <p className="text-slate-400 text-xs font-medium">Sistema de Registro v1.0</p>
            </div>
          </div>

          {/* Aquí se carga el formulario */}
          <RegisterForm />
          
        </div>
      </div>
    </main>
  );
}