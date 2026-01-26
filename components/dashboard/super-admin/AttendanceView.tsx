'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser'; 
import { 
  Loader2, MapPin, Eye, Calendar, Search, User, ArrowRight, Filter, 
  ChevronDown, AlertTriangle, LogOut, CheckCircle2, X, Clock, FileText, 
  Edit3, Users 
} from 'lucide-react';

// --- HELPER PARA NORMALIZAR ROLES ---
const normalizeRole = (role: any) => {
  return (role || '').toString().toLowerCase().trim();
};

const ADMIN_ROLES = ['admin', 'superadmin', 'coordinador', 'gerente'];

export default function AttendanceView() {
  const [groupedLogs, setGroupedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- ESTADOS DE FILTRO ---
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('hoy'); 
  const [showOnlyPresent, setShowOnlyPresent] = useState(true); // Filtro activo por defecto

  // --- ESTADOS PARA EDICIÓN / CIERRE MANUAL ---
  const [modalOpen, setModalOpen] = useState(false);
  const [targetLog, setTargetLog] = useState<{userId: string, date: string, name: string, logId?: string, currentType?: string} | null>(null);
  
  const [manualTime, setManualTime] = useState('18:00'); 
  const [manualNote, setManualNote] = useState(''); 
  const [saving, setSaving] = useState(false);

  // Fechas
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 1. INICIALIZAR USUARIO Y FECHAS
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id, role, full_name').eq('id', user.id).single();
        setCurrentUser(profile);
      }
      applyPreset('hoy');
    };
    init();
  }, []);

  // 2. LÓGICA DE PRESETS
  const applyPreset = (preset: string) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start = new Date(today);
      let end = new Date(today);

      switch (preset) {
          case 'hoy': break;
          case 'semana':
              const day = today.getDay() || 7; 
              if (day !== 1) start.setDate(today.getDate() - (day - 1));
              end.setDate(start.getDate() + 6);
              break;
          case 'quincena':
              const currentDay = today.getDate();
              if (currentDay <= 15) { start.setDate(1); end.setDate(15); } 
              else { start.setDate(16); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
              break;
          case 'mes':
              start.setDate(1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              break;
          case 'custom':
              setSelectedPreset('custom'); return;
      }

      const toLocalISO = (d: Date) => {
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };
      setStartDate(toLocalISO(start));
      setEndDate(toLocalISO(end));
      setSelectedPreset(preset);
      setShowFilterMenu(false);
  };

  // 3. CARGAR DATOS
  const fetchAndGroupLogs = useCallback(async () => {
    if (!currentUser || !startDate || !endDate) return;
    setLoading(true);
    
    const startIso = new Date(`${startDate}T00:00:00`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

    let query = supabase
      .from('attendance_logs')
      .select(`*, profiles!user_id ( full_name, role )`)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: true });

    const role = normalizeRole(currentUser.role);
    if (!ADMIN_ROLES.includes(role)) {
       query = query.eq('user_id', currentUser.id);
    }

    const { data, error } = await query;
    if (error) console.error(error);

    const rawLogs = data || [];
    const groups: Record<string, any> = {};

    rawLogs.forEach((log) => {
        const logDateObj = new Date(log.created_at);
        const logDate = logDateObj.toLocaleDateString('en-CA'); 
        const userId = log.user_id;
        const key = `${userId}_${logDate}`;

        if (!groups[key]) {
            groups[key] = {
                id: key, user_id: log.user_id, date: logDate, user: log.profiles, entrada: null, salida: null
            };
        }
        if (log.check_type === 'ENTRADA') groups[key].entrada = log;
        else if (log.check_type.includes('SALIDA')) groups[key].salida = log;
    });

    setGroupedLogs(Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date)));
    setLoading(false);
  }, [currentUser, startDate, endDate]);

  useEffect(() => { fetchAndGroupLogs(); }, [fetchAndGroupLogs]);

  // 🟢 ABRIR MODAL
  const openModal = (userId: string, date: string, name: string, log?: any) => {
     setTargetLog({ 
         userId, date, name, 
         logId: log?.id, 
         currentType: log?.check_type 
     });
     
     if (log) {
         const dateObj = new Date(log.created_at);
         const hours = dateObj.getHours().toString().padStart(2, '0');
         const minutes = dateObj.getMinutes().toString().padStart(2, '0');
         setManualTime(`${hours}:${minutes}`);
         setManualNote(log.notes || '');
     } else {
         setManualTime('18:00');
         setManualNote('');
     }
     setModalOpen(true);
  };

  // 🟢 GUARDAR CAMBIOS (Lógica Inteligente)
  const handleSave = async () => {
      if (!targetLog) return;
      if (!manualNote.trim()) { 
          alert("Por favor escribe el motivo del cambio."); 
          return; 
      }

      setSaving(true);
      try {
          // 1. Convertir hora seleccionada a UTC
          const localDateTimeString = `${targetLog.date}T${manualTime}:00`;
          const localDate = new Date(localDateTimeString);
          const utcIsoString = localDate.toISOString();

          if (targetLog.logId) {
              // 🟦 CASO 1: EDICIÓN DE REGISTRO EXISTENTE
              // Solo actualizamos Hora y Nota. 
              // NO tocamos 'check_type', 'photo_url' ni 'latitude' para no perder la evidencia original.
              const { error } = await supabase.from('attendance_logs')
                  .update({
                      created_at: utcIsoString,
                      notes: manualNote,
                  })
                  .eq('id', targetLog.logId);
              
              if (error) throw error;

          } else {
              // 🟩 CASO 2: CREACIÓN DE NUEVO CIERRE (MANUAL)
              const { error } = await supabase.from('attendance_logs').insert({
                  user_id: targetLog.userId,
                  check_type: 'SALIDA_MANUAL', 
                  created_at: utcIsoString,
                  notes: manualNote,
                  latitude: 0, 
                  longitude: 0,
                  photo_url: 'https://via.placeholder.com/150?text=EDICION_ADMIN'
              });

              if (error) throw error;
          }

          setModalOpen(false);
          setTargetLog(null);
          fetchAndGroupLogs(); // Recargar tabla

      } catch (error: any) {
          console.error("Error saving log:", error);
          alert("Error al guardar: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  // Sub-componente TimeCell
  const TimeCell = ({ log, type, userId, date, name, hasEntry }: { log: any, type: 'ENTRADA' | 'SALIDA', userId?: string, date?: string, name?: string, hasEntry?: boolean }) => {
      const role = normalizeRole(currentUser?.role);
      const isSuperAdmin = role === 'superadmin';

      // 1. CASO: NO HAY REGISTRO
      if (!log) {
          if (type === 'SALIDA' && isSuperAdmin) {
            return (
                <button 
                    onClick={() => openModal(userId!, date!, name!)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm active:scale-95 group"
                    title="Crear Cierre Manual"
                >
                    <Clock size={14} className="group-hover:text-blue-600"/>
                    <span className="text-[10px] font-black uppercase group-hover:text-blue-900">Cerrar Día</span>
                </button>
            );
          }
          return (
            <div className="flex items-center gap-2 opacity-30 py-2">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                <span className="text-[10px] font-bold uppercase italic text-slate-400">--:--</span>
            </div>
          );
      }

      // 2. CASO: SALIDA AUTOMÁTICA SIN ENTRADA (FALTA)
      if (log.check_type === 'SALIDA_AUTO' && !hasEntry && type === 'SALIDA') {
          return (
            <button 
                disabled={!isSuperAdmin}
                onClick={() => isSuperAdmin && openModal(userId!, date!, name!, log)}
                className={`relative group/tooltip w-full flex items-center justify-between p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 ${isSuperAdmin ? 'hover:border-rose-400 cursor-pointer' : ''}`}
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <div className="flex flex-col text-left">
                        <span className="text-[9px] font-black uppercase leading-none">SIN REGISTRO</span>
                        <span className="text-[9px] font-medium mt-0.5 opacity-75">Cierre Auto</span>
                    </div>
                </div>
                {isSuperAdmin && <Edit3 size={12} className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity text-rose-400"/>}
            </button>
          );
      }

      // 3. CASO: REGISTRO NORMAL
      const isManual = log.check_type === 'SALIDA_MANUAL';
      const isAuto = log.check_type === 'SALIDA_AUTO';
      
      let bgClass = ''; let borderClass = ''; let textClass = ''; let badgeColor = '';

      if (type === 'ENTRADA') {
          bgClass = 'bg-emerald-50'; borderClass = 'border-emerald-100'; textClass = 'text-emerald-800'; badgeColor = 'bg-emerald-500';
      } else if (isManual) {
          bgClass = 'bg-indigo-50'; borderClass = 'border-indigo-200'; textClass = 'text-indigo-700'; badgeColor = 'bg-indigo-500';
      } else if (isAuto) {
          bgClass = 'bg-amber-50'; borderClass = 'border-amber-200'; textClass = 'text-amber-800'; badgeColor = 'bg-amber-500';
      } else {
          bgClass = 'bg-orange-50'; borderClass = 'border-orange-100'; textClass = 'text-orange-800'; badgeColor = 'bg-orange-500';
      }

      return (
          <button
              disabled={!isSuperAdmin} 
              onClick={() => isSuperAdmin && openModal(userId!, date!, name!, log)}
              className={`relative group/tooltip w-full flex items-center justify-between p-2 rounded-xl border ${bgClass} ${borderClass} ${textClass} min-w-[150px] ${isSuperAdmin ? 'hover:brightness-95 cursor-pointer' : ''}`}
          >
              <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${badgeColor}`}></div>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-black">
                            {new Date(log.created_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', hour12: true})}
                        </span>
                        {log.notes && <span className="text-[8px] font-bold opacity-60 truncate max-w-[80px]">📝 Nota</span>}
                    </div>
              </div>
              
              {isSuperAdmin ? (
                  <Edit3 size={12} className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity"/>
              ) : (
                  <div className="flex gap-1">
                      {log.photo_url && <Eye size={12} className="opacity-50"/>}
                  </div>
              )}

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl text-left">
                  <p className="font-bold text-slate-400 mb-1 uppercase border-b border-slate-600 pb-1">
                      {isManual ? 'Modificado por Admin' : (isAuto ? 'Cierre Automático' : (type === 'ENTRADA' ? 'Entrada' : 'Salida App'))}
                  </p>
                  {log.notes && <p className="italic">"{log.notes}"</p>}
              </div>
          </button>
      );
  };

  if (!currentUser) return null;

  const role = normalizeRole(currentUser.role);
  const canViewAll = ADMIN_ROLES.includes(role);

  // 🟢 FILTRADO FINAL DE DATOS
  const displayLogs = showOnlyPresent 
        ? groupedLogs.filter(row => !!row.entrada) 
        : groupedLogs;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
        
        {/* HEADER Y FILTROS */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
                <h2 className="text-xl font-black text-[#0a1e3f] uppercase flex items-center gap-2">
                    <Calendar className="text-emerald-500" /> Bitácora de Asistencia
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {canViewAll ? 'Vista Global de Personal' : 'Mis Registros Personales'}
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
                {/* BOTÓN FILTRO */}
                <button 
                    onClick={() => setShowOnlyPresent(!showOnlyPresent)}
                    className={`
                        px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all
                        ${showOnlyPresent 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}
                    `}
                >
                    <Users size={16} className={showOnlyPresent ? "text-emerald-600" : "text-slate-400"}/>
                    {showOnlyPresent ? "Solo Presentes" : "Mostrar Todos"}
                </button>

                <div className="relative">
                    <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="w-full md:w-auto px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-black uppercase text-slate-700 hover:bg-slate-100 transition-all">
                        <span className="flex items-center gap-2">
                            <Filter size={14} className="text-slate-400"/>
                            {selectedPreset === 'custom' ? 'A Medida' : selectedPreset.replace('_', ' ')}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`}/>
                    </button>
                    {showFilterMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                            {[{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Esta Semana' }, { id: 'quincena', label: 'Esta Quincena' }, { id: 'mes', label: 'Este Mes' }, { id: 'custom', label: 'Personalizado' }].map((opt) => (
                                <button key={opt.id} onClick={() => applyPreset(opt.id)} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-slate-50 transition-colors ${selectedPreset === opt.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600'}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 flex-1 xl:flex-none">
                    <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setSelectedPreset('custom'); }} className="bg-transparent border-none outline-none text-xs font-black uppercase text-slate-700 w-full md:w-auto"/>
                    <ArrowRight size={12} className="text-slate-300"/>
                    <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setSelectedPreset('custom'); }} className="bg-transparent border-none outline-none text-xs font-black uppercase text-slate-700 w-full md:w-auto"/>
                    <button onClick={fetchAndGroupLogs} className="p-1.5 bg-[#0a1e3f] text-white rounded-lg hover:bg-blue-900 transition-colors shadow-md"><Search size={14}/></button>
                </div>
            </div>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4">
                    <Loader2 className="animate-spin text-emerald-500" size={40}/>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargando...</p>
                </div>
            ) : displayLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-slate-300 opacity-60">
                    <Calendar size={64} className="mb-4 stroke-1"/>
                    <p className="text-xs font-black uppercase tracking-widest">
                        {showOnlyPresent ? "Nadie ha registrado asistencia aún" : "Sin registros en este periodo"}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                                <th className="p-5">Fecha</th>
                                <th className="p-5">Colaborador</th>
                                <th className="p-5">Entrada</th>
                                <th className="p-5">Salida</th>
                                <th className="p-5 text-center">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayLogs.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[#0a1e3f] uppercase group-hover:text-emerald-600 transition-colors">
                                                {new Date(row.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric'})}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                {new Date(row.date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric'})}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                <User size={16}/>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 uppercase">{row.user?.full_name || 'Desconocido'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.user?.role || 'Personal'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <TimeCell 
                                            log={row.entrada} type="ENTRADA" 
                                            userId={row.user_id} date={row.date} name={row.user?.full_name}
                                        />
                                    </td>
                                    <td className="p-5">
                                        <TimeCell 
                                          log={row.salida} type="SALIDA" 
                                          userId={row.user_id} date={row.date} name={row.user?.full_name}
                                          hasEntry={!!row.entrada}
                                        />
                                    </td>
                                    <td className="p-5 text-center">
                                        {row.entrada && row.salida ? (
                                            <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-wider items-center gap-1"><CheckCircle2 size={10}/> Completa</span>
                                        ) : row.entrada ? (
                                            <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">Abierta</span>
                                        ) : (
                                            <span className="inline-flex px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[9px] font-black uppercase tracking-wider">Ausente</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* MODAL DE EDICIÓN / CIERRE */}
        {modalOpen && targetLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                             <h3 className="text-lg font-black text-[#0a1e3f] uppercase leading-none">
                                {targetLog.logId ? `Modificar ${targetLog.currentType === 'ENTRADA' ? 'Entrada' : 'Salida'}` : 'Cierre Manual'}
                             </h3>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{targetLog.name}</p>
                        </div>
                        <button onClick={() => setModalOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><X size={16} className="text-slate-500"/></button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4">
                            <Calendar className="text-blue-500" size={20}/>
                            <div>
                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Fecha</p>
                                <p className="text-sm font-black text-blue-900">{targetLog.date}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Hora</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-lg font-black text-slate-700 outline-none focus:border-[#00C897] transition-all"/>
                            </div>
                        </div>

                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Motivo / Nota</label>
                             <div className="relative">
                                <div className="absolute left-4 top-4 text-slate-400"><FileText size={18}/></div>
                                <textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Ej: Error de dedo, Permiso especial..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-medium text-slate-700 outline-none focus:border-[#00C897] transition-all resize-none h-24"/>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={() => setModalOpen(false)} className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 text-xs uppercase">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="py-3 rounded-xl font-black bg-[#0a1e3f] text-white hover:bg-blue-900 text-xs uppercase flex items-center justify-center gap-2">
                                {saving ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}