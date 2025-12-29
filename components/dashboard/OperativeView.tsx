'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { HardHat, PlayCircle, CheckCircle, MapPin, Clock, AlertTriangle, User, ChevronDown } from 'lucide-react';

// Colores del tema "Flight App"
const theme = {
  navy: 'bg-[#0a1e3f]',
  navyText: 'text-[#0a1e3f]',
  lightBg: 'bg-slate-100',
  white: 'bg-white',
};

export default function OperativeView() {
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('Operativo Demo'); 
  const [isLoading, setIsLoading] = useState(false);

  // 1. Cargar lista de staff
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase.from('profiles').select('full_name').in('role', ['operativo', 'coordinador']);
      if (data) setStaffList(data);
    };
    fetchStaff();
  }, []);

  // 2. Cargar tickets asignados
  const fetchMyTasks = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('assigned_to', currentUser)
      .neq('status', 'cerrado')
      .order('priority', { ascending: true });
    
    if (data) setMyTickets(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMyTasks();
  }, [currentUser]);

  // 3. Update status
  const updateStatus = async (id: number, newStatus: string) => {
    setMyTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    fetchMyTasks();
  };

  return (
    // FONDO GENERAL CLARO
    <div className={`min-h-screen ${theme.lightBg} p-6 md:p-10 font-sans text-slate-800 space-y-8 animate-in fade-in duration-500 pb-24`}>
      
      {/* HEADER OPERATIVO (Estilo Bloque Azul Sólido) */}
      <div className={`${theme.navy} p-8 rounded-[2.5rem] shadow-xl shadow-slate-300/50 flex flex-col md:flex-row justify-between items-center gap-6`}>
        <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-full text-white">
                <HardHat size={32}/>
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Zona Operativa</h2>
                <p className="text-blue-200 font-medium">
                    Tienes <strong className="text-white text-lg">{myTickets.length}</strong> órdenes activas hoy.
                </p>
            </div>
        </div>

        {/* SELECTOR DE IDENTIDAD (Estilo Píldora Transparente) */}
        <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-full backdrop-blur-sm border border-white/20">
            <User size={16} className="text-blue-200"/>
            <span className="text-[10px] text-blue-200 uppercase font-black tracking-wider">Perfil:</span>
            <div className="relative">
                <select 
                    value={currentUser}
                    onChange={(e) => setCurrentUser(e.target.value)}
                    className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer appearance-none pr-6"
                >
                    <option className="text-slate-800" value="Operativo Demo">Operativo Demo</option>
                    {staffList.map((s, i) => <option className="text-slate-800" key={i} value={s.full_name}>{s.full_name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-white pointer-events-none"/>
            </div>
        </div>
      </div>

      {/* LISTA DE TARJETAS DE TRABAJO (Estilo Tarjetas Blancas Redondeadas) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {myTickets.map(ticket => (
          <div key={ticket.id} className={`relative bg-white p-6 md:p-8 rounded-[2.5rem] transition-all hover:-translate-y-1 group ${
             ticket.priority === 'Crítica' ? 'shadow-xl shadow-red-100 ring-2 ring-red-50' : 
             ticket.status === 'en_proceso' ? 'shadow-xl shadow-blue-100 ring-2 ring-blue-50' :
             'shadow-lg shadow-slate-200/50'
          }`}>
            
            {/* ETIQUETAS SUPERIORES */}
            <div className="flex justify-between items-center mb-5">
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">#{ticket.id}</span>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wide flex items-center gap-1.5 ${
                ticket.priority === 'Crítica' ? 'bg-red-500 text-white animate-pulse' : 
                ticket.priority === 'Alta' ? 'bg-orange-500 text-white' :
                'bg-slate-200 text-slate-600'
              }`}>
                {ticket.priority === 'Crítica' && <AlertTriangle size={12} fill="currentColor"/>}
                {ticket.priority}
              </span>
            </div>
            
            {/* INFORMACIÓN PRINCIPAL */}
            <h4 className={`text-xl font-black ${theme.navyText} mb-3 leading-tight`}>{ticket.service_type}</h4>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-100">
                 <p className="text-sm text-slate-600 font-medium italic leading-relaxed">"{ticket.description || 'Sin descripción detallada'}"</p>
            </div>
            
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-8 font-bold uppercase tracking-wide">
              <MapPin size={16} className="text-blue-600"/> {ticket.location}
            </div>

            {/* BOTONES DE ACCIÓN (Estilo Píldora Grande) */}
            <div className="mt-auto">
                {ticket.status === 'pendiente' && (
                    <button 
                        onClick={() => updateStatus(ticket.id, 'en_proceso')}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-200 hover:shadow-xl"
                    >
                        <PlayCircle size={20} fill="currentColor" className="text-blue-200"/> INICIAR TAREA
                    </button>
                )}

                {ticket.status === 'en_proceso' && (
                    <div className="flex flex-col gap-3">
                        <div className="w-full py-3 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-black gap-2 animate-pulse">
                            <Clock size={16}/> TRABAJO EN CURSO...
                        </div>
                        <button 
                            onClick={() => updateStatus(ticket.id, 'revision')}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                        >
                            <CheckCircle size={20}/> FINALIZAR
                        </button>
                    </div>
                )}

                {(ticket.status === 'revision' || ticket.status === 'cerrado') && (
                    <div className="w-full py-4 bg-slate-100 text-slate-400 font-black rounded-full flex items-center justify-center gap-2 cursor-not-allowed">
                        <CheckCircle size={20}/> TAREA COMPLETADA
                    </div>
                )}
            </div>

          </div>
        ))}

        {myTickets.length === 0 && (
            <div className="col-span-full text-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 flex flex-col items-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <CheckCircle size={40} className="text-slate-300"/>
                </div>
                <p className="font-bold">¡Todo limpio! No tienes asignaciones pendientes.</p>
            </div>
        )}
      </div>
    </div>
  );
}