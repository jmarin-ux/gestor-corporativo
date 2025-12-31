'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
// Comenta la siguiente línea si no usas el modo espejo aún
import ClientMirrorView from './ClientMirrorView'; 
import { 
  Zap, Search, RefreshCw, XCircle, 
  User, Star, UserCog, HardHat, History, 
  MapPin, FileText, Phone, Mail, Image as ImageIcon, Send, MessageSquare, Filter, Calendar, Save // <--- AQUÍ FALTABA 'Save'
} from 'lucide-react';

const ALL_STATUSES = [
  "Sin asignar", "Asignado", "Pendiente", "En proceso", "Ejecutado", 
  "Realizado", "Revision control Interno", "Cerrado", "Cancelado", "QA"
];

// LISTA PERMITIDA PARA COORDINADOR (Todos menos Cerrado, Revision y Cancelado)
const COORDINATOR_ALLOWED_STATUSES = [
  "Sin asignar", "Asignado", "Pendiente", "En proceso", "Ejecutado", "Realizado", "QA"
];

const MONTHS = [
  { val: "01", label: "Enero" }, { val: "02", label: "Febrero" }, { val: "03", label: "Marzo" },
  { val: "04", label: "Abril" }, { val: "05", label: "May" }, { val: "06", label: "Junio" },
  { val: "07", label: "Julio" }, { val: "08", label: "Agosto" }, { val: "09", label: "Septiembre" },
  { val: "10", label: "Octubre" }, { val: "11", label: "Noviembre" }, { val: "12", label: "Diciembre" }
];

// Generamos años dinámicamente
const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

export default function CoordinatorView() {
  const [data, setData] = useState<{ tickets: any[], users: any[] }>({ tickets: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('coordinador');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Filtros Avanzados
  const [filters, setFilters] = useState({ 
      search: '', 
      month: 'todos', 
      year: new Date().getFullYear().toString() 
  });
  
  // Modales
  const [modals, setModals] = useState<{ details: any, sim: any }>({ details: null, sim: null });
  const [processing, setProcessing] = useState(false);

  // Estados temporales
  const [tempAssignment, setTempAssignment] = useState<{status: string, coord: string, oper: string}>({ status: '', coord: '', oper: '' });
  const [newComment, setNewComment] = useState("");

  useEffect(() => { 
    const session = localStorage.getItem('kiosco_user');
    if (session) {
        const user = JSON.parse(session);
        setCurrentUserName(user.full_name || 'Coordinador');
        setCurrentUserRole(user.role);
        setCurrentUserId(user.id);
        fetchData(user); 
    } else {
        fetchData(null);
    }
  }, []);

  const fetchData = async (user: any) => {
    setLoading(true);
    try {
        let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });

        // FILTRO DE SEGURIDAD (Solo sus propios tickets si es coordinador)
        if (user && user.role === 'coordinador') {
            query = query.eq('coordinator_id', user.id);
        }

        const [t, p, c] = await Promise.all([
          query, 
          supabase.from('profiles').select('*'),
          supabase.from('clients').select('*')
        ]);
    
        const formattedStaff = (p.data || []).map(x => ({ ...x, type: 'staff' }));
        const formattedClients = (c.data || []).map(x => ({ ...x, type: 'client' }));

        setData({ tickets: t.data || [], users: [...formattedStaff, ...formattedClients] });
    } catch (e) {
        console.error("Error fetching data:", e);
    } finally {
        setLoading(false);
    }
  };

  // --- LOGICA DE FILTRADO AVANZADA ---
  const { ticketsFiltered, stats, coordinators, operatives } = useMemo(() => {
    const term = filters.search.toLowerCase();
    
    // Listas para selectores
    const staffMembers = data.users.filter(u => u.type === 'staff');
    const coordinatorsList = staffMembers.filter(u => ['coordinador', 'admin', 'superadmin'].includes(u.role));
    const operativesList = staffMembers.filter(u => u.role === 'operativo');

    // Filtrado Maestro
    const ticketList = data.tickets.filter(t => {
      const date = new Date(t.created_at);
      
      // Filtro de Texto
      const matchSearch = 
          t.codigo_servicio?.toLowerCase().includes(term) || 
          t.full_name?.toLowerCase().includes(term) || 
          t.location?.toLowerCase().includes(term) ||
          t.service_type?.toLowerCase().includes(term);

      // Filtro de Fecha
      const ticketMonth = (date.getMonth() + 1).toString().padStart(2, '0');
      const ticketYear = date.getFullYear().toString();

      const matchMonth = filters.month === 'todos' || ticketMonth === filters.month;
      const matchYear = filters.year === 'todos' || ticketYear === filters.year;

      return matchSearch && matchMonth && matchYear;
    });

    const rated = data.tickets.filter(t => t.satisfaction_rating > 0);
    const rating = rated.length ? (rated.reduce((a, b) => a + b.satisfaction_rating, 0) / rated.length).toFixed(1) : "0.0";

    return { 
      ticketsFiltered: ticketList, 
      coordinators: coordinatorsList, 
      operatives: operativesList, 
      stats: { rating } 
    };
  }, [data, filters]);

  // --- FUNCIONES DE GESTIÓN ---
  const openTicketDetails = (ticket: any) => {
    setTempAssignment({
        status: ticket.status,
        coord: ticket.coordinator_id || '',
        oper: ticket.operative_id || ''
    });
    setNewComment(""); 
    setModals({ ...modals, details: ticket });
  };

  const handleSaveChanges = async () => {
    if(!modals.details) return;
    setProcessing(true);
    try {
        const changes = [];
        if(tempAssignment.status !== modals.details.status) changes.push(`Estatus: ${modals.details.status} ➝ ${tempAssignment.status}`);
        if(tempAssignment.oper != (modals.details.operative_id || '')) changes.push(`Operativo actualizado`);

        if(changes.length === 0) { alert("No hay cambios para guardar."); setProcessing(false); return; }

        const newLog = {
            date: new Date().toISOString(),
            changer: currentUserName,
            role: currentUserRole,
            type: 'system',
            action: changes.join(" | ")
        };

        const currentLogs = modals.details.logs || [];
        const updatedLogs = [newLog, ...currentLogs];

        const { error } = await supabase.from('tickets').update({
            status: tempAssignment.status,
            operative_id: tempAssignment.oper || null,
            logs: updatedLogs
        }).eq('id', modals.details.id);

        if(error) throw error;

        const session = localStorage.getItem('kiosco_user');
        const user = session ? JSON.parse(session) : null;
        await fetchData(user);

        setModals(prev => ({ 
            ...prev, 
            details: { 
                ...prev.details, 
                status: tempAssignment.status, 
                logs: updatedLogs, 
                operative_id: tempAssignment.oper 
            } 
        }));
        alert("✅ Orden actualizada correctamente.");

    } catch (e: any) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  const handleAddComment = async () => {
    if(!newComment.trim() || !modals.details) return;
    setProcessing(true);
    try {
        const commentLog = {
            date: new Date().toISOString(),
            changer: currentUserName,
            role: currentUserRole,
            type: 'comment',
            action: newComment
        };
        const currentLogs = modals.details.logs || [];
        const updatedLogs = [commentLog, ...currentLogs];
        const { error } = await supabase.from('tickets').update({ logs: updatedLogs }).eq('id', modals.details.id);
        if (error) throw error;
        
        const updatedTicket = { ...modals.details, logs: updatedLogs };
        setModals({ ...modals, details: updatedTicket });
        setNewComment(""); 
        
        const updatedTickets = data.tickets.map(t => t.id === modals.details.id ? updatedTicket : t);
        setData({ ...data, tickets: updatedTickets });
    } catch(e: any) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  const getAllowedStatuses = () => {
    if (currentUserRole === 'coordinador') {
        return ALL_STATUSES.filter(s => COORDINATOR_ALLOWED_STATUSES.includes(s) || s === modals.details?.status);
    }
    return ALL_STATUSES;
  };

  if (modals.sim) return <ClientMirrorView client={modals.sim} tickets={data.tickets} onExit={() => setModals({...modals, sim: null})} />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 pb-24">
      
      {/* HEADER HERO */}
      <div className="bg-[#0a1e3f] p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] text-white shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-4">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">MESA DE CONTROL</h1>
          <p className="text-blue-200 text-xs md:text-sm font-medium mt-1">
            Hola, <span className="text-white font-bold">{currentUserName.split(' ')[0]}</span>. 
            {currentUserRole === 'coordinador' ? ` Tienes ${ticketsFiltered.length} servicios asignados.` : ` Supervisando ${ticketsFiltered.length} servicios totales.`}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm self-end md:self-auto">
          <Star className="text-amber-400 fill-amber-400" size={24} />
          <div><p className="text-xl md:text-2xl font-black leading-none">{stats.rating}</p><p className="text-[8px] md:text-[9px] uppercase opacity-70">Calidad</p></div>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANZADA */}
      <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
            
            {/* Buscador */}
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                    className="w-full bg-slate-50 rounded-full py-3 pl-10 pr-4 text-xs font-bold outline-none border border-transparent focus:border-blue-100 focus:bg-blue-50/20 transition-all" 
                    placeholder="Buscar por folio, cliente, ubicación, servicio..." 
                    value={filters.search} 
                    onChange={e => setFilters({...filters, search: e.target.value})} 
                />
            </div>

            {/* Filtros de Fecha */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                {/* Selector de MES */}
                <div className="relative min-w-[140px]">
                    <select 
                        className="w-full bg-slate-50 rounded-full px-4 py-3 text-[10px] font-black uppercase outline-none cursor-pointer border border-transparent focus:border-blue-100 appearance-none pr-8" 
                        value={filters.month} 
                        onChange={e => setFilters({...filters, month: e.target.value})}
                    >
                        <option value="todos">Todos los Meses</option>
                        {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                    <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                </div>

                {/* Selector de AÑO */}
                <div className="relative min-w-[100px]">
                    <select 
                        className="w-full bg-slate-50 rounded-full px-4 py-3 text-[10px] font-black uppercase outline-none cursor-pointer border border-transparent focus:border-blue-100 appearance-none pr-8" 
                        value={filters.year} 
                        onChange={e => setFilters({...filters, year: e.target.value})}
                    >
                        <option value="todos">Todos</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <Calendar size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                </div>

                <button 
                    onClick={() => fetchData(JSON.parse(localStorage.getItem('kiosco_user') || '{}'))} 
                    className="p-3 bg-slate-50 rounded-full hover:bg-[#0a1e3f] hover:text-white text-slate-400 transition-colors shadow-sm"
                    title="Refrescar Datos"
                >
                    <RefreshCw size={16}/>
                </button>
            </div>
        </div>

        {/* TABLA OPERATIVA */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-black border-b border-slate-100"><tr><th className="p-6 pl-8">Folio / Servicio</th><th className="p-6">Datos Cliente</th><th className="p-6">Estado</th><th className="p-6">Asignación</th><th className="p-6 text-right pr-8">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {ticketsFiltered.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-medium bg-slate-50/30">No se encontraron servicios con los filtros actuales.</td></tr>
                    ) : (
                        ticketsFiltered.map(t => {
                            const coordinator = data.users.find(u => u.id === t.coordinator_id);
                            const operative = data.users.find(u => u.id === t.operative_id);

                            return (
                            <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="p-6 pl-8"><span className="bg-[#0a1e3f] text-white text-[9px] font-black px-2 py-1 rounded-md uppercase mb-1 inline-block">{t.codigo_servicio}</span><p className="font-black text-[#0a1e3f] uppercase text-sm">{t.service_type}</p></td>
                                <td className="p-6"><div className="flex items-center gap-2 mb-1"><User size={12} className="text-slate-400"/><span className="font-bold text-slate-700 uppercase">{t.full_name}</span></div><div className="flex items-center gap-2"><MapPin size={12} className="text-blue-500"/><span className="text-[10px] font-bold text-slate-500 uppercase">{t.location || 'Sin ubicación'}</span></div></td>
                                <td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${t.status === 'Sin asignar' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>{t.status}</span></td>
                                <td className="p-6">
                                    <div className="space-y-1">
                                        {coordinator ? (<p className="text-[10px] font-bold text-slate-600 flex items-center gap-1"><UserCog size={10} className="text-blue-500"/> {coordinator.full_name}</p>) : <p className="text-[9px] text-slate-300 italic">-- Coord</p>}
                                        {operative ? (<p className="text-[10px] font-bold text-slate-600 flex items-center gap-1"><HardHat size={10} className="text-orange-500"/> {operative.full_name}</p>) : <p className="text-[9px] text-slate-300 italic">-- Oper</p>}
                                    </div>
                                </td>
                                <td className="p-6 pr-8 text-right"><button onClick={() => openTicketDetails(t)} className="bg-[#0a1e3f] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2 ml-auto"><Zap size={14}/> Abrir Expediente</button></td>
                            </tr>
                            );
                        })
                    )}
                </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- MODAL MAESTRO --- */}
      {modals.details && (
        <div className="fixed inset-0 z-[150] flex justify-center items-end md:items-center animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setModals({ ...modals, details:null })}></div>
            <div className="relative w-full md:max-w-6xl h-[95vh] md:h-[85vh] bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                
                {/* Header */}
                <div className="bg-[#0a1e3f] px-6 py-5 md:px-8 md:py-6 text-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1"><span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-blue-100 border border-white/10 tracking-widest">{modals.details.codigo_servicio}</span><span className="text-[10px] opacity-60 font-medium">{new Date(modals.details.created_at).toLocaleDateString()}</span></div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">{modals.details.service_type}</h2>
                    </div>
                    <button onClick={() => setModals({ ...modals, details:null })} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><XCircle size={24}/></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* IZQUIERDA: DATOS */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 border-r border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><FileText size={14}/> Expediente del Cliente</h3>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Solicitante</p><p className="text-sm font-bold text-[#0a1e3f] flex items-center gap-2"><User size={16} className="text-blue-500"/> {modals.details.full_name}</p></div><div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Ubicación</p><p className="text-sm font-bold text-[#0a1e3f] flex items-center gap-2"><MapPin size={16} className="text-red-500"/> {modals.details.location}</p></div></div>
                            <div className="h-px bg-slate-100 w-full"></div>
                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-2">Reporte de Falla</p><div className="bg-slate-50 p-4 rounded-2xl text-sm text-slate-600 italic leading-relaxed border border-slate-100">"{modals.details.description}"</div></div>
                            {modals.details.evidencia_url && <div><p className="text-[9px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1"><ImageIcon size={10}/> Evidencia</p><div className="rounded-2xl overflow-hidden border border-slate-200 h-48 bg-slate-100"><img src={modals.details.evidencia_url} alt="Evidencia" className="w-full h-full object-cover"/></div></div>}
                            <div className="flex gap-2"><div className="flex-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-center gap-2"><Phone size={14} className="text-blue-600"/><span className="text-[10px] font-bold text-blue-900">{modals.details.phone || 'N/A'}</span></div><div className="flex-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-center gap-2"><Mail size={14} className="text-blue-600"/><span className="text-[10px] font-bold text-blue-900 truncate">{modals.details.email || 'N/A'}</span></div></div>
                        </div>
                    </div>

                    {/* DERECHA: GESTIÓN OPERATIVA */}
                    <div className="w-full md:w-[400px] lg:w-[450px] bg-white p-6 md:p-8 overflow-y-auto flex flex-col gap-8 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><UserCog size={14}/> Panel Operativo</h3>
                            <div className="bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
                                    {/* ESTATUS FILTRADO */}
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Estatus Actual</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-[#0a1e3f] appearance-none" value={tempAssignment.status} onChange={(e) => setTempAssignment({...tempAssignment, status: e.target.value})}>{getAllowedStatuses().map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    {/* COORDINADOR BLOQUEADO */}
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Coordinador (Fijo)</label><select className="w-full bg-gray-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-500 appearance-none cursor-not-allowed" value={tempAssignment.coord} disabled={true} onChange={(e) => setTempAssignment({...tempAssignment, coord: e.target.value})}><option value="">-- Sin Asignar --</option>{coordinators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
                                    {/* OPERATIVO LIBRE */}
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Operativo</label><select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 appearance-none" value={tempAssignment.oper} onChange={(e) => setTempAssignment({...tempAssignment, oper: e.target.value})}><option value="">-- Sin Asignar --</option>{operatives.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}</select></div>
                                    <button onClick={handleSaveChanges} disabled={processing} className="w-full bg-[#0a1e3f] text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-800 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 mt-2">{processing ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>} Actualizar Orden</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-[300px]">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><History size={14}/> Bitácora Digital</h3>
                            <div className="flex gap-2 mb-6"><input type="text" placeholder="Agregar nota técnica..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}/><button onClick={handleAddComment} disabled={!newComment.trim() || processing} className="bg-[#0a1e3f] text-white p-3 rounded-xl hover:bg-blue-800 transition-colors shadow-md"><Send size={16}/></button></div>
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 pb-4">
                                {(!modals.details.logs || modals.details.logs.length === 0) && <p className="text-[10px] text-slate-300 italic pl-4">No hay actividad registrada.</p>}
                                {modals.details.logs?.map((log: any, idx: number) => (
                                    <div key={idx} className="relative pl-6 animate-in slide-in-from-left-2 duration-300" style={{animationDelay: `${idx * 50}ms`}}>
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.type === 'comment' ? 'bg-amber-400' : 'bg-blue-500'}`}></div>
                                        <div className="flex justify-between items-start mb-1"><span className="text-[9px] font-black uppercase text-slate-500">{log.changer || 'Sistema'}</span><span className="text-[8px] font-bold text-slate-300">{new Date(log.date).toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span></div>
                                        <div className={`text-xs font-medium rounded-lg p-2 ${log.type === 'comment' ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'text-slate-600'}`}>{log.action}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}