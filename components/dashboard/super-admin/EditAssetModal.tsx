'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EditAssetModalProps {
  isOpen: boolean;
  asset?: any;
  clients: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditAssetModal({ isOpen, asset, clients, onClose, onUpdate }: EditAssetModalProps) {
  const [loading, setLoading] = useState(false);
  
  const isEditing = asset && asset.id;

  const [formData, setFormData] = useState({
    identificador: '',
    serie: '',
    nombre_activo: '',
    client_id: '',
    status: 'ACTIVO',
    location_details: ''
  });

  const generateUniqueId = useCallback(() => {
    const random = Math.floor(1000 + Math.random() * 9000); 
    return `ACT-${random}`;
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        // MODO EDICIÓN
        setFormData({
          identificador: asset.identificador || asset.asset_id || generateUniqueId(),
          serie: asset.serie || asset.serial_number || '',
          nombre_activo: asset.nombre_activo || asset.name || '',
          client_id: asset.client_id || '',
          status: asset.status || asset.estatus || 'ACTIVO',
          location_details: asset.location_details || asset.ubicacion || ''
        });
      } else {
        // MODO CREACIÓN
        setFormData({
          identificador: generateUniqueId(),
          serie: '',
          nombre_activo: '',
          client_id: '',
          status: 'ACTIVO',
          location_details: ''
        });
      }
    }
  }, [isOpen, asset, isEditing, generateUniqueId]);

  const handleRegenerateId = (e: any) => {
    e.preventDefault();
    setFormData(prev => ({ ...prev, identificador: generateUniqueId() }));
  };

  const handleSave = async () => {
    if (!formData.identificador || !formData.nombre_activo) {
      alert("Faltan datos obligatorios (ID o Nombre).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        identificador: formData.identificador,
        serie: formData.serie,
        nombre_activo: formData.nombre_activo,
        status: formData.status,
        location_details: formData.location_details,
        client_id: formData.client_id === '' ? null : formData.client_id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', asset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([payload]);
        if (error) throw error;
      }

      onUpdate();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a1e3f] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 pb-4">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                        {isEditing ? 'Editar Activo' : 'Nuevo Activo'}
                    </h2>
                    <p className="text-[#00C897] text-xs font-bold uppercase tracking-widest mt-1">
                        Gestión de Inventario Corporativo
                    </p>
                </div>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    <X size={32} />
                </button>
            </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 bg-[#F0F4F8]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ID */}
                <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block flex gap-2 items-center">
                        <QrCode size={12}/> Identificador ID
                    </label>
                    <div className="flex gap-2">
                        <input 
                            value={formData.identificador}
                            readOnly
                            className="w-full bg-slate-200 text-slate-600 font-black rounded-2xl px-5 py-4 outline-none border border-slate-300 cursor-not-allowed text-center tracking-widest"
                        />
                        {!isEditing && (
                            <button onClick={handleRegenerateId} className="bg-white p-4 rounded-2xl text-slate-400 hover:text-[#0a1e3f] border border-slate-200 shadow-sm">
                                <RefreshCw size={20}/>
                            </button>
                        )}
                    </div>
                </div>

                {/* SERIE */}
                <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">
                        # Número de Serie
                    </label>
                    <input 
                        value={formData.serie}
                        onChange={(e) => setFormData({...formData, serie: e.target.value.toUpperCase()})}
                        className="w-full bg-white text-[#0a1e3f] font-bold rounded-2xl px-5 py-4 outline-none border-2 border-transparent focus:border-[#00C897] transition-all shadow-sm"
                        placeholder="S/N..."
                    />
                </div>

                {/* NOMBRE */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">
                        Nombre del Activo / Equipo
                    </label>
                    <input 
                        value={formData.nombre_activo}
                        onChange={(e) => setFormData({...formData, nombre_activo: e.target.value.toUpperCase()})}
                        className="w-full bg-white text-[#0a1e3f] font-bold rounded-2xl px-5 py-4 outline-none border-2 border-transparent focus:border-[#00C897] transition-all shadow-sm"
                        placeholder="EJ: EXTRACTOR..."
                    />
                </div>

                <div className="md:col-span-2 my-2 border-t border-slate-200"></div>

                {/* CLIENTE (EMPRESA) - CORREGIDO */}
                <div className="md:col-span-2">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 block flex items-center gap-2">
                            Vinculación a Empresa (Cliente)
                        </label>
                        <select 
                            value={formData.client_id}
                            onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                            className="w-full bg-white text-[#0a1e3f] font-bold rounded-xl px-5 py-4 outline-none border border-emerald-100 focus:border-[#00C897] transition-all shadow-sm cursor-pointer uppercase"
                        >
                            <option value="">-- SIN ASIGNAR --</option>
                            {clients.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {/* ⚠️ CORRECCIÓN: Priorizamos la organización */}
                                    {c.organization ? c.organization : c.full_name} 
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ESTATUS Y UBICACION */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">
                        Estatus
                    </label>
                    <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-white text-[#0a1e3f] font-bold rounded-2xl px-5 py-4 outline-none border-2 border-transparent focus:border-[#00C897] transition-all shadow-sm"
                    >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                        <option value="BAJA">BAJA</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">
                        Ubicación
                    </label>
                    <input 
                        value={formData.location_details}
                        onChange={(e) => setFormData({...formData, location_details: e.target.value.toUpperCase()})}
                        className="w-full bg-white text-[#0a1e3f] font-bold rounded-2xl px-5 py-4 outline-none border-2 border-transparent focus:border-[#00C897] transition-all shadow-sm"
                        placeholder="EJ: AZOTEA"
                    />
                </div>

            </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t border-slate-100">
            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] py-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-lg"
            >
                {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Guardar Cambios</>}
            </button>
        </div>

      </div>
    </div>
  );
}