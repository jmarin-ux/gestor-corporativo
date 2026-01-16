'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import {
  Plus, CheckCircle, MapPin,
  Star, Loader2,
  Search, X, Calendar,
  Eye, Info, LogOut, Clock, ShieldCheck, UserCog
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ClientDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs / filtros
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detalles y evaluación
  const [viewingDetails, setViewingDetails] = useState<any>(null);
  const [evaluatingTicket, setEvaluatingTicket] = useState<any>(null);
  const [isProblemSolved, setIsProblemSolved] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. AUTENTICACIÓN Y CARGA DE USUARIO ---
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Buscar perfil de CLIENTE
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!clientData) {
        router.push('/login'); 
        return;
      }

      setCurrentUser(clientData);
      
      // Solo cargamos tickets si YA tiene coordinador asignado
      if (clientData.coordinator_id) {
          await fetchMyData(clientData.email);
      }
      
      setIsLoading(false);
    };

    checkSession();
  }, [router]);

  // --- 2. CARGA DE TICKETS ---
  const fetchMyData = useCallback(async (email: string) => {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return;

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('client_email', normalized)
      .order('created_at', { ascending: false });

    if (error) console.warn('Error tickets:', error.message);
    setMyTickets(data || []);
  }, []);

  // --- 3. LOGOUT ---
  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/login');
  };

  // --- 4. FILTROS ---
  const filteredTickets = useMemo(() => {
    return myTickets.filter((t) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        (t.codigo_servicio || '').toLowerCase().includes(s) ||
        (t.service_type || '').toLowerCase().includes(s) ||
        (t.location || '').toLowerCase().includes(s);

      const isHistory = 
        ['cerrado', 'cancelado', 'revision_interna'].includes((t.status || '').toLowerCase()) || 
        t.evaluacion_privada === true;

      const matchesTab = activeTab === 'activos' ? !isHistory : isHistory;
      return matchesSearch && matchesTab;
    });
  }, [myTickets, searchTerm, activeTab]);

  const getPublicStatus = (internalStatus: string) => {
    const s = (internalStatus || '').toLowerCase();
    if (['pendiente', 'sin asignar'].includes(s)) return { label: 'EN ESPERA', color: 'bg-amber-100 text-amber-700' };
    if (['in_progress', 'asignado', 'en proceso'].includes(s)) return { label: 'EN PROCESO', color: 'bg-blue-100 text-blue-700' };
    if (['ejecutado', 'realizado'].includes(s)) return { label: 'POR EVALUAR', color: 'bg-purple-100 text-purple-700' };
    if (['cerrado', 'revision_interna'].includes(s)) return { label: 'FINALIZADO', color: 'bg-emerald-100 text-emerald-700' };
    return { label: s.toUpperCase(), color: 'bg-slate-100 text-slate-600' };
  };

  const submitEvaluation = async () => {
    if (!evaluatingTicket) return;
    setIsSubmitting(true);
    const nextStatus = isProblemSolved ? 'revision_interna' : 'qa'; 
    const { error } = await supabase.from('tickets').update({
        status: nextStatus,
        auditoria_cliente: isProblemSolved ? 'Solución Confirmada' : 'No resuelto',
        satisfaction_rating: isProblemSolved ? rating : 0,
        feedback_cliente: feedback,
        evaluacion_privada: true,
      }).eq('id', evaluatingTicket.id);

    if (!error) {
      setEvaluatingTicket(null);
      setIsProblemSolved(null);
      setRating(0);
      setFeedback('');
      if (currentUser?.email) await fetchMyData(currentUser.email);
      alert("✅ ¡Gracias por tu evaluación!");
    } else {
      alert("Error al enviar evaluación");
    }
    setIsSubmitting(false);
  };

  // 🌀 PANTALLA DE CARGA
  if (isLoading) {
      return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-900" size={40}/></div>;
  }

  // 🔒🔒🔒 PANTALLA DE BLOQUEO: "EN ESPERA DE COORDINADOR" 🔒🔒🔒
  if (currentUser && !currentUser.coordinator_id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-0 w-full h-64 bg-[#0a1e3f] rounded-b-[3rem]"></div>
        
        <div className="relative z-10 w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-500 border border-slate-100">
          
          {/* Icono Principal */}
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner relative">
             <div className="absolute inset-0 border-4 border-amber-100 rounded-full animate-pulse"></div>
             <Clock size={40} className="text-amber-500"/>
          </div>

          <h1 className="text-2xl font-black text-[#0a1e3f] uppercase tracking-tight mb-2">
            Cuenta en Validación
          </h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-8">
            Bienvenido, {currentUser.organization || 'Cliente'}
          </p>

          <div className="bg-slate-50 rounded-3xl p-6 text-left space-y-4 border border-slate-100 mb-8">
            <div className="flex gap-4">
              <div className="bg-blue-100 p-2 rounded-xl h-fit text-blue-600"><ShieldCheck size={20}/></div>
              <div>
                <h3 className="font-black text-xs uppercase text-slate-700 mb-1">Registro Exitoso</h3>
                <p className="text-xs text-slate-500">Tus datos han sido recibidos correctamente en nuestro sistema central.</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-slate-200"></div>

            <div className="flex gap-4">
              <div className="bg-amber-100 p-2 rounded-xl h-fit text-amber-600"><UserCog size={20}/></div>
              <div>
                <h3 className="font-black text-xs uppercase text-slate-700 mb-1">Asignación Pendiente</h3>
                <p className="text-xs text-slate-500">
                  Estamos asignándote un <b className="text-slate-700">Coordinador Especializado</b>. En cuanto se active, podrás enviar solicitudes y ver tus servicios aquí.
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-[#0a1e3f] hover:bg-[#152c55] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut size={16}/> Cerrar Sesión
          </button>

          <p className="mt-6 text-[10px] text-slate-300 font-medium">
            Si esto demora demasiado, contacta a soporte.
          </p>
        </div>
      </div>
    );
  }

  // ✅✅✅ PANTALLA NORMAL (DASHBOARD) ✅✅✅
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 space-y-6 pb-24 text-left animate-in fade-in duration-500">
      
      {/* HEADER */}
      <section className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="bg-gradient-to-r from-[#0a1e3f] to-[#1a3a6d] p-8 md:p-12 rounded-[2.5rem] shadow-xl w-full text-white relative overflow-hidden flex justify-between items-center">
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              Hola, {currentUser?.organization?.split(' ')[0] || 'Cliente'} 👋
            </h1>
            <p className="text-blue-100 text-sm font-medium opacity-90">
              Portal de Servicios Corporativos
            </p>
          </div>
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all z-20">
              <LogOut size={20}/>
          </button>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        </div>
      </section>

      {/* CONTROLES PRINCIPALES */}
      <section className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        
        {/* TABS */}
        <div className="flex bg-slate-50 p-1.5 rounded-2xl w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('activos')}
            className={`flex-1 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'activos' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Servicios Activos
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'historial' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Historial
          </button>
        </div>

        {/* BUSCADOR Y NUEVO */}
        <div className="flex w-full lg:w-auto gap-4">
            <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Buscar por folio, tipo o lugar..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-12 pr-4 text-xs font-bold outline-none uppercase"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Link
                href="/solicitud"
                className="bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] font-black px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-lg active:scale-95 text-[10px] tracking-widest uppercase whitespace-nowrap"
            >
                <Plus size={16} strokeWidth={3} /> Nuevo
            </Link>
        </div>
      </section>

      {/* TABLA DE RESULTADOS */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest">Folio</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest">Detalle del Servicio</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Estatus</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filteredTickets.length === 0 ? (
                  <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase italic">No se encontraron servicios en esta sección.</td></tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const statusInfo = getPublicStatus(ticket.status);
                    const canEvaluate = ['ejecutado', 'realizado'].includes((ticket.status || '').toLowerCase()) && !ticket.evaluacion_privada;

                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6 align-top">
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">{ticket.codigo_servicio}</span>
                          <p className="text-[9px] text-slate-400 mt-2 font-bold">{new Date(ticket.created_at).toLocaleDateString()}</p>
                        </td>

                        <td className="p-6 align-top">
                          <p className="text-xs font-black text-[#0a1e3f] uppercase mb-1">{ticket.service_type}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 uppercase">
                            <MapPin size={10} className="text-slate-400"/> {ticket.location || 'Ubicación no especificada'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic">"{ticket.description}"</p>
                        </td>

                        <td className="p-6 text-center align-top">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-block ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>

                        <td className="p-6 text-center align-top">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => setViewingDetails(ticket)} className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-[#0a1e3f] hover:text-white transition-all tooltip">
                              <Eye size={16} />
                            </button>
                            {canEvaluate && (
                                <button onClick={() => setEvaluatingTicket(ticket)} className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all animate-pulse">
                                    <Star size={16} />
                                </button>
                            )}
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

      {/* MODALES DETALLE Y EVALUACIÓN (Mismo código que antes) */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-[#0a1e3f]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-[#0a1e3f] uppercase tracking-tight flex items-center gap-2">
                  <Info className="text-blue-600" size={20}/> Detalle del Servicio
                </h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Folio: {viewingDetails.codigo_servicio}</p>
              </div>
              <button onClick={() => setViewingDetails(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Solicitud Original</p>
                      <p className="text-sm font-medium text-slate-700">"{viewingDetails.description}"</p>
                  </div>
              </div>
              {viewingDetails.technical_result && (
                  <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <CheckCircle size={14}/> Reporte Técnico Final
                      </p>
                      <p className="text-sm font-medium text-emerald-800 mb-2">{viewingDetails.technical_result}</p>
                      <p className="text-xs text-emerald-600">{viewingDetails.service_done_comment}</p>
                  </div>
              )}
              {viewingDetails.evidencia_url && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Evidencia Fotográfica</span>
                  <div className="rounded-3xl overflow-hidden border-4 border-slate-100 shadow-sm">
                    <img src={viewingDetails.evidencia_url} alt="Evidencia" className="w-full h-64 object-cover" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex justify-end">
              <button onClick={() => setViewingDetails(null)} className="bg-[#0a1e3f] text-white px-10 py-3 rounded-full font-black text-[10px] uppercase shadow-lg hover:bg-slate-800 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {evaluatingTicket && (
        <div className="fixed inset-0 bg-[#0a1e3f]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 relative animate-in zoom-in-95 duration-300 shadow-2xl">
            <button onClick={() => setEvaluatingTicket(null)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-500 transition-colors">
              <X />
            </button>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Star size={32} className="fill-purple-600"/>
              </div>
              <h3 className="text-2xl font-black uppercase text-[#0a1e3f] tracking-tight">Tu Opinión Importa</h3>
              <p className="text-sm text-slate-500 font-medium">Ayúdanos a mejorar evaluando el servicio del folio <span className="font-black text-purple-600">{evaluatingTicket.codigo_servicio}</span></p>
            </div>
            <div className="mt-8 space-y-6">
              <div className="bg-slate-50 p-1.5 rounded-2xl flex">
                <button onClick={() => setIsProblemSolved(true)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isProblemSolved === true ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}>Sí, Resuelto</button>
                <button onClick={() => setIsProblemSolved(false)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isProblemSolved === false ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}>No Resuelto</button>
              </div>
              {isProblemSolved && (
                <div className="flex justify-center gap-3 py-4 animate-in fade-in slide-in-from-bottom-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} onClick={() => setRating(s)} className={`w-10 h-10 cursor-pointer transition-all hover:scale-110 ${s <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-200 fill-slate-50'}`} />
                  ))}
                </div>
              )}
              {isProblemSolved !== null && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-xs font-medium outline-none focus:border-purple-200 h-24 resize-none transition-all" placeholder={isProblemSolved ? "¿Qué te pareció la atención del técnico?" : "Por favor cuéntanos qué faltó para resolverlo..."} />
                    <button onClick={submitEvaluation} disabled={isSubmitting || (isProblemSolved && rating === 0)} className="w-full bg-[#0a1e3f] hover:bg-purple-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all">{isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Enviar Evaluación'}</button>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}