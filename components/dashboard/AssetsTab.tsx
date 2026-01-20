'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';
import * as XLSX from 'xlsx'; 
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Box,
  FileSpreadsheet
} from 'lucide-react';
import EditAssetModal from './super-admin/EditAssetModal';

interface AssetsTabProps {
  currentUser: any;
  assets?: any[];
  clients?: any[];
  onRefresh?: any;
}

export default function AssetsTab({ currentUser, assets = [], clients = [], onRefresh }: AssetsTabProps) {
  const [localAssets, setLocalAssets] = useState<any[]>(assets);
  const [localClients, setLocalClients] = useState<any[]>(clients);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. REGLA DE PERMISOS
  // Definimos quién puede hacer carga masiva (Solo Admin y Superadmin)
  const canUploadExcel = ['admin', 'superadmin'].includes((currentUser?.role || '').toLowerCase());

  // 2. CARGAR ACTIVOS
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

      setLocalAssets(assetsData || []);
      setLocalClients(clientsData || []);
    } catch (error) {
      console.error("Error cargando activos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // 3. LOGICA EXCEL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadExcel) return; // Doble validación por seguridad

    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = jsonData.map((row: any) => ({
        identificador: row['Identificador'] ? String(row['Identificador']) : null, 
        serie: row['Serie'] || '',
        nombre_activo: row['nombre_activo'] || 'Activo Sin Nombre',
        cliente_nombre: row['Cliente_Nombre'] || '', 
        detalles: row['detalles'] || row['Detalle'] || '', 
        ubicacion: row['ubicacion'] || row['Ubicacion'] || '',
        estatus: row['estatus'] || 'ACTIVO',
      }));

      if (formattedData.length === 0) {
        alert("El archivo parece estar vacío.");
        return;
      }

      const { error } = await supabase
        .from('assets')
        .insert(formattedData);

      if (error) throw error;

      alert(`✅ Se cargaron ${formattedData.length} activos correctamente.`);
      fetchAssets(); 

    } catch (error: any) {
      console.error("Error en carga masiva:", error);
      alert("Error al procesar el archivo: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 4. CRUD
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

  const filteredAssets = localAssets.filter(asset => {
    const term = searchTerm.toLowerCase();
    return (
      (asset.nombre_activo || '').toLowerCase().includes(term) ||
      (asset.serie || '').toLowerCase().includes(term) ||
      (asset.identificador || '').toLowerCase().includes(term) ||
      (asset.cliente_nombre || '').toLowerCase().includes(term) ||
      (asset.detalles || '').toLowerCase().includes(term) || 
      (asset.clients?.organization || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* INPUT OCULTO EXCEL (Solo renderizado si tiene permiso, aunque hidden) */}
        {canUploadExcel && (
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
        )}

        {/* HEADER */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                    <Box size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#0a1e3f] uppercase">Inventario de Activos</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {localAssets.length} Equipos registrados
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        className="w-full bg-slate-50 rounded-full py-3 pl-12 pr-6 text-xs font-bold outline-none border border-transparent focus:border-emerald-400 transition-all uppercase placeholder:normal-case"
                        placeholder="Buscar activo, serie, detalle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-2">
                    
                    {/* BOTÓN EXCEL (SOLO ADMINS) */}
                    {canUploadExcel && (
                        <button 
                            onClick={triggerFileInput}
                            disabled={isUploading}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-6 py-3 rounded-full text-xs font-black uppercase flex items-center justify-center gap-2 transition-all border border-emerald-100 whitespace-nowrap"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={16}/> : <FileSpreadsheet size={16} />}
                            {isUploading ? 'Cargando...' : 'Importar Excel'}
                        </button>
                    )}

                    <button 
                        onClick={handleCreate}
                        className="bg-[#0a1e3f] hover:bg-blue-900 text-white px-6 py-3 rounded-full text-xs font-black uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap"
                    >
                        <Plus size={16} /> Nuevo Activo
                    </button>
                </div>
            </div>
        </div>

        {/* TABLA */}
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
                                <th className="p-5 pl-8">ID / Serie</th>
                                <th className="p-5">Activo / Detalle</th>
                                <th className="p-5">Cliente</th>
                                <th className="p-5">Ubicación</th>
                                <th className="p-5 text-center">Estado</th>
                                <th className="p-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                                    
                                    <td className="p-5 pl-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded w-fit text-[9px] font-bold">
                                                {asset.identificador || `#${asset.id}`}
                                            </span>
                                            {asset.serie && (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                    S/N: {asset.serie}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[#0a1e3f] uppercase group-hover:text-emerald-600 transition-colors">
                                                {asset.nombre_activo || 'Sin Nombre'}
                                            </span>
                                            {asset.detalles && (
                                                <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={asset.detalles}>
                                                    {asset.detalles}
                                                </span>
                                            )}
                                        </div>
                                    </td>

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

                                    <td className="p-5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                                            {asset.location_details || asset.ubicacion || 'N/A'}
                                        </span>
                                    </td>

                                    <td className="p-5 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                            (asset.status === 'ACTIVO' || asset.estatus === 'ACTIVO') ? 'bg-emerald-100 text-emerald-700' :
                                            (asset.status === 'MANTENIMIENTO' || asset.estatus === 'MANTENIMIENTO') ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {asset.status || asset.estatus || 'ACTIVO'}
                                        </span>
                                    </td>

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
            clients={localClients}
            onClose={() => setIsModalOpen(false)}
            onUpdate={fetchAssets}
        />
    </div>
  );
}