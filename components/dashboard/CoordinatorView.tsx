'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, CalendarDays, Boxes } from 'lucide-react';

// Importación de Componentes
import ServiceTable from '@/components/dashboard/ServiceTable';
import PlannerView from '@/components/dashboard/PlannerView';
import AssetsTab from '@/components/dashboard/AssetsTab';

type TabKey = 'servicios' | 'planner' | 'activos';

interface CoordinatorViewProps {
  currentUser: any;
  clients?: any[];
  services?: any[];
  assets?: any[];
  staff?: any[];
  onRefresh: () => void;
}

export default function CoordinatorView({
  currentUser,
  clients = [],
  services = [],
  // assets = [], // Ya no lo usamos para pasarlo, pero lo recibimos para no romper la interfaz del padre
  staff = [],
  onRefresh,
}: CoordinatorViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('servicios');
  const coordinatorId = String(currentUser?.id || '');

  // 1. Filtrar Clientes Asignados al Coordinador
  const myClients = useMemo(() => {
    return clients.filter((c: any) => {
      const cid = String(c.coordinator_id || c.coordinador_id || '');
      return cid && cid === coordinatorId;
    });
  }, [clients, coordinatorId]);

  // Crear un Set de emails para búsqueda rápida
  const myClientEmailSet = useMemo(() => {
    return new Set(
      myClients
        .map((c: any) => (c.email || '').toLowerCase().trim())
        .filter(Boolean)
    );
  }, [myClients]);

  // 2. Filtrar Servicios (Asignados directamente O pertenecientes a sus clientes)
  const myServices = useMemo(() => {
    return services.filter((t: any) => {
      const tCoord = String(t.coordinator_id || t.coordinador_id || '');
      // Si el ticket está asignado a este coordinador
      if (tCoord && tCoord === coordinatorId) return true;

      // O si el ticket pertenece a uno de sus clientes
      const email = (t.client_email || '').toLowerCase().trim();
      return myClientEmailSet.has(email);
    });
  }, [services, coordinatorId, myClientEmailSet]);

  const tabs = [
    { key: 'servicios' as const, label: 'Operaciones', icon: ClipboardList },
    { key: 'planner' as const, label: 'Planificador', icon: CalendarDays },
    { key: 'activos' as const, label: 'Activos', icon: Boxes },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- TABS DE NAVEGACIÓN --- */}
      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
                isActive
                  ? 'bg-[#0a1e3f] text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-50',
              ].join(' ')}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* --- CONTENIDO DINÁMICO --- */}

      {/* 1. TABLA DE SERVICIOS */}
      {activeTab === 'servicios' && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
            <ServiceTable
            services={myServices}
            staff={staff}
            currentUser={currentUser}
            onRefresh={onRefresh}
            onOpenDetails={(t: any) => {
                // Aquí puedes implementar la lógica para abrir el modal de detalles
                console.log("Abrir ticket:", t);
            }}
            />
        </div>
      )}

      {/* 2. PLANIFICADOR */}
      {activeTab === 'planner' && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
            <PlannerView
            currentUser={currentUser}
            onBack={undefined} // No necesitamos botón back aquí porque usamos Tabs
            />
        </div>
      )}

      {/* 3. ACTIVOS (CORREGIDO) */}
      {activeTab === 'activos' && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
            {/* ✅ CORRECCIÓN: Solo pasamos currentUser. AssetsTab carga sus propios datos. */}
            <AssetsTab currentUser={currentUser} />
        </div>
      )}

    </div>
  );
}