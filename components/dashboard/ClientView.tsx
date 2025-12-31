'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Clock, CheckCircle, MapPin, 
  Star, ThumbsUp, ThumbsDown, Loader2, 
  Shield, ClipboardList, Send, ShieldCheck, Search, X, Calendar,
  Eye, Image as ImageIcon, FileText, Info
} from 'lucide-react';
import Link from 'next/link';

export default function ClientView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Estado para ver Detalles (Falla y Evidencia)
  const [viewingDetails, setViewingDetails] = useState<any>(null);

  // Evaluación
  const [evaluatingTicket, setEvaluatingTicket] = useState<any>(null);
  const [isProblemSolved, setIsProblemSolved] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userSession = localStorage.getItem('kiosco_user');
    if (userSession) {
      const user = JSON.parse(userSession);
      setCurrentUser(user);
      fetchMyData(user.email?.trim().toLowerCase());
    }
  }, []);

  const fetchMyData = async (email: string) => {
    if (!email) return;
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .ilike('client_email', email)
      .order('created_at', { ascending: false });

    if (data) setMyTickets(data);
    setIsLoading(false);
  };

  const filteredTickets = useMemo(() => {
    return myTickets.filter(t => {
      const date = new Date(t.created_at);
      const matchesDate = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      const matchesSearch = t.codigo_servicio?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isHistoryStatus = ['Cerrado', 'Revision control Interno'].includes(t.status) || t.evaluacion_privada;
      const matchesTab = activeTab === 'activos' ? !isHistoryStatus : isHistoryStatus;

      return matchesDate && matchesSearch && matchesTab;
    });
  }, [myTickets, searchTerm, selectedMonth, selectedYear, activeTab]);

  const getPublicStatus = (internalStatus: string) => {
    const pendiente = ['Sin asignar', 'Sin confirmar'];
    const enProceso = ['Asignado', 'Pendiente', 'En proceso', 'Ejecutado', 'QA'];
    const finalizado = ['Realizado', 'Revision control Interno', 'Cerrado'];

    if (pendiente.includes(internalStatus)) return { label: 'ESPERA', color: 'bg-amber-100 text-amber-700' };
    if (enProceso.includes(internalStatus)) return { label: 'EN PROCESO', color: 'bg-blue-100 text-blue-700' };
    if (finalizado.includes(internalStatus)) return { label: 'TERMINADO', color: 'bg-emerald-100 text-emerald-700' };
    return { label: internalStatus?.toUpperCase(), color: 'bg-slate-100 text-slate-600' };
  };

  const submitEvaluation = async () => {
    if (!evaluatingTicket) return;
    setIsSubmitting(true);
    const nextStatus = isProblemSolved ? 'Revision control Interno' : 'QA';
    const { error } = await supabase.from('tickets').update({ 
      status: nextStatus,
      auditoria_cliente: isProblemSolved ? 'Solución Confirmada' : 'No resuelto por cliente',
      satisfaction_rating: isProblemSolved ? rating : 0,
      feedback_cliente: feedback,
      evaluacion_privada: true 
    }).eq('id', evaluatingTicket.id);

    if (!error) {
      setEvaluatingTicket(null);
      setIsProblemSolved(null);
      setRating(0);
      setFeedback("");
      fetchMyData(currentUser.email);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 space-y-6 pb-24 text-left">
      
      {/* 1. HEADER DINÁMICO Y AMIGABLE */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-[#0a1e3f] to-[#1a3a6d] p-8 md:p-12 rounded-[2.5rem] shadow-xl mb-8 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              ¡Hola, {currentUser?.full_name?.split(' ')[0] || 'Jonathan'}! 👋
            </h1>
            <p className="text-blue-100 text-lg font-medium opacity-90">
              Es un gusto ayudarte hoy. Tienes <span className="font-bold underline">{filteredTickets.length} registros</span> bajo los filtros seleccionados.
            </p>
          </div>
          {/* Decoración abstracta */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-9 pr-8 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-full py-2.5 px-4 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <Link href="/solicitud" className="bg-[#0a1e3f] text-white hover:scale-105 font-black px-8 py-3.5 rounded-full flex items-center gap-2 transition-all shadow-lg active:scale-95 text-[11px] tracking-widest uppercase">
            <Plus size={18} strokeWidth={3} /> Nuevo Servicio
          </Link>
        </div>
      </section>

      {/* 2. PESTAÑAS Y BUSCADOR */}
      <section className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('activos')}
            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activos' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Activos
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Historial
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input 
            type="text" 
            placeholder="Buscar folio o lugar..." 
            className="w-full bg-white border border-slate-200 rounded-full py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {/* 3. TABLA CON DETALLES */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Código</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Servicio</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ubicación</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Estatus</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Info / Evidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase animate-pulse">Cargando...</td></tr>
                ) : filteredTickets.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase italic">Sin registros</td></tr>
                ) : (
                  filteredTickets.map(ticket => {
                    const statusInfo = getPublicStatus(ticket.status);
                    const needsAudit = ticket.status === 'Realizado' && !ticket.evaluacion_privada;

                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6">
                          <span className="font-black text-[#0a1e3f] text-xs block">{ticket.codigo_servicio}</span>
                          {needsAudit && (
                            <button 
                              onClick={() => setEvaluatingTicket(ticket)}
                              className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded mt-1 font-black animate-pulse uppercase"
                            >
                              Evaluar Ahora
                            </button>
                          )}
                        </td>
                        <td className="p-6 text-xs font-bold text-slate-600">{ticket.service_type}</td>
                        <td className="p-6 text-xs text-slate-500 font-medium">{ticket.location || '---'}</td>
                        <td className="p-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => setViewingDetails(ticket)}
                              className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                              title="Ver descripción y fotos"
                            >
                              <Eye size={14} /> Detalles
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. MODAL DE DETALLES (DESCRIPCIÓN Y EVIDENCIA) */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-[#0a1e3f]/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-[#0a1e3f] uppercase tracking-tight flex items-center gap-2">
                  <Info className="text-blue-600" /> Detalles del Servicio
                </h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Folio: {viewingDetails.codigo_servicio}</p>
              </div>
              <button onClick={() => setViewingDetails(null)} className="p-3 bg-white shadow-sm rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              {/* Descripción de la Falla */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={14}/> Descripción de la Falla
                </h4>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-slate-700 text-sm leading-relaxed font-medium italic">
                    {viewingDetails.description || viewingDetails.falla_comentada || "No se proporcionó una descripción detallada."}
                  </p>
                </div>
              </div>

              {/* Evidencia Fotográfica */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ImageIcon size={14}/> Evidencia Multimedia
                </h4>
                
                {viewingDetails.evidencia_url || viewingDetails.photo_url ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Aquí mapeamos la URL de la imagen. Ajusta el nombre del campo según tu base de datos */}
                    <div className="group relative rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-sm">
                      <img 
                        src={viewingDetails.evidencia_url || viewingDetails.photo_url} 
                        alt="Evidencia" 
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <a href={viewingDetails.evidencia_url || viewingDetails.photo_url} target="_blank" className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Ver Pantalla Completa</a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-10 rounded-[2rem] text-center">
                    <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-slate-400 text-xs font-bold uppercase">Sin evidencia adjunta</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setViewingDetails(null)} className="bg-[#0a1e3f] text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* MANTENEMOS TU MODAL DE EVALUACIÓN ORIGINAL ABAJO */}
      {evaluatingTicket && (
        /* ... (Tu código de evaluación actual sin cambios) ... */
        <div className="fixed inset-0 bg-[#0a1e3f]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             {/* Tu lógica de evaluación existente se mantiene aquí */}
             <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 relative">
                <button onClick={() => setEvaluatingTicket(null)} className="absolute right-6 top-6 p-2 text-slate-400"><X/></button>
                <h3 className="text-xl font-black mb-4 uppercase text-[#0a1e3f]">Evaluar {evaluatingTicket.codigo_servicio}</h3>
                {/* ... resto del contenido de evaluación ... */}
                <p className="text-sm text-slate-500 mb-6 font-medium">¿Se resolvió el problema?</p>
                <div className="flex gap-4">
                    <button onClick={() => setIsProblemSolved(true)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all">Sí</button>
                    <button onClick={() => setIsProblemSolved(false)} className="flex-1 bg-slate-200 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-all">No</button>
                </div>
                {isProblemSolved !== null && (
                    <div className="mt-6 space-y-4 animate-in fade-in">
                         {isProblemSolved && (
                            <div className="flex justify-center gap-2 mb-4">
                                {[1,2,3,4,5].map(s => <Star key={s} onClick={() => setRating(s)} className={`cursor-pointer ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                            </div>
                         )}
                         <textarea onChange={(e) => setFeedback(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-4 text-sm outline-none" placeholder="Comentarios adicionales..."></textarea>
                         <button onClick={submitEvaluation} disabled={isSubmitting} className="w-full bg-[#0a1e3f] text-white py-4 rounded-full font-black uppercase text-xs tracking-[0.2em]">
                             {isSubmitting ? 'Enviando...' : 'Finalizar Evaluación'}
                         </button>
                    </div>
                )}
             </div>
        </div>
      )}
    </div>
  );
}