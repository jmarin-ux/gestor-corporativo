'use client';

import { useState, useEffect } from 'react';
import { X, Save, Box, Hash, Cpu, MapPin, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any; // Si viene vacío es creación, si tiene datos es edición
  clients: any[];
  onUpdate: () => void;
}

export default function EditAssetModal({ isOpen, onClose, asset, clients, onUpdate }: EditAssetModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_activo: '',
    serial_number: '',
    modelo: '',
    ubicacion: '',
    status: 'activo',
    client_id: '',
  });

  const isEditing = asset && asset.id;

  useEffect(() => {
    if (asset) {
      setFormData({
        nombre_activo: asset.nombre_activo || '',
        serial_number: asset.serial_number || '',
        modelo: asset.modelo || '',
        ubicacion: asset.ubicacion || '',
        status: asset.status || 'activo',
        client_id: asset.client_id || '',
      });
    }
  }, [asset]);

  const handleSave = async () => {
    if (!formData.nombre_activo) return alert('El nombre del activo es obligatorio');
    
    setLoading(true);
    try {
      const payload = { ...formData };

      let error;
      if (isEditing) {
        // ACTUALIZAR
        const { error: updateError } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', asset.id);
        error = updateError;
      } else {
        // CREAR NUEVO
        const { error: createError } = await supabase
          .from('assets')
          .insert([payload]);
        error = createError;
      }

      if (error) throw error;

      alert(isEditing ? '✅ Activo actualizado' : '✅ Activo creado');
      onUpdate();
      onClose();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              {isEditing ? 'Editar Activo' : 'Nuevo Activo'}
            </h2>
            <p className="text-emerald-400 text-xs font-bold uppercase">Gestión de Inventario</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"><X size={20}/></button>
        </div>

        {/* Formulario */}
        <div className="p-8 space-y-4 overflow-y-auto max-h-[70vh]">
          
          {/* Nombre y Serie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nombre del Equipo</label>
                <div className="relative">
                    <Box size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        value={formData.nombre_activo}
                        onChange={(e) => setFormData({...formData, nombre_activo: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none uppercase focus:border-emerald-500"
                        placeholder="Ej: Laptop Dell Latitude"
                    />
                </div>
            </div>
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Número de Serie</label>
                <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        value={formData.serial_number}
                        onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none uppercase focus:border-emerald-500"
                        placeholder="Ej: SN-55443322"
                    />
                </div>
            </div>
          </div>

          {/* Modelo y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Modelo / Marca</label>
                <div className="relative">
                    <Cpu size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        value={formData.modelo}
                        onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none uppercase focus:border-emerald-500"
                        placeholder="Ej: Dell 5420"
                    />
                </div>
            </div>
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Ubicación Física</label>
                <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        value={formData.ubicacion}
                        onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none uppercase focus:border-emerald-500"
                        placeholder="Ej: Oficina Central - Piso 2"
                    />
                </div>
            </div>
          </div>

          {/* Cliente y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Cliente Asignado</label>
                <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 uppercase cursor-pointer"
                >
                    <option value="">-- SIN ASIGNAR --</option>
                    {clients.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.organization}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Estado del Activo</label>
                <div className="relative">
                    <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 uppercase cursor-pointer"
                    >
                        <option value="activo">🟢 Activo / Operativo</option>
                        <option value="mantenimiento">🟠 En Mantenimiento</option>
                        <option value="baja">🔴 Baja / Inactivo</option>
                    </select>
                </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-[#0a1e3f] hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-2 transition-all"
            >
                {loading ? <span className="animate-spin">⌛</span> : <Save size={16}/>} Guardar Activo
            </button>
        </div>
      </div>
    </div>
  );
}