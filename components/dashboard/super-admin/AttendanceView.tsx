'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  MapPin, 
  Eye, 
  Calendar, 
  Search, 
  User,
  ArrowRight,
  Filter,
  ChevronDown
} from 'lucide-react';

export default function AttendanceView() {
  const [groupedLogs, setGroupedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- ESTADOS DE FILTRO ---
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('hoy'); 

  // Fechas en formato string YYYY-MM-DD
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 1. INICIALIZAR USUARIO Y FECHAS
  useEffect(() => {
    const init = async () => {
      // Usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id, role, full_name').eq('id', user.id).single();
        setCurrentUser(profile);
      }
      // Aplicar filtro HOY por defecto
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
          case 'hoy':
              break;
          
          case 'semana':
              const day = today.getDay() || 7; 
              if (day !== 1) start.setDate(today.getDate() - (day - 1));
              end.setDate(start.getDate() + 6);
              break;

          case 'quincena':
              const currentDay = today.getDate();
              if (currentDay <= 15) {
                  start.setDate(1);
                  end.setDate(15);
              } else {
                  start.setDate(16);
                  end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              }
              break;

          case 'mes':
              start.setDate(1);
              end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              break;

          case 'custom':
              setSelectedPreset('custom');
              return;
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
    
    // Configuración de fechas
    const startObj = new Date(`${startDate}T00:00:00`); 
    const endObj = new Date(`${endDate}T23:59:59.999`);
    const startIso = startObj.toISOString();
    const endIso = endObj.toISOString();

    let query = supabase
      .from('attendance_logs')
      .select(`
        *,
        profiles!user_id ( full_name, role )
      `)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: true });

    // 🔐 SEGURIDAD: LÓGICA DE VISIBILIDAD ACTUALIZADA
    const role = (currentUser.role || '').toLowerCase().trim();
    
    // Lista de roles que tienen PERMISO DE VER TODO
    // Si agregas nuevos roles de alto nivel (ej. 'rh'), agrégalos aquí.
    const canViewAll = ['admin', 'superadmin', 'coordinador', 'gerente'];

    // Si el rol del usuario NO está en la lista de privilegiados, forzamos filtro por SU ID.
    // Esto asegura que 'operativo', 'lider', 'auxiliar', etc., solo vean lo suyo.
    if (!canViewAll.includes(role)) {
       query = query.eq('user_id', currentUser.id);
    }

    const { data, error } = await query;
    if (error) console.error("Error:", error);

    const rawLogs = data || [];

    // AGRUPACIÓN (Entrada + Salida)
    const groups: Record<string, any> = {};

    rawLogs.forEach((log) => {
        const logDateObj = new Date(log.created_at);
        const logDate = logDateObj.toLocaleDateString('en-CA');
        const userId = log.user_id;
        const key = `${userId}_${logDate}`;

        if (!groups[key]) {
            groups[key] = {
                id: key,
                date: logDate,
                user: log.profiles,
                entrada: null,
                salida: null
            };
        }

        if (log.check_type === 'ENTRADA') {
            if (!groups[key].entrada) groups[key].entrada = log;
        } else if (log.check_type === 'SALIDA') {
            groups[key].salida = log;
        }
    });

    const result = Object.values(groups).sort((a: any, b: any) => 
        b.date.localeCompare(a.date)
    );

    setGroupedLogs(result);
    setLoading(false);
  }, [currentUser, startDate, endDate]);

  useEffect(() => {
    fetchAndGroupLogs();
  }, [fetchAndGroupLogs]);

  // Sub-componente Celda
  const TimeCell = ({ log, type }: { log: any, type: 'ENTRADA' | 'SALIDA' }) => {
      if (!log) return (
          <div className="flex items-center gap-2 opacity-30 py-2">
              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              <span className="text-[10px] font-bold uppercase italic text-slate-400">--:--</span>
          </div>
      );

      const isEntrada = type === 'ENTRADA';
      const badgeClass = isEntrada ? 'bg-emerald-500' : 'bg-orange-500';
      const bgClass = isEntrada ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-50 text-orange-800';

      return (
          <div className={`flex items-center justify-between p-2 rounded-xl border border-slate-100/50 ${bgClass} min-w-[160px]`}>
              <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${badgeClass}`}></div>
                   <span className="text-xs font-black">
                       {new Date(log.created_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', hour12: true})}
                   </span>
              </div>
              
              <div className="flex gap-1">
                  <button 
                    onClick={() => window.open(log.photo_url, '_blank')}
                    className="p-1.5 bg-white rounded-lg hover:text-blue-600 transition-colors shadow-sm"
                    title="Evidencia"
                  >
                      <Eye size={12}/>
                  </button>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-white rounded-lg hover:text-red-600 transition-colors shadow-sm"
                    title="Mapa"
                  >
                      <MapPin size={12}/>
                  </a>
              </div>
          </div>
      );
  };

  if (!currentUser) return null;

  // Lógica para el título dinámico
  const canViewAll = ['admin', 'superadmin', 'coordinador', 'gerente'].includes((currentUser.role || '').toLowerCase());

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
        
        {/* BARRA DE TÍTULO Y FILTROS */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            
            {/* Título */}
            <div>
                <h2 className="text-xl font-black text-[#0a1e3f] uppercase flex items-center gap-2">
                    <Calendar className="text-emerald-500" /> Bitácora de Asistencia
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {canViewAll ? 'Vista Global de Personal' : 'Mis Registros Personales'}
                </p>
            </div>

            {/* ZONA DE FILTROS */}
            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
                
                {/* 1. Botón Dropdown de Presets */}
                <div className="relative">
                    <button 
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className="w-full md:w-auto px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-black uppercase text-slate-700 hover:bg-slate-100 transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <Filter size={14} className="text-slate-400"/>
                            {selectedPreset === 'custom' ? 'A Medida' : selectedPreset.replace('_', ' ')}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`}/>
                    </button>

                    {/* Menú Desplegable */}
                    {showFilterMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                            {[
                                { id: 'hoy', label: 'Hoy' },
                                { id: 'semana', label: 'Esta Semana' },
                                { id: 'quincena', label: 'Esta Quincena' },
                                { id: 'mes', label: 'Este Mes' },
                                { id: 'custom', label: 'Personalizado' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => applyPreset(opt.id)}
                                    className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-slate-50 transition-colors ${selectedPreset === opt.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Selectores de Fecha */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 flex-1 xl:flex-none">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setSelectedPreset('custom'); }}
                        className="bg-transparent border-none outline-none text-xs font-black uppercase text-slate-700 w-full md:w-auto"
                    />
                    <ArrowRight size={12} className="text-slate-300"/>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setSelectedPreset('custom'); }}
                        className="bg-transparent border-none outline-none text-xs font-black uppercase text-slate-700 w-full md:w-auto"
                    />
                    <button 
                        onClick={fetchAndGroupLogs}
                        className="p-1.5 bg-[#0a1e3f] text-white rounded-lg hover:bg-blue-900 transition-colors shadow-md"
                    >
                        <Search size={14}/>
                    </button>
                </div>

            </div>
        </div>

        {/* TABLA DE RESULTADOS */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4">
                    <Loader2 className="animate-spin text-emerald-500" size={40}/>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Consultando registros...</p>
                </div>
            ) : groupedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-slate-300 opacity-60">
                    <Calendar size={64} className="mb-4 stroke-1"/>
                    <p className="text-xs font-black uppercase tracking-widest">Sin registros en este periodo</p>
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
                                <th className="p-5 text-center">Jornada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {groupedLogs.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                    
                                    {/* FECHA */}
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

                                    {/* USUARIO */}
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                <User size={16}/>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 uppercase">
                                                    {row.user?.full_name || 'Desconocido'}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {row.user?.role || 'Personal'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* ENTRADA */}
                                    <td className="p-5">
                                        <TimeCell log={row.entrada} type="ENTRADA" />
                                    </td>

                                    {/* SALIDA */}
                                    <td className="p-5">
                                        <TimeCell log={row.salida} type="SALIDA" />
                                    </td>

                                    {/* ESTATUS */}
                                    <td className="p-5 text-center">
                                        {row.entrada && row.salida ? (
                                            <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                Completa
                                            </span>
                                        ) : row.entrada ? (
                                            <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                Abierta
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                -
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
}