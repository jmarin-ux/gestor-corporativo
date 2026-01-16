'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Search, Building2, Box, QrCode, User, FileText, Hash, Loader2, CheckCircle2, Tag, Package, PlusCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess: () => void;
}

export default function CreateTicketModal({ isOpen, onClose, currentUser, onSuccess }: CreateTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Datos maestros
  const [clients, setClients] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Formulario
  const [formData, setFormData] = useState({
    clientId: '', 
    manualClientName: '', 
    manualContact: '',    
    description: '',
    externalCode: '', 
    assetId: '', 
    serviceType: 'Correctivo' 
  });

  const [assetSearch, setAssetSearch] = useState('');

  // 1. Cargar Datos
  useEffect(() => {
    if (isOpen) {
      const loadMasterData = async () => {
        setDataLoading(true);
        const [cReq, aReq] = await Promise.all([
          supabase.from('clients').select('id, organization, full_name').order('organization'),
          supabase.from('assets').select('*').order('nombre_activo')
        ]);
        
        if (cReq.data) setClients(cReq.data);
        if (aReq.data) setAssets(aReq.data);
        setDataLoading(false);
      };
      loadMasterData();
    }
  }, [isOpen]);

  // 2. Filtrar Activos (LOGICA CORREGIDA PARA VINCULACIÓN)
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // 🔍 REGLA DE ORO: 
    // Si el usuario escribe en el buscador, BUSCAMOS EN TODO EL INVENTARIO (Global).
    // Esto permite encontrar activos "húerfanos" (sin client_id) para seleccionarlos y vincularlos.
    if (assetSearch.trim().length > 0) {
      const term = assetSearch.toLowerCase();
      filtered = assets.filter(a => 
        (a.nombre_activo || '').toLowerCase().includes(term) ||
        (a.serial_number || '').toLowerCase().includes(term) ||
        (a.modelo || '').toLowerCase().includes(term) ||
        (a.cliente_nombre || '').toLowerCase().includes(term) // También busca por el nombre de texto antiguo
      );
    } else {
      // Si no escribe nada, mostramos por defecto los que YA coinciden con el ID (si hay cliente seleccionado)
      if (formData.clientId && formData.clientId !== 'new_client') {
        filtered = assets.filter(a => a.client_id === formData.clientId);
      }
    }
    
    return filtered;
  }, [assets, formData.clientId, assetSearch]);

  // 3. Detalles del Activo Seleccionado
  const selectedAssetDetails = useMemo(() => {
    return assets.find(a => a.id === formData.assetId);
  }, [assets, formData.assetId]);

  // --- LÓGICA DE GUARDADO ---
  const handleSubmit = async () => {
    if (!formData.description) return alert("La descripción del servicio es obligatoria.");
    if (!formData.clientId) return alert("Debes seleccionar un cliente.");
    if (formData.clientId === 'new_client' && !formData.manualClientName) return alert("Escribe el nombre del nuevo cliente.");

    setLoading(true);
    try {
      let finalClientId = formData.clientId;
      let organizationName = '';

      // CASO A: CREAR CLIENTE NUEVO
      if (formData.clientId === 'new_client') {
        const newClientPayload = {
            organization: formData.manualClientName.toUpperCase(),
            full_name: 'CONTACTO PRINCIPAL',
            email: `cliente${Date.now()}@sistema.com`,
            phone: '',
            type: 'client'
        };

        const { data: newClientData, error: clientError } = await supabase
            .from('clients')
            .insert([newClientPayload])
            .select()
            .single();

        if (clientError) throw new Error("Error al crear cliente: " + clientError.message);
        
        finalClientId = newClientData.id;
        organizationName = newClientData.organization;

      } else {
        // CASO B: CLIENTE EXISTENTE
        const clientObj = clients.find(c => c.id === formData.clientId);
        organizationName = clientObj?.organization || 'CLIENTE';
      }

      // 🟡 CASO C: VINCULACIÓN AUTOMÁTICA DEL ACTIVO
      // Aquí ocurre la magia: Si seleccionas un activo (que quizás tenía client_id null),
      // lo actualizamos para que pertenezca a ESTE cliente seleccionado.
      if (formData.assetId && finalClientId) {
         const { error: assetError } = await supabase.from('assets')
            .update({ 
                client_id: finalClientId, 
                cliente_nombre: organizationName // Actualizamos también el texto para consistencia
            })
            .eq('id', formData.assetId);
         
         if (assetError) console.error("Error al vincular activo:", assetError);
      }

      // CREAR TICKET
      const newTicket = {
        company: organizationName,
        client_email: 'autogestion@sistema.com',
        service_type: formData.serviceType,
        status: 'Sin asignar', 
        description: `[FOLIO EXT: ${formData.externalCode}] ${formData.description}`,
        location: formData.manualContact || 'Sitio del Cliente',
        client_id: finalClientId,
        asset_id: formData.assetId || null,
        created_by: currentUser.id, 
        codigo_servicio: formData.externalCode || `AG-${Math.floor(Math.random()*10000)}`,
        technical_level: 'autogestion'
      };

      const { error } = await supabase.from('tickets').insert([newTicket]);
      if (error) throw error;

      alert("✅ Servicio creado y activo vinculado correctamente.");
      onSuccess();
      onClose();
      // Reset
      setFormData({ clientId: '', manualClientName: '', manualContact: '', description: '', externalCode: '', assetId: '', serviceType: 'Correctivo' });
      setAssetSearch('');

    } catch (e: any) {
      console.error(e);
      alert("Error al crear: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <FileText className="text-[#00C897]" /> Nueva Autogestión
            </h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Generar servicio y vincular activos</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
            
            {/* SECCIÓN 1: DATOS GENERALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Cliente</label>
                    <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <select 
                            className={`w-full border rounded-xl pl-12 pr-4 py-4 text-xs font-black outline-none uppercase focus:border-blue-500 appearance-none cursor-pointer transition-all ${formData.clientId === 'new_client' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-[#0a1e3f]'}`}
                            value={formData.clientId}
                            onChange={(e) => setFormData({...formData, clientId: e.target.value, assetId: ''})} 
                        >
                            <option value="">-- SELECCIONAR --</option>
                            <option value="new_client" className="text-emerald-600 font-black">➕ REGISTRAR NUEVO CLIENTE</option>
                            <option disabled>----------------</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.organization}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Código / Folio (Obligatorio)</label>
                    <div className="relative">
                        <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00C897]"/>
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-xs font-black text-[#0a1e3f] outline-none uppercase focus:border-[#00C897]"
                            placeholder="EJ: TICKET-1234"
                            value={formData.externalCode}
                            onChange={(e) => setFormData({...formData, externalCode: e.target.value.toUpperCase()})}
                        />
                    </div>
                </div>
            </div>

            {/* CAMPOS PARA NUEVO CLIENTE */}
            {formData.clientId === 'new_client' && (
                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="col-span-2 flex items-center gap-2 mb-1">
                        <PlusCircle size={16} className="text-emerald-500"/>
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase">Alta Rápida de Cliente</h4>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-2 mb-1">Nombre Organización / Empresa</label>
                        <input 
                            className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold outline-none uppercase placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="EJ: HOTELES XCARET..."
                            value={formData.manualClientName}
                            onChange={(e) => setFormData({...formData, manualClientName: e.target.value.toUpperCase()})}
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-2 mb-1">Ubicación / Sitio</label>
                        <input 
                            className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold outline-none uppercase placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="EJ: PLAYA DEL CARMEN..."
                            value={formData.manualContact}
                            onChange={(e) => setFormData({...formData, manualContact: e.target.value.toUpperCase()})}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Detalle del Servicio</label>
                 <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold text-slate-700 outline-none uppercase focus:border-blue-500 min-h-[100px]"
                    placeholder="DESCRIBE EL PROBLEMA O REQUERIMIENTO..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value.toUpperCase()})}
                 />
            </div>

            {/* SECCIÓN 3: SELECCIÓN DE ACTIVO */}
            <div className="space-y-4">
                
                {/* TARJETA VISUAL DE ACTIVO SELECCIONADO */}
                {selectedAssetDetails && (
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-md mb-4 animate-in slide-in-from-bottom-2 fade-in relative overflow-hidden">
                        
                        {/* Indicador visual de si está vinculado o no */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${selectedAssetDetails.client_id ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                        
                        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100">
                             <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                                <FileText size={20}/>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Vinculación Actual</p>
                                {selectedAssetDetails.client_id ? (
                                    <p className="text-sm font-black text-emerald-600 uppercase flex items-center gap-1">
                                        <CheckCircle2 size={14}/> {selectedAssetDetails.cliente_nombre || 'Vinculado'}
                                    </p>
                                ) : (
                                    <p className="text-sm font-black text-amber-500 uppercase flex items-center gap-1">
                                        <AlertTriangle size={14}/> Carga Masiva (Sin Vincular) - {selectedAssetDetails.cliente_nombre}
                                    </p>
                                )}
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Tag size={12}/> Identificador ID
                                </label>
                                <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm font-black text-[#0a1e3f] uppercase border border-slate-100">
                                    {selectedAssetDetails.identificador || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Hash size={12}/> Número de Serie
                                </label>
                                <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm font-black text-[#0a1e3f] uppercase border border-slate-100">
                                    {selectedAssetDetails.serial_number || 'S/N'}
                                </div>
                            </div>
                        </div>

                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Package size={12}/> Nombre del Activo / Equipo
                             </label>
                             <div className="bg-slate-100 rounded-xl px-4 py-3 text-sm font-black text-[#0a1e3f] uppercase border border-slate-200/60">
                                {selectedAssetDetails.nombre_activo}
                             </div>
                        </div>

                        {/* Mensaje de confirmación de acción */}
                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-xl text-center border border-blue-100">
                            ℹ️ Al crear este servicio, este activo se vinculará automáticamente al cliente seleccionado.
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                        <Box size={14}/> Vincular Activo ({filteredAssets.length})
                    </label>
                    <div className="relative w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            className="w-full bg-slate-100 rounded-full pl-9 pr-4 py-3 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="BUSCAR GLOBAL (NOMBRE, SERIE, CLIENTE ORIG)..."
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto">
                    {dataLoading ? (
                        <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>
                    ) : (
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-slate-50 text-slate-500 font-black uppercase sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3">Seleccionar</th>
                                    <th className="p-3">Equipo</th>
                                    <th className="p-3">Serie</th>
                                    <th className="p-3">Cliente (Datos)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAssets.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 uppercase font-bold">
                                        {assetSearch ? 'No se encontraron activos con esa búsqueda' : 'Selecciona un cliente o busca para ver activos'}
                                    </td></tr>
                                ) : (
                                    filteredAssets.map(asset => (
                                        <tr 
                                            key={asset.id} 
                                            onClick={() => setFormData({...formData, assetId: asset.id})}
                                            className={`cursor-pointer transition-colors ${formData.assetId === asset.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="p-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.assetId === asset.id ? 'border-emerald-500 bg-emerald-500 text-white scale-110' : 'border-slate-300'}`}>
                                                    {formData.assetId === asset.id && <CheckCircle2 size={10}/>}
                                                </div>
                                            </td>
                                            <td className="p-3 font-bold text-[#0a1e3f]">{asset.nombre_activo}</td>
                                            <td className="p-3 text-slate-500">{asset.serial_number}</td>
                                            <td className="p-3 text-slate-400">
                                                {/* Mostrar indicador si está huerfano */}
                                                {!asset.client_id && <span className="text-amber-500 font-bold mr-1">⚠️</span>}
                                                {asset.cliente_nombre || 'S/N'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors uppercase">Cancelar</button>
            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="bg-[#0a1e3f] text-white px-8 py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-900/20 hover:bg-[#112a55] transition-all flex items-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                {formData.clientId === 'new_client' ? 'REGISTRAR Y VINCULAR' : 'CREAR Y VINCULAR'}
            </button>
        </div>

      </div>
    </div>
  );
}