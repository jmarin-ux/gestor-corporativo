'use client';

import { useState, useMemo } from 'react';
import { 
  MonitorPlay, LogOut, Search, MapPin, 
  Eye, Star, Info, CheckCircle, X, Loader2 
} from 'lucide-react';

export default function ClientMirrorView({ client, tickets, onExit }: any) {
  
  // Tabs / filtros locales para la simulación
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDetails, setViewingDetails] = useState<any>(null);

  // Filtramos los tickets que pertenecen a este cliente específico
  const clientTickets = useMemo(() => {
      return tickets.filter((t: any) => 
          (t.client_email === client.email) || 
          (t.company && t.company === client.organization)
      );
  }, [tickets, client]);

  // Lógica de filtrado idéntica al portal real
  const filteredTickets = useMemo(() => {
    return clientTickets.filter((t: any) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        (t.codigo_servicio || '').toLowerCase().includes(s) ||
        (t.service_type || '').toLowerCase().includes(s) ||
        (t.location || '').toLowerCase().includes(s);

      const isHistory = 
        ['cerrado', 'cancelado', 'revision_interna'].includes((t.status || '').toLowerCase()) || 
        t.evaluacion_privada === true;

      const matchesTab = activeTab === 'activos' ? !isHistory : isHistory;
      
      return matchesSearch && matchesTab;
    });
  }, [clientTickets, searchTerm, activeTab]);

  const getPublicStatus = (internalStatus: string) => {
    const s = (internalStatus || '').toLowerCase();
    if (['pendiente', 'sin asignar'].includes(s)) return { label: 'EN ESPERA', color: 'bg-amber-100 text-amber-700' };
    if (['in_progress', 'asignado', 'en proceso'].includes(s)) return { label: 'EN PROCESO', color: 'bg-blue-100 text-blue-700' };
    if (['ejecutado', 'realizado'].includes(s)) return { label: 'POR EVALUAR', color: 'bg-purple-100 text-purple-700' };
    if (['cerrado', 'revision_interna'].includes(s)) return { label: 'FINALIZADO', color: 'bg-emerald-100 text-emerald-700' };
    return { label: s.toUpperCase(), color: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in zoom-in duration-300 font-sans">
      
      {/* BARRA SUPERIOR DE ADVERTENCIA (MODO ESPEJO) */}
      <div className="bg-orange-500 text-white p-3 px-6 flex justify-between items-center sticky top-0 z-[50] shadow-md">
        <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
          <MonitorPlay size={18} />
          <span>Modo Espejo: Viendo como {client.organization || client.full_name}</span>
        </div>
        <button 
          onClick={onExit}
          className="bg-white text-orange-600 px-5 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-slate-100 transition-all flex items-center gap-2"
        >
          <LogOut size={14}/> Salir del Modo Espejo
        </button>
      </div>

      <div className="p-4 md:p-10 pb-24 max-w-7xl mx-auto space-y-6">
        
        {/* HERO SECTION (Idéntico al portal) */}
        <section className="bg-gradient-to-r from-[#0a1e3f] to-[#1a3a6d] p-8 md:p-12 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden flex justify-between items-center">
            <div className="relative z-10 space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
                    Hola, {client.organization?.split(' ')[0] || 'Cliente'} 👋
                </h1>
                <p className="text-blue-100 text-sm font-medium opacity-90">
                    Portal de Servicios Corporativos (Vista Simulada)
                </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        </section>

        {/* CONTROLES */}
        <section className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl w-full lg:w-auto">
                <button onClick={() => setActiveTab('activos')} className={`flex-1 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activos' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Servicios Activos</button>
                <button onClick={() => setActiveTab('historial')} className={`flex-1 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Historial</button>
            </div>
            <div className="relative flex-1 lg:w-80 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar folio, tipo o lugar..." className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-12 pr-4 text-xs font-bold outline-none uppercase" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </section>

        {/* TABLA DE RESULTADOS */}
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest">Folio</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest">Detalle</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Estatus</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredTickets.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase italic">No se encontraron servicios.</td></tr>
                        ) : (
                            filteredTickets.map((ticket: any) => {
                                const statusInfo = getPublicStatus(ticket.status);
                                return (
                                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 align-top">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">{ticket.codigo_servicio}</span>
                                            <p className="text-[9px] text-slate-400 mt-2 font-bold">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="p-6 align-top">
                                            <p className="text-xs font-black text-[#0a1e3f] uppercase mb-1">{ticket.service_type}</p>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1 uppercase"><MapPin size={10} className="text-slate-400"/> {ticket.location || 'S/N'}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic">"{ticket.description}"</p>
                                        </td>
                                        <td className="p-6 text-center align-top">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-block ${statusInfo.color}`}>{statusInfo.label}</span>
                                        </td>
                                        <td className="p-6 text-center align-top">
                                            <button onClick={() => setViewingDetails(ticket)} className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-[#0a1e3f] hover:text-white transition-all tooltip" title="Ver Detalles">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
      </div>

      {/* MODAL DETALLE (Simplificado para simulación) */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-[#0a1e3f]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-[#0a1e3f] uppercase tracking-tight flex items-center gap-2"><Info className="text-blue-600" size={20}/> Detalle</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Folio: {viewingDetails.codigo_servicio}</p>
              </div>
              <button onClick={() => setViewingDetails(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</p>
                    <p className="text-sm font-medium text-slate-700">"{viewingDetails.description}"</p>
                </div>
                {viewingDetails.technical_result && (
                    <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Reporte Técnico</p>
                        <p className="text-sm font-medium text-emerald-800">{viewingDetails.technical_result}</p>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}