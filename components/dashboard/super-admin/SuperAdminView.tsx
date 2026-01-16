'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import {
  Zap, Users, Building2, Search, RefreshCw,
  DollarSign, Edit3, Plus, Check, X, UserPlus,
  Calendar as CalendarIcon, Database, LayoutGrid
} from 'lucide-react';

// --- IMPORTACIONES DE COMPONENTES ---
import ServiceTable from '@/components/dashboard/ServiceTable';
import StaffTab from './StaffTab';
import AssetsTab from '../AssetsTab';
import ClientMirrorView from '../ClientMirrorView';
import ServiceDetailModal from '@/components/dashboard/ServiceDetailModal';
import Planner from '@/components/dashboard/Planner';
import GlobalAdminModal from './GlobalAdminModal';
import EditAssetModal from './EditAssetModal';
import Header from '@/components/ui/Header';

interface SuperAdminViewProps {
  currentUser: any;
  onRefresh?: () => void;
  [key: string]: any;
}

export default function SuperAdminView({ currentUser }: SuperAdminViewProps) {
  // ✅ Permisos
  const roleLower = (currentUser?.role || '').toString().toLowerCase().trim();
  const isFullAdmin = ['superadmin', 'super admin', 'admin'].includes(roleLower);

  // --- ESTADOS DE DATOS ---
  const [data, setData] = useState<{
    tickets: any[],
    users: any[],
    rawClients: any[],
    rawAssets: any[],
    requests: any[]
  }>({
    tickets: [],
    users: [],
    rawClients: [],
    rawAssets: [],
    requests: []
  });

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ops' | 'staff' | 'clients' | 'planner' | 'assets' | 'requests'>('ops');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: '',
    month: 'todos',
    year: new Date().getFullYear().toString(),
    roleFilter: 'todos'
  });

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [simulatingClient, setSimulatingClient] = useState<any>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // --- CARGA MAESTRA ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ 2A) CARGA CON FILTRADO POR WHITELIST
      // Esto asegura que solo roles administrativos, operativos y kioscos entren en Profiles.
      const [t, p, c, a, r] = await Promise.all([
        supabase
          .from('tickets')
          .select('*')
          .neq('status', 'Cancelado')
          .order('created_at', { ascending: false }),

        // ✅ REEMPLAZO RECOMENDADO: Solo traer roles que pertenecen legalmente al Staff o Kioscos
        supabase
          .from('profiles')
          .select('*')
          .in('role', ['superadmin', 'admin', 'coordinador', 'operativo', 'tecnico', 'kiosco']),

        supabase
          .from('clients')
          .select('*')
          .order('organization', { ascending: true }),

        supabase
          .from('assets')
          .select('*')
          .order('nombre_activo', { ascending: true }),

        supabase
          .from('access_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      // 🔍 LOGS DE DEPURACIÓN TEMPORALES (Puedes eliminarlos después de verificar)
      console.log('PROFILES COUNT:', p.data?.length);
      console.log('HAS KIOSCO:', (p.data || []).some(x => (x.role || '').toLowerCase() === 'kiosco'));
      console.log('KIOSCO ROW:', (p.data || []).find(x => (x.role || '').toLowerCase() === 'kiosco'));

      const formattedClients = (c.data || []).map((x: any) => ({
        ...x, type: 'client', role: 'client', company: x.organization
      }));

      const formattedStaff = (p.data || []).map((x: any) => ({ ...x, type: 'staff' }));

      setData({
        tickets: t.data || [],
        users: [...formattedStaff, ...formattedClients],
        rawClients: c.data || [],
        rawAssets: a.data || [],
        requests: r.data || []
      });
    } catch (e) {
      console.error("Error crítico de sincronización:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- MANEJADORES DE ACCIÓN ---
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

  const handleSaveAsset = async (action: string, assetData: any) => {
    setLoading(true);
    try {
      if (action === 'create') {
        const finalId = assetData.identificador || `W${Math.floor(1000 + Math.random() * 9000)}`;
        const payload = { ...assetData, identificador: finalId };
        if (payload.id === 'new') delete payload.id;
        const { error } = await supabase.from('assets').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('assets').update(assetData).eq('id', assetData.id);
        if (error) throw error;
      }
      await fetchData();
      setEditingAsset(null);
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTROS ---
  const { staffFiltered, assetsFiltered, stats } = useMemo(() => {
    const term = filters.search.toLowerCase();

    const staff = data.users.filter((u: any) => {
      const matchSearch = u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
      const matchRole = filters.roleFilter === 'todos' || u.role === filters.roleFilter;
      return u.type === 'staff' && matchSearch && matchRole;
    });

    const assets = data.rawAssets.filter((a: any) => {
      return a.nombre_activo?.toLowerCase().includes(term) ||
        a.serie?.toLowerCase().includes(term) ||
        a.cliente_nombre?.toLowerCase().includes(term) ||
        a.identificador?.toLowerCase().includes(term);
    });

    const totalRevenue = data.tickets.reduce((acc: number, t: any) => acc + (Number(t.quote_amount || 0) * 1.16), 0);
    const rated = data.tickets.filter((t: any) => (t.satisfaction_rating || 0) > 0);
    const avg = rated.length ? (rated.reduce((a: number, b: any) => a + b.satisfaction_rating, 0) / rated.length).toFixed(1) : "0.0";

    return {
      staffFiltered: staff,
      assetsFiltered: assets,
      stats: { rating: avg, total: data.tickets.length, revenue: totalRevenue }
    };
  }, [data, filters]);

  if (simulatingClient) {
    return <ClientMirrorView client={simulatingClient} tickets={data.tickets} onExit={() => setSimulatingClient(null)} />;
  }

  return (
    <>
      <Header
        user={currentUser}
        currentRole={currentUser.role}
        onChangeRole={(role) => console.log("Cambio de rol:", role)}
      />

      <div className="space-y-6 pb-20 pt-4 md:pt-8 animate-in fade-in duration-500 text-left bg-slate-50/50 min-h-screen">

        {/* Banner */}
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

          {/* Tabs */}
          <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] shadow-sm border border-slate-100 w-full overflow-x-auto gap-2 flex items-center justify-start md:justify-center">
            {[
              { id: 'ops', icon: Zap, label: 'Operaciones' },
              { id: 'planner', icon: CalendarIcon, label: 'Planificador' },
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

          {/* Search */}
          {tab !== 'planner' && (
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

          {/* Views */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-700 min-h-[500px]">

            {tab === 'ops' && (
              <ServiceTable
                services={data.tickets}
                staff={data.users}
                currentUser={currentUser}
                onRefresh={fetchData}
                onOpenDetails={setSelectedTicket}
              />
            )}

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

            {tab === 'planner' && <Planner currentUser={currentUser} onRefresh={fetchData} />}

            {tab === 'staff' && (
              <div className="space-y-4">
                <div className="flex justify-end px-2">
                  <button
                    onClick={() => {
                      setEditingUser({
                        id: 'new',
                        type: 'staff',
                        full_name: '',
                        email: '',
                        role: 'operativo',
                        status: 'active',
                      });
                      setIsStaffModalOpen(true);
                    }}
                    className="bg-[#00C897] text-[#0a1e3f] px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all"
                  >
                    <Plus size={16} /> Añadir Personal
                  </button>
                </div>

                <StaffTab
                  staffList={staffFiltered}
                  currentUserRole={currentUser?.role}
                  canEditSensitive={true}
                  onEdit={(u: any) => {
                    setEditingUser(u);
                    setIsStaffModalOpen(true);
                  }}
                  hideSearch={true}
                />
              </div>
            )}

            {tab === 'assets' && (
              <AssetsTab
                assets={assetsFiltered}
                clients={data.rawClients}
                currentUser={currentUser}
                onEdit={setEditingAsset}
                onCreate={() => setEditingAsset({ id: 'new' })}
                onRefresh={fetchData}
              />
            )}

            {tab === 'clients' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.rawClients.map((client: any) => (
                  <div key={client.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl group transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-slate-900 rounded-2xl text-white"><Users size={24} /></div>
                        <div>
                          <h3 className="font-black uppercase text-slate-800 text-sm">{client.full_name || 'Sin Nombre'}</h3>
                          <span className="text-[10px] font-black bg-[#00C897]/10 text-[#00C897] px-3 py-1 rounded-full uppercase mt-1 inline-block">
                            {client.organization}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const coordinators = data.users.filter((u: any) => u.role === 'coordinador' || u.role === 'admin' || u.role === 'superadmin');
                          setEditingUser({ ...client, type: 'client', role: 'client', availableCoordinators: coordinators });
                          setIsStaffModalOpen(true);
                        }}
                        className="p-3 text-slate-300 hover:text-[#00C897] transition-colors bg-slate-50 rounded-xl"
                      >
                        <Edit3 size={18} />
                      </button>
                    </div>
                    <button
                      onClick={() => setSimulatingClient(client)}
                      className="w-full bg-[#0a1e3f] text-white py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-[#00C897] transition-all tracking-widest"
                    >
                      Ver como Cliente
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modales */}
      {selectedTicket && (
        <ServiceDetailModal
          isOpen={!!selectedTicket}
          ticket={selectedTicket}
          currentUser={currentUser}
          onClose={() => setSelectedTicket(null)}
          onUpdate={fetchData}
        />
      )}

      {isStaffModalOpen && (
        <GlobalAdminModal
          isOpen={isStaffModalOpen}
          user={editingUser}
          currentUser={currentUser}
          canEditSensitiveData={isFullAdmin}
          onClose={() => {
            setIsStaffModalOpen(false);
            setEditingUser(null);
          }}
          onUpdate={fetchData}
        />
      )}

      {editingAsset && (
        <EditAssetModal
          isOpen={true}
          asset={editingAsset}
          clients={data.rawClients}
          onClose={() => setEditingAsset(null)}
          onSave={handleSaveAsset}
          onUpdate={fetchData}
        />
      )}
    </>
  );
}