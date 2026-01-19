'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  X, Zap, Search, CheckCircle2, 
  Box, Calendar, ClipboardList, Plus, RotateCcw, 
  MapPin, Trash2, Lock, Loader2, AlertTriangle
} from 'lucide-react';

import { updateTicket } from '@/lib/tickets.actions';
import { UserRole } from '@/lib/tickets.rules';

export default function ServiceModal({ 
  isOpen, 
  onClose, 
  ticket, 
  currentUser, 
  clients = [], 
  staff = [], 
  assets = [], 
  onActionCompleted 
}: any) {
  
  const [isSaving, setIsSaving] = useState(false);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [stagedAsset, setStagedAsset] = useState<any>(null);
  
  const isEditing = !!ticket;
  const userRole = (currentUser?.role || 'cliente') as UserRole;

  /* ==========================================================
     🔒 LÓGICA DE BLINDAJE (MODO SOLO LECTURA)
     ========================================================== */
  
  // 1. Normalizar estatus actual (si existe ticket)
  const currentStatus = (ticket?.status || '').toLowerCase().trim();
  
  // 2. Definir estatus que bloquean la edición
  const LOCKED_STATUSES = ['realizado', 'ejecutado', 'revision_interna', 'cerrado', 'cancelado'];
  
  // 3. ¿Está bloqueado por estatus? (Si es estatus final Y NO soy superadmin)
  const isStatusLocked = isEditing && LOCKED_STATUSES.includes(currentStatus) && userRole !== 'superadmin';

  // 4. Definir si es Solo Lectura (Por Rol O Por Estatus)
  const isReadOnly = userRole === 'cliente' || userRole === 'operativo' || isStatusLocked;

  const canAssignCoordinator = userRole === 'superadmin' || userRole === 'admin';

  const [form, setForm] = useState({
    clientId: '',
    manualClientName: '',
    clientEmail: '',
    location: '',
    description: '',
    serviceType: 'Mantenimiento Preventivo',
    scheduled_date: '',
    leader_id: '',
    assistant_id: '',
    coordinator_id: '',
    internal_notes: '',
  });

  /* =========================
     1. FILTROS DE PERSONAL
     ========================= */
  const leadersList = useMemo(() => {
    return staff.filter((s: any) => {
        const role = (s.role || '').toLowerCase().trim();
        const pos = (s.position || '').toUpperCase().trim();
        if (role === 'kiosk_master') return true;
        if (role !== 'operativo') return false; 
        return pos.includes('LIDER') || pos.includes('LÍDER') || pos.includes('ENCARGADO');
    });
  }, [staff]);

  const assistantsList = useMemo(() => {
    return staff.filter((s: any) => {
        const role = (s.role || '').toLowerCase().trim();
        const pos = (s.position || '').toUpperCase().trim();
        if (role !== 'operativo') return false;
        const isLeaderPos = pos.includes('LIDER') || pos.includes('LÍDER') || pos.includes('ENCARGADO');
        return !isLeaderPos; 
    });
  }, [staff]);

  const coordinatorsList = useMemo(() => {
    return staff.filter((s: any) => 
      ['admin', 'superadmin', 'coordinador'].includes((s.role || '').toLowerCase())
    );
  }, [staff]);

  /* =========================
     2. CARGA DE DATOS
     ========================= */
  useEffect(() => {
    if (isOpen) {
      if (isEditing && ticket) {
        const dbDate = ticket.scheduled_date ? ticket.scheduled_date.split('T')[0] : '';
        const ticketEmail = (ticket.client_email || '').trim().toLowerCase();
        
        let client = clients.find((c: any) => (c.email || '').trim().toLowerCase() === ticketEmail);
        if (!client && ticket.company) {
            client = clients.find((c: any) => (c.organization || '').trim().toLowerCase() === (ticket.company || '').trim().toLowerCase());
        }

        setForm({
          clientId: client?.id || '',
          manualClientName: client?.organization || ticket.company || 'Cliente Particular',
          clientEmail: ticket.client_email || client?.email || '',
          location: ticket.location || client?.address || '',
          description: ticket.description || '',
          serviceType: ticket.service_type || 'Mantenimiento Preventivo',
          scheduled_date: dbDate,
          leader_id: ticket.leader_id || '',
          assistant_id: ticket.assistant_id || '',
          coordinator_id: ticket.coordinator_id || '',
          internal_notes: ticket.additional_details || '',
        });
      } else {
        setForm({
          clientId: '', manualClientName: '', clientEmail: '', location: '',
          description: '', serviceType: 'Mantenimiento Preventivo', 
          scheduled_date: '', leader_id: '', assistant_id: '', coordinator_id: '', internal_notes: '',
        });
        setStagedAsset(null);
        setAssetSearchTerm('');
      }
    }
  }, [isOpen, isEditing, ticket, clients]);

  /* =========================
     3. MANEJO DE ACTIVOS
     ========================= */
  const filteredAssets = useMemo(() => {
    const term = assetSearchTerm.toLowerCase().trim();
    if (!term) return assets.slice(0, 20);
    return assets
      .filter((asset: any) =>
        String(asset.identificador).toLowerCase().includes(term) ||
        String(asset.nombre_activo).toLowerCase().includes(term) ||
        String(asset.cliente_nombre).toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [assets, assetSearchTerm]);

  const handleSelectAsset = (asset: any) => {
    setStagedAsset(asset);

    if (!form.clientId) {
      const owner = clients.find((c: any) =>
        (c.organization || '').trim().toLowerCase() ===
        (asset.cliente_nombre || '').trim().toLowerCase()
      );

      if (owner) {
        setForm(prev => ({
          ...prev,
          clientId: owner.id,
          manualClientName: owner.organization,
          clientEmail: owner.email,
          location: owner.address || ''
        }));
      }
    }
  };

  /* =========================
     4. GUARDADO / ACCIONES
     ========================= */
  const handleSave = async () => {
    if (isReadOnly) return;
    if (isEditing && (!form.scheduled_date || !form.leader_id)) {
      return alert("Para agendar, asigna fecha y líder.");
    }

    setIsSaving(true);
    try {
      const changes: any = {
        company: form.manualClientName,
        client_email: form.clientEmail,
        location: form.location,
        service_type: form.serviceType,
        description: form.description,
        scheduled_date: form.scheduled_date || null,
        leader_id: form.leader_id || null,
        assistant_id: form.assistant_id || null,
        coordinator_id: form.coordinator_id || null,
        additional_details: form.internal_notes,
      };

      if (form.scheduled_date && (!ticket?.scheduled_date)) {
        changes.status = 'Asignado';
      }

      await updateTicket({
        ticketId: isEditing ? ticket.id : null,
        userId: currentUser?.id,
        source: 'MODAL',
        changes
      });

      if (onActionCompleted) await onActionCompleted();
      onClose();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnToInbox = async () => {
    if (isReadOnly) return;
    if (!confirm("¿Liberar agenda?")) return;
    setIsSaving(true);
    try {
        await updateTicket({
            ticketId: ticket.id,
            userId: currentUser?.id,
            source: 'MODAL',
            changes: { scheduled_date: null, leader_id: null, assistant_id: null, status: 'Pendiente' }
        });
        if(onActionCompleted) await onActionCompleted();
        onClose();
    } catch(e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 pl-2">
            <div className="bg-emerald-50 p-2 rounded-xl text-[#00C897]">
              <Zap size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-slate-800 tracking-tight leading-none">
                {isEditing ? 'Gestión de Servicio' : 'Nuevo Servicio'}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                {isEditing ? `Folio: ${ticket.codigo_servicio || 'SIN FOLIO'}` : 'Alta de Solicitud'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-slate-50 p-2 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
        </div>

        {/* 🔒 BANNER DE BLOQUEO */}
        {isReadOnly && (
          <div className={`p-3 text-[10px] font-black uppercase text-center tracking-widest flex items-center justify-center gap-2 ${isStatusLocked ? 'bg-rose-50 text-rose-600 border-b border-rose-100' : 'bg-blue-50 text-blue-700 border-b border-blue-100'}`}>
            {isStatusLocked ? (
                <>
                    <Lock size={12}/> Servicio finalizado - Edición bloqueada por sistema
                </>
            ) : (
                "Modo solo lectura"
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/30">
          
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="w-full lg:w-[420px] border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 bg-white">
            
            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Cliente</label>
               {isEditing || isReadOnly ? (
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm font-black text-slate-700 uppercase">{form.manualClientName}</p>
                    <p className="text-[10px] text-slate-400">{form.clientEmail}</p>
                 </div>
               ) : (
                 <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                    value={form.clientId}
                    onChange={(e) => {
                        const c = clients.find((cl:any) => cl.id === e.target.value);
                        setForm({...form, clientId: e.target.value, manualClientName: c?.organization || '', clientEmail: c?.email || '', location: c?.address || ''});
                    }}
                 >
                    <option value="">-- Seleccionar Empresa --</option>
                    {clients.map((c:any) => <option key={c.id} value={c.id}>{c.organization}</option>)}
                 </select>
               )}
            </div>

            <div className="space-y-3">
               <div className={`bg-amber-50/40 p-3 rounded-xl border border-amber-100`}>
                  <span className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-2 mb-2"><ClipboardList size={12}/> Detalle Solicitud</span>
                  <textarea 
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-none p-0 text-xs font-medium text-slate-700 resize-none focus:ring-0 disabled:opacity-60"
                      rows={2}
                      placeholder="Descripción..."
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                  />
               </div>
               <div className={`flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100`}>
                  <MapPin size={14} className="text-slate-400 shrink-0"/>
                  <input 
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none disabled:opacity-60" 
                    placeholder="Ubicación..." value={form.location} onChange={e => setForm({...form, location: e.target.value})} 
                  />
               </div>
            </div>

            {!isReadOnly && isEditing && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Calendar size={14}/> Asignación</h3>
                        <button onClick={handleReturnToInbox} className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1">
                            <RotateCcw size={10}/> Liberar Agenda
                        </button>
                    </div>
                    
                    <input type="date" className="w-full bg-slate-50 rounded-xl p-2.5 text-xs font-bold outline-none" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Líder Técnico</label>
                            <select className="w-full bg-slate-50 rounded-xl p-2 text-[10px] font-bold" value={form.leader_id} onChange={e => setForm({...form, leader_id: e.target.value})}>
                                <option value="">Seleccionar...</option>
                                {leadersList.map((s:any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Auxiliar</label>
                            <select className="w-full bg-slate-50 rounded-xl p-2 text-[10px] font-bold" value={form.assistant_id} onChange={e => setForm({...form, assistant_id: e.target.value})}>
                                <option value="">Ninguno</option>
                                {assistantsList.map((s:any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {canAssignCoordinator && (
                      <div className="pt-2 border-t border-slate-50">
                        <label className="text-[8px] font-bold text-blue-500 uppercase ml-1">Coordinador Asignado</label>
                        <select className="w-full bg-blue-50/50 rounded-xl p-2 text-[10px] font-bold border border-blue-100" value={form.coordinator_id} onChange={e => setForm({...form, coordinator_id: e.target.value})}>
                          <option value="">-- Sin Coordinación --</option>
                          {coordinatorsList.map((s:any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      </div>
                    )}
                </div>
            )}
          </div>

          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-slate-50/30">
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-50 shadow-sm disabled:opacity-50"
                  placeholder={isReadOnly ? "Activos vinculados" : "Buscar activo..."}
                  value={assetSearchTerm}
                  onChange={e => setAssetSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {stagedAsset && (
                  <div className="bg-blue-600 p-3 rounded-xl shadow-lg flex justify-between items-center mb-4 text-white">
                    <div className="flex items-center gap-3">
                      <Box size={18}/>
                      <div>
                        <p className="text-[10px] font-bold opacity-80 uppercase leading-none">Activo Vinculado</p>
                        <p className="text-xs font-black uppercase">{stagedAsset.nombre_activo}</p>
                      </div>
                    </div>
                    {!isReadOnly && <button onClick={() => setStagedAsset(null)} className="p-1.5 hover:bg-white/20 rounded-lg"><Trash2 size={14}/></button>}
                  </div>
                )}

                {!isReadOnly && filteredAssets.map((asset: any) => (
                   <div key={asset.id} className="bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all flex justify-between items-center group cursor-pointer" onClick={() => handleSelectAsset(asset)}>
                      <div>
                          <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 rounded">#{asset.identificador}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{asset.cliente_nombre}</span>
                          </div>
                          <h4 className="text-xs font-black text-slate-700 uppercase mt-1">{asset.nombre_activo}</h4>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                          <Plus size={14}/>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-400 hover:bg-slate-50 uppercase transition-colors">Cerrar</button>
          
          {!isReadOnly && (
            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="px-8 py-2.5 bg-[#0a1e3f] hover:bg-blue-900 text-white rounded-xl text-xs font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin"/> : <><CheckCircle2 size={16}/> {isEditing ? 'Guardar Cambios' : 'Crear Solicitud'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}