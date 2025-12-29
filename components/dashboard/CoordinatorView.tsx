'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Zap, AlertCircle, ChevronDown, 
  BarChart3, Clock, PlayCircle, CheckSquare, 
  FileCheck, Shield, CheckCircle2, Ban, MapPin, Users,
  Phone, Mail, User, Loader2, HardHat, Calendar, Filter,
  Search, Trash2, Check, ArrowUpRight, X, History, MessageSquare, Send, FileText
} from 'lucide-react';

const deepNavy = 'bg-[#0a1e3f]';
const deepNavyText = 'text-[#0a1e3f]';

export default function CoordinatorView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [operatives, setOperatives] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  
  // ESTADOS PARA EL PANEL DE AUDITORÍA
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isLogPosting, setIsLogPosting] = useState(false);

  // Filtros iniciales (Diciembre 2025)
  const [selectedMonth, setSelectedMonth] = useState<string>("12");
  const [selectedYear, setSelectedYear] = useState<string>("2025");

  const statusOptions = ["Sin asignar", "Asignado", "Pendiente", "En proceso", "Ejecutado", "Realizado", "Revision control Interno", "Cerrado", "Cancelado", "QA"];

  const statusStyles: any = {
      "Sin asignar": 'bg-red-50 text-red-700 border-red-100',
      "Asignado":    'bg-blue-50 text-blue-700 border-blue-100',
      "Pendiente":   'bg-orange-50 text-orange-700 border-orange-100',
      "En proceso":  'bg-amber-50 text-amber-700 border-amber-100',
      "Ejecutado":   'bg-indigo-50 text-indigo-700 border-indigo-100',
      "Realizado":   'bg-emerald-50 text-emerald-700 border-emerald-100',
      "Revision control Interno": 'bg-purple-50 text-purple-700 border-purple-100',
      "Cerrado":     'bg-slate-100 text-slate-700 border-slate-200',
      "Cancelado":   'bg-rose-50 text-rose-700 border-rose-100',
      "QA":          'bg-cyan-50 text-cyan-700 border-cyan-100',
  };

  const fetchData = async () => {
    const { data: ticketsData } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (ticketsData) setTickets(ticketsData);

    const { data: staffData } = await supabase.from('profiles').select('full_name, role').eq('role', 'operativo');
    if (staffData) setOperatives(staffData);
  };

  useEffect(() => { fetchData(); }, []);

  // --- FUNCIÓN CRÍTICA: REGISTRO DE HISTORIAL (LOGS) ---
  const addLogEntry = async (ticketId: number, entry: any) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const currentLogs = Array.isArray(ticket.logs) ? ticket.logs : [];
    const updatedLogs = [...currentLogs, { ...entry, date: new Date().toISOString() }];
    
    await supabase.from('tickets').update({ logs: updatedLogs }).eq('id', ticketId);
    fetchData();
    if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...ticket, logs: updatedLogs });
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const oldStatus = tickets.find(t => t.id === id)?.status;
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    if (!error) {
        addLogEntry(id, { type: 'status', from: oldStatus, to: newStatus, user: 'Coordinador' });
    }
  };

  const handleAssignOperative = async (id: number, operativeName: string) => {
    const { error } = await supabase.from('tickets').update({ assigned_to: operativeName }).eq('id', id);
    if (!error) {
        addLogEntry(id, { type: 'assignment', to: operativeName, user: 'Coordinador' });
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setIsLogPosting(true);
    await addLogEntry(selectedTicket.id, { type: 'comment', text: newComment, user: 'Administrador' });
    setNewComment("");
    setIsLogPosting(false);
  };

  const handleBulkAccept = async () => {
    if (selectedTickets.length === 0) return;
    await supabase.from('tickets').update({ status: 'Asignado' }).in('id', selectedTickets);
    setSelectedTickets([]);
    fetchData();
  };

  const toggleSelectTicket = (id: number) => {
    setSelectedTickets(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const filteredTickets = tickets.filter(t => {
    const ticketDate = new Date(t.created_at);
    const matchesSearch = (t.codigo_servicio?.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchesMonth = selectedMonth === 'todos' || (ticketDate.getMonth() + 1).toString() === selectedMonth;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800 space-y-8 animate-in fade-in pb-24 relative">
      
      {/* 1. KPIs PROFESIONALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3 overflow-x-auto pb-4 custom-scrollbar">
          <KpiCard label="Total" count={tickets.length} id="todos" icon={BarChart3} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
          <KpiCard label="Nuevos" count={tickets.filter(t=>t.status==='Sin asignar').length} id="Sin asignar" icon={AlertCircle} activeColor="bg-red-600" filterStatus={filterStatus} setFilterStatus={setFilterStatus}/>
          <KpiCard label="En QA" count={tickets.filter(t=>t.status==='QA').length} id="QA" icon={Shield} activeColor="bg-cyan-600" filterStatus={filterStatus} setFilterStatus={setFilterStatus}/>
      </div>

      {/* 2. HERRAMIENTAS DE GESTIÓN MASIVA Y BUSQUEDA */}
      <section className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por Folio o Solicitante..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-12 pr-4 text-sm focus:bg-white outline-none transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {selectedTickets.length > 0 && (
                <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                    <button onClick={handleBulkAccept} className="bg-emerald-600 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-700 shadow-lg transition-all">
                        <Check size={14} /> Validar {selectedTickets.length} Seleccionados
                    </button>
                    <button onClick={() => setSelectedTickets([])} className="text-slate-400 hover:text-slate-600 p-2"><Trash2 size={16}/></button>
                </div>
            )}
        </div>

        <div className="flex gap-2">
            <select className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-[10px] font-black uppercase" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)}>
                <option value="todos">Mes (Todo)</option>
                <option value="12">Diciembre</option>
            </select>
        </div>
      </section>

      {/* 3. MESA DE VALIDACIÓN (LISTA PRINCIPAL) */}
      <section className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 bg-white border border-slate-200">
        <div className={`${deepNavy} p-6 flex items-center justify-between text-white`}>
            <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-2xl"><Shield size={22}/></div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Centro de Control Operativo</h2>
                    <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Diciembre 2025</p>
                </div>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th className="px-6 py-4 w-10">
                            <input type="checkbox" className="rounded border-slate-300" onChange={(e) => e.target.checked ? setSelectedTickets(filteredTickets.map(t => t.id)) : setSelectedTickets([])}/>
                        </th>
                        <th className="px-6 py-4">Folio / Servicio</th>
                        <th className="px-6 py-4">Identidad / Ubicación</th>
                        <th className="px-6 py-4">Estatus</th>
                        <th className="px-6 py-4">Asignación</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredTickets.map(ticket => (
                        <tr key={ticket.id} className={`transition-all ${selectedTickets.includes(ticket.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                            <td className="px-6 py-4">
                                <input type="checkbox" checked={selectedTickets.includes(ticket.id)} onChange={() => toggleSelectTicket(ticket.id)} className="rounded border-slate-300 text-blue-600" />
                            </td>
                            <td className="px-6 py-6">
                                <div className="space-y-1">
                                    <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-slate-200">
                                        {ticket.codigo_servicio || `#${ticket.id}`}
                                    </span>
                                    <h4 className={`font-black text-sm block leading-tight ${deepNavyText}`}>{ticket.service_type}</h4>
                                </div>
                            </td>
                            <td className="px-6 py-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                                        <User size={12} className="text-slate-400"/> {ticket.full_name || 'Particular'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                        <MapPin size={10} className="text-blue-500"/> {ticket.location}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-6">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusStyles[ticket.status]}`}>
                                    {ticket.status}
                                </span>
                            </td>
                            <td className="px-6 py-6">
                                <div className="relative group/select">
                                    <HardHat size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <select 
                                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-full py-2 pl-10 pr-8 focus:bg-white outline-none"
                                      value={ticket.assigned_to || ""}
                                      onChange={(e) => handleAssignOperative(ticket.id, e.target.value)}
                                    >
                                        <option value="">No Asignado</option>
                                        {operatives.map((op, idx) => <option key={idx} value={op.full_name}>{op.full_name}</option>)}
                                    </select>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <select 
                                        className="bg-white border border-slate-200 text-[9px] font-black uppercase rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20"
                                        value={ticket.status}
                                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                    >
                                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <button 
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <ArrowUpRight size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>

      {/* 4. PANEL LATERAL DE AUDITORÍA (SIDE PANEL) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}></div>
            
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                {/* Header del Panel */}
                <div className={`${deepNavy} p-8 text-white flex justify-between items-start`}>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black bg-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest text-blue-200 border border-white/10">
                            EXPEDIENTE TÉCNICO: {selectedTicket.codigo_servicio}
                        </span>
                        <h2 className="text-2xl font-black leading-tight mt-2">{selectedTicket.service_type}</h2>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                </div>

                {/* Cuerpo del Panel */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    
                    {/* Detalles */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter text-left">Solicitante</p>
                            <p className="text-sm font-black text-slate-800 uppercase">{selectedTicket.full_name}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter text-left">Ubicación</p>
                            <p className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><MapPin size={14} className="text-blue-500"/> {selectedTicket.location}</p>
                        </div>
                    </div>

                    {/* Descripción Original */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14}/> Reporte Inicial del Cliente
                        </p>
                        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-3xl text-sm font-medium text-slate-700 leading-relaxed italic">
                            "{selectedTicket.description}"
                        </div>
                    </div>

                    {/* HISTORIAL Y COMENTARIOS */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-[#0a1e3f] uppercase tracking-widest flex items-center gap-2">
                            <History size={16} /> Bitácora de Movimientos
                        </p>
                        
                        <div className="space-y-4 border-l-2 border-slate-100 ml-2 pl-6 py-2">
                            {Array.isArray(selectedTicket.logs) && selectedTicket.logs.length > 0 ? (
                                selectedTicket.logs.map((log: any, idx: number) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-blue-600 uppercase">{log.user}</span>
                                                <span className="text-[9px] font-bold text-slate-400">{new Date(log.date).toLocaleString()}</span>
                                            </div>
                                            {log.type === 'status' ? (
                                                <p className="text-xs font-medium text-slate-600">
                                                    Estatus actualizado de <span className="font-bold">{log.from}</span> a <span className="text-blue-600 font-bold">{log.to}</span>
                                                </p>
                                            ) : log.type === 'assignment' ? (
                                                <p className="text-xs font-medium text-slate-600">
                                                    Servicio asignado a: <span className="font-bold text-slate-800">{log.to}</span>
                                                </p>
                                            ) : (
                                                <p className="text-xs font-medium text-slate-700 italic flex gap-2">
                                                    <MessageSquare size={12} className="text-slate-400 shrink-0"/> "{log.text}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 font-bold uppercase italic">Sin actividad registrada aún.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer del Panel (Input Comentarios) */}
                <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center gap-3 bg-white p-2 rounded-full border border-slate-200 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <input 
                            type="text" 
                            placeholder="Añadir nota técnica a la bitácora..." 
                            className="flex-1 bg-transparent border-none text-xs font-medium px-4 outline-none"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                        />
                        <button 
                            onClick={handlePostComment}
                            disabled={isLogPosting || !newComment.trim()}
                            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all"
                        >
                            {isLogPosting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente KpiCard con soporte para filtrado
const KpiCard = ({ label, count, id, icon: Icon, activeColor, filterStatus, setFilterStatus }: any) => {
    const isActive = filterStatus === id;
    return (
        <button 
            onClick={() => setFilterStatus(id)}
            className={`flex-1 min-w-[120px] p-4 rounded-[2rem] text-left transition-all border ${isActive ? (activeColor || deepNavy) + ' text-white shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300'}`}
        >
            <div className="flex justify-between items-center mb-2">
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span className="text-xl font-black">{count}</span>
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{label}</p>
        </button>
    );
};