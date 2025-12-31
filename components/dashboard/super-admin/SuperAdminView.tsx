'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
// Nota: ClientMirrorView sigue en la carpeta padre dashboard/, así que usamos ../
import ClientMirrorView from '../ClientMirrorView'; 
import { 
  Zap, Users, Building2, Search, Star, UserCog, HardHat, History, 
  MapPin, User, Monitor, Briefcase, RefreshCw, Download, Edit, 
  Eye, EyeOff, CheckCircle2, XCircle, Send, Plus, MonitorPlay,
  // --- CORRECCIÓN AQUÍ: Agregué 'Image as ImageIcon' y 'Save' ---
  Image as ImageIcon, Save
} from 'lucide-react';
import OperativeAccessModal from '@/components/auth/OperativeAccessModal';

// --- IMPORTAMOS LOS COMPONENTES QUE ACABAMOS DE CREAR ---
import EditUserModal from './EditUserModal';
import StaffTab from './StaffTab';

const ALL_STATUSES = ["Sin asignar", "Asignado", "Pendiente", "En proceso", "Ejecutado", "Realizado", "Revision control Interno", "Cerrado", "Cancelado", "QA"];
const MONTHS = [{ val: "01", label: "Ene" }, { val: "02", label: "Feb" }, { val: "03", label: "Mar" }, { val: "04", label: "Abr" }, { val: "05", label: "May" }, { val: "06", label: "Jun" }, { val: "07", label: "Jul" }, { val: "08", label: "Ago" }, { val: "09", label: "Sep" }, { val: "10", label: "Oct" }, { val: "11", label: "Nov" }, { val: "12", label: "Dic" }];

export default function SuperAdminView() {
  const [data, setData] = useState<{ tickets: any[], users: any[] }>({ tickets: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>(''); 
  const [currentUserName, setCurrentUserName] = useState<string>('');

  const [tab, setTab] = useState<'ops' | 'staff' | 'clients'>('ops');
  const [filters, setFilters] = useState({ search: '', month: 'todos', year: new Date().getFullYear().toString() });
  
  // Estados de Modales y Edición
  const [modals, setModals] = useState<{ details: any, sim: any }>({ details: null, sim: null });
  const [editingUser, setEditingUser] = useState<any>(null); // Usuario que se está editando
  const [showKioskModal, setShowKioskModal] = useState(false);
  
  const [passVisible, setPassVisible] = useState<{[key: string]: boolean}>({});
  const [processing, setProcessing] = useState(false);

  // Estados temporales para tickets
  const [tempAssignment, setTempAssignment] = useState<{status: string, coord: string, oper: string}>({ status: '', coord: '', oper: '' });
  const [newComment, setNewComment] = useState("");
  
  // Estado para sub-tabs de Clientes (Directorio vs Solicitudes)
  const [clientSubTab, setClientSubTab] = useState<'active' | 'requests'>('active');

  useEffect(() => { 
    const session = localStorage.getItem('kiosco_user');
    if (session) {
        const user = JSON.parse(session);
        setCurrentUserRole(user.role);
        setCurrentUserName(user.full_name || 'Admin');
    }
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [t, p, c] = await Promise.all([
          supabase.from('tickets').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*'),
          supabase.from('clients').select('*')
        ]);
        const formattedClients = (c.data || []).map(x => ({ ...x, type: 'client', role: 'client', status: x.status || 'pending', company: x.organization, password_view: x.password }));
        const formattedStaff = (p.data || []).map(x => ({ ...x, type: 'staff' }));
        setData({ tickets: t.data || [], users: [...formattedStaff, ...formattedClients] });
    } catch (e) { console.error("Error:", e); } finally { setLoading(false); }
  };

  const { staff, clients, requests, ticketsFiltered, stats, coordinators, operatives, kioskMasters } = useMemo(() => {
    const term = filters.search.toLowerCase();
    const staffMembers = data.users.filter(u => u.type === 'staff');
    const coordinatorsList = staffMembers.filter(u => ['coordinador', 'admin', 'superadmin'].includes(u.role));
    const operativesList = staffMembers.filter(u => u.role === 'operativo');
    const kioskList = staffMembers.filter(u => u.role === 'kiosk_master');

    const staffList = staffMembers.filter(u => (u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)));
    const clientList = data.users.filter(u => u.type === 'client' && u.status === 'active' && (u.company?.toLowerCase().includes(term) || u.full_name?.toLowerCase().includes(term)));
    const requestList = data.users.filter(u => u.type === 'client' && u.status === 'pending');

    const ticketList = data.tickets.filter(t => {
      const d = new Date(t.created_at);
      const matchSearch = t.codigo_servicio?.toLowerCase().includes(term) || t.full_name?.toLowerCase().includes(term) || t.location?.toLowerCase().includes(term);
      const matchDate = (filters.month === 'todos' || (d.getMonth() + 1).toString().padStart(2, '0') === filters.month) && (filters.year === 'todos' || d.getFullYear().toString() === filters.year);
      return matchSearch && matchDate;
    });

    const rated = data.tickets.filter(t => t.satisfaction_rating > 0);
    const rating = rated.length ? (rated.reduce((a, b) => a + b.satisfaction_rating, 0) / rated.length).toFixed(1) : "0.0";

    return { staff: staffList, clients: clientList, requests: requestList, ticketsFiltered: ticketList, coordinators: coordinatorsList, operatives: operativesList, kioskMasters: kioskList, stats: { rating } };
  }, [data, filters]);

  // --- PREPARAR NUEVO USUARIO (Se pasa al componente hijo) ---
  const handlePrepareCreate = (targetRole: string) => {
    let emptyUser: any = { id: 'new', type: 'staff', full_name: '', email: '', phone: '', password: '' };
    
    if (targetRole === 'client') emptyUser = { ...emptyUser, type: 'client', role: 'client', company: '', position: '' };
    else if (targetRole === 'kiosk_master') emptyUser = { ...emptyUser, role: 'kiosk_master', full_name: 'Nueva Sucursal', email: '@cmw.com.mx' };
    else if (targetRole === 'operativo') emptyUser = { ...emptyUser, role: 'operativo', pin: '', linked_kiosk_email: '' };
    else emptyUser = { ...emptyUser, role: 'admin' };
    
    setEditingUser(emptyUser); // Abrimos el modal
  };

  // --- LÓGICA DE GUARDADO DE USUARIO (Se pasa al Modal) ---
  const handleSaveUser = async (action: 'update' | 'new', payload: any) => {
    if (processing) return; 
    setProcessing(true);
    try {
        const table = payload.type === 'client' ? 'clients' : 'profiles';
        const updateData: any = { full_name: payload.full_name };

        // 1. Roles con email real
        if (payload.role !== 'operativo' && payload.type !== 'client') {
             updateData.email = payload.email; updateData.role = payload.role;
        }
        // 2. Operativos (Vínculo Kiosco + Email interno)
        if (payload.role === 'operativo') {
             updateData.role = 'operativo'; updateData.pin = payload.pin;
             updateData.linked_kiosk_email = payload.linked_kiosk_email; 
             if (payload.id === 'new') {
                 const uniqueSuffix = Math.floor(Math.random() * 100000);
                 const cleanName = payload.full_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 10);
                 updateData.email = `op.${cleanName}.${uniqueSuffix}@internal.cmw`;
             }
        }
        // 3. Clientes
        if (payload.type === 'client') {
            updateData.email = payload.email; updateData.organization = payload.company; 
            updateData.position = payload.position; updateData.phone = payload.phone;
        }
        if (payload.password) updateData.password = payload.password;

        if (payload.id === 'new') { await supabase.from(table).insert([updateData]); } 
        else { await supabase.from(table).update(updateData).eq('id', payload.id); }

        setEditingUser(null);
        await fetchData();
        alert("✅ Guardado correctamente");
    } catch (e: any) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  // --- LÓGICA DE CLIENTES (Aprobar/Rechazar) ---
  const handleClientAction = async (action: 'approve' | 'reject', payload: any) => {
      if (processing) return; setProcessing(true);
      try {
        if (currentUserRole !== 'superadmin') throw new Error("Requiere Superadmin");
        if (!confirm(action === 'approve' ? "¿Aprobar?" : "¿Eliminar?")) return;
        if (action === 'reject') { await supabase.from('clients').delete().eq('id', payload.id); } 
        else { const pass = payload.password || `Cmw${new Date().getFullYear()}!`; await supabase.from('clients').update({ status: 'active', password: pass }).eq('id', payload.id); alert(`Clave: ${pass}`); }
        await fetchData();
      } catch(e:any) { alert(e.message); } finally { setProcessing(false); }
  };

  // --- LÓGICA DE TICKETS ---
  const openTicketDetails = (ticket: any) => {
    setTempAssignment({ status: ticket.status, coord: ticket.coordinator_id || '', oper: ticket.operative_id || '' });
    setNewComment(""); setModals({ ...modals, details: ticket });
  };

  const handleSaveChanges = async () => { 
    if(!modals.details) return; setProcessing(true);
    try { const changes = []; if(tempAssignment.status !== modals.details.status) changes.push(`Estatus: ${modals.details.status} ➝ ${tempAssignment.status}`); if(tempAssignment.coord != (modals.details.coordinator_id || '')) changes.push(`Coordinador actualizado`); if(tempAssignment.oper != (modals.details.operative_id || '')) changes.push(`Operativo actualizado`); if(changes.length === 0) { alert("No hay cambios."); setProcessing(false); return; } const newLog = { date: new Date().toISOString(), changer: currentUserName, role: currentUserRole, type: 'system', action: changes.join(" | ") }; const currentLogs = modals.details.logs || []; const updatedLogs = [newLog, ...currentLogs]; const { error } = await supabase.from('tickets').update({ status: tempAssignment.status, coordinator_id: tempAssignment.coord || null, operative_id: tempAssignment.oper || null, logs: updatedLogs }).eq('id', modals.details.id); if(error) throw error; await fetchData(); setModals(prev => ({ ...prev, details: { ...prev.details, status: tempAssignment.status, logs: updatedLogs, coordinator_id: tempAssignment.coord, operative_id: tempAssignment.oper } })); alert("✅ Orden actualizada"); } catch (e: any) { alert(e.message); } finally { setProcessing(false); }
  };

  const handleAddComment = async () => { 
    if(!newComment.trim() || !modals.details) return; setProcessing(true);
    try { const commentLog = { date: new Date().toISOString(), changer: currentUserName, role: currentUserRole, type: 'comment', action: newComment }; const currentLogs = modals.details.logs || []; const updatedLogs = [commentLog, ...currentLogs]; const { error } = await supabase.from('tickets').update({ logs: updatedLogs }).eq('id', modals.details.id); if (error) throw error; const updatedTicket = { ...modals.details, logs: updatedLogs }; setModals({ ...modals, details: updatedTicket }); setNewComment(""); const updatedTickets = data.tickets.map(t => t.id === modals.details.id ? updatedTicket : t); setData({ ...data, tickets: updatedTickets }); } catch(e: any) { alert(e.message); } finally { setProcessing(false); }
  };

  const downloadCSV = () => { 
    const headers = ["Empresa", "Contacto", "Email", "Tickets"]; const rows = clients.map(c => [`"${c.company}"`, c.full_name, c.email, data.tickets.filter(t=>t.client_email===c.email).length].join(",")); const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURI([headers.join(","), ...rows].join("\n")); link.download = "clientes.csv"; link.click();
  };

  if (modals.sim) return <ClientMirrorView client={modals.sim} tickets={data.tickets} onExit={() => setModals({...modals, sim: null})} />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 pb-24">
      
      {/* HEADER HERO */}
      <div className="bg-[#0a1e3f] p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] text-white shadow-2xl mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-4">
        <div className="relative z-10"><h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">¡Hola, {currentUserName.split(' ')[0]}! 👑</h1><p className="text-blue-200 text-xs md:text-sm font-medium mt-1">Sistema 100% operativo.</p></div>
        <div className="flex items-center gap-4 self-end md:self-auto z-10">
            <button onClick={() => setShowKioskModal(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl backdrop-blur-sm transition-all border border-white/10 group"><Monitor size={20}/><div className="text-left hidden md:block"><p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none">Probar</p><p className="text-sm font-bold leading-none mt-1">Acceso Kiosco</p></div></button>
            <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/10"><Star className="text-amber-400 fill-amber-400" size={24} /><div><p className="text-xl md:text-2xl font-black leading-none">{stats.rating}</p><p className="text-[8px] md:text-[9px] uppercase opacity-70">Calidad</p></div></div>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 w-fit mb-6 md:mb-8 min-w-max">
            {[{ id: 'ops', icon: Zap, label: 'Operaciones' }, { id: 'staff', icon: Users, label: 'Staff' }, { id: 'clients', icon: Building2, label: 'Clientes' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 md:gap-3 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.id ? 'bg-[#0a1e3f] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><t.icon size={16} strokeWidth={2.5}/> {t.label}</button>))}
        </div>
      </div>

      {/* VISTA OPERACIONES */}
      {tab === 'ops' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input className="w-full bg-slate-50 rounded-full py-3 pl-10 pr-4 text-xs font-bold outline-none" placeholder="Buscar folio, cliente..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
            </div>
            <select className="bg-slate-50 rounded-full px-4 py-3 text-[10px] font-black uppercase outline-none cursor-pointer" value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})}><option value="todos">Mes</option>{MONTHS.map(m=><option key={m.val} value={m.val}>{m.label}</option>)}</select>
          </div>
          {/* Tabla */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-black border-b border-slate-100"><tr><th className="p-6 pl-8">Folio / Servicio</th><th className="p-6">Datos Cliente</th><th className="p-6">Estado</th><th className="p-6">Asignación</th><th className="p-6 text-right pr-8">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {ticketsFiltered.map(t => {
                        const coordinator = data.users.find(u => u.id === t.coordinator_id);
                        const operative = data.users.find(u => u.id === t.operative_id);
                        return (
                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="p-6 pl-8"><span className="bg-[#0a1e3f] text-white text-[9px] font-black px-2 py-1 rounded-md uppercase mb-1 inline-block">{t.codigo_servicio}</span><p className="font-black text-[#0a1e3f] uppercase text-sm">{t.service_type}</p></td>
                            <td className="p-6"><div className="flex items-center gap-2 mb-1"><User size={12} className="text-slate-400"/><span className="font-bold text-slate-700 uppercase">{t.full_name}</span></div><div className="flex items-center gap-2"><MapPin size={12} className="text-blue-500"/><span className="text-[10px] font-bold text-slate-500 uppercase">{t.location || 'Sin ubicación'}</span></div></td>
                            <td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${t.status === 'Sin asignar' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>{t.status}</span></td>
                            <td className="p-6"><div className="space-y-1">{coordinator ? (<p className="text-[10px] font-bold text-slate-600 flex items-center gap-1"><UserCog size={10} className="text-blue-500"/> {coordinator.full_name}</p>) : <p className="text-[9px] text-slate-300 italic">-- Coord</p>}{operative ? (<p className="text-[10px] font-bold text-slate-600 flex items-center gap-1"><HardHat size={10} className="text-orange-500"/> {operative.full_name}</p>) : <p className="text-[9px] text-slate-300 italic">-- Oper</p>}</div></td>
                            <td className="p-6 pr-8 text-right"><button onClick={() => openTicketDetails(t)} className="bg-[#0a1e3f] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2 ml-auto"><Zap size={14}/> Abrir</button></td>
                        </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA STAFF (COMPONENTE IMPORTADO) */}
      {tab === 'staff' && (
        <StaffTab 
            staffList={staff} 
            currentUserRole={currentUserRole} 
            onEdit={setEditingUser} 
            onCreate={handlePrepareCreate}
        />
      )}

      {/* VISTA CLIENTES */}
      {tab === 'clients' && (
        <div className="animate-in fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 pl-4 pr-2 rounded-[2rem] shadow-sm border border-slate-100 gap-2">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide p-1">
                    <button onClick={() => setClientSubTab('active')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${clientSubTab === 'active' ? 'bg-[#0a1e3f] text-white' : 'text-slate-400'}`}>Directorio</button>
                    <button onClick={() => setClientSubTab('requests')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 whitespace-nowrap ${clientSubTab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Solicitudes {requests.length > 0 && <span className="bg-white text-blue-600 px-1.5 rounded-md text-[9px]">{requests.length}</span>}</button>
                </div>
                <div className="flex gap-2 items-center">
                    {currentUserRole === 'superadmin' && clientSubTab === 'active' && (
                        <button onClick={() => handlePrepareCreate('client')} className="flex items-center gap-2 bg-[#0a1e3f] hover:bg-blue-800 text-white px-4 py-2 rounded-xl shadow-md transition-all text-[10px] font-black uppercase mr-2"><Plus size={14} /> Nuevo</button>
                    )}
                    <button onClick={fetchData} className="p-2.5 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><RefreshCw size={14}/></button>
                    {clientSubTab === 'active' && <button onClick={downloadCSV} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100" title="Exportar CSV"><Download size={14}/></button>}
                </div>
            </div>
            
            {/* TABLA CLIENTES */}
            {clientSubTab === 'active' && (
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-black border-b border-slate-100"><tr><th className="p-5 pl-8">Organización</th><th className="p-5">Contacto</th><th className="p-5">Accesos</th><th className="p-5 text-center">Tickets</th><th className="p-5 text-right pr-8">Gestión</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {clients.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 group">
                                        <td className="p-5 pl-8"><div className="font-black text-[#0a1e3f] text-sm uppercase">{c.company}</div></td>
                                        <td className="p-5"><div className="font-bold text-slate-600">{c.full_name}</div><div className="text-[10px] text-slate-400">{c.email}</div></td>
                                        <td className="p-5"><div className="flex items-center gap-2 bg-amber-50 w-fit px-3 py-1.5 rounded-lg border border-amber-100"><span className="font-mono text-[10px] font-bold text-slate-600 tracking-widest min-w-[60px]">{passVisible[c.id] ? (c.password_view || c.password) : '••••••'}</span>{currentUserRole === 'superadmin' && (<button onClick={() => setPassVisible({...passVisible, [c.id]: !passVisible[c.id]})} className="text-amber-500 hover:text-amber-700">{passVisible[c.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button>)}</div></td>
                                        <td className="p-5 text-center"><span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black">{data.tickets.filter(t => t.client_email === c.email).length}</span></td>
                                        <td className="p-5 pr-8 text-right flex justify-end gap-2"><button onClick={()=>setModals({...modals, sim: c})} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-[#0a1e3f] hover:text-white" title="Modo Espejo"><MonitorPlay size={16}/></button><button onClick={()=>{setEditingUser(c)}} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white" title="Editar"><Edit size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SOLICITUDES */}
            {clientSubTab === 'requests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.length === 0 && <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs col-span-2">Sin solicitudes pendientes</div>}
                    {requests.map(req => (
                        <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-md relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
                            <div className="flex justify-between items-start mb-4 mt-2">
                                <div><h3 className="text-lg font-black text-[#0a1e3f] uppercase">{req.company || 'Sin Empresa'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Briefcase size={10}/> {req.position || 'N/A'}</p></div>
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[9px] font-black uppercase">Nueva</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 mb-4 text-slate-600"><p><strong>Contacto:</strong> {req.full_name}</p><p><strong>Email:</strong> {req.email}</p><p><strong>Tel:</strong> {req.phone}</p></div>
                            {currentUserRole === 'superadmin' && (
                                <div className="flex gap-2"><button onClick={() => handleClientAction('reject', req)} className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase border border-red-100 text-red-500 hover:bg-red-50">Rechazar</button><button onClick={() => handleClientAction('approve', req)} className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-[#0a1e3f] text-white hover:bg-blue-700">Aprobar</button></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {/* MODALES */}
      {/* 1. EDICIÓN / CREACIÓN (COMPONENTE IMPORTADO) */}
      {editingUser && (
        <EditUserModal 
            user={editingUser} 
            kioskMasters={kioskMasters} 
            currentUserRole={currentUserRole}
            onClose={() => setEditingUser(null)} 
            onSave={handleSaveUser}
            isProcessing={processing}
        />
      )}

      {/* 2. DETALLES DE TICKET (MODAL ORIGINAL INTEGRADO AQUÍ PARA SIMPLICIDAD) */}
      {modals.details && (
        <div className="fixed inset-0 z-[150] flex justify-center items-end md:items-center animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setModals({...modals, details:null})}></div>
            <div className="relative w-full md:max-w-6xl h-[95vh] md:h-[85vh] bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                {/* Header Ticket */}
                <div className="bg-[#0a1e3f] px-6 py-5 md:px-8 md:py-6 text-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1"><span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-blue-100 border border-white/10 tracking-widest">{modals.details.codigo_servicio}</span><span className="text-[10px] opacity-60 font-medium">{new Date(modals.details.created_at).toLocaleDateString()}</span></div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">{modals.details.service_type}</h2>
                    </div>
                    <button onClick={() => setModals({...modals, details:null})} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><XCircle size={24}/></button>
                </div>
                {/* Cuerpo Ticket */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 border-r border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Zap size={14}/> Expediente</h3>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Solicitante</p><p className="text-sm font-bold text-[#0a1e3f] flex items-center gap-2"><User size={16} className="text-blue-500"/> {modals.details.full_name}</p></div>
                                <div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Ubicación</p><p className="text-sm font-bold text-[#0a1e3f] flex items-center gap-2"><MapPin size={16} className="text-red-500"/> {modals.details.location}</p></div>
                            </div>
                            <div className="h-px bg-slate-100 w-full"></div>
                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-2">Reporte</p><div className="bg-slate-50 p-4 rounded-2xl text-sm text-slate-600 italic leading-relaxed border border-slate-100">"{modals.details.description}"</div></div>
                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1"><ImageIcon size={10}/> Evidencia</p>{modals.details.evidencia_url ? (<div className="rounded-2xl overflow-hidden border border-slate-200 h-48 bg-slate-100 group relative"><img src={modals.details.evidencia_url} alt="Evidencia" className="w-full h-full object-cover"/><a href={modals.details.evidencia_url} target="_blank" className="absolute bottom-2 right-2 bg-black/50 text-white text-[9px] px-2 py-1 rounded backdrop-blur-md">Ver Full</a></div>) : (<div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center"><p className="text-[10px] text-slate-300 font-black uppercase">Sin evidencia</p></div>)}</div>
                        </div>
                    </div>
                    <div className="w-full md:w-[400px] bg-white p-6 md:p-8 overflow-y-auto flex flex-col gap-8 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><UserCog size={14}/> Gestión</h3>
                            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-slate-100">
                                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Estatus</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={tempAssignment.status} onChange={(e) => setTempAssignment({...tempAssignment, status: e.target.value})}>{ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Coordinador</label><select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={tempAssignment.coord} onChange={(e) => setTempAssignment({...tempAssignment, coord: e.target.value})}><option value="">-- Sin Asignar --</option>{coordinators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
                                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400">Operativo</label><select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={tempAssignment.oper} onChange={(e) => setTempAssignment({...tempAssignment, oper: e.target.value})}><option value="">-- Sin Asignar --</option>{operatives.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}</select></div>
                                <button onClick={handleSaveChanges} disabled={processing} className="w-full bg-[#0a1e3f] text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-2 mt-2">{processing ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>} Actualizar</button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><History size={14}/> Bitácora</h3>
                            <div className="flex gap-2 mb-6"><input type="text" placeholder="Nota..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}/><button onClick={handleAddComment} disabled={!newComment.trim() || processing} className="bg-[#0a1e3f] text-white p-3 rounded-xl hover:bg-blue-800"><Send size={16}/></button></div>
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 pb-4">
                                {modals.details.logs?.map((log: any, idx: number) => (
                                    <div key={idx} className="relative pl-6">
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.type === 'comment' ? 'bg-amber-400' : 'bg-blue-500'}`}></div>
                                        <div className="flex justify-between items-start mb-1"><span className="text-[9px] font-black uppercase text-slate-500">{log.changer || 'Sistema'}</span><span className="text-[8px] font-bold text-slate-300">{new Date(log.date).toLocaleDateString()}</span></div>
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

      {showKioskModal && <OperativeAccessModal onClose={() => setShowKioskModal(false)} />}
    </div>
  );
}