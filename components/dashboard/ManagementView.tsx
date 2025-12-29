'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Zap, Trash2, Users, PlayCircle, FileCheck, CheckSquare, 
  X, Calendar, XCircle, BarChart3, Building, Phone, User,
  Shield, Briefcase, Plus, Edit, Lock, Smartphone, Hash, Monitor,
  UserCheck, ChevronDown, AlertCircle, Clock, CheckCircle2, Ban
} from 'lucide-react';

interface ManagementViewProps { role: 'superadmin' | 'admin' | 'coordinador'; }

// --- TEMA FLIGHT APP ---
const theme = {
  navy: 'bg-[#0a1e3f]',
  navyText: 'text-[#0a1e3f]',
  lightBg: 'bg-slate-100',
  white: 'bg-white',
};

export default function ManagementView({ role }: ManagementViewProps) {
  
  const isSuperAdmin = role === 'superadmin';
  // Permisos para edición manual de estatus según tabla oficial
  const canEditStatus = role === 'superadmin' || role === 'admin' || role === 'coordinador';

  // --- LISTA OFICIAL DE ESTATUS ---
  const statusOptions = [
    "Sin asignar", "Asignado", "Pendiente", "En proceso", 
    "Ejecutado", "Realizado", "Revision control Interno", 
    "Cerrado", "Cancelado", "QA"
  ];

  const statusStyles: any = {
      "Sin asignar": 'bg-red-100 text-red-700 border-red-200',
      "Asignado":    'bg-blue-100 text-blue-700 border-blue-200',
      "Pendiente":   'bg-orange-100 text-orange-700 border-orange-200',
      "En proceso":  'bg-amber-100 text-amber-700 border-amber-200',
      "Ejecutado":   'bg-indigo-100 text-indigo-700 border-indigo-200',
      "Realizado":   'bg-emerald-100 text-emerald-700 border-emerald-200',
      "Revision control Interno": 'bg-purple-100 text-purple-700 border-purple-200',
      "Cerrado":     'bg-slate-200 text-slate-700 border-slate-300',
      "Cancelado":   'bg-rose-100 text-rose-700 border-rose-200',
      "QA":          'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  // --- ESTADOS DE PESTAÑAS ---
  const [activeTab, setActiveTab] = useState<'operaciones' | 'staff' | 'clientes'>('operaciones');
  const [staffSubTab, setStaffSubTab] = useState<'admin' | 'kiosco'>('admin');
  
  // --- ESTADOS DE DATOS ---
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterStaff, setFilterStaff] = useState<string | null>(null);
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [editingType, setEditingType] = useState<'staff_admin' | 'staff_kiosco' | 'client'>('staff_admin');

  // --- FETCH DE DATOS ---
  const fetchData = async () => {
    let q = supabase.from('tickets').select('*').order('created_at', { ascending: false });
    
    if (selectedMonth !== 'todos') {
      const start = `${selectedMonth}-01`; 
      const [y, m] = selectedMonth.split('-').map(Number);
      const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);
      q = q.gte('created_at', start).lt('created_at', nextMonth);
    }

    const [t, p, c] = await Promise.all([
        q, 
        supabase.from('profiles').select('*').order('full_name'), 
        supabase.from('clients').select('*').order('created_at', { ascending: false })
    ]);
    
    if (t.data) setTickets(t.data); 
    if (p.data) setProfiles(p.data); 
    if (c.data) setClients(c.data);
  };
  
  useEffect(() => { fetchData(); }, [selectedMonth]);

  // --- LOGICA DE FILTROS Y CONTADORES ACTUALIZADA ---
  const filteredTickets = tickets.filter(t => (filterStatus === 'todos' || t.status === filterStatus) && (filterStaff === null || t.assigned_to === filterStaff));
  
  const counts = {
    todos: tickets.length,
    sin_asignar: tickets.filter(t => t.status === 'Sin asignar').length,
    asignado: tickets.filter(t => t.status === 'Asignado').length,
    pendiente: tickets.filter(t => t.status === 'Pendiente').length,
    en_proceso: tickets.filter(t => t.status === 'En proceso').length,
    ejecutado: tickets.filter(t => t.status === 'Ejecutado').length,
    realizado: tickets.filter(t => t.status === 'Realizado').length,
    revision: tickets.filter(t => t.status === 'Revision control Interno').length,
    cerrado: tickets.filter(t => t.status === 'Cerrado').length,
    cancelado: tickets.filter(t => t.status === 'Cancelado').length,
    qa: tickets.filter(t => t.status === 'QA').length,
  };
  
  const staffAdminList = profiles.filter(p => p.role !== 'operativo' && p.role !== 'client');
  const staffKioscoList = profiles.filter(p => p.role === 'operativo');
  const staffWorkload = staffKioscoList.concat(staffAdminList).map(s => ({ ...s, activeTickets: tickets.filter(t => t.assigned_to === s.full_name && t.status !== 'Cerrado').length })).sort((a, b) => b.activeTickets - a.activeTickets);

  // --- HANDLERS ---
  const handleAssign = async (id: number, staff: string) => { 
      const { error } = await supabase.from('tickets').update({ assigned_to: staff }).eq('id', id); 
      if (error) alert("Error al asignar técnico: " + error.message);
      fetchData(); 
  };

  // HANDLER: Cambio manual de estatus
  const handleStatusChange = async (id: number, newStatus: string) => {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    if (error) alert("Error al cambiar estatus: " + error.message);
    else fetchData();
  };

  // HANDLER: Asignación de coordinador con Lógica Automática de Estatus
  const handleAssignCoordinator = async (id: number, coordinatorId: string) => {
      const val = coordinatorId === "" ? null : coordinatorId;
      const autoStatus = val ? "Asignado" : "Sin asignar";

      const { error } = await supabase.from('tickets').update({ 
        coordinador_id: val,
        status: autoStatus
      }).eq('id', id);

      if (error) {
          console.error("Error BD:", error);
          alert(`Error al guardar: ${error.message}\n\nNota: Verifique que la columna 'coordinador_id' sea TEXT en Supabase.`);
      } else {
          fetchData();
      }
  };

  const handleDelete = async (table: string, id: number) => { 
      if(confirm('¿Borrar registro permanentemente?')) { 
          await supabase.from(table).delete().eq('id', id); 
          fetchData(); 
      }
  };

  // --- MODAL ---
  const openModal = (type: 'staff_admin' | 'staff_kiosco' | 'client', data: any = null) => { setEditingType(type); setEditingData(data); setIsModalOpen(true); };
  const closeModal = () => { setEditingData(null); setIsModalOpen(false); };
  
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoading(true); const fd = new FormData(e.currentTarget);
    const base = { full_name: fd.get('full_name') };
    
    if (editingType.startsWith('staff')) {
        let data: any = { ...base };
        if (editingType === 'staff_admin') { data = { ...data, email: fd.get('email'), password: fd.get('password'), role: fd.get('role'), pin: null }; } 
        else { data = { ...data, pin: fd.get('pin'), role: 'operativo', email: `op.${Date.now()}@kiosco.local`, password: 'no-login' }; }
        data.status = 'active';
        editingData ? await supabase.from('profiles').update(data).eq('id', editingData.id) : await supabase.from('profiles').insert([data]);
    } else { 
        const data = { ...base, email: fd.get('email'), password: fd.get('password'), organization: fd.get('organization'), phone: fd.get('phone'), position: fd.get('position') };
        if(!editingData) (data as any).status='active';
        editingData ? await supabase.from('clients').update(data).eq('id', editingData.id) : await supabase.from('clients').insert([data]);
    }
    await fetchData(); setLoading(false); closeModal();
  };

  // --- UI COMPONENTS ---
  const KpiCard = ({ label, count, id, icon: Icon, activeColor }: any) => {
    const isActive = filterStatus === id;
    return (
        <button onClick={() => setFilterStatus(id)} className={`relative p-5 rounded-[2rem] transition-all duration-300 flex flex-col justify-between items-start text-left h-32 w-full group overflow-hidden ${isActive ? (activeColor || 'bg-[#0a1e3f]') + ' text-white shadow-xl transform -translate-y-1' : 'bg-white text-slate-600 hover:shadow-md border border-slate-100'}`}>
            <div className="w-full flex justify-between items-start mb-1">
                <div className={`p-2 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-50'}`}>
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                </div>
            </div>
            <div>
                <span className={`text-3xl font-black tracking-tighter block ${isActive ? 'text-white' : 'text-[#0a1e3f]'}`}>{count}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{label}</span>
            </div>
        </button>
    );
  };

  const TabButton = ({ id, label, icon: Icon }: any) => {
      const isActive = activeTab === id;
      return (
        <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${isActive ? 'bg-[#0a1e3f] text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:bg-white hover:text-[#0a1e3f]'}`}>
            <Icon size={16} /> {label}
        </button>
      );
  };

  const availableMonths = (() => {
    const months = []; const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push({ value: d.toISOString().slice(0, 7), label: d.toLocaleString('es-MX', { month: 'long', year: 'numeric' }) });
    }
    return months;
  })();

  return (
    <div className={`min-h-screen ${theme.lightBg} text-slate-800 font-sans selection:bg-blue-200 pb-20`}>
      
      {/* PESTAÑAS (Sticky Nav) */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md px-6 py-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 transition-all">
          <div className="flex gap-2 bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
            <TabButton id="operaciones" label="Operaciones" icon={Zap} />
            {(role === 'superadmin' || role === 'admin') && <TabButton id="staff" label="Staff" icon={Shield} />}
            <TabButton id="clientes" label="Clientes" icon={Building} />
          </div>
          
          <div className="flex items-center gap-4">
               <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-slate-200">
                    <Calendar size={16} className="text-[#0a1e3f]"/>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer uppercase">
                        {availableMonths.map(m => <option className="text-slate-900 bg-white" key={m.value} value={m.value}>{m.label}</option>)}
                        <option className="text-slate-900 bg-white" value="todos">📂 Histórico</option>
                    </select>
               </div>
          </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* === TAB 1: OPERACIONES === */}
        {activeTab === 'operaciones' && (
            <>
                {/* GRID DE CONTADORES COMPLETOS */}
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-11 gap-3 overflow-x-auto pb-2">
                    <KpiCard label="Todos" count={counts.todos} id="todos" icon={BarChart3} />
                    <KpiCard label="S.Asignar" count={counts.sin_asignar} id="Sin asignar" icon={AlertCircle} activeColor="bg-red-600" />
                    <KpiCard label="Asignados" count={counts.asignado} id="Asignado" icon={Users} activeColor="bg-blue-600" />
                    <KpiCard label="Pendientes" count={counts.pendiente} id="Pendiente" icon={Clock} activeColor="bg-orange-600" />
                    <KpiCard label="Proceso" count={counts.en_proceso} id="En proceso" icon={PlayCircle} activeColor="bg-amber-600" />
                    <KpiCard label="Ejecutado" count={counts.ejecutado} id="Ejecutado" icon={CheckSquare} activeColor="bg-indigo-600" />
                    <KpiCard label="Realizado" count={counts.realizado} id="Realizado" icon={FileCheck} activeColor="bg-emerald-600" />
                    <KpiCard label="Control" count={counts.revision} id="Revision control Interno" icon={Shield} activeColor="bg-purple-600" />
                    <KpiCard label="Cerrado" count={counts.cerrado} id="Cerrado" icon={CheckCircle2} activeColor="bg-slate-600" />
                    <KpiCard label="Cancelado" count={counts.cancelado} id="Cancelado" icon={Ban} activeColor="bg-rose-600" />
                    <KpiCard label="QA" count={counts.qa} id="QA" icon={Zap} activeColor="bg-cyan-600" />
                </div>

                <div className="flex flex-col xl:flex-row gap-8">
                    {/* TABLA DE OPERACIONES */}
                    <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                        <div className="p-8 bg-[#0a1e3f] flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-full"><Zap size={24}/></div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">Centro de Control</h2>
                                    <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Gestión Operativa</p>
                                </div>
                            </div>
                            {(filterStatus !== 'todos' || filterStaff) && (
                                <button onClick={() => { setFilterStatus('todos'); setFilterStaff(null); }} className="px-5 py-2.5 bg-white text-[#0a1e3f] rounded-full text-[10px] font-black tracking-wider transition-all hover:bg-blue-50 flex items-center gap-2">
                                    <XCircle size={14}/> LIMPIAR
                                </button>
                            )}
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                                    <tr>
                                        <th className="px-8 py-5">Folio</th>
                                        <th className="px-6 py-5">Cliente</th>
                                        <th className="px-6 py-5">Servicio</th>
                                        <th className="px-6 py-5">Ubicación</th>
                                        <th className="px-6 py-5 text-center">Estado Oficial</th>
                                        <th className="px-6 py-5 text-[#0a1e3f]">Coordinador</th>
                                        <th className="px-6 py-5">Técnico</th>
                                        {isSuperAdmin && <th className="px-6 py-5"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredTickets.map(ticket => {
                                        const clientInfo = clients.find(c => c.email === ticket.client_email);
                                        const missingCoord = !ticket.coordinador_id; 

                                        return (
                                        <tr key={ticket.id} className={`group transition-all duration-500 ${
                                            missingCoord 
                                            ? "bg-blue-50/70 hover:bg-blue-100 shadow-[inset_6px_0_0_0_#3b82f6]" //
                                            : "hover:bg-slate-50"
                                        }`}>
                                            <td className="px-8 py-6 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-sm text-[#0a1e3f] bg-white/50 px-2 py-1 rounded-md w-fit">#{ticket.id.toString().padStart(4, '0')}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-6 align-top whitespace-normal min-w-[220px]">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-1">
                                                        <Building size={14} className="text-orange-500"/> {clientInfo?.organization || 'Externo'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-medium">{clientInfo?.full_name}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-6 align-top whitespace-normal min-w-[300px] max-w-md">
                                                <div className="font-bold text-slate-700 text-sm mb-1">{ticket.service_type}</div>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 bg-white/40 p-2 rounded-lg border border-slate-200/50">{ticket.description}</p>
                                            </td>

                                            <td className="px-6 py-6 align-top">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-sm">{ticket.location}</span>
                                            </td>

                                            {/* SELECTOR MANUAL DE ESTADO OFICIAL */}
                                            <td className="px-6 py-6 align-top text-center">
                                                {canEditStatus ? (
                                                  <div className="relative group/status">
                                                    <select 
                                                      className={`appearance-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm cursor-pointer outline-none transition-all ${statusStyles[ticket.status] || 'bg-slate-100 text-slate-700'}`}
                                                      value={ticket.status}
                                                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                    >
                                                      {/* OPCIONES CON TEXTO NEGRO */}
                                                      {statusOptions.map(opt => (
                                                        <option key={opt} value={opt} className="text-slate-900 bg-white">{opt}</option>
                                                      ))}
                                                    </select>
                                                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                                                  </div>
                                                ) : (
                                                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${statusStyles[ticket.status]}`}>{ticket.status}</span>
                                                )}
                                            </td>
                                            
                                            <td className="px-6 py-6 align-top">
                                                <div className="relative group/select">
                                                    <select 
                                                        className={`w-48 appearance-none text-[11px] font-bold rounded-full py-2.5 pl-4 pr-10 outline-none cursor-pointer transition-all ${
                                                            missingCoord 
                                                            ? "bg-white border-2 border-blue-400 text-blue-700 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                                                            : "bg-white border border-slate-200 text-slate-700 hover:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-900/20"
                                                        }`}
                                                        value={ticket.coordinador_id || ''} 
                                                        onChange={(e) => handleAssignCoordinator(ticket.id, e.target.value)}
                                                    >
                                                        <option className="text-slate-900 bg-white" value="">-- Asignar --</option>
                                                        {staffAdminList.map(p => (
                                                            <option className="text-slate-900 bg-white" key={p.id} value={p.id}>{p.full_name}</option>
                                                        ))}
                                                    </select>
                                                    {missingCoord ? (
                                                        <AlertCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none animate-bounce"/>
                                                    ) : (
                                                        <UserCheck size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/select:text-[#0a1e3f] transition-colors"/>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6 align-top">
                                                <div className="relative group/select">
                                                    <select 
                                                        className="w-48 appearance-none bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-full py-2.5 pl-4 pr-10 focus:bg-white focus:ring-2 focus:ring-blue-900/20 outline-none cursor-pointer transition-all hover:border-blue-200"
                                                        value={ticket.assigned_to || ''} 
                                                        onChange={(e) => handleAssign(ticket.id, e.target.value)}
                                                    >
                                                        <option className="text-slate-900 bg-white" value="">-- Asignar --</option>
                                                        {staffKioscoList.map(p => (
                                                            <option className="text-slate-900 bg-white" key={p.id} value={p.full_name}>👷 {p.full_name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                                </div>
                                            </td>

                                            {isSuperAdmin && (
                                                <td className="px-6 py-6 align-top text-right">
                                                    <button onClick={() => handleDelete('tickets', ticket.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                                                </td>
                                            )}
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* SIDEBAR */}
                    <div className="w-full xl:w-80 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 sticky top-40 border border-slate-100">
                            <div className="flex justify-between items-center mb-6 px-2">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-[#0a1e3f]"/> Fuerza Operativa</h3>
                            </div>
                            <div className="space-y-3">
                                {staffWorkload.map((staff, idx) => { 
                                    const isActive = filterStaff === staff.full_name; 
                                    return (
                                    <button key={idx} onClick={() => setFilterStaff(isActive ? null : staff.full_name)} className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] transition-all duration-300 group ${isActive ? 'bg-[#0a1e3f] shadow-lg shadow-blue-900/30 text-white transform scale-105' : 'bg-slate-50 hover:bg-white hover:shadow-md text-slate-600'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${staff.activeTickets > 4 ? 'bg-red-100 text-red-600' : isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>{staff.activeTickets}</div>
                                            <div className="text-left">
                                                <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>{staff.full_name}</div>
                                                <div className={`text-[10px] font-bold uppercase tracking-wide ${isActive?'text-blue-200':'text-slate-400'}`}>{staff.role}</div>
                                            </div>
                                        </div>
                                    </button>
                                )})}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* === TAB 2: STAFF === */}
        {activeTab === 'staff' && (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                <div className="p-8 bg-[#0a1e3f] flex justify-between items-center text-white">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-white/10 rounded-full"><Shield size={24}/></div>
                        <h2 className="text-2xl font-black tracking-tight">Directorio de Staff</h2>
                    </div>
                    {isSuperAdmin && (
                        <button onClick={() => openModal(staffSubTab === 'admin' ? 'staff_admin' : 'staff_kiosco')} className="bg-white text-[#0a1e3f] px-6 py-3 rounded-full text-[10px] font-black flex items-center gap-2 transition-all hover:bg-blue-50 shadow-lg tracking-wider">
                            <Plus size={16}/> NUEVO
                        </button>
                    )}
                </div>
                
                <div className="px-8 pt-6 pb-2">
                    <div className="inline-flex bg-slate-100 p-1.5 rounded-full border border-slate-200">
                        <button onClick={() => setStaffSubTab('admin')} className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${staffSubTab === 'admin' ? 'bg-white shadow-sm text-[#0a1e3f]' : 'text-slate-500'}`}>Administrativos</button>
                        <button onClick={() => setStaffSubTab('kiosco')} className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${staffSubTab === 'kiosco' ? 'bg-white shadow-sm text-[#0a1e3f]' : 'text-slate-500'}`}>Operativos</button>
                    </div>
                </div>

                <div className="p-4">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-5">Nombre</th>
                                {staffSubTab === 'admin' && <th className="px-6 py-5">Email</th>}
                                <th className="px-6 py-5">Rol</th>
                                <th className="px-6 py-5">{staffSubTab === 'admin' ? 'Password' : 'PIN'}</th>
                                {isSuperAdmin && <th className="px-6 py-5 text-right"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(staffSubTab === 'admin' ? staffAdminList : staffKioscoList).map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-700 flex items-center gap-3">
                                            <div className={`p-2.5 rounded-full ${staffSubTab==='admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {staffSubTab==='admin' ? <Monitor size={18}/> : <Smartphone size={18}/>}
                                            </div>
                                            {p.full_name}
                                        </div>
                                    </td>
                                    {staffSubTab === 'admin' && <td className="px-6 py-5 text-slate-500 font-medium">{p.email}</td>}
                                    <td className="px-6 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide ${p.role==='superadmin'?'bg-red-100 text-red-700':p.role==='coordinador'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{p.role}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {staffSubTab === 'admin' ? (
                                            isSuperAdmin ? <span className="font-mono text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-bold">{p.password}</span> : <span className="text-slate-300 flex items-center gap-1"><Lock size={14}/> ••••</span>
                                        ) : (
                                            <span className="font-mono text-lg font-bold text-slate-700 bg-slate-100 px-4 py-1 rounded-full tracking-widest">{p.pin || '----'}</span>
                                        )}
                                    </td>
                                    {isSuperAdmin && (
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(staffSubTab === 'admin' ? 'staff_admin' : 'staff_kiosco', p)} className="p-2 text-slate-400 hover:text-[#0a1e3f] rounded-full hover:bg-blue-50 transition-all"><Edit size={18}/></button>
                                                <button onClick={() => handleDelete('profiles', p.id)} disabled={p.role==='superadmin'} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-all disabled:opacity-30"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* === TAB 3: CLIENTES === */}
        {activeTab === 'clientes' && (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                <div className="p-8 bg-[#0a1e3f] flex justify-between items-center text-white">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-white/10 rounded-full"><Briefcase size={24}/></div>
                        <h2 className="text-2xl font-black tracking-tight">Cartera de Clientes</h2>
                    </div>
                    {isSuperAdmin && (
                        <button onClick={() => openModal('client')} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full text-[10px] font-black flex items-center gap-2 transition-all shadow-lg tracking-wider"><Plus size={16}/> NUEVO CLIENTE</button>
                    )}
                </div>
                
                <div className="p-4">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                            <tr><th className="px-8 py-5">Organización</th><th className="px-6 py-5">Contacto</th><th className="px-6 py-5">Teléfono</th><th className="px-6 py-5">Accesos</th>{isSuperAdmin && <th className="px-6 py-5 text-right"></th>}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {clients.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5"><div className="font-bold text-slate-700 flex items-center gap-3"><div className="p-2 bg-orange-100 text-orange-600 rounded-full"><Building size={16}/></div> {c.organization}</div></td>
                                    <td className="px-6 py-5 text-slate-600 font-medium">{c.full_name}</td>
                                    <td className="px-6 py-5 text-slate-500 font-mono">{c.phone}</td>
                                    <td className="px-6 py-5"><div className="text-xs text-slate-500 font-bold mb-1">{c.email}</div>{isSuperAdmin ? <div className="text-xs font-mono bg-slate-100 inline-block px-3 py-0.5 rounded-full text-slate-600 font-bold">{c.password}</div> : <div className="text-xs text-slate-300 flex items-center gap-1"><Lock size={12}/> ••••</div>}</td>
                                    {isSuperAdmin && <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => openModal('client', c)} className="p-2 text-slate-400 hover:text-[#0a1e3f] rounded-full hover:bg-blue-50"><Edit size={18}/></button><button onClick={() => handleDelete('clients', c.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50"><Trash2 size={18}/></button></div></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      {/* MODAL GLOBAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1e3f]/60 backdrop-blur-sm p-4 transition-all">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden border-4 border-white/20">
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-[#0a1e3f] text-xl flex items-center gap-3">
                        {editingType.includes('staff') ? <Shield className="text-blue-600"/> : <Building className="text-orange-500"/>}
                        {editingData?'Editar Registro':'Nuevo Registro'}
                    </h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-[#0a1e3f] bg-white p-2 rounded-full shadow-sm transition-colors"><X size={20}/></button>
                </div>
                <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Nombre Completo</label><input name="full_name" defaultValue={editingData?.full_name} className="w-full bg-slate-100 border-none text-slate-800 font-bold rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-[#0a1e3f]/20 transition-all placeholder:text-slate-300" required /></div>
                    
                    {(editingType === 'staff_admin' || editingType === 'client') && (
                        <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Email</label><input name="email" defaultValue={editingData?.email} className="w-full bg-slate-100 border-none text-slate-800 font-bold rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-[#0a1e3f]/20 transition-all placeholder:text-slate-300" required /></div>
                    )}

                    {editingType === 'staff_kiosco' && (
                        <div className="space-y-2"><label className="text-[10px] font-bold text-emerald-600 uppercase ml-2 tracking-widest">PIN de Acceso</label><input name="pin" maxLength={4} defaultValue={editingData?.pin} className="w-full bg-emerald-50 text-emerald-800 font-black text-center text-3xl tracking-[0.5em] rounded-2xl py-4 px-5 outline-none focus:ring-2 focus:ring-emerald-500/30 border border-emerald-100" placeholder="0000" required /></div>
                    )}
                    
                    {editingType==='client' && (
                        <>
                            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Organización</label><input name="organization" defaultValue={editingData?.organization} className="w-full bg-slate-100 border-none text-slate-800 font-bold rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-[#0a1e3f]/20 transition-all" required /></div>
                            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Teléfono</label><input name="phone" defaultValue={editingData?.phone} className="w-full bg-slate-100 border-none text-slate-800 font-bold rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-[#0a1e3f]/20 transition-all" required /></div>
                        </>
                    )}

                    {editingType==='staff_admin' && (
                        <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Rol</label>
                            <div className="relative">
                                <select name="role" defaultValue={editingData?.role||'coordinador'} className="w-full appearance-none bg-slate-100 text-slate-800 font-bold rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-[#0a1e3f]/20 transition-all cursor-pointer">
                                    <option className="text-slate-900 bg-white" value="superadmin">Super Admin</option>
                                    <option className="text-slate-900 bg-white" value="admin">Administrador</option>
                                    <option className="text-slate-900 bg-white" value="coordinador">Coordinador</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            </div>
                        </div>
                    )}
                    
                    {(editingType === 'staff_admin' || editingType === 'client') && (
                        <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Contraseña</label><input name="password" defaultValue={editingData?.password} className="w-full bg-slate-100 border-none text-slate-800 font-bold rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-[#0a1e3f]/20 transition-all font-mono" required /></div>
                    )}
                    
                    <div className="pt-6 flex gap-4">
                        <button type="button" onClick={closeModal} className="flex-1 py-3.5 bg-white border-2 border-slate-100 text-slate-400 font-black rounded-full hover:bg-slate-50 transition-colors text-xs tracking-wider">CANCELAR</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-[#0a1e3f] text-white font-black rounded-full hover:bg-blue-900 shadow-xl shadow-blue-900/20 transition-all transform active:scale-95 text-xs tracking-wider">{loading?'...':'GUARDAR'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}