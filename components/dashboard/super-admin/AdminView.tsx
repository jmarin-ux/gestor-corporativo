'use client'

import { useState } from 'react'
import {
  ClipboardList,
  CalendarDays,
  Users,
  Boxes,
  Building2,
  RefreshCw,
  Search,
} from 'lucide-react'

// --- COMPONENTES ---
import ServiceTable from '../ServiceTable'
// ✅ CORRECCIÓN: Importamos el nombre correcto del archivo
import PlannerView from '../PlannerView' 
import StaffSection from './StaffSection'
import AssetsTab from '../AssetsTab'
import ClientsSection from './ClientsSection'
import ServiceDetailModal from '../ServiceDetailModal'

// 👇 PARCHE SILENCIOSO: Aceptamos props extras para que no falle en Vercel
interface AdminViewProps {
  currentUser: any
  staff?: any[]
  clients?: any[]
  services?: any[]
  assets?: any[]
  onRefresh?: any
  // Aceptamos cualquier otra cosa que el padre le envíe
  [key: string]: any 
}

export default function AdminView({
  currentUser,
  staff = [],
  clients = [],
  services = [],
  assets = [],
  onRefresh,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState('servicios')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  // Definición de Tabs
  const tabs = [
    { id: 'servicios', label: 'Operaciones', icon: ClipboardList },
    { id: 'planner', label: 'Planificador', icon: CalendarDays },
    { id: 'personal', label: 'Personal', icon: Users },
    { id: 'activos', label: 'Activos', icon: Boxes },
    { id: 'clientes', label: 'Clientes', icon: Building2 },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- MENU DE NAVEGACIÓN (TABS) --- */}
      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap gap-2 sticky top-24 z-20">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                ${isActive 
                  ? 'bg-[#0a1e3f] text-white shadow-md shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* --- CONTENIDO DE LAS PESTAÑAS --- */}
      <div className="min-h-[500px]">
        
        {/* 1. OPERACIONES (Servicios) */}
        {activeTab === 'servicios' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             {/* Barra de búsqueda simple para esta vista */}
             <div className="mb-6 flex gap-4">
               <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                 <Search className="text-slate-300" size={18} />
                 <input 
                    type="text" 
                    placeholder="Buscar en operaciones generales..." 
                    className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-slate-300 uppercase text-slate-600"
                    disabled 
                 />
               </div>
               <button 
                  onClick={onRefresh} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-[#00C897] transition-colors"
                  title="Recargar Datos"
               >
                 <RefreshCw size={18} />
               </button>
             </div>

             <ServiceTable 
                services={services} 
                staff={staff} 
                currentUser={currentUser} 
                onRefresh={onRefresh}
                onOpenDetails={setSelectedTicket}
             />
          </div>
        )}

        {/* 2. PLANIFICADOR */}
        {activeTab === 'planner' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             {/* ✅ CORRECCIÓN: Usamos PlannerView */}
             <PlannerView 
                currentUser={currentUser} 
                onBack={() => setActiveTab('servicios')} 
             />
          </div>
        )}

        {/* 3. PERSONAL */}
        {activeTab === 'personal' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             <StaffSection 
                currentUser={currentUser} 
                // Pasamos props aunque el componente las ignore (por compatibilidad)
                profiles={staff}
                onRefresh={onRefresh}
             />
          </div>
        )}

        {/* 4. ACTIVOS */}
        {activeTab === 'activos' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             <AssetsTab 
                currentUser={currentUser}
                // Pasamos props extras por compatibilidad
                assets={assets}
                clients={clients}
                onRefresh={onRefresh}
             />
          </div>
        )}

        {/* 5. CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             <ClientsSection 
                currentUser={currentUser}
                // Pasamos props extras por compatibilidad
                clients={clients}
                onRefresh={onRefresh}
             />
          </div>
        )}

      </div>

      {/* --- MODALES GLOBALES --- */}
      {selectedTicket && (
        <ServiceDetailModal
          isOpen={!!selectedTicket}
          ticket={selectedTicket}
          currentUser={currentUser}
          staff={staff}
          onClose={() => setSelectedTicket(null)}
          onUpdate={onRefresh}
        />
      )}

    </div>
  )
}