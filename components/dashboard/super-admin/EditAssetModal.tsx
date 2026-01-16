'use client';

import { useState, useEffect } from 'react';
import { X, Save, Tag, Hash, Building2, MapPin, FileText, CheckCircle2, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface EditAssetModalProps {
  isOpen: boolean;
  asset: any;
  clients: any[];
  onClose: () => void;
  
  // Soporte dual para Dashboard nuevo y vista legacy
  onUpdate?: () => void | Promise<void>; 
  onSave?: (action: string, assetData: any) => void | Promise<void>; 
  isProcessing?: boolean; 
}

export default function EditAssetModal({ 
  isOpen, 
  asset, 
  clients = [], 
  onClose, 
  onUpdate, 
  onSave, 
  isProcessing = false 
}: EditAssetModalProps) {
  
  const [formData, setFormData] = useState<any>({});
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (asset?.id && asset.id !== 'new') {
      // MODO EDICIÓN
      // Intentamos encontrar el cliente por nombre si no tenemos ID
      const matchingClient = clients.find((c: any) => 
        c.organization?.toUpperCase() === asset.cliente_nombre?.toUpperCase()
      );

      setFormData((prev: any) => {
        const isSameAsset = prev?.id === asset.id;
        
        return {
          ...asset,
          // Si ya seleccionamos uno manualmente, lo mantenemos. Si no, usamos el match.
          selectedClientId: (isSameAsset && prev?.selectedClientId) 
            ? prev.selectedClientId 
            : (asset.client_id || (matchingClient ? matchingClient.id : ''))
        };
      });

    } else {
      // MODO CREACIÓN
      setFormData({ 
          estatus: 'ACTIVO',
          identificador: '',
          serie: '',
          nombre_activo: '',
          cliente_nombre: '',
          ubicacion: '',
          detalles: '',
          selectedClientId: ''
      });
    }
  }, [isOpen, asset, clients]);

  const handleSave = async () => {
    setInternalLoading(true);
    try {
      // 1. Resolver el nombre del cliente basado en el ID seleccionado
      let finalClientName = formData.cliente_nombre;
      let finalClientId = formData.selectedClientId; // Guardamos el ID real también
      
      if (formData.selectedClientId) {
        const officialClient = clients.find((c: any) => c.id.toString() === formData.selectedClientId.toString());
        if (officialClient) {
            finalClientName = officialClient.organization;
        }
      } else {
        finalClientId = null; // Si selecciona "-- SIN ASIGNAR --"
      }

      const payload = {
        identificador: formData.identificador,
        serie: formData.serie,
        nombre_activo: formData.nombre_activo,
        cliente_nombre: finalClientName,
        client_id: finalClientId, // Importante guardar la relación real
        ubicacion: formData.ubicacion,
        detalles: formData.detalles,
        estatus: formData.estatus
      };

      const isEdit = asset?.id && asset.id !== 'new';

      if (onSave) {
        // MODO LEGACY (Delegado al padre)
        await onSave(isEdit ? 'update' : 'create', { ...payload, id: asset.id });
      } else {
        // MODO DIRECTO (Supabase)
        if (isEdit) {
          const { error } = await supabase.from('assets').update(payload).eq('id', asset.id);
          if (error) throw error;
        } else {
          // Generar ID temporal si no existe lógica de backend
          const insertPayload = { ...payload };
          if (!insertPayload.identificador) insertPayload.identificador = `NEW-${Date.now()}`;
          
          const { error } = await supabase.from('assets').insert([insertPayload]);
          if (error) throw error;
        }
      }
      
      if (onUpdate) await onUpdate(); 
      onClose();

    } catch (e: any) {
      console.error(e);
      alert('Error al guardar: ' + e.message);
    } finally {
      setInternalLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = internalLoading || isProcessing;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex justify-end transition-all">
      <div className="w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="bg-[#0a1e3f] p-8 flex justify-between items-center shrink-0">
          <div>
            <div className="bg-[#10b981] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
               <Package size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {asset?.id && asset.id !== 'new' ? 'Detalle Técnico del Activo' : 'Nuevo Activo'}
            </h2>
            <p className="text-[#10b981] text-[10px] font-black uppercase tracking-widest mt-1">
              Gestión de Inventario Corporativo
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
            
            {/* Referencia visual */}
            {asset?.id && asset.id !== 'new' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                        <FileText size={20}/>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organización Actual</p>
                        <p className="text-sm font-black text-slate-700 uppercase italic">{asset.cliente_nombre || 'Sin Asignar'}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Tag size={12}/> Identificador ID
                    </label>
                    <input 
                        className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl px-4 py-3 text-xs font-black text-[#0a1e3f] outline-none transition-all uppercase"
                        value={formData.identificador || ''}
                        onChange={e => setFormData({...formData, identificador: e.target.value})}
                        placeholder="EJ: LP-001"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Hash size={12}/> Número de Serie
                    </label>
                    <input 
                        className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl px-4 py-3 text-xs font-black text-[#0a1e3f] outline-none transition-all uppercase"
                        value={formData.serie || ''}
                        onChange={e => setFormData({...formData, serie: e.target.value})}
                        placeholder="S/N..."
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Package size={12}/> Nombre del Activo / Equipo
                </label>
                <input 
                    className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl px-4 py-3 text-sm font-black text-[#0a1e3f] outline-none transition-all uppercase"
                    value={formData.nombre_activo || ''}
                    onChange={e => setFormData({...formData, nombre_activo: e.target.value})}
                    placeholder="EJ: LAPTOP DELL LATITUDE"
                />
            </div>

            {/* SELECTOR DE CLIENTES */}
            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Building2 size={12}/> Vincular con Cliente Oficial
                </label>
                <div className="relative">
                    <select 
                        className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-4 text-xs font-black text-[#0a1e3f] outline-none appearance-none cursor-pointer uppercase shadow-sm"
                        value={formData.selectedClientId || ''}
                        onChange={e => setFormData({...formData, selectedClientId: e.target.value})}
                    >
                        <option value="">-- SIN ASIGNAR (Inventario Interno) --</option>
                        {clients.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.organization?.toUpperCase()}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                        <CheckCircle2 size={16} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12}/> Estatus Operativo
                    </label>
                    <select 
                        className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl px-4 py-3 text-xs font-black text-[#0a1e3f] outline-none cursor-pointer uppercase"
                        value={formData.estatus || 'ACTIVO'}
                        onChange={e => setFormData({...formData, estatus: e.target.value})}
                    >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                        <option value="BAJA">BAJA</option>
                        <option value="MANTENIMIENTO">EN MANTENIMIENTO</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <MapPin size={12}/> Ubicación / Detalles
                    </label>
                    <input 
                        className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl px-4 py-3 text-xs font-black text-[#0a1e3f] outline-none transition-all uppercase"
                        placeholder="N/A"
                        value={formData.ubicacion || ''}
                        onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                    />
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 border-t border-slate-100 bg-white">
            <button 
                onClick={handleSave}
                disabled={isLoading}
                className="w-full bg-[#00C897] hover:bg-emerald-400 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 size={18} className="animate-spin"/> Procesando...
                    </>
                ) : (
                    <>
                        <Save size={18} /> Guardar Cambios
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
}