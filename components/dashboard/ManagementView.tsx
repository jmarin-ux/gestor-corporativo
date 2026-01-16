'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Briefcase, Calendar, FileText, Users, Building2, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

// ✅ IMPORTACIÓN DEL CEREBRO DE REGLAS
import { ticketsVisibilityQuery, type UserRole } from '@/lib/tickets.rules';

// COMPONENTES DE VISTA
import PlannerView from './PlannerView';
import OperativeView from './OperativeView';
import ServiceTable from './ServiceTable';
import AssetsTab from './AssetsTab';

// COMPONENTES ADMINISTRATIVOS (Super-Admin)
import StaffSection from './super-admin/StaffSection';
import ClientsSection from './super-admin/ClientsSection';

interface ManagementViewProps {
  currentUser: any;
}

/**
 * Normaliza el rol del usuario para asegurar compatibilidad con el sistema de tipos.
 */
function normalizeRole(raw: any): UserRole {
  const r = (raw || 'cliente').toString().toLowerCase().trim();
  if (r === 'super_admin' || r === 'super-admin') return 'superadmin';
  if (r === 'coordinator') return 'coordinador';
  if (r === 'technician' || r === 'tecnico') return 'operativo';
  if (r === 'superadmin' || r === 'admin' || r === 'coordinador' || r === 'operativo' || r === 'cliente') {
    return r as UserRole;
  }
  return 'cliente';
}

export default function ManagementView({ currentUser }: ManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'operativo' | 'planificador' | 'solicitudes' | 'staff' | 'clientes' | 'activos'>(
    'solicitudes'
  );

  // ESTADOS DE DATOS GLOBALES
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); 

  const role = useMemo(() => normalizeRole(currentUser?.role), [currentUser?.role]);

  /**
   * Carga masiva de datos necesarios para el dashboard según el rol del usuario.
   */
  const loadDashboardData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      // 1) Carga de Staff (Profiles) para selects y gestión
      const staffRes = await supabase
        .from('profiles')
        .select('id, full_name, role, position, email')
        .order('full_name');

      // 2) Carga de Clientes (Base para ClientsSection y Modales)
      const clientsRes = await supabase
        .from('clients')
        .select('*')
        .order('organization');

      // 3) Carga de Tickets usando la lógica de visibilidad por rol
      const ticketsRes = await ticketsVisibilityQuery(supabase, {
        id: currentUser?.id,
        role,
        email: currentUser?.email,
        full_name: currentUser?.full_name,
      })
        .neq('status', 'Cerrado')
        .neq('status', 'Cancelado')
        .neq('status', 'CERRADO')
        .neq('status', 'CANCELADO')
        .order('created_at', { ascending: false });

      setStaff(staffRes.data || []);
      setClients(clientsRes.data || []); 
      setTickets((ticketsRes as any).data || []);
    } catch (e) {
      console.error('loadDashboardData error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, role]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const tabs = useMemo(() => [
    { id: 'operativo', label: 'Operativo', icon: Briefcase },
    { id: 'planificador', label: 'Planificador', icon: Calendar },
    { id: 'solicitudes', label: 'Solicitudes', icon: FileText },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'clientes', label: 'Clientes', icon: Building2 },
    { id: 'activos', label: 'Activos', icon: Package },
  ] as const, []);

  /**
   * Maneja el renderizado del contenido según la pestaña activa.
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 font-bold gap-3">
          <Loader2 className="animate-spin text-[#00C897]" size={32} />
          <p className="text-[10px] uppercase tracking-widest">Sincronizando portal...</p>
        </div>
      );
    }

    // Objeto de props compartido para simplificar el renderizado
    const commonProps = {
      currentUser,
      onRefresh: loadDashboardData
    };

    switch (activeTab) {
      case 'operativo':
        // ✅ Corregido: Ahora pasamos currentUser a la vista operativa
        return <OperativeView currentUser={currentUser} />;

      case 'planificador':
        return <PlannerView currentUser={currentUser} />;

      case 'solicitudes':
        return (
          <ServiceTable
            services={tickets}
            staff={staff}
            currentUser={currentUser}
            onRefresh={loadDashboardData}
            onOpenDetails={() => {}}
          />
        );

      case 'staff':
        return (
          <StaffSection
            currentUser={currentUser}
            // ✅ Asegúrate de usar el nombre de prop que acepte tu StaffSection (onRefresh o onUpdate)
            onRefresh={loadDashboardData} 
          />
        );

      case 'clientes':
        return (
          <ClientsSection
            currentUser={currentUser}
            clients={clients} 
            // ✅ Asegúrate de usar el nombre de prop que acepte tu ClientsSection (onRefresh o onUpdate)
            onRefresh={loadDashboardData} 
          />
        );

      case 'activos':
        // ✅ Si tu AssetsTab requiere al usuario, inclúyelo aquí
        return <AssetsTab assets={[]} clients={clients} currentUser={currentUser} onRefresh={loadDashboardData} />;

      default:
        return (
          <ServiceTable
            services={tickets}
            staff={staff}
            currentUser={currentUser}
            onRefresh={loadDashboardData}
            onOpenDetails={() => {}}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50/50 font-sans overflow-hidden">
      {/* HEADER FIJO */}
      <header className="bg-white border-b border-slate-200 px-6 py-2 shadow-sm shrink-0 z-50">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-2 mr-8">
            <div className="w-8 h-8 bg-[#00C897] rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">
              W
            </div>
            <span className="font-black text-[#0a1e3f] tracking-tight hidden md:block uppercase text-sm">
              Wuotto Control
            </span>
          </div>

          <nav className="flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      relative flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 text-[10px] font-black uppercase tracking-widest whitespace-nowrap select-none
                      ${isActive ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-500' : 'text-slate-400'} strokeWidth={2.5} />
                    {tab.label}
                    {isActive && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="ml-4 pl-4 border-l border-slate-100 flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase text-slate-800">{currentUser?.full_name || 'Usuario'}</p>
              <p className="text-[9px] font-bold uppercase text-[#00C897]">{role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#0a1e3f] text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white ring-1 ring-slate-100 uppercase">
              {currentUser?.full_name?.substring(0, 2) || 'US'}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENEDOR CON SCROLL INDEPENDIENTE */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-[1920px] mx-auto w-full h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}