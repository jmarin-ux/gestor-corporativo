'use client';

import { MonitorPlay, LogOut, Star } from 'lucide-react';

// Este componente recibe:
// 1. client: Los datos del cliente que estamos espiando.
// 2. tickets: Todos los tickets (él los filtrará para mostrar solo los suyos).
// 3. onExit: La función para cerrar este modo.

export default function ClientMirrorView({ client, tickets, onExit }: any) {
  
  // Filtramos los tickets que pertenecen a este cliente
  const clientTickets = tickets.filter((t: any) => t.client_email === client.email);

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in zoom-in duration-300">
      
      {/* BARRA SUPERIOR DE ADVERTENCIA (Para que no olvides que estás simulando) */}
      <div className="bg-orange-500 text-white p-3 px-6 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
          <MonitorPlay size={18} />
          <span>Modo Espejo: Viendo como {client.company || client.full_name}</span>
        </div>
        <button 
          onClick={onExit}
          className="bg-white text-orange-600 px-5 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-slate-100 transition-all flex items-center gap-2"
        >
          <LogOut size={14}/> Salir del Modo Espejo
        </button>
      </div>

      <div className="p-10 max-w-7xl mx-auto space-y-8">
        
        {/* HERO SECTION DEL CLIENTE */}
        <section className="bg-gradient-to-r from-[#0a1e3f] to-[#1a3a6d] p-10 rounded-[2.5rem] text-white shadow-2xl flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">¡Hola, {client.full_name.split(' ')[0]}! 👋</h1>
                <p className="opacity-70 font-medium text-sm">Bienvenido a tu panel de servicios corporativos.</p>
            </div>
            <div className="text-right hidden sm:block">
                <p className="text-3xl font-black">{clientTickets.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Servicios Activos</p>
            </div>
        </section>

        {/* TABLA DE SERVICIOS DEL CLIENTE */}
        <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-[#0a1e3f] uppercase text-sm tracking-wide">Historial de Operaciones</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-black border-b border-slate-100">
              <tr>
                <th className="p-6">Folio</th>
                <th className="p-6">Servicio</th>
                <th className="p-6 text-center">Estatus</th>
                <th className="p-6 text-center">Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientTickets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest">
                    Sin registros activos
                  </td>
                </tr>
              ) : (
                clientTickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 font-black text-[#0a1e3f]">{t.codigo_servicio}</td>
                    <td className="p-6 font-medium text-slate-600">
                        {t.service_type}
                        <p className="text-[9px] text-slate-400 mt-1 uppercase">{t.location}</p>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${t.status === 'Realizado' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                        <div className="flex justify-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={10} className={i < t.satisfaction_rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                            ))}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}