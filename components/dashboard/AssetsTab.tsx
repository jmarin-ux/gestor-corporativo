'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Search, Plus, Boxes, QrCode, Edit3, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions'; 
// 👇 AQUÍ ESTÁ LA CORRECCIÓN DE LA RUTA DEL MODAL:
import EditAssetModal from '@/components/dashboard/super-admin/EditAssetModal';

// 👇 EL PARCHE PARA VERCEL: 
// Definimos estas props para que TypeScript no se queje cuando el padre (CoordinatorView)
// intente enviarlas, aunque nosotros no las usemos (usamos fetch interno).
interface AssetsTabProps {
  currentUser: any;
  assets?: any[];
  clients?: any[];
  onRefresh?: any;
  onCreate?: any;
  onEdit?: any;
}

export default function AssetsTab({ currentUser, ...ignoredProps }: AssetsTabProps) {
  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // 🔒 PERMISOS (Sistema nuevo)
  const { can } = usePermissions(currentUser);
  const canView = can('assets', 'read');
  const canCreate = can('assets', 'create');
  const canEdit = can('assets', 'edit');
  const canDelete = can('assets', 'delete');

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Cargar Activos
    const { data: assetsData } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Cargar Clientes (Para el nombre en la tabla)
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, organization');

    if (assetsData) setAssetsList(assetsData);
    if (clientsData) setClientsList(clientsData);
    
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Manejadores
  const handleCreate = () => {
    if (!canCreate) return;
    setSelectedAsset(null); // Null significa crear nuevo
    setIsEditModalOpen(true);
  };

  const handleEdit = (asset: any) => {
    if (!canEdit) return;
    setSelectedAsset(asset);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm('¿Estás seguro de eliminar este activo?')) return;

    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) alert('Error al eliminar');
    else fetchData();
  };

  // Filtrado
  const filteredAssets = assetsList.filter(a => 
    (a.nombre_activo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Si no tiene permiso de ver
  if (!loading && !canView) {
    return (
        <div className="flex flex-col items-center justify-center p-10 text-slate-400 bg-slate-50 rounded-[2rem] border border-slate-100">
            <AlertTriangle size={40} className="mb-4 text-amber-400"/>
            <p className="text-xs font-black uppercase">Acceso Restringido</p>
            <p className="text-[10px]">No tienes permisos para ver el inventario.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* BARRA SUPERIOR */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                <Boxes size={20}/>
            </div>
            <div>
                <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Inventario de Activos</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{assetsList.length} Equipos registrados</p>
            </div>
        </div>
        
        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
                type="text" 
                placeholder="Buscar activo, serie o modelo..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-3 text-xs font-bold outline-none uppercase focus:border-emerald-500 transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        {/* Botón Crear */}
        {canCreate && (
            <button onClick={handleCreate} className="bg-[#0a1e3f] text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10">
                <Plus size={16}/> Nuevo Activo
            </button>
        )}
      </div>

      {/* TABLA DE ACTIVOS */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="p-6">Equipo / Serie</th>
                        <th className="p-6">Ubicación / Cliente</th>
                        <th className="p-6 text-center">Estado</th>
                        <th className="p-6 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredAssets.map(asset => {
                        const clientName = clientsList.find(c => c.id === asset.client_id)?.organization || 'Sin Asignar';
                        
                        return (
                            <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-6">
                                    <p className="font-black text-[#0a1e3f] uppercase text-sm">{asset.nombre_activo}</p>
                                    <div className="flex items-center gap-1 text-slate-400 mt-1">
                                        <QrCode size={12}/> {asset.serial_number || 'S/N'}
                                    </div>
                                    <p className="text-[9px] text-slate-400 uppercase mt-0.5">{asset.modelo}</p>
                                </td>
                                <td className="p-6">
                                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[9px] font-bold uppercase mb-1">
                                        {clientName}
                                    </span>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase">{asset.ubicacion || 'Sin ubicación'}</p>
                                </td>
                                <td className="p-6 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${asset.status === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {asset.status || 'Desconocido'}
                                    </span>
                                </td>
                                <td className="p-6 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {canEdit && (
                                            <button onClick={() => handleEdit(asset)} className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 transition-colors" title="Editar">
                                                <Edit3 size={14}/>
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button onClick={() => handleDelete(asset.id)} className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors" title="Eliminar">
                                                <Trash2 size={14}/>
                                            </button>
                                        )}
                                        {!canEdit && !canDelete && (
                                            <span className="text-slate-300"><FileText size={14}/></span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {filteredAssets.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-10 text-center text-slate-400 text-xs uppercase font-bold">
                                No se encontraron activos
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL (Se renderiza si existe EditAssetModal) */}
      {isEditModalOpen && (canEdit || canCreate) && (
          <EditAssetModal
            isOpen={true}
            asset={selectedAsset || {}} 
            clients={clientsList}
            onClose={() => setIsEditModalOpen(false)}
            onUpdate={fetchData}
          />
      )}
    </div>
  );
}