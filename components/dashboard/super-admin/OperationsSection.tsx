'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser'; 
import { 
  TrendingUp, MapPin, MoreHorizontal, UserCheck, HardHat, 
  RefreshCw, Download, Loader2
} from 'lucide-react';
// Asegúrate de que esta ruta sea correcta según tu estructura
import ServiceDetailModal from '@/components/dashboard/ServiceDetailModal'; 

// 👇 PARCHE PARA VERCEL: Interface flexible
interface OperationsSectionProps {
  tickets: any[];
  profiles: any[];
  clients: any[];
  refresh: () => void;
  [key: string]: any;
}

export default function OperationsSection({ tickets, profiles, clients, refresh }: OperationsSectionProps) {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const totalTickets = tickets?.length || 0;
  const closedTickets = tickets?.filter((t: any) => t.status === 'Cerrado').length || 0;
  const efficiency = totalTickets > 0 ? Math.round((closedTickets / totalTickets) * 100) : 0;

  const statusStyles: any = {
    "Sin asignar": 'bg-red-50 text-red-700 border-red-100',
    "Asignado":    'bg-blue-50 text-blue-700 border-blue-100',
    "Pendiente":   'bg-orange-50 text-orange-700 border-orange-100',
    "En proceso":  'bg-amber-50 text-amber-700 border-amber-100',
    "QA":          'bg-purple-50 text-purple-700 border-purple-100',
    "Cerrado":     'bg-slate-100 text-slate-600 border-slate-200',
  };

  const handleQuickUpdate = async (id: number, field: string, value: string) => {
    setProcessingId(id);
    const valToSend = value === "" ? null : value;
    
    const targetField = field === 'coordinador_id' ? 'coordinator_id' : field;
    
    const updates: any = { [targetField]: valToSend };
    
    if (targetField === 'coordinator_id' && valToSend) {
      updates.status = 'Asignado'; 
    }

    try {
      const { error } = await supabase.from('tickets').update(updates).eq('id', id);
      if (error) throw error;
      await refresh();
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExport = () => {
    const rows = tickets.map((t: any) => {
        const clientMatch = clients?.find((c: any) => c.email === t.client_email);
        const realOrg = clientMatch?.organization || t.company || 'GEN';
        return [
            t.codigo_servicio, t.status, realOrg, t.client_email, 
            t.location, t.service_type, t.quote_amount || 0
        ].join(",");
    });
    
    const csvContent = "Folio,Estado,Cliente,Email,Sitio,Servicio,Monto\n" + rows.join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
    link.download = "Reporte_Operativo.csv";
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER DE ESTADÍSTICAS */}
        <div className="bg-[#0a1e3f] rounded-[2.5rem] p-8 text-white shadow-2xl flex justify-between items-center">
            <div>
                <h3 className="text-5xl font-black tracking-tighter">{efficiency}%</h3>
                <p className="text-blue-300 text-[10px] font-bold mt-2 uppercase">Eficiencia Operativa</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handleExport} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all" title="Descargar"><Download size={24}/></button>
                <button onClick={refresh} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all" title="Refrescar"><RefreshCw size={24}/></button>
            </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F8F9FA] text-slate-400 font-black text-[10px] uppercase border-b tracking-wider">
                        <tr>
                            <th className="px-6 py-6 sticky left-0 bg-[#F8F9FA] z-10 border-r text-center">Acción</th>
                            <th className="px-6 py-6">Estado</th>
                            <th className="px-6 py-6">Folio</th>
                            <th className="px-6 py-6">Organización</th>
                            <th className="px-6 py-6 w-48">Coordinador</th>
                            <th className="px-6 py-6 w-48">Líder Técnico</th>
                            <th className="px-6 py-6">Sitio / Activo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {tickets?.map((t: any) => {
                            const clientMatch = clients?.find((c: any) => c.email === t.client_email);
                            const clientOrg = clientMatch?.organization || t.company || 'BAMA';
                            const isProcessing = processingId === t.id;

                            return (
                                <tr key={t.id} className="hover:bg-slate-50/80 transition-all group text-[11px]">
                                    <td className="px-6 py-5 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r shadow-sm text-center">
                                        <button onClick={() => setSelectedTicket(t)} className="p-2 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg transition-colors border border-blue-100"><MoreHorizontal size={18}/></button>
                                    </td>
                                    <td className="px-6 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${statusStyles[t.status] || 'bg-slate-100'}`}>{t.status}</span></td>
                                    <td className="px-6 py-5 font-black text-[#0a1e3f]">{t.codigo_servicio}</td>
                                    <td className="px-6 py-5 font-black text-slate-700 uppercase tracking-tighter">{clientOrg}</td>
                                    
                                    <td className="px-6 py-5">
                                        <div className="relative">
                                            {isProcessing && <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={12}/></div>}
                                            <select 
                                                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 w-full cursor-pointer truncate"
                                                value={t.coordinator_id || t.coordinador_id || ''} 
                                                onChange={(e) => handleQuickUpdate(t.id, 'coordinador_id', e.target.value)}
                                            >
                                                <option value="">-- Sin asignar --</option>
                                                {profiles?.filter((p:any) => ['coordinador','admin','superadmin'].includes((p.role || '').toLowerCase())).map((p:any) => (
                                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                                ))}
                                            </select>
                                            <UserCheck size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                        </div>
                                    </td>

                                    <td className="px-6 py-5">
                                        <div className="relative">
                                            <select 
                                                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none w-full cursor-pointer truncate"
                                                value={t.operative_id || ''}
                                                onChange={(e) => handleQuickUpdate(t.id, 'operative_id', e.target.value)}
                                            >
                                                <option value="">-- Elije Líder --</option>
                                                {profiles?.filter((p:any) => p.role === 'operativo').map((p:any) => (
                                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                                ))}
                                            </select>
                                            <HardHat size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-5 uppercase font-bold text-slate-500 flex items-center gap-2 mt-3"><MapPin size={10} className="text-red-500"/> {t.location || 'OFICINAS WUOTTO'}</td>
                                </tr>
                            )})}
                    </tbody>
                </table>
            </div>
        </div>

        {/* ✅ MODAL CORREGIDO: isOpen + onClose */}
        {selectedTicket && (
            <ServiceDetailModal 
                isOpen={true} // OBLIGATORIO
                ticket={selectedTicket} 
                currentUser={{role:'superadmin'}} 
                onClose={() => setSelectedTicket(null)} // Nombre correcto: onClose
                onUpdate={refresh} 
            />
        )}
    </div>
  );
}