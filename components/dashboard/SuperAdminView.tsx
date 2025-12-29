'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Zap, AlertCircle, ChevronDown, 
  BarChart3, Clock, PlayCircle, CheckSquare, 
  FileCheck, Shield, CheckCircle2, Ban, MapPin, Users,
  User, Loader2, HardHat, Calendar, Search, 
  ArrowUpRight, X, History, MessageSquare, Star, TrendingUp
} from 'lucide-react';

const deepNavy = 'bg-[#0a1e3f]';
const deepNavyText = 'text-[#0a1e3f]';

export default function SuperAdminView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [operatives, setOperatives] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros de tiempo (Diciembre 2025)
  const [selectedMonth, setSelectedMonth] = useState<string>("12");

  const fetchData = async () => {
    setIsLoading(true);
    const { data: ticketsData } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (ticketsData) setTickets(ticketsData);

    const { data: staffData } = await supabase.from('profiles').select('full_name, role');
    if (staffData) setOperatives(staffData);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Lógica de cálculo de satisfacción (Solo para Super Admin)
  const ticketsEvaluados = tickets.filter(t => t.satisfaction_rating > 0);
  const avgRating = ticketsEvaluados.length > 0 
    ? (ticketsEvaluados.reduce((acc, t) => acc + t.satisfaction_rating, 0) / ticketsEvaluados.length).toFixed(1)
    : "N/A";

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = (t.codigo_servicio?.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMonth = selectedMonth === 'todos' || (new Date(t.created_at).getMonth() + 1).toString() === selectedMonth;
    return matchesSearch && matchesMonth;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800 space-y-8 pb-24">
      
      {/* 1. KPIs DE CONTROL TOTAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 overflow-x-auto pb-4">
          <KpiCard label="Total Ops" count={tickets.length} icon={BarChart3} />
          
          {/* KPI EXCLUSIVO: SATISFACCIÓN CLIENTE */}
          <div className="flex-1 min-w-[140px] p-4 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-200">
            <div className="flex justify-between items-center mb-2">
                <Star size={18} className="fill-white" />
                <span className="text-2xl font-black">{avgRating}</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-80 text-left">Rating Promedio</p>
          </div>

          <KpiCard label="S.Asignar" count={tickets.filter(t=>t.status==='Sin asignar').length} icon={AlertCircle} activeColor="bg-red-600" />
          <KpiCard label="En QA" count={tickets.filter(t=>t.status==='QA').length} icon={Shield} activeColor="bg-cyan-600" />
      </div>

      {/* 2. BARRA DE HERRAMIENTAS INTELIGENTE */}
      <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Auditar folio, cliente o servicio..." 
                className="w-full bg-slate-50 border-none rounded-full py-4 pl-14 pr-6 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <select className="bg-slate-100 border-none rounded-full px-6 py-4 text-[10px] font-black uppercase outline-none" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)}>
            <option value="todos">Historial Completo</option>
            <option value="12">Diciembre 2025</option>
        </select>
      </div>

      {/* 3. CENTRO DE CONTROL (TABLA) */}
      <section className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200 border border-slate-200">
        <div className={`${deepNavy} p-8 text-white flex items-center justify-between`}>
            <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-4 rounded-3xl border border-white/10"><TrendingUp size={24}/></div>
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Centro de Control Directivo</h2>
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mt-1">Supervisión Global de Operaciones</p>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th className="px-8 py-5 text-left">Folio / Fecha</th>
                        <th className="px-8 py-5">Servicio / Cliente</th>
                        <th className="px-8 py-5 text-center">Satisfacción</th>
                        <th className="px-8 py-5 text-center">Estado Oficial</th>
                        <th className="px-8 py-5 text-center">Auditar</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredTickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-blue-50/30 transition-all group">
                            <td className="px-8 py-6">
                                <div className="space-y-1">
                                    <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                        {ticket.codigo_servicio || `#${ticket.id}`}
                                    </span>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase pl-1">
                                        {new Date(ticket.created_at).toLocaleDateString('es-MX')}
                                    </p>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <h4 className="font-black text-sm text-[#0a1e3f] uppercase">{ticket.service_type}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{ticket.full_name || 'Particular'}</span>
                                </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                                {ticket.satisfaction_rating ? (
                                    <div className="flex justify-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} className={i < ticket.satisfaction_rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[9px] font-black text-slate-300 uppercase">Sin evaluar</span>
                                )}
                            </td>
                            <td className="px-8 py-6 text-center">
                                <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100 bg-white shadow-sm ${ticket.status === 'Cerrado' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    {ticket.status}
                                </span>
                            </td>
                            <td className="px-8 py-6 text-center">
                                <button 
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="bg-[#0a1e3f] text-white p-3 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-900/20"
                                >
                                    <ArrowUpRight size={20} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>

      {/* 4. SIDE PANEL DE AUDITORÍA PROFUNDA */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedTicket(null)}></div>
            
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                {/* Header del Expediente */}
                <div className={`${deepNavy} p-10 text-white flex justify-between items-start`}>
                    <div className="space-y-3">
                        <span className="text-[10px] font-black bg-blue-500/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-blue-200 border border-white/10">
                            Expediente de Auditoría: {selectedTicket.codigo_servicio}
                        </span>
                        <h2 className="text-3xl font-black leading-tight">{selectedTicket.service_type}</h2>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={28}/></button>
                </div>

                {/* Cuerpo del Expediente */}
                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                    
                    {/* RESULTADO DE EVALUACIÓN DEL CLIENTE */}
                    <div className="bg-amber-50 border border-amber-200 rounded-[2.5rem] p-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-amber-700 tracking-widest">Evaluación del Cliente</h3>
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} className={i < selectedTicket.satisfaction_rating ? "fill-amber-400 text-amber-400" : "text-amber-200"} />
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-6">
                            <p className="text-xs font-bold text-amber-900 italic leading-relaxed">
                                {selectedTicket.feedback_cliente ? `"${selectedTicket.feedback_cliente}"` : "El cliente no dejó comentarios adicionales."}
                            </p>
                        </div>
                    </div>

                    {/* BITÁCORA DE MOVIMIENTOS (LOGS) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-[#0a1e3f] font-black text-sm uppercase tracking-widest">
                            <History size={20} /> Historial de Cambios y Comentarios
                        </div>
                        
                        <div className="space-y-4 border-l-4 border-slate-100 ml-3 pl-8 py-2">
                            {Array.isArray(selectedTicket.logs) && selectedTicket.logs.length > 0 ? (
                                selectedTicket.logs.map((log: any, idx: number) => (
                                    <div key={idx} className="relative pb-6 last:pb-0">
                                        <div className="absolute -left-[38px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-blue-200 transition-all shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{log.user}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(log.date).toLocaleString()}</span>
                                            </div>
                                            {log.type === 'status' ? (
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                    Cambió de <span className="line-through opacity-50">{log.from}</span> a <span className="text-blue-700 font-black">{log.to}</span>
                                                </div>
                                            ) : (
                                                <div className="flex gap-3 items-start">
                                                    <MessageSquare size={14} className="text-slate-400 mt-0.5" />
                                                    <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{log.text}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 font-bold uppercase italic">Sin historial disponible para este folio.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente KPI Profesional
const KpiCard = ({ label, count, icon: Icon, activeColor }: any) => (
    <div className="flex-1 min-w-[120px] p-4 rounded-[2rem] bg-white border border-slate-100 text-left shadow-sm hover:shadow-lg transition-all group">
        <div className="flex justify-between items-center mb-2">
            <div className={`p-2 rounded-xl bg-slate-50 group-hover:${activeColor || 'bg-blue-600'} group-hover:text-white transition-colors`}>
                <Icon size={16} />
            </div>
            <span className="text-2xl font-black text-[#0a1e3f]">{count}</span>
        </div>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
    </div>
);