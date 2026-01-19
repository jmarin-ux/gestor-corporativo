'use client';

import { useState, useMemo } from 'react';
import { 
  X, Save, Calendar, User, MapPin, Building2, 
  MessageSquare, Clock, CheckCircle2, HardHat, Users, 
  ClipboardCheck, FileText, RotateCcw, UserCog, Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

const cleanText = (text: string) => {
    return (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export default function ServiceDetailModal({ 
  isOpen, 
  ticket, 
  onClose, 
  onUpdate,
  currentUser,
  staff = [] 
}: { 
  isOpen: boolean; 
  ticket: any; 
  onClose: () => void; 
  onUpdate?: () => void;
  currentUser: any;
  staff?: any[];
}) {
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS ---
  const [status, setStatus] = useState(ticket?.status || 'pendiente');
  const [scheduledDate, setScheduledDate] = useState(ticket?.scheduled_date ? ticket.scheduled_date.split('T')[0] : '');
  
  // Asignaciones
  const [selectedCoordinator, setSelectedCoordinator] = useState(ticket?.coordinator_id || ticket?.coordinador_id || '');
  const [selectedLeader, setSelectedLeader] = useState(ticket?.technical_lead_id || ticket?.leader_id || '');
  const [selectedAux, setSelectedAux] = useState(ticket?.auxiliary_id || '');
  
  const [notes, setNotes] = useState('');

  // Reporte Técnico
  const [findings, setFindings] = useState(ticket?.technical_result || ''); 
  const [actionsDone, setActionsDone] = useState(ticket?.service_done_comment || ''); 

  // --- FILTROS DE PERSONAL ---
  const coordinatorsList = staff.filter(u => {
      const r = (u.role || '').toLowerCase();
      return ['coordinador', 'admin', 'superadmin'].includes(r);
  });

  const operativesOnly = staff.filter(u => (u.role || '').toLowerCase() === 'operativo');
  const leaders = operativesOnly.filter(u => cleanText(u.position + ' ' + u.technical_level).includes('lider'));
  const auxiliaries = operativesOnly.filter(u => !cleanText(u.position + ' ' + u.technical_level).includes('lider'));

  // --- PERMISOS Y BLOQUEO DE SEGURIDAD ---
  const role = (currentUser?.role || '').toLowerCase().trim();
  
  // 1. Normalizar estatus actual para verificar bloqueo
  const currentStatusLower = (ticket?.status || '').toLowerCase().trim();
  const lockedStatuses = ['realizado', 'ejecutado', 'revision_interna', 'cerrado', 'cancelado'];

  // 🔒 BLOQUEO MAESTRO: Si está en estatus final y NO soy superadmin, todo se bloquea.
  const isStatusLocked = lockedStatuses.includes(currentStatusLower) && role !== 'superadmin';

  // Permisos base (si no está bloqueado por estatus)
  const isSuperOrAdmin = ['admin', 'superadmin'].includes(role);
  const canEditBase = ['admin', 'superadmin', 'coordinador'].includes(role);
  const canEditReportBase = ['admin', 'superadmin', 'coordinador', 'operativo'].includes(role);

  // Permisos Finales (Aplicando el bloqueo)
  const canEdit = canEditBase && !isStatusLocked;
  const canEditReport = canEditReportBase && !isStatusLocked;

  const availableStatuses = useMemo(() => {
      const options = [
          { value: 'pendiente', label: 'Pendiente', roles: ['admin', 'superadmin', 'coordinador'] },
          { value: 'asignado', label: 'Asignado (Automático)', roles: ['admin', 'superadmin'] },
          { value: 'in_progress', label: 'En Proceso', roles: ['admin', 'superadmin', 'coordinador'] },
          { value: 'ejecutado', label: 'Ejecutado', roles: ['operativo', 'admin', 'superadmin', 'coordinador'] }, 
          { value: 'realizado', label: 'Realizado', roles: ['coordinador', 'admin', 'superadmin'] },
          { value: 'revision_interna', label: 'Revisión Control Interno', roles: ['admin', 'superadmin'] },
          { value: 'cerrado', label: 'Cerrado', roles: ['admin', 'superadmin'] },
          { value: 'cancelado', label: 'Cancelado', roles: ['admin', 'superadmin'] },
          { value: 'qa', label: 'QA / Garantía', roles: ['admin', 'superadmin', 'coordinador'] },
      ];
      return options.filter(opt => opt.roles.includes(role));
  }, [role]);

  // 🟢 ACCIÓN: REGRESAR A PENDIENTES
  const handleReturnToPending = async () => {
      if (!confirm("¿Borrar fecha y asignación operativa? El servicio volverá a pendientes.")) return;

      setLoading(true);
      try {
          const updates: any = {
              status: 'pendiente',
              scheduled_date: null,
              technical_lead_id: null,
              leader_id: null,
              auxiliary_id: null,
              updated_at: new Date().toISOString()
          };

          const newLog = {
              date: new Date().toISOString(),
              user: currentUser.full_name || 'Sistema',
              note: 'Reset operativo: Regresado a pendientes.',
              type: 'system_reset'
          };
          
          let currentLogs = ticket.logs || [];
          if (typeof currentLogs === 'string') { try { currentLogs = JSON.parse(currentLogs); } catch(e) { currentLogs = []; } }
          updates.logs = [newLog, ...currentLogs];

          const { error } = await supabase.from('tickets').update(updates).eq('id', ticket.id);
          if (error) throw error;

          alert("↩️ Servicio regresado a pendientes.");
          if (onUpdate) onUpdate();
          onClose();

      } catch (e: any) { alert('Error: ' + e.message); } 
      finally { setLoading(false); }
  };

  // --- GUARDAR ---
  const handleSave = async () => {
    // Alerta de seguridad crítica
    if ((status === 'revision_interna' || status === 'realizado') && role !== 'superadmin') {
        const confirmSave = confirm("⚠️ ALERTA DE BLOQUEO \n\nAl cambiar el estatus a TERMINADO, este ticket se bloqueará y ya no podrás editarlo. ¿Continuar?");
        if (!confirmSave) return;
    }

    setLoading(true);
    try {
        let finalStatus = status;
        // Auto-asignación de estatus si asignan fecha y líder
        if (scheduledDate && selectedLeader && status === 'pendiente') {
            finalStatus = 'in_progress';
        }

        const updates: any = {
            status: finalStatus,
            updated_at: new Date().toISOString(),
            coordinator_id: selectedCoordinator || null,
            coordinador_id: selectedCoordinator || null,
            scheduled_date: scheduledDate || null,
            technical_lead_id: selectedLeader || null,
            leader_id: selectedLeader || null,
            auxiliary_id: selectedAux || null,
            technical_result: findings,
            service_done_comment: actionsDone
        };

        if (notes.trim()) {
            const newLog = {
                date: new Date().toISOString(),
                user: currentUser.full_name || 'Sistema',
                note: notes,
                type: 'manual_update'
            };
            let currentLogs = ticket.logs || [];
            if (typeof currentLogs === 'string') { try { currentLogs = JSON.parse(currentLogs); } catch(e) { currentLogs = []; } }
            updates.logs = [newLog, ...currentLogs];
        }

        const { error } = await supabase.from('tickets').update(updates).eq('id', ticket.id);
        if (error) throw error;

        alert(`✅ Actualizado correctamente.`);
        if (onUpdate) onUpdate();
        onClose();

    } catch (e: any) {
        console.error(e);
        alert('Error: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#F0F4F8] w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="bg-[#0a1e3f] p-6 md:p-8 flex justify-between items-start text-white shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-[#00C897] text-[#0a1e3f] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {ticket.codigo_servicio || 'SIN FOLIO'}
                </span>
                <span className="text-white/50 text-xs font-bold uppercase">{ticket.service_type}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                {ticket.company || 'CLIENTE PARTICULAR'}
            </h2>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all text-white">
            <X size={24} />
          </button>
        </div>

        {/* BANNER DE BLOQUEO */}
        {isStatusLocked && (
            <div className="bg-rose-50 border-b border-rose-100 p-3 text-center text-[10px] font-black uppercase text-rose-600 tracking-widest flex items-center justify-center gap-2">
                <Lock size={12}/> Servicio Finalizado - Edición Bloqueada por Sistema
            </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* INFO (Izquierda) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Building2 size={24}/></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</p>
                                <p className="text-base font-black text-slate-800 uppercase">{ticket.contact_name || ticket.full_name || 'Sin contacto'}</p>
                                <p className="text-xs font-bold text-slate-500 lowercase">{ticket.client_email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 border-t border-slate-50 pt-4">
                            <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><MapPin size={24}/></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</p>
                                <p className="text-sm font-bold text-slate-700 uppercase leading-snug">{ticket.location || ticket.address || 'Sin dirección registrada'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 border-t border-slate-50 pt-4">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><MessageSquare size={24}/></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle</p>
                                <p className="text-sm font-medium text-slate-600 mt-1">{ticket.description || 'Sin descripción.'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Clock size={14}/> Historial
                        </h3>
                        <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {ticket.logs && Array.isArray(ticket.logs) ? (
                                ticket.logs.map((log: any, i: number) => (
                                    <div key={i} className="flex gap-3 text-xs border-l-2 border-slate-200 pl-3 py-1">
                                        <div className="text-slate-400 font-bold min-w-[70px]">{new Date(log.date).toLocaleDateString()}</div>
                                        <div><span className="font-black text-slate-700 uppercase">{log.user}: </span><span className="text-slate-600">{log.note}</span></div>
                                    </div>
                                ))
                            ) : <p className="text-xs text-slate-300 italic">Sin registros.</p>}
                        </div>
                    </div>
                </div>

                {/* ACCIONES (Derecha) */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* 🟢 SECCIÓN: GESTIÓN DE COORDINACIÓN (SOLO ADMIN/SUPERADMIN) */}
                    {isSuperOrAdmin && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-indigo-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-indigo-900 mb-5 flex items-center gap-2">
                                <UserCog size={16} className="text-indigo-500"/> Gestión de Proyecto
                            </h3>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Coordinador Responsable</label>
                                <div className="relative">
                                    <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16}/>
                                    <select 
                                        disabled={isStatusLocked && role !== 'superadmin'}
                                        value={selectedCoordinator}
                                        onChange={(e) => setSelectedCoordinator(e.target.value)}
                                        className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all appearance-none uppercase cursor-pointer disabled:opacity-50"
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {coordinatorsList.map(c => (
                                            <option key={c.id} value={c.id}>{c.full_name} ({c.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROGRAMACIÓN OPERATIVA */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-blue-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-[#0a1e3f] mb-5 flex items-center gap-2">
                            <Users size={16} className="text-blue-500"/> Programación de Cuadrilla
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Fecha Programada</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input 
                                        type="date" 
                                        disabled={!canEdit}
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all uppercase disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Líder Técnico (Operativo)</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16}/>
                                    <select 
                                        disabled={!canEdit}
                                        value={selectedLeader}
                                        onChange={(e) => setSelectedLeader(e.target.value)}
                                        className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all appearance-none uppercase cursor-pointer disabled:opacity-50"
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Auxiliar / Apoyo (Operativo)</label>
                                <div className="relative">
                                    <HardHat className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={16}/>
                                    <select 
                                        disabled={!canEdit}
                                        value={selectedAux}
                                        onChange={(e) => setSelectedAux(e.target.value)}
                                        className="w-full bg-amber-50/50 border border-amber-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 transition-all appearance-none uppercase cursor-pointer disabled:opacity-50"
                                    >
                                        <option value="">-- Sin Auxiliar --</option>
                                        {auxiliaries.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* BOTÓN: REGRESAR A PENDIENTES (Solo si no está bloqueado) */}
                            {canEdit && (scheduledDate || selectedLeader) && !isStatusLocked && (
                                <button 
                                    onClick={handleReturnToPending}
                                    className="w-full py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    <RotateCcw size={12}/> Regresar a Pendientes
                                </button>
                            )}
                        </div>
                    </div>

                    {/* REPORTE TÉCNICO */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <ClipboardCheck size={16} className="text-purple-500"/> Reporte de Servicio
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block flex gap-1 items-center">
                                    <FileText size={10}/> Hallazgos Técnicos
                                </label>
                                <textarea 
                                    disabled={!canEditReport}
                                    placeholder="¿Qué se encontró al revisar?" 
                                    className="w-full bg-purple-50/30 border border-purple-100 rounded-xl p-3 text-xs font-medium outline-none h-20 resize-none focus:bg-white focus:border-purple-300 transition-all disabled:opacity-50"
                                    value={findings}
                                    onChange={(e) => setFindings(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block flex gap-1 items-center">
                                    <CheckCircle2 size={10}/> Acciones Realizadas
                                </label>
                                <textarea 
                                    disabled={!canEditReport}
                                    placeholder="¿Qué solución se aplicó?" 
                                    className="w-full bg-emerald-50/30 border border-emerald-100 rounded-xl p-3 text-xs font-medium outline-none h-20 resize-none focus:bg-white focus:border-emerald-300 transition-all disabled:opacity-50"
                                    value={actionsDone}
                                    onChange={(e) => setActionsDone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ESTATUS Y CONTROL */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Estatus Actual ({role})</label>
                                <select 
                                    disabled={!canEdit}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none uppercase cursor-pointer disabled:opacity-50"
                                >
                                    {!availableStatuses.find(opt => opt.value === status) && (
                                        <option value={status}>{status.toUpperCase()}</option>
                                    )}
                                    {availableStatuses.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nota Interna</label>
                                <textarea 
                                    disabled={!canEdit}
                                    placeholder="Nota sobre el cambio..." 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none h-14 resize-none disabled:opacity-50"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                            
                            {/* BOTÓN GUARDAR (SOLO SI NO ESTÁ BLOQUEADO) */}
                            {(!isStatusLocked || role === 'superadmin') && (canEdit || canEditReport) && (
                                <button 
                                    onClick={handleSave} 
                                    disabled={loading}
                                    className="w-full bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] font-black uppercase py-4 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {loading ? <CheckCircle2 className="animate-spin"/> : <Save size={18}/>}
                                    Guardar Cambios
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>
    </div>
  );
}