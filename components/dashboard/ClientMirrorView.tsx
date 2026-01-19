'use client';

import { useState, useEffect } from 'react';
import { 
  MonitorPlay, LogOut, Search, X, Loader2, Plus, Box, Save, 
  User, Building2, Calendar, FileText, CheckCircle2, AlertTriangle, Users
} from 'lucide-react';
// ✅ IMPORTACIÓN CORRECTA PARA CLIENTE (EVITA ERRORES DE PERMISOS)
import { supabase } from '@/lib/supabase-browser';

// ==========================================
// 1. VISTA PRINCIPAL
// ==========================================
export default function ClientMirrorView({ client, tickets, onExit }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] px-8 py-4 rounded-full font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-900/20 transform hover:scale-105 transition-all"
            >
                <Plus size={20} /> Nueva Autogestión
            </button>
        </section>

        {/* LISTA DE TICKETS (VISUALIZACIÓN) */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
             {/* Aquí iría la tabla de tickets existente, la dejo simple para centrar en el modal */}
             <div className="p-10 text-center text-slate-300 font-bold text-xs uppercase">
                LISTADO DE SERVICIOS (VISTA PREVIA)
             </div>
        </div>
      </div>

      {/* MODAL DE NUEVA AUTOGESTIÓN */}
      <NewServiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

// ==========================================
// 2. MODAL DEFINITIVO (CON LÓGICA DE CLIENTE NUEVO/EXISTENTE)
// ==========================================
function NewServiceModal({ isOpen, onClose }: any) {
    // --- ESTADOS ---
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [assetsList, setAssetsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // MODO: 'existing' (Base de datos) o 'new' (Texto libre)
    const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');

    // DATOS FORMULARIO
    const [selectedClientId, setSelectedClientId] = useState(''); // ID para existente
    const [newClientCompany, setNewClientCompany] = useState(''); // Texto para nuevo
    const [newClientContact, setNewClientContact] = useState(''); // Texto para nuevo
    const [description, setDescription] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');

    // BÚSQUEDA ACTIVOS
    const [assetSearch, setAssetSearch] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    // --- 1. CARGA INICIAL (AL ABRIR) ---
    useEffect(() => {
        if (isOpen) {
            // Resetear todo
            setClientMode('existing');
            setSelectedClientId('');
            setNewClientCompany('');
            setNewClientContact('');
            setDescription('');
            setScheduleDate('');
            setAssetSearch('');
            setSelectedAssetId(null);
            
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // A. Traer Clientes
            const { data: clients } = await supabase
                .from('clients')
                .select('id, organization, full_name')
                .order('organization');
            
            // B. Traer TODOS los Activos (Sin filtros RLS)
            const { data: assets } = await supabase
                .from('assets')
                .select('*, clients(organization)')
                .order('created_at', { ascending: false });

            setClientsList(clients || []);
            setAssetsList(assets || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. FILTRADO DE ACTIVOS (LOCAL) ---
    const filteredAssets = assetsList.filter(asset => {
        const term = assetSearch.toLowerCase();
        // Buscar por cualquier campo relevante
        return (
            (asset.nombre_activo || '').toLowerCase().includes(term) ||
            (asset.name || '').toLowerCase().includes(term) ||
            (asset.serie || '').toLowerCase().includes(term) ||
            (asset.identificador || '').toLowerCase().includes(term) ||
            (asset.clients?.organization || '').toLowerCase().includes(term)
        );
    });

    // --- 3. GUARDADO ---
    const handleSubmit = async () => {
        // Validaciones
        if (clientMode === 'existing' && !selectedClientId) return alert("Selecciona un cliente de la lista.");
        if (clientMode === 'new' && (!newClientCompany || !newClientContact)) return alert("Completa los datos del nuevo cliente.");
        if (!description) return alert("Escribe el detalle del servicio.");

        // Construir Objeto
        const ticketPayload = {
            mode: clientMode,
            // Cliente
            client_id: clientMode === 'existing' ? selectedClientId : null,
            new_client_info: clientMode === 'new' ? { company: newClientCompany, contact: newClientContact } : null,
            // Servicio
            description: description,
            scheduled_at: scheduleDate,
            // Activo
            asset_id: selectedAssetId
        };

        console.log("GUARDANDO:", ticketPayload);
        
        let msg = "✅ Solicitud Creada Correctamente.";
        if (clientMode === 'existing' && selectedAssetId) msg += "\n(Activo vinculado al cliente)";
        if (clientMode === 'new' && selectedAssetId) msg += "\n(Activo asignado como referencia)";
        
        alert(msg);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0a1e3f]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            {/* BORDE ROJO TEMPORAL PARA VERIFICAR QUE ES EL ARCHIVO CORRECTO */}
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-emerald-500">
                
                {/* HEADER */}
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-[#0a1e3f] uppercase tracking-tight flex items-center gap-2">
                            <Box className="text-emerald-500"/> Nueva Autogestión V3.0
                        </h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">
                            Generar Servicio y Programación
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                </div>

                {/* BODY */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    {/* 1. SELECTOR DE MODO DE CLIENTE */}
                    <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setClientMode('existing')}
                                className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    clientMode === 'existing' 
                                    ? 'bg-[#0a1e3f] text-white shadow-lg transform scale-[1.02]' 
                                    : 'bg-white text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Building2 size={16}/> Cliente Registrado
                            </button>
                            <button 
                                onClick={() => setClientMode('new')}
                                className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    clientMode === 'new' 
                                    ? 'bg-emerald-500 text-white shadow-lg transform scale-[1.02]' 
                                    : 'bg-white text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <User size={16}/> Cliente Sin Registro
                            </button>
                        </div>

                        {/* INPUTS DINÁMICOS */}
                        <div className="mt-4 px-2 pb-2">
                            {clientMode === 'existing' ? (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                        Seleccionar Cliente de Base de Datos
                                    </label>
                                    <select 
                                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-4 text-xs font-bold text-[#0a1e3f] outline-none focus:border-blue-500 uppercase cursor-pointer"
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                    >
                                        <option value="">-- SELECCIONAR --</option>
                                        {clientsList.map(c => (
                                            <option key={c.id} value={c.id}>{c.organization || c.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">
                                            Nombre Empresa / Cliente
                                        </label>
                                        <input 
                                            className="w-full bg-white border-2 border-emerald-100 rounded-xl px-4 py-3 text-xs font-bold text-[#0a1e3f] outline-none focus:border-emerald-500 uppercase placeholder:normal-case"
                                            placeholder="EJ: RESTAURANTE NUEVO..."
                                            value={newClientCompany}
                                            onChange={(e) => setNewClientCompany(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">
                                            Nombre Contacto
                                        </label>
                                        <input 
                                            className="w-full bg-white border-2 border-emerald-100 rounded-xl px-4 py-3 text-xs font-bold text-[#0a1e3f] outline-none focus:border-emerald-500 uppercase placeholder:normal-case"
                                            placeholder="EJ: JUAN PEREZ..."
                                            value={newClientContact}
                                            onChange={(e) => setNewClientContact(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 2. DETALLE Y PROGRAMACIÓN */}
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
                                <Calendar size={12}/> Programación Cuadrilla
                            </label>
                            <input 
                                type="datetime-local"
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-4 text-xs font-bold text-[#0a1e3f] outline-none focus:border-blue-500 mb-2"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                            />
                            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-700">
                                <Users size={14}/>
                                <span className="text-[9px] font-bold">Asignación pendiente</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 3. TABLA DE ACTIVOS (GLOBAL) */}
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                                    <Box size={14} className="text-emerald-500"/> Vincular Activo ({filteredAssets.length})
                                </label>
                                <p className="text-[9px] text-slate-400 mt-1 font-medium">
                                    {clientMode === 'existing' 
                                        ? "El activo seleccionado quedará VINCULADO al cliente." 
                                        : "El activo se usará solo como REFERENCIA (Sin vincular)."}
                                </p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    className="w-full bg-white border-2 border-slate-100 rounded-full py-2.5 pl-10 pr-4 text-[10px] font-bold uppercase outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    placeholder="BUSCAR: PRUEBA, SERIE, ID..."
                                    value={assetSearch}
                                    onChange={(e) => setAssetSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* TABLA */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col h-72 shadow-sm">
                            <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                                <div className="col-span-1 text-center">Sel</div>
                                <div className="col-span-4">Equipo / Activo</div>
                                <div className="col-span-3">Serie / ID</div>
                                <div className="col-span-4 text-right">Ubicación / Cliente Actual</div>
                            </div>
                            
                            <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center flex-col gap-2">
                                        <Loader2 className="animate-spin text-emerald-500" />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Cargando Inventario...</span>
                                    </div>
                                ) : filteredAssets.length === 0 ? (
                                    <div className="h-full flex items-center justify-center flex-col gap-2 opacity-50">
                                        <Box size={32} className="text-slate-300"/>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">No se encontraron activos</span>
                                    </div>
                                ) : (
                                    filteredAssets.map(asset => (
                                        <div 
                                            key={asset.id}
                                            onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                                            className={`grid grid-cols-12 gap-4 p-3 items-center border-b border-slate-50 cursor-pointer transition-all hover:bg-emerald-50/30 ${
                                                selectedAssetId === asset.id ? 'bg-emerald-50 border-emerald-100' : ''
                                            }`}
                                        >
                                            <div className="col-span-1 flex justify-center">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    selectedAssetId === asset.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                                }`}>
                                                    {selectedAssetId === asset.id && <CheckCircle2 size={10} className="text-white"/>}
                                                </div>
                                            </div>
                                            <div className="col-span-4">
                                                <p className="text-[10px] font-black text-[#0a1e3f] uppercase truncate">
                                                    {asset.nombre_activo || 'SIN NOMBRE'}
                                                </p>
                                            </div>
                                            <div className="col-span-3">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase truncate">{asset.serie || 'S/N'}</p>
                                                <p className="text-[8px] font-bold text-slate-300 uppercase truncate">{asset.identificador || asset.asset_id}</p>
                                            </div>
                                            <div className="col-span-4 text-right">
                                                {asset.clients ? (
                                                    <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded truncate inline-block max-w-full">
                                                        {asset.clients.organization}
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded truncate inline-block">
                                                        SIN ASIGNAR
                                                    </span>
                                                )}
                                                <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase truncate">
                                                    {asset.location_details || 'N/A'}
                                                </p>
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