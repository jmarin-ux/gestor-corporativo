'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, ShieldAlert, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); 
  const isAdminView = mode === 'admin'; // TRUE = Pantalla Azul (Staff), FALSE = Pantalla Morada (Cliente)

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Estilos visuales
  const theme = {
    color: isAdminView ? 'text-blue-500' : 'text-purple-400',
    borderColor: isAdminView ? 'focus:border-blue-500' : 'focus:border-purple-500',
    ringColor: isAdminView ? 'focus:ring-blue-500' : 'focus:ring-purple-500',
    btnGradient: isAdminView ? 'from-blue-600 to-indigo-600' : 'from-purple-600 to-indigo-600',
    btnHover: isAdminView ? 'hover:from-blue-500 hover:to-indigo-500' : 'hover:from-purple-500 hover:to-indigo-500',
    iconColor: isAdminView ? 'text-blue-400' : 'text-purple-400',
    shadow: isAdminView ? 'shadow-blue-900/20' : 'shadow-purple-900/20',
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // -------------------------------------------------------------
    // 1. MODO KIOSCO (Login Maestro de Asistencia)
    // -------------------------------------------------------------
    if (email === 'asistencia@cmw.com.mx') {
      if (password === 'Kiosco2025') { 
          setTimeout(() => { router.push('/kiosk'); }, 1000);
          return;
      } else {
          setError('Contraseña Maestra incorrecta.'); setIsLoading(false); return;
      }
    }

    try {
      // -------------------------------------------------------------
      // 2. LA "LLAVE MAESTRA" DEL DIRECTOR (TÚ)
      // -------------------------------------------------------------
      if (email === 'jmarin@cmw.com.mx') {
         const { data: directorUser } = await supabase.from('profiles').select('*').eq('email', email).eq('password', password).single();
         
         if (directorUser) {
             // ---> GUARDAR SESIÓN AQUÍ <---
             localStorage.setItem('kiosco_user', JSON.stringify(directorUser));
             
             router.push(`/dashboard?role=${directorUser.role}`);
             return;
         } else {
             setError('Contraseña de Director incorrecta.'); setIsLoading(false); return;
         }
      }

      // -------------------------------------------------------------
      // 3. LÓGICA ESTRICTA PARA LOS DEMÁS (MORTALES)
      // -------------------------------------------------------------
      
      if (isAdminView) {
        // === ESTAMOS EN LA PUERTA AZUL (ADMIN/STAFF) ===
        
        // Solo buscamos en Staff (profiles)
        const { data: staffUser } = await supabase.from('profiles').select('*').eq('email', email).eq('password', password).single();

        if (staffUser) {
            if (staffUser.status !== 'active') { setError('Cuenta desactivada.'); setIsLoading(false); return; }
            
            // ---> GUARDAR SESIÓN AQUÍ <---
            localStorage.setItem('kiosco_user', JSON.stringify(staffUser));

            router.push(`/dashboard?role=${staffUser.role}`);
            return;
        }

        // Validación cruzada (si es cliente en puerta de staff)
        const { data: isClient } = await supabase.from('clients').select('id').eq('email', email).single();
        if (isClient) {
            setError('Acceso denegado. Clientes deben usar el Portal de Clientes.');
        } else {
            setError('Credenciales de Staff incorrectas.');
        }

      } else {
        // === ESTAMOS EN LA PUERTA MORADA (CLIENTES) ===
        
        // Solo buscamos en Clientes (clients)
        const { data: clientUser } = await supabase.from('clients').select('*').eq('email', email).eq('password', password).single();

        if (clientUser) {
            if (clientUser.status !== 'active') { setError('Cuenta pendiente de aprobación.'); setIsLoading(false); return; }
            
            // ---> GUARDAR SESIÓN AQUÍ <---
            // Esto es crucial para que luego ClientView sepa quién es
            localStorage.setItem('kiosco_user', JSON.stringify(clientUser));

            // Ya no dependemos solo de la URL, pero la dejamos por compatibilidad
            router.push(`/dashboard?role=client&user=${clientUser.email}`);
            return;
        }

        // Validación cruzada (si es staff en puerta de clientes)
        const { data: isStaff } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (isStaff) {
             setError('Personal interno: Favor de usar el Acceso Administrativo (Azul).');
        } else {
             setError('Credenciales incorrectas o usuario no registrado.');
        }
      }

      setIsLoading(false);

    } catch (err) {
      console.error(err);
      setError('Error de conexión.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      
      <div className="text-center mb-8">
        <div className={`mx-auto w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center mb-4 bg-slate-900`}>
          {isAdminView ? <ShieldCheck className="text-blue-500" size={32} /> : <Zap className="text-purple-400" size={32} />}
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          {isAdminView ? 'ACCESO ADMINISTRATIVO' : 'ACCESO DE CLIENTE'}
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          {isAdminView ? 'Credenciales de Nivel 5 Requeridas' : 'Ingresa para gestionar tus servicios'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex gap-3 items-center animate-in fade-in">
          <ShieldAlert className="text-red-500 shrink-0" size={18} />
          <p className="text-xs text-red-200 font-bold">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Correo Registrado</label>
          <div className="relative group">
            <Mail className={`absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:${theme.iconColor}`} size={18} />
            <input name="email" type="email" placeholder={isAdminView ? "staff@corpops.com" : "usuario@empresa.com"} className={`w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all ${theme.borderColor} focus:ring-1 ${theme.ringColor}`} required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contraseña</label>
          <div className="relative group">
            <Lock className={`absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:${theme.iconColor}`} size={18} />
            <input name="password" type="password" placeholder="••••••••" className={`w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all ${theme.borderColor} focus:ring-1 ${theme.ringColor}`} required />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isLoading} className={`w-full bg-gradient-to-r ${theme.btnGradient} ${theme.btnHover} text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${theme.shadow} active:scale-[0.98]`}>
        {isLoading ? <><Loader2 size={20} className="animate-spin" /> Verificando...</> : <>{isAdminView ? 'ENTRAR A LA CONSOLA' : 'INICIAR GESTIÓN'} <ArrowRight size={20} /></>}
      </button>

    </form>
  );
}