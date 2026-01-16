'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { MapPin, Clock, User, Calendar, Loader2 } from 'lucide-react';

export default function AttendanceView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Traemos logs de HOY + datos del usuario (profiles)
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        profiles:user_id ( full_name, role )
      `)
      .gte('created_at', `${today}T00:00:00`) // Desde inicio del día
      .order('created_at', { ascending: false });

    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-[#0a1e3f] uppercase">Asistencia del Día</h2>
            <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2">
                <Calendar size={14}/> {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {logs.length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-300 font-bold uppercase">
                    No hay registros de asistencia hoy
                </div>
            )}
            
            {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    {/* Header de la tarjeta */}
                    <div className={`h-2 w-full ${log.check_type === 'ENTRADA' ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
                    
                    <div className="p-5 flex gap-4">
                        {/* FOTO EVIDENCIA */}
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0 relative">
                            <img src={log.photo_url || '/placeholder.png'} className="w-full h-full object-cover" alt="Evidencia" />
                        </div>

                        <div className="overflow-hidden">
                            <h3 className="font-black text-[#0a1e3f] text-xs uppercase truncate">
                                {log.profiles?.full_name || 'Usuario Desconocido'}
                            </h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">{log.profiles?.role}</p>
                            
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${log.check_type === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                                <Clock size={10}/> {new Date(log.created_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})} • {log.check_type}
                            </div>
                        </div>
                    </div>

                    {/* Footer: Ubicación */}
                    <div className="px-5 pb-5 pt-0">
                         <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors bg-slate-50 p-3 rounded-xl"
                         >
                            <MapPin size={14} className="text-red-400"/>
                            <span className="truncate">Ver ubicación en mapa</span>
                         </a>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}