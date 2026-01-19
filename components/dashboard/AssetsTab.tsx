'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Box 
} from 'lucide-react';
import EditAssetModal from './super-admin/EditAssetModal';

export default function AssetsTab({ currentUser }: { currentUser: any }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // 1. CARGAR ACTIVOS
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data: assetsData, error } = await supabase
        .from('assets')
        .select(`
          *,
          clients (
            id,
            organization,
            full_name
          )
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('full_name');

      setAssets(assetsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error cargando activos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este activo?")) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) alert("Error al eliminar");
    else fetchAssets();
  };

  const handleEdit = (asset: any) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const filteredAssets = assets.filter(asset => {
    const term = searchTerm.toLowerCase();
    return (
      (asset.nombre_activo || '').toLowerCase().includes(term) ||
      (asset.serie || '').toLowerCase().includes(term) ||
      (asset.identificador || '').toLowerCase().includes(term) ||
      (asset.cliente_nombre || '').toLowerCase().includes(term) ||
      (asset.clients?.organization || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Box size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#0a1e3f] uppercase">Inventario de Activos</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {assets.length} Equipos registrados
                    </p>
                </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        className="w-full bg-slate-50 rounded-full py-3 pl-12 pr-6 text-xs font-bold outline-none border border-transparent focus:border-emerald-400 transition-all uppercase placeholder:normal-case"
                        placeholder="Buscar activo, serie o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleCreate}
                    className="bg-[#0a1e3f] hover:bg-blue-900 text-white px-6 py-3 rounded-full text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap"
                >
                    <Plus size={16} /> Nuevo Activo
                </button>
            </div>
        </div>

        {/* TABLA DESGLOSADA (COLUMNAS INDIVIDUALES) */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="animate-spin text-emerald-500" size={40}/>
                    <p className="text-[10px] font-black uppercase text-slate-400">Cargando inventario...</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-300 opacity-60">
                    <Box size={64} className="mb-4 stroke-1"/>
                    <p className="text-xs font-black uppercase tracking-widest">No se encontraron activos</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                                <th className="p-5 pl-8">ID</th>
                                <th className="p-5">Equipo / Activo</th>
                                <th className="p-5">Serie</th>
                                <th className="p-5">Cliente / Empresa</th>
                                <th className="p-5">Ubicación</th>
                                <th className="p-5 text-center">Estado</th>
                                <th className="p-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                                    
                                    {/* COL 1: ID */}
                                    <td className="p-5 pl-8">
                                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[9px] font-bold">
                                            {asset.identificador || asset.id}
                                        </span>
                                    </td>

                                    {/* COL 2: NOMBRE DEL ACTIVO */}
                                    <td className="p-5">
                                        <span className="text-xs font-black text-[#0a1e3f] uppercase group-hover:text-emerald-600 transition-colors">
                                            {asset.nombre_activo || 'Sin Nombre'}
                                        </span>
                                    </td>

                                    {/* COL 3: SERIE */}
                                    <td className="p-5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {asset.serie || 'S/N'}
                                        </span>
                                    </td>

                                    {/* COL 4: CLIENTE */}
                                    <td className="p-5">
                                        {asset.clients ? (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase whitespace-nowrap">
                                                {asset.clients.organization || asset.clients.full_name}
                                            </span>
                                        ) : asset.cliente_nombre ? (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase whitespace-nowrap">
                                                {asset.cliente_nombre}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">
                                                - Sin Asignar -
                                            </span>
                                        )}
                                    </td>

                                    {/* COL 5: UBICACIÓN */}
                                    <td className="p-5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                                            {asset.location_details || asset.ubicacion || 'N/A'}
                                        </span>
                                    </td>

                                    {/* COL 6: ESTADO */}
                                    <td className="p-5 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                            (asset.status === 'ACTIVO' || asset.estatus === 'ACTIVO') ? 'bg-emerald-100 text-emerald-700' :
                                            (asset.status === 'MANTENIMIENTO' || asset.estatus === 'MANTENIMIENTO') ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {asset.status || asset.estatus || 'ACTIVO'}
                                        </span>
                                    </td>

                                    {/* COL 7: ACCIONES */}
                                    <td className="p-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleEdit(asset)}
                                                className="p-2 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(asset.id)}
                                                className="p-2 text-red-400 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        <EditAssetModal 
            isOpen={isModalOpen}
            asset={selectedAsset}
            clients={clients}
            onClose={() => setIsModalOpen(false)}
            onUpdate={fetchAssets}
        />
    </div>
  );
}