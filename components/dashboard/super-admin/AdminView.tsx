'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-browser'
import {
  LayoutDashboard,
  Users,
  Database,
  Calendar as CalendarIcon,
  Zap,
} from 'lucide-react'

// tablas existentes
import ServiceTable from '../ServiceTable'
import Planner from '../Planner'
import StaffSection from './StaffSection'
import AssetsTab from '../AssetsTab'
import ServiceDetailModal from '../ServiceDetailModal'
import GlobalAdminModal from './GlobalAdminModal'
import EditAssetModal from './EditAssetModal'

// 🔥 NUEVO
import ClientRequestsSection from './ClientRequestsSection'
import ClientsSection from './ClientsSection'

export default function AdminView({ currentUser }: { currentUser: any }) {
  const [tab, setTab] = useState<'ops' | 'planner' | 'staff' | 'assets' | 'clients'>('ops')
  const [loading, setLoading] = useState(true)

  const [data, setData] = useState<{
    tickets: any[]
    users: any[]
    rawClients: any[]
    rawAssets: any[]
    requests: any[]
  }>({
    tickets: [],
    users: [],
    rawClients: [],
    rawAssets: [],
    requests: [],
  })

  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)

  // =========================
  // FETCH GENERAL
  // =========================
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        ticketsRes,
        staffRes,
        clientsRes,
        assetsRes,
        requestsRes,
      ] = await Promise.all([
        supabase
          .from('tickets')
          .select('*')
          .neq('status', 'Cancelado')
          .order('created_at', { ascending: false }),

        supabase
          .from('profiles')
          .select('id, full_name, email, role, position, created_at'),

        supabase
          .from('clients')
          .select('*')
          .order('organization', { ascending: true }),

        supabase
          .from('assets')
          .select('*')
          .order('nombre_activo', { ascending: true }),

        // 🔥 SOLICITUDES
        supabase
          .from('client_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ])

      setData({
        tickets: ticketsRes.data || [],
        users: (staffRes.data || []).map((u: any) => ({ ...u, type: 'staff' })),
        rawClients: clientsRes.data || [],
        rawAssets: assetsRes.data || [],
        requests: requestsRes.data || [],
      })
    } catch (e) {
      console.error('Error cargando admin data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // =========================
  // ASSETS SAVE
  // =========================
  const handleSaveAsset = async (action: string, assetData: any) => {
    try {
      if (action === 'create') {
        const payload = { ...assetData }
        if (payload.id === 'new') delete payload.id
        const { error } = await supabase.from('assets').insert([payload])
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', assetData.id)
        if (error) throw error
      }
      await fetchData()
      setEditingAsset(null)
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* HEADER */}
      <div className="bg-[#0a1e3f] p-8 rounded-[2.5rem] text-white shadow-xl flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-[#00C897]/20 p-3 rounded-2xl text-[#00C897]">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Panel Administrativo
            </h1>
            <p className="text-[#00C897] text-[10px] font-bold uppercase tracking-widest mt-1">
              Gestión Centralizada
            </p>
          </div>
        </div>
        <div className="hidden md:block text-right border-l border-white/10 pl-6">
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">
            Sesión
          </p>
          <p className="font-black uppercase text-sm">
            {currentUser?.full_name}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 w-fit gap-2">
        {[
          { id: 'ops', label: 'Operaciones', icon: Zap },
          { id: 'planner', label: 'Planificador', icon: CalendarIcon },
          { id: 'staff', label: 'Personal', icon: Users },
          { id: 'clients', label: 'Clientes', icon: Users },
          { id: 'assets', label: 'Activos', icon: Database },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
              tab === item.id
                ? 'bg-[#0a1e3f] text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="p-20 text-center text-slate-300 font-black uppercase text-xs animate-pulse">
            Sincronizando...
          </div>
        ) : (
          <>
            {tab === 'ops' && (
              <ServiceTable
                services={data.tickets}
                staff={data.users}
                currentUser={currentUser}
                onRefresh={fetchData}
                onOpenDetails={setSelectedTicket}
              />
            )}

            {tab === 'planner' && (
              <Planner currentUser={currentUser} onRefresh={fetchData} />
            )}

            {tab === 'staff' && (
              <StaffSection
                profiles={data.users}
                currentUser={currentUser}
                onUpdate={fetchData}
                onEdit={(u: any) => {
                  setEditingUser(u)
                  setIsUserModalOpen(true)
                }}
              />
            )}

            {/* 🔥 SOLICITUDES + CLIENTES */}
            {tab === 'clients' && (
              <div className="space-y-6">
                <ClientRequestsSection
                  requests={data.requests}
                  currentUser={currentUser}
                  onRefresh={fetchData}
                />

                <ClientsSection
                  rawClients={data.rawClients}
                  currentUser={currentUser}
                  onRefresh={fetchData}
                />
              </div>
            )}

            {tab === 'assets' && (
              <AssetsTab
                assets={data.rawAssets}
                clients={data.rawClients}
                currentUser={currentUser}
                onEdit={setEditingAsset}
                onCreate={() => setEditingAsset({ id: 'new' })}
                onRefresh={fetchData}
              />
            )}
          </>
        )}
      </div>

      {/* MODALES */}
      {isUserModalOpen && (
        <GlobalAdminModal
          isOpen={isUserModalOpen}
          user={editingUser}
          currentUser={currentUser}
          canEditSensitiveData={currentUser?.role === 'superadmin'}
          onClose={() => {
            setIsUserModalOpen(false)
            setEditingUser(null)
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

      {selectedTicket && (
        <ServiceDetailModal
          isOpen={!!selectedTicket}
          ticket={selectedTicket}
          currentUser={currentUser}
          onClose={() => setSelectedTicket(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  )
}
