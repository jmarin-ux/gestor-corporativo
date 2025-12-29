'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, MapPin, Info, Upload, FileText, ArrowRight, Loader2, CheckCircle, Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ServiceForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [generatedFolio, setGeneratedFolio] = useState('');
  
  const [userSession, setUserSession] = useState<any>(null);

  const serviceTypes = [
    "Mantenimiento Correctivo Programado - Reparación de fallo no crítico",
    "Instalación/Montaje - Equipos o sistemas nuevos",
    "Configuración/Ajuste - Modificar parámetros o software",
    "Visita Técnica o Levantamiento - Inspección o cotización",
    "Conservación de Inmueble - Electricidad, fontanería, pintura",
    "Mantenimiento Correctivo (Emergencia) - Fallo crítico o detención total"
  ];

  // Recuperamos la sesión completa
  useEffect(() => {
    const sessionData = localStorage.getItem('kiosco_user');
    if (sessionData) {
      setUserSession(JSON.parse(sessionData));
    }
  }, []);

  // --- LÓGICA DE FOLIOS REPLICADA DEL SCRIPT ---
  const createFolio = (type: string) => {
    const prefix = type.toLowerCase().includes('emergencia') ? 'ME' : 'SR'; 
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    return `${prefix}${yy}${mm}${randomHex}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validación de sesión reforzada
    if (!userSession || !userSession.email) {
      alert("Error: No se detectó tu sesión. Por favor inicia sesión nuevamente.");
      return;
    }

    if (!selectedType) {
      alert("Por favor selecciona un tipo de servicio");
      return;
    }

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const folio = createFolio(selectedType);
    setGeneratedFolio(folio);

    const location = formData.get('location') as string;
    const description = formData.get('description') as string;

    // --- REPLICANDO "DETALLE ENRIQUECIDO" ---
    const detalleEnriquecido = `📍 Ubicación: ${location}
👤 Contacto: ${userSession.full_name} (${userSession.phone || userSession.phone_number || 'N/A'})
📧 Correo: ${userSession.email}

📝 Reporte: ${description}

📷 EVIDENCIA VISUAL:
Sin archivos adjuntos (Módulo en desarrollo)`;

    // Mapeo de datos (Asegúrate de que estas columnas existan en Supabase)
    const newTicket = {
      codigo_servicio: folio,
      service_type: selectedType,
      location: location,
      description: description,
      detalle_problema: detalleEnriquecido, 
      priority: selectedType.toLowerCase().includes('emergencia') ? 'Urgente' : 'Normal',
      client_email: userSession.email, 
      full_name: userSession.full_name || 'No registrado', 
      phone_number: userSession.phone || userSession.phone_number || 'Sin teléfono', 
      company: userSession.company || 'No registrado',
      status: 'Sin asignar', // Cambiado de 'Sin confirmar' para consistencia con tu tabla
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('tickets')
      .insert([newTicket]);

    setIsLoading(false);

    if (error) {
      // LOG DETALLADO PARA DEPURAR
      console.error('Error detallado de Supabase:', error.message, error.details, error.hint);
      alert(`Error al crear el ticket: ${error.message}`);
    } else {
      setIsSent(true);
    }
  };

  if (isSent) {
    return (
      <div className="text-center space-y-6 py-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
          <Clock className="text-blue-400" size={40} />
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight">Solicitud en Revisión</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Tu folio es <span className="text-blue-400 font-mono font-bold">{generatedFolio}</span>. 
          Se ha asociado la confirmación a <span className="text-white">{userSession.email}</span>.
        </p>
        
        <Link 
            href="/dashboard?role=client" 
            className="inline-block bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest mt-4 transition-all"
        >
          VOLVER AL PANEL
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* SECCIÓN REFORZADA: Identidad del Solicitante */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex gap-4 items-start">
        <Info className="text-blue-400 shrink-0 mt-1" size={24} />
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Identidad del Solicitante</h4>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <p className="text-slate-300">👤 Usuario: <span className="text-white font-bold">{userSession?.full_name || 'Cargando...'}</span></p>
            <p className="text-slate-300">📧 Correo: <span className="text-white font-bold">{userSession?.email || 'N/A'}</span></p>
            <p className="text-slate-300">📱 Teléfono: <span className="text-white font-bold">{userSession?.phone || userSession?.phone_number || 'No registrado'}</span></p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tipo de Servicio Requerido <span className="text-red-500">*</span></label>
        <div className="space-y-2">
          {serviceTypes.map((type, index) => (
            <label key={index} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedType === type ? 'bg-purple-500/10 border-purple-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
              <div className="mt-0.5 relative flex items-center justify-center">
                <input 
                  type="radio" 
                  name="serviceType" 
                  value={type} 
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="peer sr-only" 
                />
                <div className={`w-4 h-4 rounded-full border ${selectedType === type ? 'border-purple-500 bg-purple-500' : 'border-slate-600'}`}></div>
              </div>
              <span className="text-sm font-medium">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ubicación Exacta <span className="text-red-500">*</span></label>
        <div className="relative group">
          <MapPin className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
          <input name="location" type="text" placeholder="Ej. Sucursal Norte - Piso 2 - Sala Juntas" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-purple-500 outline-none transition-all" required />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Detalle Técnico <span className="text-red-500">*</span></label>
        <div className="relative group">
          <FileText className="absolute left-4 top-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
          <textarea name="description" rows={5} placeholder="Describe qué falla, dónde y desde cuándo..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-purple-500 outline-none transition-all resize-none" required />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Evidencia Visual</label>
        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-800/50 hover:border-purple-500/50 transition-all cursor-pointer group">
          <Upload className="text-slate-400 group-hover:text-purple-400 mx-auto mb-2" size={24} />
          <p className="text-xs text-slate-400">Clic para subir fotos o video (Próximamente)</p>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN: Enviar y Cancelar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          type="button" 
          onClick={() => router.push('/dashboard?role=client')}
          className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-4 rounded-xl border border-white/5 transition-all active:scale-[0.98]"
        >
          CANCELAR
        </button>
        <button 
          type="submit" 
          disabled={isLoading} 
          className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-[0.98]"
        >
          {isLoading ? <><Loader2 size={20} className="animate-spin" /> Procesando Ticket...</> : <>ENVIAR REPORTE <ArrowRight size={20} /></>}
        </button>
      </div>

    </form>
  );
}