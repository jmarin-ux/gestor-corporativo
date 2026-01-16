'use client';

import { 
  Calendar, Users, ChevronLeft, ChevronRight, 
  Loader2, Plus, X, RefreshCw, ClipboardList, Info, ArrowLeft, MapPin, History, CheckCircle2, Lock, User, HardHat
} from 'lucide-react';
import { usePlannerLogic } from './usePlannerLogic';
import ServiceDetailModal from './ServiceDetailModal'; 

export default function PlannerView({ currentUser, onBack }: { currentUser: any, onBack?: () => void }) {
  
  const {
    loading, saving, leadersList, auxiliariesList, pendingTickets, allStaff,
    selectedLeader, selectedAux, kanbanBoard, 
    detailModalOpen, selectedTicketForDetail,
    weekNumber, weekDays, currentMonday, currentSunday,
    canEdit, isOperative,
    setSelectedLeader, setSelectedAux, 
    openTicketDetail, closeDetailModal,
    handleSaveAll, removeCard, loadData, changeWeek
  } = usePlannerLogic(currentUser);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00C897]" size={48}/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 hover:bg-slate-200 transition-all shadow-sm active:scale-95">
              <ArrowLeft size={24} />
          </button>
          <div className="bg-[#0a1e3f] p-3 rounded-2xl text-white"><History size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Planificador Maestro</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="bg-blue-100 text-blue-600 px-3 py-0.5 rounded-full text-[9px] font-black uppercase">Semana #{weekNumber}</span>
              <button onClick={loadData} className="text-[10px] font-bold text-slate-400 flex items-center gap-1 hover:text-blue-500 transition-colors"><RefreshCw size={12}/> Recargar</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
          <button onClick={() => changeWeek(-7)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronLeft size={20}/></button>
          <div className="text-center px-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Periodo</p>
            <p className="font-bold text-slate-800 text-xs">{currentMonday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {currentSunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
          </div>
          <button onClick={() => changeWeek(7)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO */}
        {!isOperative && (
            <div className="xl:col-span-3 space-y-6">
              <div className="bg-[#0a1e3f] p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6 relative overflow-hidden">
                {!selectedLeader && (
                    <div className="absolute top-0 left-0 w-full bg-yellow-500 text-[#0a1e3f] text-[10px] font-black text-center py-1 uppercase tracking-widest z-10">Vista General (Solo Lectura)</div>
                )}
                <h3 className="font-black text-xs uppercase tracking-widest text-[#00C897] flex items-center gap-2 mt-4"><Users size={16}/> Cuadrilla</h3>
                <div className="space-y-4">
                  <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Líder</label>
                      <select className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold outline-none text-white focus:bg-white/20 transition-all" 
                              value={selectedLeader} onChange={(e) => setSelectedLeader(e.target.value)}>
                        <option value="" className="text-slate-800">-- VER TODOS --</option>
                        {leadersList.map(l => <option key={l.id} value={l.id} className="text-slate-800">{l.full_name}</option>)}
                      </select>
                  </div>
                  {selectedLeader && canEdit && (
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Auxiliar</label>
                            <select className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold outline-none text-white focus:bg-white/20 transition-all" 
                                    value={selectedAux} onChange={(e) => setSelectedAux(e.target.value)}>
                                <option value="" className="text-slate-800">-- Sin Auxiliar --</option>
                                {auxiliariesList.map(a => <option key={a.id} value={a.id} className="text-slate-800">{a.full_name}</option>)}
                            </select>
                        </div>
                  )}
                </div>
              </div>

              {/* BANDEJA DE PENDIENTES */}
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 h-[500px] flex flex-col">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <ClipboardList size={14} className="text-blue-500"/> Pendientes ({pendingTickets.length})
                </h3>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {pendingTickets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                      <ClipboardList className="mb-2" size={32}/>
                      <p className="text-[10px] font-bold uppercase tracking-tighter">Bandeja vacía</p>
                    </div>
                  ) : (
                    pendingTickets.map(t => (
                      <div key={t.id} 
                           onClick={() => openTicketDetail(t)} // CLICK ABRE DETALLE
                           className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all group cursor-pointer relative shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{t.codigo_servicio}</span>
                        </div>
                        <p className="text-[11px] font-black text-slate-800 leading-tight uppercase mt-2 truncate">{t.company}</p>
                        <p className="text-[10px] font-bold text-slate-500 leading-tight mt-1 truncate">{t.service_type}</p>
                        <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                            <p className="text-[9px] text-slate-400 font-medium truncate w-32 flex items-center gap-1"><MapPin size={9}/> {t.location || 'S/N'}</p>
                            <Info size={14} className="text-blue-400"/>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        )}

        {/* TABLERO KANBAN */}
        <div className={isOperative ? "xl:col-span-12 overflow-x-auto pb-6" : "xl:col-span-9 overflow-x-auto pb-6"}>
          <div className="flex gap-4 min-w-[1400px] h-full">
            {weekDays.map((day) => {
              const cards = kanbanBoard[day.dateStr] || [];
              return (
                <div key={day.dateStr} className={`flex-1 rounded-[2.5rem] border flex flex-col overflow-hidden transition-all shadow-sm ${day.isToday ? 'bg-blue-50/30 border-blue-200' : 'bg-slate-50/50 border-slate-200'}`}>
                  
                  <div className={`p-5 border-b ${day.isToday ? 'bg-blue-100/50 border-blue-200' : 'bg-white border-slate-100'}`}>
                    <h4 className={`font-black text-[11px] uppercase tracking-tighter ${day.isToday ? 'text-blue-700' : 'text-slate-800'}`}>{day.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400">{day.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  
                  <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[600px] min-h-[300px]">
                    {cards.map((card) => (
                      <div key={card.temp_id} 
                           onClick={() => openTicketDetail(card)} // CLICK ABRE DETALLE
                           className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 group relative hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase truncate max-w-[80%]">{card.client_name}</p>
                            {canEdit && (
                                <button onClick={(e) => { e.stopPropagation(); removeCard(day.dateStr, card.temp_id, card.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={14}/></button>
                            )}
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{card.site_data?.name || card.service_type}</p>
                        
                        {!selectedLeader && card.leader_name && (
                            <div className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg">
                                <User size={10}/> {card.leader_name}
                            </div>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-slate-400 uppercase pt-2 border-t border-slate-50">
                          <CheckCircle2 size={12} className="text-emerald-500"/> {card.service_type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL COMPLETO DE DETALLE (Solo este, el simple ya no existe) */}
      {detailModalOpen && selectedTicketForDetail && (
        <ServiceDetailModal 
            isOpen={true} 
            ticket={selectedTicketForDetail} 
            currentUser={currentUser}
            staff={allStaff}
            onClose={() => closeDetailModal(false)} 
            onUpdate={() => closeDetailModal(true)} 
        />
      )}
    </div>
  );
}