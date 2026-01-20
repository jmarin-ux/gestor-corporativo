'use client';

import { useState, useEffect } from 'react';
import { 
  MonitorPlay, LogOut, Search, X, Loader2, Plus, Box, Save, 
  User, Building2, Calendar, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { useRBAC } from '@/hooks/useRBAC'; // <--- IMPORTANTE

// ==========================================
// 1. VISTA PRINCIPAL
// ==========================================
export default function ClientMirrorView({ client, tickets, onExit, currentUserRole }: any) { // Recibimos el rol actual
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Hook de Permisos
  const { can } = useRBAC(currentUserRole);

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in zoom-in duration-300 font-sans">
      
      {/* BARRA SUPERIOR - MODO ESPEJO */}
      <div className="bg-[#0a1e3f] text-white p-3 px-6 flex justify-between items-center sticky top-0 z-[50] shadow-md">
        <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
          <MonitorPlay size={18} className="text-emerald-400" />
          <span>Modo Espejo: {client.organization || client.full_name}</span>
        </div>
        <button onClick={onExit} className="bg-red-500 hover:bg-red-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2">
          <LogOut size={14}/> Salir
        </button>
      </div>

      <div className="p-4 md:p-10 pb-24 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h1 className="text-2xl font-black text-[#0a1e3f] uppercase tracking-tight">
                    Portal de Servicios
                </h1>
                <p className="text-slate-400 text-xs font-bold uppercase mt-1">
                    Gestión de Tickets y Activos
                </p>
            </div>
            
            {/* BOTÓN PROTEGIDO POR RBAC */}
            {can('tickets', 'create') && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] px-8 py-4 rounded-full font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-900/20 transform hover:scale-105 transition-all"
                >
                    <Plus size={20} /> Programación Semanal
                </button>
            )}
        </section>

        {/* LISTA DE TICKETS (VISUALIZACIÓN) */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
             {/* Aquí iría la tabla de tickets existente */}
             <div className="p-10 text-center text-slate-300 font-bold text-xs uppercase">
                LISTADO DE SERVICIOS DEL CLIENTE
             </div>
        </div>
      </div>

      {/* MODAL DE NUEVA AUTOGESTIÓN */}
      <NewServiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        // Pasamos el cliente pre-seleccionado para bloquear el modo
        defaultClient={client} 
      />
    </div>
  );
}

// ==========================================
// 2. MODAL ADAPTADO
// ==========================================
function NewServiceModal({ isOpen, onClose, defaultClient }: any) {
    // --- ESTADOS ---
    const [assetsList, setAssetsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // DATOS FORMULARIO
    // En modo espejo, el cliente SIEMPRE es el que estamos espejeando
    const [description, setDescription] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');

    // BÚSQUEDA ACTIVOS
    const [assetSearch, setAssetSearch] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    // --- 1. CARGA INICIAL (AL ABRIR) ---
    useEffect(() => {
        if (isOpen) {
            setDescription('');
            setScheduleDate('');
            setAssetSearch('');
            setSelectedAssetId(null);
            fetchAssets();
        }
    }, [isOpen]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            // Traer SOLO los activos de ESTE cliente
            const { data: assets } = await supabase
                .from('assets')
                .select('*, clients(organization)')
                .eq('client_id', defaultClient.id) // FILTRO CRÍTICO
                .order('created_at', { ascending: false });

            setAssetsList(assets || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. FILTRADO LOCAL ---
    const filteredAssets = assetsList.filter(asset => {
        const term = assetSearch.toLowerCase();
        return (
            (asset.nombre_activo || '').toLowerCase().includes(term) ||
            (asset.serie || '').toLowerCase().includes(term) ||
            (asset.identificador || '').toLowerCase().includes(term)
        );
    });

    // --- 3. GUARDADO ---
    const handleSubmit = async () => {
        if (!description) return alert("Escribe el detalle del servicio.");

        // Construir Objeto Directo
        const newTicket = {
            description: description,
            scheduled_date: scheduleDate || null,
            asset_id: selectedAssetId || null,
            client_id: defaultClient.id, // Cliente Fijo
            company: defaultClient.organization, // Nombre Fijo
            service_type: 'Programación Semanal',
            status: 'pendiente',
            // Generamos código temporal o dejamos que el backend lo haga
            codigo_servicio: `AU-${Date.now().toString().slice(-6)}` 
        };

        try {
            const { error } = await supabase.from('tickets').insert([newTicket]);
            if (error) throw error;
            
            alert("✅ Solicitud Creada Correctamente.");
            onClose();
        } catch(e: any) {
            alert("Error: " + e.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0a1e3f]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-emerald-500">
                
                {/* HEADER */}
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-[#0a1e3f] uppercase tracking-tight flex items-center gap-2">
                            <Box className="text-emerald-500"/> Programación Semanal
                        </h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">
                            Cliente: <span className="text-blue-600">{defaultClient.organization}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                </div>

                {/* BODY */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    {/* 1. DETALLE Y PROGRAMACIÓN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                <FileText size={12}/> Detalle del Servicio
                            </label>
                            <textarea 
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-bold text-[#0a1e3f] outline-none focus:border-blue-500 min-h-[120px] resize-none uppercase"
                                placeholder="DESCRIBE LA FALLA O SERVICIO REQUERIDO..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                <Calendar size={12}/> Fecha Preferente
                            </label>
                            <input 
                                type="datetime-local"
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-4 text-xs font-bold text-[#0a1e3f] outline-none focus:border-blue-500 mb-2"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 2. TABLA DE ACTIVOS (DEL CLIENTE) */}
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                                    <Box size={14} className="text-emerald-500"/> Seleccionar Activo ({filteredAssets.length})
                                </label>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    className="w-full bg-white border-2 border-slate-100 rounded-full py-2.5 pl-10 pr-4 text-[10px] font-bold uppercase outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    placeholder="BUSCAR EQUIPO..."
                                    value={assetSearch}
                                    onChange={(e) => setAssetSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* TABLA SIMPLIFICADA */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col h-64 shadow-sm">
                            <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center flex-col gap-2">
                                        <Loader2 className="animate-spin text-emerald-500" />
                                    </div>
                                ) : filteredAssets.length === 0 ? (
                                    <div className="h-full flex items-center justify-center flex-col gap-2 opacity-50">
                                        <Box size={32} className="text-slate-300"/>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Este cliente no tiene activos registrados</span>
                                    </div>
                                ) : (
                                    filteredAssets.map(asset => (
                                        <div 
                                            key={asset.id}
                                            onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                                            className={`flex items-center gap-4 p-3 border-b border-slate-50 cursor-pointer transition-all hover:bg-emerald-50/30 ${
                                                selectedAssetId === asset.id ? 'bg-emerald-50 border-emerald-100' : ''
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                selectedAssetId === asset.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                            }`}/>
                                            <div>
                                                <p className="text-[10px] font-black text-[#0a1e3f] uppercase">{asset.nombre_activo}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Serie: {asset.serie || 'S/N'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="bg-[#0a1e3f] hover:bg-blue-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all text-xs">
                        <Save size={16} /> Crear Servicio
                    </button>
                </div>

            </div>
        </div>
    );
}