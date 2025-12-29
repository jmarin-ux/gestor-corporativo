'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Clock, CheckCircle, MapPin, Search, 
  ArrowRight, AlertCircle, Star, MessageSquare, 
  ThumbsUp, ThumbsDown, Loader2, MessageCircle, UserCheck, Shield
} from 'lucide-react';
import Link from 'next/link';

const theme = {
  navy: 'bg-[#0a1e3f]',
  navyText: 'text-[#0a1e3f]',
  lightBg: 'bg-slate-100',
  white: 'bg-white',
};

export default function ClientView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userSession = localStorage.getItem('kiosco_user');
    if (userSession) {
      const user = JSON.parse(userSession);
      setCurrentUser(user);
      fetchMyData(user.email);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchMyData = async (email: string) => {
    // Consulta enriquecida: Traemos el ticket y los datos del coordinador asignado
    const { data } = await supabase
      .from('tickets')
      .select(`
        *,
        coordinator_data:profiles!tickets_assigned_to_fkey (
          full_name,
          phone_number,
          email
        )
      `)
      .eq('client_email', email)
      .order('created_at', { ascending: false });

    if (data) setMyTickets(data);
    setIsLoading(false);
  };

  const getPublicStatus = (internalStatus: string) => {
    const pendiente = ['Sin asignar', 'QA', 'Sin confirmar'];
    const enProceso = ['Asignado', 'Pendiente', 'En proceso'];
    const finalizado = ['Ejecutado', 'Realizado', 'Revision control Interno', 'Cerrado'];

    if (pendiente.includes(internalStatus)) return { label: 'PENDIENTE', color: 'bg-orange-50 text-orange-600', icon: Clock };
    if (enProceso.includes(internalStatus)) return { label: 'EN PROCESO', color: 'bg-blue-50 text-blue-600', icon: Clock };
    if (finalizado.includes(internalStatus)) return { label: 'FINALIZADO', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle };
    return { label: 'PENDIENTE', color: 'bg-slate-50 text-slate-600', icon: Clock };
  };

  const submitEvaluation = async (ticketId: number, wasPerformed: boolean) => {
    setIsSubmitting(true);
    
    // Si NO se realizó -> QA. Si SÍ se realizó -> Realizado.
    const nextStatus = wasPerformed ? 'Realizado' : 'QA';
    
    const { error } = await supabase
      .from('tickets')
      .update({ 
        status: nextStatus,
        auditoria_cliente: wasPerformed ? 'Validado' : 'Rechazado por Cliente',
        satisfaction_rating: wasPerformed ? rating : null,
        feedback_cliente: feedback,
        evaluacion_privada: true 
      })
      .eq('id', ticketId);

    if (!error) {
      setEvaluatingId(null);
      setRating(0);
      setFeedback("");
      fetchMyData(currentUser.email);
    }
    setIsSubmitting(false);
  };

  return (
    <div className={`min-h-screen ${theme.lightBg} p-6 md:p-10 font-sans text-slate-800 space-y-8 pb-24`}>
      
      {/* 1. HEADER PROFESIONAL REFORZADO */}
      <div className={`${theme.navy} p-8 md:p-12 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden`}>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">
            Hola, {currentUser ? currentUser.full_name.split(' ')[0] : 'Bienvenido'}.
          </h2>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-widest">
            <Shield size={14}/> Estatus de Operaciones: {myTickets.filter(t => t.status === 'Ejecutado').length} por confirmar
          </div>
        </div>

        <Link href="/solicitud" className="relative z-10 bg-white text-[#0a1e3f] hover:bg-blue-50 font-black px-8 py-4 rounded-full flex items-center gap-3 transition-all shadow-lg active:scale-95 group">
          <div className="bg-[#0a1e3f] text-white p-1 rounded-full"><Plus size={18} /></div>
          NUEVA SOLICITUD
        </Link>
      </div>

      {/* 2. LISTADO DE SERVICIOS OPTIMIZADO PARA TRATAMIENTO MASIVO */}
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between px-4">
             <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.navyText}`}>Monitor de Operaciones Masivas</h3>
             <span className="text-[10px] font-black text-slate-400 bg-white border px-4 py-1.5 rounded-full">{myTickets.length} REPORTES TOTALES</span>
        </div>
        
        {isLoading ? (
           <div className="text-center p-20 text-slate-400 font-black uppercase tracking-tighter animate-pulse">Sincronizando Base de Datos...</div>
        ) : (
          <div className="grid gap-6">
            {myTickets.map(ticket => {
              const publicStatus = getPublicStatus(ticket.status);
              const needsEvaluation = ticket.status === 'Ejecutado';
              const StatusIcon = publicStatus.icon;

              return (
                <div key={ticket.id} className={`bg-white rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${needsEvaluation ? 'border-blue-400 ring-4 ring-blue-500/5 shadow-xl' : 'border-slate-100 shadow-sm'}`}>
                  <div className="p-6 md:p-8 flex flex-col gap-8">
                    
                    {/* Fila 1: Datos del Servicio y Coordinador */}
                    <div className="flex flex-col lg:flex-row gap-8">
                      
                      {/* Izquierda: Info Técnica */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-4 rounded-2xl text-white shadow-lg ${publicStatus.color.replace('50', '600').replace('text', 'bg')}`}>
                            <StatusIcon size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                                {ticket.codigo_servicio || `#${ticket.id}`}
                              </span>
                              <span className="text-[10px] font-bold text-slate-300 uppercase">• {new Date(ticket.created_at).toLocaleDateString('es-MX')}</span>
                            </div>
                            <h4 className="font-black text-xl text-[#0a1e3f] leading-tight mb-2">{ticket.service_type}</h4>
                            <p className="text-slate-400 text-xs font-bold uppercase flex items-center gap-1">
                              <MapPin size={12} className="text-blue-500"/> {ticket.location}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Centro: Rostro Humano (Coordinador Asignado) */}
                      <div className="lg:w-80 bg-slate-50 rounded-[2rem] p-5 border border-slate-100 flex flex-col items-center justify-center text-center space-y-3">
                        {ticket.coordinator_data ? (
                          <>
                            <div className="w-12 h-12 rounded-full bg-[#0a1e3f] text-white flex items-center justify-center font-black text-lg border-4 border-white shadow-sm">
                              {ticket.coordinator_data.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Atención Directa</p>
                              <p className="text-sm font-black text-[#0a1e3f] uppercase">{ticket.coordinator_data.full_name}</p>
                            </div>
                            <a 
                                href={`https://wa.me/${ticket.coordinator_data.phone_number}`}
                                target="_blank"
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-100"
                            >
                                <MessageCircle size={14} /> WhatsApp
                            </a>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-30">
                            <UserCheck size={24} className="text-slate-400" />
                            <p className="text-[9px] font-black uppercase">Esperando Asignación de Gestor</p>
                          </div>
                        )}
                      </div>

                      {/* Derecha: Estatus Público */}
                      <div className="flex flex-col justify-center items-center lg:items-end gap-3 min-w-[140px]">
                        <span className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border ${publicStatus.color}`}>
                          {publicStatus.label}
                        </span>
                        <button className="text-slate-300 hover:text-blue-600 text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                          Ver Detalles <ArrowRight size={14}/>
                        </button>
                      </div>
                    </div>

                    {/* Fila 2: Módulo de Auditoría y Evaluación (Solo si está Ejecutado) */}
                    {needsEvaluation && (
                      <div className="bg-blue-50/50 rounded-3xl p-6 md:p-8 border border-blue-100 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="space-y-1 text-center md:text-left">
                            <p className="text-[#0a1e3f] font-black text-base uppercase tracking-tight">Confirmación de Cumplimiento</p>
                            <p className="text-slate-500 text-[10px] font-bold uppercase italic">¿El servicio fue realizado satisfactoriamente en su ubicación?</p>
                          </div>
                          
                          <div className="flex gap-3 w-full md:w-auto">
                            <button 
                              onClick={() => setEvaluatingId(ticket.id)}
                              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all"
                            >
                              <ThumbsUp size={16} /> SÍ, SE REALIZÓ
                            </button>
                            <button 
                              onClick={() => {
                                const m = prompt("Por favor, detalla los motivos por los cuales no se realizó:");
                                if(m) { setFeedback(m); submitEvaluation(ticket.id, false); }
                              }}
                              className="flex-1 md:flex-none bg-rose-100 hover:bg-rose-200 text-rose-600 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                              <ThumbsDown size={16} /> NO SE REALIZÓ
                            </button>
                          </div>
                        </div>

                        {/* Modal de Calificación de Estrellas */}
                        {evaluatingId === ticket.id && (
                          <div className="mt-8 pt-8 border-t border-blue-200 space-y-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="space-y-2">
                              <h5 className="font-black text-[#0a1e3f] uppercase text-xs tracking-[0.2em]">Evaluación de Calidad</h5>
                              <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star 
                                    key={s} 
                                    size={36} 
                                    className={`cursor-pointer transition-all hover:scale-125 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                    onClick={() => setRating(s)}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            <textarea 
                              placeholder="Comentarios adicionales sobre el personal o el servicio (Opcional)..."
                              className="w-full bg-white border border-slate-200 rounded-[1.5rem] p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                              rows={3}
                              onChange={(e) => setFeedback(e.target.value)}
                            />

                            <div className="flex flex-col items-center gap-4">
                              <button 
                                onClick={() => submitEvaluation(ticket.id, true)}
                                disabled={rating === 0 || isSubmitting}
                                className="bg-[#0a1e3f] hover:bg-slate-800 text-white px-12 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 transition-all"
                              >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "FINALIZAR AUDITORÍA"}
                              </button>
                              
                              <div className="flex items-center gap-2 bg-blue-100 px-5 py-2 rounded-full">
                                <AlertCircle size={14} className="text-blue-700" />
                                <span className="text-[9px] font-bold text-blue-700 uppercase tracking-tighter">
                                  Evaluación Privada: Solo el Administrador verá este reporte.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}