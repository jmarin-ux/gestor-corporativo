'use client';

import { useState, useEffect } from 'react';
import { 
  X, Save, Search, Building2, Box, User, FileText, Hash, Loader2, CheckCircle2, 
  Calendar, Users, UserPlus, Briefcase, Zap, Flag 
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any; 
  onSuccess?: () => void; 
  client?: any; 
}

export default function CreateTicketModal({ isOpen, onClose, currentUser, onSuccess, client }: CreateTicketModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchingAssets, setSearchingAssets] = useState(false);
  
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const [foundAssets, setFoundAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  
  const [formData, setFormData] = useState({
    clientId: '', 
    manualClientName: '', 
    manualContact: '',    
    description: '',
    projectReference: '',
    priority: 'Normal',
    assetId: '', 
    scheduleDate: '',
    leaderId: '',
    auxiliarId: '',
    serviceType: 'Autogestión' 
  });

  // Debounce for asset search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(assetSearch), 500);
    return () => clearTimeout(timer);
  }, [assetSearch]);

  // Initial Load
  useEffect(() => {
    if (isOpen) {
      setClientMode('existing');
      setFormData({
        clientId: client?.id || '', 
        manualClientName: '',
        manualContact: '',
        description: '',
        projectReference: '',
        priority: 'Normal',
        assetId: '',
        scheduleDate: '',
        leaderId: '',
        auxiliarId: '',
        serviceType: 'Autogestión'
      });
      setAssetSearch('');
      setFoundAssets([]);
      loadLightData();
    }
  }, [isOpen, client]);

  const loadLightData = async () => {
    setInitialLoading(true);
    try {
      const [cReq, sReq] = await Promise.all([
        supabase.from('clients').select('id, organization, full_name').order('organization'),
        supabase.from('profiles').select('id, full_name, email, role').order('full_name')
      ]);
      if (cReq.data) setClients(cReq.data);
      if (sReq.data) setStaffList(sReq.data); 
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Asset Search Logic
  useEffect(() => {
    if (!debouncedSearch) {
        setFoundAssets([]);
        return;
    }
    searchAssetsInServer(debouncedSearch);
  }, [debouncedSearch]);

  const searchAssetsInServer = async (term: string) => {
    setSearchingAssets(true);
    try {
        // Corrected OR syntax for Supabase
        const { data, error } = await supabase
            .from('assets')
            .select('*, clients(organization)')
            .or(`nombre_activo.ilike.%${term}%,serie.ilike.%${term}%,identificador.ilike.%${term}%`)
            .limit(10);
            
        if (error) throw error;
        if (data) setFoundAssets(data);
    } catch (err) {
        console.error("Asset search error:", err);
    } finally {
        setSearchingAssets(false);
    }
  };

  const generateAutoCode = () => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); 
    const year = now.getFullYear().toString().slice(-2); 
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomStr = Array(3).fill(0).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    return `AU${month}${year}${randomStr}`;
  };

  // --- SUBMISSION HANDLER ---
  const handleSubmit = async () => {
    if (!formData.description) return alert("Falta descripción.");
    if (clientMode === 'existing' && !formData.clientId) return alert("Selecciona cliente.");
    if (clientMode === 'new' && !formData.manualClientName) return alert("Nombre de cliente obligatorio.");

    setSubmitting(true);
    try {
        const generatedCode = generateAutoCode();
        let finalClientId = formData.clientId;

        // Determine Location Logic
        let finalLocation = 'SITIO DEL CLIENTE'; // Default safe value
        
        if (clientMode === 'new') {
            finalLocation = formData.manualClientName; // Use company name for new clients
        } else {
            // If existing client, try to get organization name
            const clientObj = clients.find(c => c.id === finalClientId);
            if (clientObj) {
                finalLocation = clientObj.organization || clientObj.full_name || 'OFICINAS';
            }
        }

        // --- COORDINATOR AUTO-ASSIGNMENT LOGIC ---
        // If current user is a coordinator, auto-assign ticket to them
        let coordinatorAssigned = null;
        if (currentUser?.role === 'coordinador') {
            coordinatorAssigned = currentUser.id;
        }

        const newTicket = {
            description: formData.description,
            // ❌ ELIMINADO EL CAMPO 'title' PARA EVITAR EL ERROR DE SCHEMA
            codigo_servicio: generatedCode,
            service_type: 'Autogestión',
            status: formData.leaderId ? 'asignado' : 'pendiente',
            
            priority: formData.priority,
            
            location: finalLocation, 

            quote_reference: formData.projectReference, 

            client_id: clientMode === 'existing' ? finalClientId : null,
            company: clientMode === 'new' ? formData.manualClientName : null,
            contact_name: clientMode === 'new' ? formData.manualContact : null,
            
            asset_id: formData.assetId || null,
            
            scheduled_date: formData.scheduleDate || null,
            technical_lead_id: formData.leaderId || null,
            auxiliary_id: formData.auxiliarId || null,
            
            coordinator_id: coordinatorAssigned, // <--- Auto-assign coordinator here
            created_by: currentUser?.id, // Track creator
            
            technical_level: 'autogestion'
        };

        const { error } = await supabase.from('tickets').insert([newTicket]);
        if (error) throw error;

        // Optional: Update asset location if assigned to a client
        if (clientMode === 'existing' && formData.assetId && finalClientId) {
            await supabase.from('assets').update({ client_id: finalClientId }).eq('id', formData.assetId);
        }

        alert(`✅ Autogestión Generada: ${generatedCode}`);
        if (onSuccess) onSuccess();
        onClose();

    } catch (e: any) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    } finally {
        setSubmitting(false);
    }
  };

  // Staff Filters
  const leadersList = staffList.filter(u => ['lider', 'operativo', 'líder'].includes((u.role || '').toLowerCase().trim()));
  const auxiliariesList = staffList.filter(u => ['auxiliar', 'ayudante', 'operativo'].includes((u.role || '').toLowerCase().trim()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border-4 border-[#0a1e3f]">
        
        {/* HEADER */}
        <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
                <FileText className="text-[#00C897]" /> 
                <h2 className="text-xl font-black uppercase tracking-tight">Nueva Autogestión</h2>
                <span className="bg-[#00C897] text-[#0a1e3f] text-[10px] px-2 py-0.5 rounded font-bold">V6.3 FINAL</span>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 pl-8">
                Generación Rápida de Servicio
            </p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            
            {initialLoading ? (
                <div className="h-40 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#0a1e3f]" size={32}/>
                </div>
            ) : (
                <>
                    {/* 1. CLIENTE Y REFERENCIA */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        {/* Selector de Modo */}
                        <div className="md:col-span-3 flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Cliente</label>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => setClientMode('existing')}
                                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
                                        clientMode === 'existing' ? 'bg-[#0a1e3f] text-white shadow-md' : 'bg-white text-slate-400 border'
                                    }`}
                                >
                                    <Building2 size={14}/> Registrado
                                </button>
                                <button 
                                    onClick={() => setClientMode('new')}
                                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
                                        clientMode === 'new' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-400 border'
                                    }`}
                                >
                                    <User size={14}/> Nuevo / Libre
                                </button>
                            </div>
                        </div>

                        {/* Inputs Dinámicos */}
                        <div className="md:col-span-5">
                            {clientMode === 'existing' ? (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buscar Cliente</label>
                                    <select 
                                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-[#0a1e3f] outline-none uppercase h-[50px]"
                                        value={formData.clientId}
                                        onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                                    >
                                        <option value="">-- SELECCIONAR --</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.organization || c.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <input 
                                        className="w-full bg-white border-2 border-emerald-100 rounded-xl px-4 py-2 text-xs font-bold text-[#0a1e3f] outline-none uppercase placeholder:text-slate-300"
                                        placeholder="NOMBRE EMPRESA"
                                        value={formData.manualClientName}
                                        onChange={(e) => setFormData({...formData, manualClientName: e.target.value.toUpperCase()})}
                                    />
                                    <input 
                                        className="w-full bg-white border-2 border-emerald-100 rounded-xl px-4 py-2 text-xs font-bold text-[#0a1e3f] outline-none uppercase placeholder:text-slate-300"
                                        placeholder="CONTACTO"
                                        value={formData.manualContact}
                                        onChange={(e) => setFormData({...formData, manualContact: e.target.value.toUpperCase()})}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Referencia y Prioridad */}
                        <div className="md:col-span-4 space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block flex items-center gap-2">
                                    <Briefcase size={12}/> #Obra / Proyecto
                                </label>
                                <input 
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1e3f] outline-none uppercase"
                                    placeholder="EJ: PROY-505"
                                    value={formData.projectReference}
                                    onChange={(e) => setFormData({...formData, projectReference: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block flex items-center gap-2">
                                    <Flag size={12}/> Prioridad
                                </label>
                                <select 
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1e3f] outline-none uppercase"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 2. DETALLES Y PROGRAMACIÓN */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Detalle del Servicio</label>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold text-[#0a1e3f] outline-none uppercase min-h-[120px] focus:bg-white transition-all"
                                placeholder="DESCRIBE EL PROBLEMA..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value.toUpperCase()})}
                            />
                        </div>

                        <div className="md:col-span-4 space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Programación</label>
                                <input 
                                    type="datetime-local"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-[#0a1e3f] outline-none"
                                    value={formData.scheduleDate}
                                    onChange={(e) => setFormData({...formData, scheduleDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-600 uppercase mb-1 block">Líder (Op/Lider)</label>
                                <select 
                                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-bold text-blue-800 outline-none uppercase"
                                    value={formData.leaderId}
                                    onChange={(e) => setFormData({...formData, leaderId: e.target.value})}
                                >
                                    <option value="">-- SIN ASIGNAR --</option>
                                    {leadersList.length > 0 ? (
                                        leadersList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)
                                    ) : <option disabled>-- SIN PERSONAL --</option>}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Auxiliar</label>
                                <select 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none uppercase"
                                    value={formData.auxiliarId}
                                    onChange={(e) => setFormData({...formData, auxiliarId: e.target.value})}
                                >
                                    <option value="">-- SIN ASIGNAR --</option>
                                    {auxiliariesList.length > 0 ? (
                                        auxiliariesList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)
                                    ) : <option disabled>-- SIN PERSONAL --</option>}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 3. BÚSQUEDA DE ACTIVOS */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Box size={14}/> Buscador de Activos (Escribe para buscar)
                            </label>
                            {searchingAssets && <span className="text-[9px] text-blue-500 font-bold animate-pulse">BUSCANDO...</span>}
                        </div>
                        
                        <div className="relative mb-3">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input 
                                className="w-full bg-slate-100 rounded-full pl-12 pr-4 py-3 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                                placeholder="ESCRIBE NOMBRE, SERIE O ID..."
                                value={assetSearch}
                                onChange={(e) => setAssetSearch(e.target.value)}
                            />
                        </div>

                        {/* LISTA DE RESULTADOS */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden h-40 bg-white relative">
                            <div className="overflow-y-auto h-full custom-scrollbar">
                                {foundAssets.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                                        {assetSearch ? 'No se encontraron resultados' : 'Esperando búsqueda...'}
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-[10px]">
                                        <thead className="bg-slate-50 text-slate-500 font-black uppercase sticky top-0">
                                            <tr>
                                                <th className="p-2">Sel</th>
                                                <th className="p-2">Equipo</th>
                                                <th className="p-2">Serie</th>
                                                <th className="p-2 text-right">Ubicación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {foundAssets.map(asset => (
                                                <tr 
                                                    key={asset.id} 
                                                    onClick={() => setFormData({...formData, assetId: asset.id === formData.assetId ? '' : asset.id})}
                                                    className={`cursor-pointer hover:bg-slate-50 ${formData.assetId === asset.id ? 'bg-emerald-50' : ''}`}
                                                >
                                                    <td className="p-2 text-center">
                                                        <div className={`w-3 h-3 rounded-full border mx-auto ${formData.assetId === asset.id ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}></div>
                                                    </td>
                                                    <td className="p-2 font-bold text-[#0a1e3f] uppercase">{asset.nombre_activo}</td>
                                                    <td className="p-2 text-slate-500 uppercase">{asset.serial_number || asset.serie}</td>
                                                    <td className="p-2 text-right text-slate-400 uppercase">{asset.clients ? asset.clients.organization : 'SIN ASIGNAR'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                <Zap size={12} className="text-amber-500"/>
                <span>FOLIO AUTOMÁTICO: <span className="text-[#0a1e3f]">AU-{new Date().getMonth()+1}-{new Date().getFullYear().toString().slice(-2)}-XXX</span></span>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 uppercase">Cancelar</button>
                <button 
                    onClick={handleSubmit} 
                    disabled={submitting || initialLoading}
                    className="bg-[#0a1e3f] text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-900/20 hover:bg-[#112a55] transition-all flex items-center gap-2"
                >
                    {submitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                    GENERAR
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}