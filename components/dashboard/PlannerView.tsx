'use client';

import { useState, useMemo } from 'react';
import { 
  Calendar, Users, ChevronLeft, ChevronRight, 
  Loader2, Plus, X, RefreshCw, ClipboardList, Info, ArrowLeft, History, 
  CheckCircle2, User, AlertTriangle, Layers, LayoutGrid, UserCheck, ShieldCheck
} from 'lucide-react';
import { usePlannerLogic } from './usePlannerLogic';
import ServiceDetailModal from './ServiceDetailModal'; 
import CreateTicketModal from './CreateTicketModal'; 

export default function PlannerView({ currentUser, onBack }: { currentUser: any, onBack?: () => void }) {
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupByLeader, setGroupByLeader] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] = useState('');

  const {
    loading, leadersList, auxiliariesList, pendingTickets, allStaff,
    selectedLeader, selectedAux, kanbanBoard, 
    detailModalOpen, selectedTicketForDetail,
    weekNumber, weekDays, currentMonday, currentSunday,
    canEdit, isOperative,
    setSelectedLeader, setSelectedAux, 
    openTicketDetail, closeDetailModal,
    removeCard, loadData, changeWeek
  } = usePlannerLogic(currentUser);

  // 1. LISTA DE COORDINADORES
  const coordinatorsList = useMemo(() => {
    return allStaff.filter(u => 
        ['coordinador', 'admin', 'superadmin', 'gerente'].includes((u.role || '').toLowerCase().trim())
    );
  }, [allStaff]);

  // 2. HELPER: OBTENER NOMBRE CORTO
  const getStaffName = (id: string) => {
    if (!id) return 'S/A';
    const staff = allStaff.find(s => s.id === id);
    return staff ? staff.full_name.split(' ')[0] : '...';
  };

  // 🎨 ESTILOS COMPACTOS
  const getCardStyle = (card: any) => {
    const status = (card.status || '').toLowerCase();
    const type = (card.service_type || '').toLowerCase();
    const priority = (card.priority || '').toLowerCase();

    let base = "border-l-[3px] bg-white transition-all duration-200";

    if (['realizado', 'cerrado', 'listo', 'finalizado'].includes(status)) {
        return `${base} border-l-emerald-500 hover:bg-emerald-50/50`;
    }
    if (type.includes('correctivo') && priority === 'urgente') {
        return `${base} border-l-rose-500 hover:bg-rose-50/50`;
    }
    return `${base} border-l-blue-400 hover:bg-blue-50/50`;
  };

  const processCards = (cards: any[]) => {
    let filtered = cards;
    if (selectedCoordinator) {
        filtered = cards.filter(c => 
            (c.coordinator_id === selectedCoordinator) || (c.coordinador_id === selectedCoordinator)
        );
    }

    if (!groupByLeader) return { 'TODOS': filtered };

    return filtered.reduce((groups: any, card: any) => {
        const leaderName = card.leader_name || 'SIN ASIGNAR';
        if (!groups[leaderName]) groups[leaderName] = [];
        groups[leaderName].push(card);
        return groups;
    }, {});
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#0a1e3f]" size={48}/></div>;

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans overflow-hidden text-[#0a1e3f]">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight uppercase">Planificador</h2>
                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-blue-100">
                    S{weekNumber}
                </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                <Calendar size={10}/>
                {currentMonday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {currentSunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => setGroupByLeader(!groupByLeader)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all border ${
                    groupByLeader 
                    ? 'bg-[#0a1e3f] text-white border-[#0a1e3f]' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {groupByLeader ? <Layers size={12}/> : <LayoutGrid size={12}/>}
                {groupByLeader ? 'Agrupado' : 'Simple'}
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm">
                <button onClick={() => changeWeek(-7)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={14}/></button>
                <button onClick={() => loadData()} className="mx-1 p-1.5 hover:bg-slate-100 rounded text-blue-600" title="Actualizar"><RefreshCw size={12}/></button>
                <button onClick={() => changeWeek(7)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14}/></button>
            </div>
        </div>
      </div>

      {/* --- CONTENIDO --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR COMPACTO */}
        {!isOperative && (
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
                <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-[#0a1e3f] mb-1">
                        <Users size={14} className="text-blue-600"/>
                        <span className="text-[10px] font-black uppercase tracking-wide">Filtros</span>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="relative">
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-7 pr-2 text-[10px] font-bold text-slate-700 outline-none uppercase cursor-pointer" 
                                    value={selectedCoordinator} onChange={(e) => setSelectedCoordinator(e.target.value)}>
                                <option value="">Coord: Todos</option>
                                {coordinatorsList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <ShieldCheck size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        </div>

                        <div className="relative">
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-7 pr-2 text-[10px] font-bold text-slate-700 outline-none uppercase cursor-pointer" 
                                    value={selectedLeader} onChange={(e) => setSelectedLeader(e.target.value)}>
                                <option value="">Líder: Todos</option>
                                {leadersList.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                            </select>
                            <User size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        </div>
                    </div>

                    {/* BOTÓN RENOMBRADO AQUÍ 👇 */}
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full bg-[#00C897] hover:bg-emerald-400 text-[#0a1e3f] py-2 rounded-lg font-black text-[10px] uppercase shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                        <Plus size={12} strokeWidth={3}/> Programación Semanal
                    </button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                    <div className="px-3 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-400">Por Asignar</span>
                        <span className="bg-slate-200 text-slate-600 px-1.5 rounded text-[9px] font-bold">{pendingTickets.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                        {pendingTickets.map(t => (
                            <div key={t.id} onClick={() => openTicketDetail(t)}
                                className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 cursor-pointer group">
                                <div className="flex justify-between mb-0.5">
                                    <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">{t.codigo_servicio}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-700 uppercase truncate">{t.company}</p>
                                <p className="text-[9px] text-slate-400 truncate">{t.service_type}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* TABLERO KANBAN ULTRA COMPACTO */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#F1F5F9] p-2">
          <div className="flex gap-2 h-full min-w-max">
            {weekDays.map((day) => {
              const rawCards = kanbanBoard[day.dateStr] || [];
              const processedData = processCards(rawCards);
              const isToday = day.isToday;

              return (
                <div key={day.dateStr} className={`w-[220px] flex flex-col rounded-xl overflow-hidden shadow-sm border transition-all ${isToday ? 'bg-white border-blue-300 ring-2 ring-blue-50' : 'bg-slate-100 border-slate-200'}`}>
                  
                  {/* Header Día */}
                  <div className={`py-1.5 px-3 border-b flex justify-between items-center ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                    <span className={`text-[10px] font-black uppercase ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>{day.name}</span>
                    <span className={`text-[9px] font-bold ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>{day.date.getDate()}</span>
                  </div>

                  {/* Cuerpo */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-2 custom-scrollbar bg-slate-50/30">
                    
                    {Object.entries(processedData).map(([groupName, groupCards]: [string, any]) => (
                        <div key={groupName} className="space-y-1.5">
                            
                            {/* Cabecera Grupo */}
                            {groupByLeader && (
                                <div className="flex items-center gap-1.5 pl-1 mt-1">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#0a1e3f] text-white flex items-center justify-center text-[7px] font-bold">
                                        {groupName.charAt(0)}
                                    </div>
                                    <span className="text-[9px] font-bold uppercase text-slate-500 truncate max-w-[150px]">
                                        {groupName}
                                    </span>
                                </div>
                            )}

                            {/* TARJETAS ULTRA COMPACTAS */}
                            {groupCards.map((card: any) => (
                                <div key={card.temp_id} 
                                    onClick={() => openTicketDetail(card)}
                                    className={`relative p-2 rounded-lg border shadow-sm hover:shadow-md cursor-pointer group ${getCardStyle(card)}`}>
                                    
                                    {/* 1. Header: Folio y Estado Urgente */}
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[8px] font-bold text-slate-400 tracking-wider">#{card.codigo_servicio}</span>
                                        <div className="flex items-center gap-1">
                                            {card.priority?.toLowerCase() === 'urgente' && <AlertTriangle size={8} className="text-rose-500 animate-pulse" />}
                                            {canEdit && (
                                                <button onClick={(e) => { e.stopPropagation(); removeCard(day.dateStr, card.temp_id, card.id); }} 
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-all">
                                                    <X size={10}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Cliente (Título) */}
                                    <p className="text-[10px] font-black text-slate-800 uppercase leading-tight truncate mb-0.5" title={card.company}>
                                        {card.client_name || card.company || 'SIN CLIENTE'}
                                    </p>

                                    {/* 3. Tipo Servicio */}
                                    <p className="text-[8px] font-medium text-slate-500 uppercase truncate leading-tight">
                                        {card.service_type}
                                    </p>

                                    {/* 4. FOOTER: COORDINADOR Y LÍDER */}
                                    <div className="mt-2 pt-1.5 border-t border-slate-100 grid grid-cols-2 gap-1">
                                        
                                        {/* Líder Técnico */}
                                        {!groupByLeader && (
                                            <div className="flex items-center gap-1 truncate" title={`Líder: ${card.leader_name}`}>
                                                <User size={8} className="text-blue-400 shrink-0"/>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase truncate">
                                                    {card.leader_name?.split(' ')[0] || '-'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Coordinador (NUEVO) */}
                                        <div className="flex items-center gap-1 truncate" title={`Coord: ${getStaffName(card.coordinator_id || card.coordinador_id)}`}>
                                            <ShieldCheck size={8} className="text-emerald-500 shrink-0"/>
                                            <span className="text-[8px] font-bold text-slate-600 uppercase truncate">
                                                {getStaffName(card.coordinator_id || card.coordinador_id)}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    ))}
                    
                    {rawCards.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[60px]">
                            <p className="text-[8px] font-bold uppercase select-none opacity-50">Libre</p>
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODALES */}
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

      {isCreateModalOpen && (
        <CreateTicketModal 
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          currentUser={currentUser}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}