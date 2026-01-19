'use client';

import { useState, useMemo } from 'react';
import { 
  Search, Clock, MapPin, Calendar, 
  AlertTriangle, CheckCircle2, Lock, User, FileText 
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

export default function SharedOpsView({ tickets, currentUser, onTicketUpdate }: any) {
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. FILTRADO ---
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t: any) => {
      const term = searchTerm.toLowerCase();
      return (
        (t.codigo_servicio || '').toLowerCase().includes(term) ||
        (t.company || '').toLowerCase().includes(term) ||
        (t.service_type || '').toLowerCase().includes(term) ||
        (t.location || '').toLowerCase().includes(term)
      );
    });
  }, [tickets, searchTerm]);

  // --- 2. CAMBIO DE ESTATUS ---
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    // Advertencia solo si intentan pasar a Revisión (punto de no retorno)
    if (newStatus === 'revision_interna' && currentUser?.role !== 'super_admin') {
        const confirm = window.confirm("⚠️ ¿Confirmas que el trabajo está TERMINADO? \n\nAl pasar a 'Revisión Interna', el ticket se bloqueará y ya no podrás editarlo.");
        if (!confirm) return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;
      if (onTicketUpdate) onTicketUpdate(); 
    } catch (e) {
      console.error("Error:", e);
      alert("Error al actualizar estatus.");
    }
  };

  // --- 3. LIMPIEZA DE ESTATUS ---
  const getCleanStatusValue = (statusFromDB: string) => {
      const s = (statusFromDB || '').toLowerCase().trim();
      if (s === 'ejecutado') return 'realizado'; 
      if (s === 'en camino') return 'en proceso';
      
      const validos = ['pendiente', 'asignado', 'en proceso', 'realizado', 'revision_interna', 'cerrado', 'cancelado'];
      return validos.includes(s) ? s : 'pendiente'; 
  };

  const getStatusColor = (statusVal: string) => {
    switch (statusVal) {
      case 'pendiente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'asignado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'en proceso': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'realizado': return 'bg-purple-100 text-purple-700 border-purple-200 font-black'; 
      case 'revision_interna': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'cerrado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelado': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* BARRA SUPERIOR */}
      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center">
        <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm font-bold text-slate-700 outline-none uppercase"
                placeholder="Buscar por folio, cliente, servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <button onClick={onTicketUpdate} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-500">
            <Clock size={18}/>
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="p-5 pl-8">Acción</th>
                        <th className="p-5">Estado Operativo</th>
                        <th className="p-5 text-center">Estatus (Control)</th>
                        <th className="p-5">Programación</th>
                        <th className="p-5">Líder Técnico</th>
                        <th className="p-5">Cliente</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredTickets.map((ticket: any) => {
                        
                        const currentStatusVal = getCleanStatusValue(ticket.status);

                        // 🔒 REGLA ESTRICTA: SI ES UNO DE ESTOS, YA NO SE MUESTRA EL MENU (SALVO SUPERADMIN)
                        const isLocked = (
                            currentStatusVal === 'realizado' ||
                            currentStatusVal === 'revision_interna' || 
                            currentStatusVal === 'cerrado' || 
                            currentStatusVal === 'cancelado'
                        ) && currentUser?.role !== 'super_admin';

                        return (
                            <tr key={ticket.id} className="hover:bg-slate-50/50 transition-all">
                                
                                {/* ACCIÓN */}
                                <td className="p-5 pl-8">
                                    <button className="bg-[#0a1e3f] text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/10">
                                        <FileText size={12}/> Detalle
                                    </button>
                                </td>

                                {/* ESTADO OPERATIVO */}
                                <td className="p-5">
                                    {ticket.technical_lead_id ? (
                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase border border-emerald-100 flex items-center gap-1 w-fit">
                                            <CheckCircle2 size={12}/> Listo
                                        </span>
                                    ) : (
                                        <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase border border-amber-100 flex items-center gap-1 w-fit">
                                            <AlertTriangle size={12}/> Faltan Datos
                                        </span>
                                    )}
                                </td>

                                {/* ESTATUS - AQUI ESTA EL CAMBIO VISUAL */}
                                <td className="p-5 text-center">
                                    <div className="relative inline-block w-44">
                                        
                                        {/* SI ESTA BLOQUEADO -> SOLO MUESTRA TEXTO (NO MENU) */}
                                        {isLocked ? (
                                            <div className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border text-center flex flex-col items-center justify-center gap-1 select-none opacity-80 ${getStatusColor(currentStatusVal)}`}>
                                                <span>{currentStatusVal.replace('_', ' ')}</span>
                                                <div className="flex items-center gap-1 text-[8px] opacity-60">
                                                    <Lock size={8}/> BLOQUEADO
                                                </div>
                                            </div>
                                        ) : (
                                            /* SI NO ESTA BLOQUEADO -> MUESTRA EL MENU */
                                            <select
                                                value={currentStatusVal}
                                                onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                className={`
                                                    w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border appearance-none outline-none text-center cursor-pointer transition-all hover:brightness-95 shadow-sm
                                                    ${getStatusColor(currentStatusVal)}
                                                `}
                                            >
                                                <option value="pendiente">PENDIENTE</option>
                                                <option value="asignado">ASIGNADO</option>
                                                <option value="en proceso">EN PROCESO</option>
                                                <option value="realizado">✅ REALIZADO</option>
                                                
                                                {/* Punto de No Retorno */}
                                                <option value="revision_interna">🔒 REVISIÓN INTERNA</option>

                                                {(currentUser?.role === 'super_admin' || currentStatusVal === 'cerrado') && <option value="cerrado">🏁 CERRADO</option>}
                                                {(currentUser?.role === 'super_admin' || currentStatusVal === 'cancelado') && <option value="cancelado">🚫 CANCELADO</option>}
                                            </select>
                                        )}
                                    </div>
                                </td>

                                {/* PROGRAMACIÓN */}
                                <td className="p-5">
                                    {ticket.scheduled_date ? (
                                        <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                                            <Calendar size={14} className="text-slate-400"/>
                                            {new Date(ticket.scheduled_date).toLocaleDateString()}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-rose-400 font-bold uppercase">Por Agendar</span>
                                    )}
                                </td>

                                {/* LÍDER */}
                                <td className="p-5">
                                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-lg border flex items-center gap-2 w-fit ${ticket.technical_lead_id ? 'bg-slate-50 border-slate-100 text-[#0a1e3f]' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'}`}>
                                        <User size={12}/>
                                        {ticket.operative_name || 'Sin Asignar'}
                                    </span>
                                </td>

                                {/* CLIENTE */}
                                <td className="p-5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-[#0a1e3f] uppercase truncate max-w-[150px]">{ticket.company || 'Cliente'}</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 truncate max-w-[150px]">
                                            <MapPin size={10}/> {ticket.location || 'N/A'}
                                        </span>
                                    </div>
                                </td>

                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}