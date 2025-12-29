'use client';

import { useState } from 'react';
import { User, Building, Mail, Briefcase, Phone, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
// Importamos la conexión real
import { supabase } from '@/lib/supabase';

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Extraemos los datos del formulario usando los "name" de los inputs
    const formData = new FormData(e.currentTarget);
    
    const newClient = {
      full_name: formData.get('fullName'),
      organization: formData.get('organization'),
      position: formData.get('position'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      status: 'pending' // Estado inicial por defecto
    };

    // 2. Enviamos a Supabase
    const { error } = await supabase
      .from('clients')
      .insert([newClient]);

    setIsLoading(false);

    if (error) {
      console.error('Error al guardar:', error);
      alert('Hubo un error al guardar los datos. Revisa la consola.');
    } else {
      setIsSent(true);
    }
  };

  if (isSent) {
    return (
      <div className="text-center space-y-6 py-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Briefcase className="text-emerald-400" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-white">¡Solicitud Registrada!</h3>
        <p className="text-slate-400 max-w-xs mx-auto">
          Tus datos ya están seguros en nuestra base de datos. El administrador revisará tu perfil en breve.
        </p>
        <Link href="/" className="inline-block text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest text-xs mt-4">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      
      {/* DATOS PERSONALES */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-500/70 border-b border-white/5 pb-2">Datos Personales</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
              {/* OJO: Agregamos name="fullName" */}
              <input name="fullName" type="text" placeholder="Ej. Roberto G." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Número de Contacto</label>
            <div className="relative group">
              <Phone className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
              {/* OJO: Agregamos name="phone" */}
              <input name="phone" type="tel" placeholder="(55) 1234 5678" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all" required />
            </div>
          </div>
        </div>
      </div>

      {/* DATOS CORPORATIVOS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-500/70 border-b border-white/5 pb-2">Datos Corporativos</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Organización</label>
            <div className="relative group">
              <Building className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
              {/* OJO: Agregamos name="organization" */}
              <input name="organization" type="text" placeholder="Ej. Tech Corp" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Puesto / Cargo</label>
            <div className="relative group">
              <Briefcase className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
              {/* OJO: Agregamos name="position" */}
              <input name="position" type="text" placeholder="Ej. Gerente de TI" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all" required />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Correo Corporativo</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
            {/* OJO: Agregamos name="email" */}
            <input name="email" type="email" placeholder="usuario@empresa.com" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all" required />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 active:scale-[0.98]">
        {isLoading ? <Loader2 className="animate-spin" /> : <>ENVIAR SOLICITUD DE ALTA <ArrowRight size={20} /></>}
      </button>

      <div className="text-center border-t border-slate-800 pt-4">
        <Link href="/login" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">¿Ya tiene acceso? <span className="font-bold">Ir a Consola</span></Link>
      </div>
    </form>
  );
}