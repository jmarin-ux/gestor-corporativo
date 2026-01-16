'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Search, Package, Plus, Edit, Trash2 } from 'lucide-react';
// import EditAssetModal from './EditAssetModal'; // Asegúrate de tener este componente

export default function AssetsTab({ currentUser }: { currentUser: any }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🔒 PERMISOS: Aquí SÍ incluimos al 'coordinador'
  const canManageAssets = ['admin', 'superadmin', 'coordinador'].includes(currentUser?.role);

  const fetchAssets = async () => {
    setLoading(true);
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    setAssets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAssets(); }, []);

  const handleDelete = async (id: string) => {
      if(!canManageAssets) return;
      if(!confirm("¿Eliminar este activo?")) return;
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if(!error) fetchAssets();
  };

  const filtered = assets.filter(a => (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in">
       {/* Toolbar */}
       <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><Package size={20}/></div>
            <div>
                <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Inventario de Activos</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{assets.length} Ítems</p>
            </div>
        </div>
        
        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input type="text" placeholder="Buscar activo..." className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-3 text-xs font-bold outline-none uppercase" onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>

        {/* 🟢 BOTÓN NUEVO ACTIVO: DISPONIBLE PARA COORDINADOR */}
        {canManageAssets && (
            <button className="bg-[#0a1e3f] text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg">
                <Plus size={14}/> Nuevo Activo
            </button>
        )}
      </div>

      {/* Tabla de Activos */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="p-6">Nombre del Activo</th>
                        <th className="p-6">Descripción</th>
                        <th className="p-6 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                    {filtered.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6 font-black text-[#0a1e3f] uppercase">{asset.name}</td>
                            <td className="p-6 text-slate-500">{asset.description || 'Sin descripción'}</td>
                            <td className="p-6 text-center flex justify-center gap-2">
                                {/* 🟢 ACCIONES DISPONIBLES PARA COORDINADOR */}
                                {canManageAssets ? (
                                    <>
                                        <button className="bg-slate-100 p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit size={14}/></button>
                                        <button onClick={() => handleDelete(asset.id)} className="bg-slate-100 p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
                                    </>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}