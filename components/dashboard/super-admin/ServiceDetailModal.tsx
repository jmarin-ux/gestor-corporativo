'use client';

import { useState } from 'react';
import { 
  X, Save, Calendar, User, MapPin, Building2, 
  MessageSquare, Clock, CheckCircle2, HardHat, Users
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
  staff = [] // Lista completa de personal
}: { 
  isOpen: boolean; 
  ticket: any; 
  onClose: () => void; 
  onUpdate?: () => void;
  currentUser: any;
  staff?: any[];
}) {
  const [loading, setLoading] = useState(false);
  
  // Estados Locales
  const [status, setStatus] = useState(ticket?.status || 'pendiente');
  // Fecha: Si existe, la usamos y cortamos la parte de la hora. Si no, cadena vacía.
  const [scheduledDate, setScheduledDate] = useState(ticket?.scheduled_date ? ticket.scheduled_date.split('T')[0] : '');
  // IDs de asignación (Strings vacíos si es null)
  const [selectedLeader, setSelectedLeader] = useState(ticket?.technical_lead_id || ticket?.leader_id || '');
  const [selectedAux, setSelectedAux] = useState(ticket?.auxiliary_id || '');
  const [notes, setNotes] = useState('');

  // Filtros de Personal
  const leaders = staff.filter(u => {
      const t = cleanText(u.position + ' ' + u.technical_level);
      return t.includes('lider');
  });
  
  const auxiliaries = staff.filter(u => {
      const t = cleanText(u.position + ' ' + u.technical_level);
      return !t.includes('lider');
  });

  // Permisos
  const role = (currentUser?.role || '').toLowerCase();
  const canEdit = ['admin', 'superadmin', 'coordinador'].includes(role);

  // 🟢 FUNCIÓN DE GUARDADO INTELIGENTE (AUTO-HISTORIAL)
  const handleSave = async () => {
    setLoading(true);
    try {
        const updates: any = {
            status: status,
            updated_at: new Date().toISOString(),
            scheduled_date: scheduledDate || null, // Guardamos la fecha
            technical_lead_id: selectedLeader || null,
            leader_id: selectedLeader || null,
            auxiliary_id: selectedAux || null,
        };

        // --- DETECCIÓN DE CAMBIOS PARA EL HISTORIAL ---
        let changeLog: string[] = [];

        // 1. Detectar cambio de Estatus
        if (status !== ticket.status) {
            changeLog.push(`Estatus actualizado a: ${status.toUpperCase()}`);
        }

        // 2. Detectar cambio de Fecha
        const oldDate = ticket.scheduled_date ? ticket.scheduled_date.split('T')[0] : '';
        if (scheduledDate !== oldDate) {
            changeLog.push(`Fecha reprogramada para: ${scheduledDate || 'Sin fecha'}`);
        }

        // 3. Detectar cambio de Líder
        // Usamos '!=' para comparar aunque uno sea string y otro number
        const oldLeader = ticket.technical_lead_id || ticket.leader_id || '';
        if (selectedLeader != oldLeader) { 
             const leaderName = staff.find(s => s.id == selectedLeader)?.full_name || 'Sin Asignar';
             changeLog.push(`Líder asignado: ${leaderName}`);
        }

        // 4. Detectar cambio de Auxiliar
        const oldAux = ticket.auxiliary_id || '';
        if (selectedAux != oldAux) {
             const auxName = staff.find(s => s.id == selectedAux)?.full_name || 'Sin Asignar';
             changeLog.push(`Auxiliar asignado: ${auxName}`);
        }

        // 5. Agregar nota manual si el usuario escribió algo
        if (notes.trim()) {
            changeLog.push(`Nota: ${notes}`);
        }

        // --- SI HUBO ALGÚN CAMBIO, GUARDAMOS EL LOG ---
        if (changeLog.length > 0) {
            const finalNote = changeLog.join('. '); // Unimos los cambios en un solo texto

            const newLog = {
                date: new Date().toISOString(),
                user: currentUser.full_name || 'Sistema',
                note: finalNote,
                type: 'system_update' 
            };

            // Recuperamos logs anteriores asegurando que sea un array
            let currentLogs = ticket.logs || [];
            if (typeof currentLogs === 'string') {
                try { currentLogs = JSON.parse(currentLogs); } catch(e) { currentLogs = []; }
            }
            
            // Agregamos el nuevo log al principio
            updates.logs = [newLog, ...currentLogs];
        }

        // Actualizamos en Supabase
        const { error } = await supabase.from('tickets').update(updates).eq('id', ticket.id);
        if (error) throw error;

        alert('✅ Servicio actualizado correctamente.');
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* IZQUIERDA: DATOS */}
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
                                <p className="text-sm font-bold text-slate-700 uppercase leading-snug">{ticket.location || ticket.address || 'Sin dirección'}</p>
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

                    {/* Historial */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Clock size={14}/> Historial de Movimientos
                        </h3>
                        <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {ticket.logs && Array.isArray(ticket.logs) && ticket.logs.length > 0 ? (
                                ticket.logs.map((log: any, i: number) => (
                                    <div key={i} className="flex gap-3 text-xs border-l-2 border-slate-200 pl-3 py-1">
                                        <div className="text-slate-400 font-bold min-w-[70px]">
                                            {new Date(log.date).toLocaleDateString('es-MX', {day: '2-digit', month:'2-digit'})}
                                        </div>
                                        <div>
                                            <span className="font-black text-slate-700 uppercase">{log.user}: </span>
                                            <span className="text-slate-600">{log.note}</span>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="text-xs text-slate-300 italic">Sin registros previos.</p>}
                        </div>
                    </div>
                </div>

                {/* DERECHA: ACCIONES */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* SECCIÓN DE PROGRAMACIÓN */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-blue-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-[#0a1e3f] mb-5 flex items-center gap-2">
                            <Users size={16} className="text-blue-500"/> Asignación de Cuadrilla
                        </h3>

                        <div className="space-y-4">
                            {/* 1. FECHA */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Fecha Programada</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input 
                                        type="date" 
                                        disabled={!canEdit}
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all uppercase"
                                    />
                                </div>
                            </div>

                            {/* 2. LÍDER */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Líder Técnico</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16}/>
                                    <select 
                                        disabled={!canEdit}
                                        value={selectedLeader}
                                        onChange={(e) => setSelectedLeader(e.target.value)}
                                        className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all appearance-none uppercase cursor-pointer"
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* 3. AUXILIAR */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Auxiliar</label>
                                <div className="relative">
                                    <HardHat className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={16}/>
                                    <select 
                                        disabled={!canEdit}
                                        value={selectedAux}
                                        onChange={(e) => setSelectedAux(e.target.value)}
                                        className="w-full bg-amber-50/50 border border-amber-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 transition-all appearance-none uppercase cursor-pointer"
                                    >
                                        <option value="">-- Sin Auxiliar --</option>
                                        {auxiliaries.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ESTATUS Y NOTAS */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Estatus Actual</label>
                                <select 
                                    disabled={!canEdit}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none uppercase"
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="asignado">Asignado</option>
                                    <option value="in_progress">En Proceso</option>
                                    <option value="closed">Cerrado</option>
                                    <option value="cancelled">Cancelado</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nota Interna (Opcional)</label>
                                <textarea 
                                    disabled={!canEdit}
                                    placeholder="Escribe una nota manual si deseas..." 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none h-20 resize-none"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                            {canEdit && (
                                <button 
                                    onClick={handleSave} 
                                    disabled={loading}
                                    className="w-full bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] font-black uppercase py-4 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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