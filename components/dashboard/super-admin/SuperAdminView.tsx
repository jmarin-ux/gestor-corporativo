'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Zap, Users, Building2, Search, RefreshCw,
  DollarSign, UserPlus, Calendar as CalendarIcon, 
  Database, LayoutGrid, Check, X, Clock // ✅ Clock añadido
} from 'lucide-react';

// --- IMPORTACIONES DE COMPONENTES ---
import ServiceTable from '@/components/dashboard/ServiceTable';
import StaffSection from './StaffSection';
import ClientsSection from './ClientsSection';
import AssetsTab from '../AssetsTab';
import PlannerView from '@/components/dashboard/PlannerView';
import ServiceDetailModal from '@/components/dashboard/ServiceDetailModal';
import AttendanceView from './AttendanceView'; // ✅ Vista de Asistencia añadida
import Header from '@/components/ui/Header';

interface SuperAdminViewProps {
  currentUser: any;
  onRefresh?: () => void;
  // Permitimos props extra para evitar errores de TypeScript estrictos
  [key: string]: any;
}

export default function SuperAdminView({ currentUser }: SuperAdminViewProps) {
  
  // --- ESTADOS DE DATOS GLOBALES ---
  const [data, setData] = useState<{
    tickets: any[],
    requests: any[]
  }>({
    tickets: [],
    requests: []
  });

  const [loading, setLoading] = useState(true);
  // ✅ Añadido 'attendance' al tipo del estado tab
  const [tab, setTab] = useState<'ops' | 'staff' | 'clients' | 'planner' | 'assets' | 'requests' | 'attendance'>('ops');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: '',
  });

  // --- CARGA DE DATOS (Solo Operaciones y Solicitudes) ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        // 1. Tickets
        supabase
          .from('tickets')
          .select('*')
          .neq('status', 'Cancelado')
          .order('created_at', { ascending: false }),

        // 2. Solicitudes de Acceso
        supabase
          .from('access_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      setData({
        tickets: t.data || [],
        requests: r.data || []
      });

    } catch (e) {
      console.error("Error al cargar datos:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- MANEJADORES DE SOLICITUDES ---
  const handleApproveClient = async (request: any) => {
    if (!confirm(`¿Confirmas la aprobación para ${request.full_name}?`)) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          full_name: request.full_name,
          organization: request.organization
        })
      });

      if (response.ok) {
        await supabase.from('access_requests').update({ status: 'approved' }).eq('id', request.id);
        alert("Invitación enviada con éxito.");
        fetchData();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo en la invitación');
      }
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("¿Deseas rechazar esta solicitud?")) return;
    await supabase.from('access_requests').update({ status: 'rejected' }).eq('id', id);
    fetchData();
  };

  // --- CÁLCULOS RAPIDOS (Solo para el banner) ---
  const stats = {
      revenue: data.tickets.reduce((acc: number, t: any) => acc + (Number(t.quote_amount || 0) * 1.16), 0)
  };

  return (
    <>
      <Header
        user={currentUser}
        currentRole={currentUser.role}
        onChangeRole={(role) => console.log("Cambio de rol:", role)}
      />

      <div className="space-y-6 pb-20 pt-4 md:pt-8 animate-in fade-in duration-500 text-left bg-slate-50/50 min-h-screen">

        {/* BANNER PRINCIPAL */}
        <div className="mx-4 md:mx-8">
          <div className="bg-[#0a1e3f] p-8 md:p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative z-10">
              <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                <LayoutGrid size={32} className="text-[#00C897]" />
                Panel Maestro
              </h1>
              <p className="text-[#00C897] text-[10px] font-bold uppercase tracking-[0.3em] mt-1 pl-1">
                Bienvenido, {currentUser?.full_name?.split(' ')[0]}
              </p>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className="bg-white/10 px-6 py-4 rounded-[2rem] border border-white/10 flex items-center gap-4 shadow-xl backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00C897]/20">
                  <DollarSign className="text-[#00C897]" size={24} />
                </div>
                <div>
                  <p className="text-xl font-black leading-none tabular-nums">
                    ${stats.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1">
                    Ingresos Totales (INC. IVA)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 space-y-6">

          {/* MENÚ DE TABS */}
          <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] shadow-sm border border-slate-100 w-full overflow-x-auto gap-2 flex items-center justify-start md:justify-center">
            {[
              { id: 'ops', icon: Zap, label: 'Operaciones' },
              { id: 'planner', icon: CalendarIcon, label: 'Planificador' },
              { id: 'attendance', icon: Clock, label: 'Asistencia' }, // ✅ Pestaña Asistencia
              { id: 'requests', icon: UserPlus, label: `Solicitudes (${data.requests.length})` },
              { id: 'staff', icon: Users, label: 'Personal' },
              { id: 'assets', icon: Database, label: 'Activos' },
              { id: 'clients', icon: Building2, label: 'Clientes' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t.id
                    ? 'bg-[#0a1e3f] text-white shadow-lg scale-105'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
              >
                <t.icon size={14} strokeWidth={3} /> {t.label}
              </button>
            ))}
          </div>

          {/* BARRA DE BÚSQUEDA (Solo visible en Operaciones y Solicitudes) */}
          {(tab === 'ops') && (
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  className="w-full bg-slate-50 rounded-[1.5rem] py-4 pl-14 pr-4 text-sm font-bold outline-none uppercase placeholder:text-slate-300"
                  placeholder="BUSCAR REGISTROS..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value.toUpperCase() })}
                />
              </div>
              <button onClick={fetchData} className="p-4 bg-slate-50 text-[#00C897] rounded-full hover:bg-emerald-50 transition-colors">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}

          {/* VISTAS */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-700 min-h-[500px]">

            {/* 1. OPERACIONES */}
            {tab === 'ops' && (
              <ServiceTable
                services={data.tickets.filter(t => 
                   JSON.stringify(t).toUpperCase().includes(filters.search)
                )}
                staff={[]} 
                currentUser={currentUser}
                onRefresh={fetchData}
                onOpenDetails={setSelectedTicket}
              />
            )}

            {/* 2. SOLICITUDES */}
            {tab === 'requests' && (
              <div className="grid grid-cols-1 gap-4">
                {data.requests.length === 0 && (
                  <div className="text-center py-20 text-slate-400">
                    <p className="text-sm font-bold uppercase">No hay solicitudes pendientes</p>
                  </div>
                )}
                {data.requests.map((req: any) => (
                  <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-sm">{req.full_name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{req.organization} • {req.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApproveClient(req)}
                        className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                      >
                        <Check size={16} /> Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. PLANIFICADOR */}
            {tab === 'planner' && (
                <PlannerView 
                    currentUser={currentUser} 
                    onBack={() => setTab('ops')}
                />
            )}

            {/* 4. PERSONAL */}
            {tab === 'staff' && (
                <StaffSection currentUser={currentUser} />
            )}

            {/* 5. ACTIVOS */}
            {tab === 'assets' && (
                <AssetsTab currentUser={currentUser} />
            )}

            {/* 6. CLIENTES */}
            {tab === 'clients' && (
                <ClientsSection currentUser={currentUser} />
            )}

            {/* 7. ASISTENCIA (NUEVO) */}
            {tab === 'attendance' && (
                <AttendanceView />
            )}

          </div>
        </div>
      </div>

      {/* MODAL DETALLES TICKET */}
      {selectedTicket && (
        <ServiceDetailModal
          isOpen={!!selectedTicket}
          ticket={selectedTicket}
          currentUser={currentUser}
          onClose={() => setSelectedTicket(null)}
          onUpdate={fetchData}
        />
      )}
    </>
  );
}