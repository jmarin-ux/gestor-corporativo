'use client'

import { useMemo, useState } from 'react'
import { ClipboardList, CalendarDays, Boxes } from 'lucide-react'

// Reusa tus componentes existentes:
import ServiceTable from '@/components/dashboard/ServiceTable'
import PlannerView from '@/components/dashboard/PlannerView'
import AssetsTab from '@/components/dashboard/AssetsTab'

// Si tienes modal de detalle úsalo aquí
// import ServiceModal from '@/components/dashboard/ServiceModal'

type TabKey = 'servicios' | 'planner' | 'activos'

export default function CoordinatorView({
  currentUser,
  clients = [],
  services = [],
  assets = [],
  staff = [],
  onRefresh,
}: any) {
  const [activeTab, setActiveTab] = useState<TabKey>('servicios')
  // const [openTicket, setOpenTicket] = useState<any>(null)

  const coordinatorId = String(currentUser?.id || '')

  // 1. Clientes Asignados
  const myClients = useMemo(() => {
    return clients.filter((c: any) => {
      const cid = String(c.coordinator_id || c.coordinador_id || '')
      return cid && cid === coordinatorId
    })
  }, [clients, coordinatorId])

  const myClientEmailSet = useMemo(() => {
    return new Set(
      myClients
        .map((c: any) => (c.email || '').toLowerCase().trim())
        .filter(Boolean)
    )
  }, [myClients])

  // 2. Servicios Visibles (Filtrados por coordinador o clientes asignados)
  const myServices = useMemo(() => {
    return services.filter((t: any) => {
      const tCoord = String(t.coordinator_id || t.coordinador_id || '')
      if (tCoord && tCoord === coordinatorId) return true

      const email = (t.client_email || '').toLowerCase().trim()
      return myClientEmailSet.has(email)
    })
  }, [services, coordinatorId, myClientEmailSet])

  // 3. Activos Visibles (✅ CORRECCIÓN: Mostrar TODO sin filtrar)
  // El coordinador debe tener acceso a todo el inventario para poder asignar o consultar
  const myAssets = useMemo(() => assets, [assets])

  const tabs = [
    { key: 'servicios' as const, label: 'Operaciones', icon: ClipboardList },
    { key: 'planner' as const, label: 'Planificador', icon: CalendarDays },
    { key: 'activos' as const, label: 'Activos', icon: Boxes },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* NOTA: No incluimos Header aquí porque ya existe uno global en DashboardPage.
          Esta vista se renderiza DENTRO del layout principal.
      */}

      {/* Tabs de Navegación */}
      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.key
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
          )
        })}
      </div>

      {/* Contenido Dinámico */}
      {activeTab === 'servicios' && (
        <ServiceTable
          services={myServices}
          staff={staff}
          currentUser={currentUser}
          onRefresh={onRefresh}
          onOpenDetails={(t: any) => {
            // Lógica para abrir modal de detalle
            alert(`Abrir detalle ticket: ${t.codigo_servicio || t.id}`)
            // setOpenTicket(t)
          }}
        />
      )}

      {activeTab === 'planner' && (
        <PlannerView
          currentUser={currentUser}
          // Ocultamos botón 'Back' si PlannerView lo tiene, ya que usamos Tabs aquí
          onBack={undefined} 
        />
      )}

      {activeTab === 'activos' && (
        <AssetsTab
          assets={myAssets}
          clients={clients}
          currentUser={currentUser}
          onRefresh={onRefresh}
          // Acciones placeholder (puedes conectar tus modales reales aquí)
          onCreate={() => alert('Abrir modal: Crear Activo')}
          onEdit={(asset: any) => alert('Abrir modal: Editar Activo ' + asset.nombre_activo)}
        />
      )}

      {/* Ejemplo de Modal Integrado:
      {openTicket && (
        <ServiceModal
          isOpen={!!openTicket}
          onClose={() => setOpenTicket(null)}
          ticket={openTicket}
          // ... props ...
        />
      )} 
      */}
    </div>
  )
}