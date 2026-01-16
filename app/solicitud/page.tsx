'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { Loader2, ArrowLeft } from 'lucide-react';
import ServiceForm from '@/components/forms/ServiceForm'; // 👈 Importamos el componente de arriba

export default function NewServicePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Traer datos completos del cliente desde la tabla 'clients'
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!clientData) {
        // Si tiene sesión pero no está en la tabla clients (ej. es un admin), lo sacamos
        alert("Acceso denegado: Solo clientes pueden crear solicitudes.");
        router.push('/login');
        return;
      }

      setCurrentUser(clientData);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#0a1e3f]" size={40}/></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header simple con botón de volver */}
        <div className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600"/>
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#0a1e3f] uppercase tracking-tight">Nueva Solicitud</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generar Ticket de Servicio</p>
          </div>
        </div>

        {/* Aquí insertamos el componente del formulario */}
        <ServiceForm currentUser={currentUser} />
        
      </div>
    </div>
  );
}