'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

// --- COMPONENTES ---
import PlannerView from '@/components/dashboard/PlannerView';
import AssetsTab from '@/components/dashboard/AssetsTab';
import StaffSection from '@/components/dashboard/super-admin/StaffSection';
import ClientsSection from '@/components/dashboard/super-admin/ClientsSection';
import ServiceTable from '@/components/dashboard/ServiceTable';
import ClientMirrorView from '@/components/dashboard/ClientMirrorView';
import ServiceDetailModal from '@/components/dashboard/ServiceDetailModal';
import GlobalAdminModal from '@/components/dashboard/super-admin/GlobalAdminModal';
import EditAssetModal from '@/components/dashboard/super-admin/EditAssetModal';
import RolesManager from '@/components/dashboard/super-admin/RolesManager';
import AttendanceModal from '@/components/dashboard/AttendanceModal';
// 1. IMPORTAMOS LA VISTA DE ASISTENCIA
import AttendanceView from '@/components/dashboard/super-admin/AttendanceView'; 

// --- ICONOS ---
import { Search, RefreshCw, LayoutGrid, LogOut, Loader2, Settings, Camera, Clock } from 'lucide-react'; 

// Tipos de pestañas
type Tab = 'operaciones' | 'planificador' | 'personal' | 'activos' | 'clientes' | 'configuracion' | 'asistencia';

export default function DashboardPage() {
  const router = useRouter();
  
  // --- ESTADOS DE UI ---
  const [activeTab, setActiveTab] = useState<Tab>('operaciones');
  const [loading, setLoading] = useState(true);
  const [showAttendance, setShowAttendance] = useState(false);
  
  // --- ESTADOS DE DATOS ---
  const [user, setUser] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  
  // Base de datos local
  const [data, setData] = useState<{ tickets: any[], users: any[], assets: any[], clients: any[] }>({ 
    tickets: [], 
    users: [], 
    assets: [], 
    clients: [] 
  });

  // --- MODALES ---
  const [modals, setModals] = useState<{ details: any, sim: any, admin: any, asset: any }>({ 
    details: null, sim: null, admin: null, asset: null 
  });

  // --- FILTROS ---
  const [filters, setFilters] = useState({ 
    search: '', month: 'todos', year: new Date().getFullYear().toString() 
  });

  // 1. CARGA DE DATOS
  const fetchData = useCallback(async (currentUser: any) => {
    if (!currentUser?.id || !currentUser?.role) return;
    
    const role = (currentUser.role || '').toLowerCase().trim();
    if (role === 'client' || role === 'cliente') return;

    setLoading(true);
    try {
      let ticketsQuery = supabase.from('tickets').select('*').order('created_at', { ascending: false });

      if (role === 'coordinador') {
         ticketsQuery = ticketsQuery.or(`coordinator_id.eq.${currentUser.id},coordinador_id.eq.${currentUser.id}`);
      }

      const [tRes, pRes, aRes, cRes] = await Promise.all([
        ticketsQuery,
        supabase.from('profiles').select('*').order('full_name'), 
        supabase.from('assets').select('*'),
        supabase.from('clients').select('*'),
      ]);

      const rawTickets = tRes.data || [];
      const rawClients = cRes.data || [];

      const processedTickets = rawTickets.map((ticket: any) => {
          const clientMatch = rawClients.find((c: any) => 
              (c.email && c.email === ticket.client_email) || 
              (c.organization && c.organization === ticket.company)
          );

          return {
              ...ticket,
              client: clientMatch || { 
                  full_name: ticket.contact_name || ticket.company || 'CLIENTE EXTERNO', 
                  organization: ticket.company || 'Particular',
                  email: ticket.client_email 
              }
          };
      });

      setData({ 
        tickets: processedTickets, 
        users: pRes.data ?? [], 
        assets: aRes.data ?? [], 
        clients: rawClients 
      });

    } catch (e) { 
      console.error("Error cargando dashboard:", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  // 2. SEGURIDAD Y ARRANQUE
  useEffect(() => {
    let alive = true;
    const boot = async () => {
      setLoading(true);
      const { data: sessionWrap } = await supabase.auth.getSession();
      
      if (!sessionWrap?.session?.user) { router.replace('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', sessionWrap.session.user.id).maybeSingle();

      if (!profile) { await supabase.auth.signOut(); router.replace('/login'); return; }

      const role = (profile.role || '').toLowerCase().trim();
      
      if (['client', 'cliente'].includes(role)) { router.replace('/accesos/cliente'); return; }

      if (alive) {
        setUser(profile);
        setCurrentUserName(profile.full_name || 'Usuario');
        setCurrentUserRole(role); 
        await fetchData(profile);
      }
    };
    boot();
    return () => { alive = false; };
  }, [fetchData, router]);

  // 3. LÓGICA DE VISUALIZACIÓN
  const ticketsFiltered = useMemo(() => {
    const term = filters.search.toLowerCase();
    return (data.tickets || []).filter((t: any) => {
      const matchText = (
        (t.codigo_servicio || '').toLowerCase().includes(term) || 
        (t.client?.full_name || '').toLowerCase().includes(term) ||
        (t.company || '').toLowerCase().includes(term) ||
        (t.service_type || '').toLowerCase().includes(term)
      );
      return matchText;
    });
  }, [data.tickets, filters]);

  // 👇 4. CONFIGURACIÓN DE PESTAÑAS (CORREGIDO: Sin duplicados)
  const visibleTabs = useMemo(() => {
      // Pestañas BASE que TODOS ven
      const tabs: Tab[] = ['operaciones', 'planificador', 'asistencia'];

      // Pestañas EXTRA para ADMIN y SUPERADMIN
      if (['superadmin', 'admin'].includes(currentUserRole)) {
          tabs.push('personal', 'clientes', 'activos'); // ✅ Agregamos activos aquí
      } 
      // Pestañas EXTRA para COORDINADOR
      else if (currentUserRole === 'coordinador') {
          tabs.push('clientes', 'activos'); // ✅ Coordinador también ve activos
      }
      
      return tabs;
  }, [currentUserRole]);

  const handleLogout = async () => {
    if (confirm("¿Deseas cerrar sesión?")) { 
      await supabase.auth.signOut(); 
      localStorage.clear(); 
      router.replace('/login'); 
    }
  };

  if (loading && !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#00C897]"/>
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Cargando Panel...</p>
      </div>
    );
  }

  if (modals.sim) {
    return <ClientMirrorView client={modals.sim} tickets={data.tickets} onExit={() => setModals({ ...modals, sim: null })} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <header className="bg-[#0a1e3f] text-white p-6 md:px-10 md:py-8 flex justify-between items-center shadow-2xl sticky top-0 z-30">
        <div className="flex items-center gap-4 text-left">
          <div className="bg-[#00C897] p-3 rounded-xl shadow-lg shadow-emerald-900/20">
            <LayoutGrid size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Wuotto<span className="text-[#00C897]">Systems</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel Administrativo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block border-r border-white/10 pr-6 mr-2">
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest text-left">Sesión Activa</p>
            <p className="text-sm font-black uppercase">{currentUserName}</p>
            <p className="text-[10px] font-bold text-[#00C897] uppercase">{currentUserRole}</p>
          </div>

          <button 
              onClick={() => setShowAttendance(true)}
              className="bg-white/10 hover:bg-white/20 px-4 py-3 rounded-2xl transition-all flex items-center gap-2 backdrop-blur-sm group border border-white/10"
              title="Marcar Asistencia"
          >
              <Camera size={20} className="text-[#00C897] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white hidden md:inline">
                  Asistencia
              </span>
          </button>

          {currentUserRole === 'superadmin' && (
            <button 
                onClick={() => setActiveTab('configuracion')}
                className={`p-3 rounded-xl transition-all border border-white/10 ${activeTab === 'configuracion' ? 'bg-[#00C897] text-[#0a1e3f] shadow-lg shadow-[#00C897]/50' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title="Configuración de Roles y Permisos"
            >
                <Settings size={20} className={activeTab === 'configuracion' ? 'animate-spin-slow' : ''} />
            </button>
          )}

          <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 p-3 rounded-xl transition-all border border-white/10" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="p-6 md:p-10 pb-24 max-w-[1900px] mx-auto">
        
        {/* BARRA DE TABS */}
        {activeTab !== 'configuracion' && (
             <div className="bg-white p-1.5 rounded-[2rem] shadow-sm inline-flex items-center gap-2 mb-8 border border-slate-100 flex-wrap sticky top-28 z-20">
             {visibleTabs.map((tab) => (
               <button key={tab} onClick={() => setActiveTab(tab as Tab)} className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-2 transition-all ${activeTab === tab ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                 {tab === 'asistencia' && <Clock size={14} strokeWidth={3}/>}
                 {tab}
               </button>
             ))}
           </div>
        )}

        {/* BOTÓN VOLVER (CONFIG) */}
        {activeTab === 'configuracion' && (
             <div className="mb-8 animate-in fade-in slide-in-from-left-4">
                 <button onClick={() => setActiveTab('operaciones')} className="bg-white px-6 py-3 rounded-full text-slate-500 hover:text-[#0a1e3f] hover:bg-blue-50 font-black text-xs uppercase flex items-center gap-2 transition-all shadow-sm border border-slate-100">
                     ← Volver al Panel
                 </button>
             </div>
        )}

        {/* --- VISTAS --- */}
        {activeTab === 'operaciones' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="flex gap-4 mb-8 bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input className="w-full bg-slate-50 rounded-full py-4 pl-12 pr-6 text-sm font-bold outline-none border border-transparent focus:border-[#00C897] transition-all uppercase placeholder:normal-case" 
                    placeholder="Buscar por folio, cliente o servicio..." 
                    value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} 
                  />
                </div>
                <button onClick={() => fetchData(user)} className="p-4 bg-slate-50 rounded-full hover:bg-[#0a1e3f] hover:text-white transition-all">
                   <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <ServiceTable services={ticketsFiltered} staff={data.users} currentUser={user} onOpenDetails={(t: any) => setModals({ ...modals, details: t })} onRefresh={() => fetchData(user)} />
          </div>
        )}

        {activeTab === 'planificador' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <PlannerView currentUser={user} onBack={() => setActiveTab('operaciones')} />
            </div>
        )}
        
        {/* VISTA DE ASISTENCIA */}
        {activeTab === 'asistencia' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <AttendanceView />
            </div>
        )}

        {activeTab === 'personal' && visibleTabs.includes('personal') && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <StaffSection currentUser={user} />
            </div>
        )}
        {activeTab === 'clientes' && visibleTabs.includes('clientes') && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <ClientsSection currentUser={user} />
            </div>
        )}
        {/* 👇 VISTA DE ACTIVOS (CORREGIDA: CONECTADA A DATOS) */}
        {activeTab === 'activos' && visibleTabs.includes('activos') && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <AssetsTab 
                    assets={data.assets} 
                    clients={data.clients} 
                    currentUser={user} 
                    onRefresh={() => fetchData(user)} 
                />
            </div>
        )}

        {activeTab === 'configuracion' && currentUserRole === 'superadmin' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <RolesManager />
            </div>
        )}

      </div>

      {/* --- MODALES FLOTANTES --- */}
      {showAttendance && (
        <AttendanceModal
            isOpen={true}
            onClose={() => setShowAttendance(false)}
            currentUser={user}
        />
      )}
      
      {modals.admin && (
        <GlobalAdminModal isOpen={!!modals.admin} user={modals.admin} currentUser={user} canEditSensitiveData={currentUserRole === 'superadmin'} onClose={() => setModals({ ...modals, admin: null })} onUpdate={() => fetchData(user)} />
      )}
      {modals.details && (
        <ServiceDetailModal isOpen={!!modals.details} ticket={modals.details} currentUser={user} staff={data.users} onClose={() => setModals({ ...modals, details: null })} onUpdate={() => fetchData(user)} />
      )}
      {modals.asset && (
        <EditAssetModal isOpen={!!modals.asset} asset={modals.asset} clients={data.clients} onClose={() => setModals({ ...modals, asset: null })} onUpdate={() => fetchData(user)} />
      )}
    </div>
  );
}