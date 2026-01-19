'use client';

import { useState } from 'react';
import { 
  Zap, Building2, Calendar, CheckCircle2, 
  AlertTriangle, ClipboardList, Loader2, Lock 
} from 'lucide-react';
import { updateTicket } from '@/lib/tickets.actions';
import { getStatusColor } from '@/lib/serviceUtils';
import { UserRole, STATUS_FLOW_BY_ROLE, PROTECTED_STATUSES } from '@/lib/tickets.rules';

export default function ServiceTable({
  services = [],
  staff = [],
  currentUser,
  onOpenDetails,
  onRefresh,
}: any) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const role = (currentUser?.role || 'cliente') as UserRole;
  const isReadOnlyUser = role === 'cliente' || role === 'operativo';
  
  // Lista de estatus permitidos según el rol
  const allowedStatuses = STATUS_FLOW_BY_ROLE[role] || [];

  const canAssignCoordinator = role === 'superadmin' || role === 'admin';
  const canAssignTechnician = role === 'superadmin' || role === 'admin' || role === 'coordinador';

  const coordinatorsList = staff.filter((s: any) =>
    ['coordinador', 'admin', 'superadmin'].includes((s.role || '').toString().toLowerCase().trim())
  );

  const operativesList = staff.filter((s: any) =>
    ['operativo', 'tecnico', 'kiosk_master', 'lider'].includes((s.role || '').toString().toLowerCase().trim())
  );

  const getOperationalState = (t: any) => {
    const missing: string[] = [];
    const coordinatorId = t.coordinator_id || t.coordinador_id;

    if (!t.scheduled_date) missing.push('Fecha');
    if (!coordinatorId) missing.push('Coordinador');
    if (!t.leader_id && !t.technical_lead_id) missing.push('Líder');

    return { ready: missing.length === 0, missing };
  };

  // --- NORMALIZADOR DE ESTATUS ---
  const normalizeStatus = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    
    if (s === 'ejecutado') return 'Realizado';
    if (s === 'en camino') return 'En Proceso';
    
    // Buscar coincidencia en la lista permitida
    const match = allowedStatuses.find((as: string) => as.toLowerCase() === s);
    
    // Si ya es uno de los estados finales aunque no esté en "allowed", lo respetamos para mostrarlo
    if (['realizado', 'revisión interna', 'cerrado', 'cancelado'].includes(s)) return status;

    return match || status || 'Pendiente';
  };

  const handleFastAssign = async (ticketId: number, field: string, value: string) => {
    
    // Alerta de seguridad 
    if (field === 'status' && value === 'revision_interna' && role !== 'superadmin') {
        const confirm = window.confirm("⚠️ ¿Confirmas que el trabajo está TERMINADO? \n\nAl pasar a 'Revisión Interna', el ticket se bloqueará para control de calidad.");
        if (!confirm) return;
    }

    setUpdatingId(ticketId);
    try {
      const payload: any = {};
      
      if (field === 'coordinator_id') {
        payload.coordinator_id = value || null;
        payload.coordinador_id = value || null; 
      } else {
        payload[field] = value || null;
      }

      // Automatización: Asignar Líder -> En Proceso
      if (field === 'leader_id' && value) {
         const currentStatus = services.find((s:any) => s.id === ticketId)?.status?.toLowerCase();
         if ((currentStatus === 'pendiente' || !currentStatus) && allowedStatuses.some(s => s.toLowerCase() === 'en proceso')) {
             payload.status = 'En Proceso';
         }
      }

      await updateTicket({
        ticketId,
        changes: payload,
        userId: currentUser?.id,
        source: 'TABLE',
      });

      onRefresh?.();
    } catch (e: any) {
      alert('Error al actualizar: ' + (e?.message || 'desconocido'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden font-sans">
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <table className="w-full min-w-[1800px] text-xs text-left">
          <thead className="bg-slate-50 text-slate-400 uppercase font-black">
            <tr>
              <th className="p-6">Acción</th>
              <th className="p-6">Estado Operativo</th>
              <th className="p-6 text-center">Estatus</th>
              <th className="p-6">Programación</th>
              <th className="p-6">Coordinación</th>
              <th className="p-6">Líder Técnico</th>
              <th className="p-6">Cliente</th>
              <th className="p-6">Servicio</th>
              <th className="p-6">Seguimiento</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-600">
            {services.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-14 text-center">
                  <div className="text-slate-400 font-black uppercase text-xs">No hay servicios disponibles</div>
                </td>
              </tr>
            ) : (
              services.map((t: any) => {
                const state = getOperationalState(t);
                const isUpdating = updatingId === t.id;
                const coordinatorId = t.coordinator_id || t.coordinador_id;
                const leaderId = t.leader_id || t.technical_lead_id;

                const currentStatusValue = normalizeStatus(t.status);
                const statusLower = currentStatusValue.toLowerCase();

                // 🔒 BLOQUEO ESTRICTO: Si es uno de estos estados, NO MOSTRAR SELECTOR (salvo superadmin)
                const isLocked = (
                    statusLower === 'realizado' || 
                    statusLower === 'ejecutado' || 
                    statusLower === 'revisión interna' || 
                    statusLower === 'revision_interna' || 
                    statusLower === 'cerrado' ||
                    statusLower === 'cancelado'
                ) && role !== 'superadmin';

                return (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                    
                    {/* 1. ACCIÓN */}
                    <td className="p-6">
                      <button
                        onClick={() => onOpenDetails?.(t)}
                        className="bg-[#0a1e3f] text-white px-5 py-2.5 rounded-xl font-black uppercase flex items-center gap-2 hover:bg-[#00C897] hover:text-[#0a1e3f] transition-all shadow-md active:scale-95"
                      >
                        <Zap size={14} /> Detalle
                      </button>
                    </td>

                    {/* 2. ESTADO OPERATIVO */}
                    <td className="p-6">
                      {state.ready ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-black border border-emerald-100">
                          <CheckCircle2 size={12} /> LISTO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-black border border-amber-100">
                          <AlertTriangle size={12} /> FALTAN {state.missing.length} DATOS
                        </span>
                      )}
                    </td>

                    {/* 3. ESTATUS (CON LOGICA DE BLOQUEO VISUAL) */}
                    <td className="p-6 text-center">
                      <div className="relative inline-block w-44">
                        
                        {isReadOnlyUser ? (
                            <span className={`inline-block px-4 py-2 rounded-full font-black uppercase text-[10px] ${getStatusColor(t.status)}`}>
                              {t.status || 'Pendiente'}
                            </span>
                        ) : isLocked ? (
                            // 🔒 MODO BLOQUEADO: Solo texto, sin menú
                            <div className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border text-center flex flex-col items-center justify-center gap-1 select-none opacity-80 ${getStatusColor(currentStatusValue)}`}>
                                <span>{currentStatusValue.replace('_', ' ')}</span>
                                <div className="flex items-center gap-1 text-[8px] opacity-60">
                                    <Lock size={8}/> BLOQUEADO
                                </div>
                            </div>
                        ) : (
                            // 🔓 MODO EDICIÓN: Selector habilitado
                            <>
                              <select
                                value={currentStatusValue}
                                disabled={isUpdating}
                                onChange={(e) => handleFastAssign(t.id, 'status', e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-xl font-black border uppercase text-[10px] appearance-none text-center outline-none cursor-pointer transition-all hover:brightness-95 shadow-sm ${getStatusColor(t.status)}`}
                              >
                                {!allowedStatuses.includes(currentStatusValue) && (
                                    <option value={currentStatusValue}>{currentStatusValue}</option>
                                )}
                                {allowedStatuses
                                  .filter((s: string) => !PROTECTED_STATUSES.includes(s as any))
                                  .map((s: string) => (
                                    <option key={s} value={s} className="bg-white text-slate-700 py-1">
                                        {s === 'revision_interna' ? '🔒 Revisión Interna' : s}
                                    </option>
                                  ))}
                              </select>
                              {isUpdating && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <Loader2 size={12} className="animate-spin text-slate-500" />
                                  </div>
                              )}
                            </>
                        )}
                      </div>
                    </td>

                    {/* 4. PROGRAMACIÓN */}
                    <td className="p-6 font-bold text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-300" />
                        {t.scheduled_date ? (
                          new Date(t.scheduled_date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        ) : (
                          <span className="text-rose-400 font-black text-[10px]">POR AGENDAR</span>
                        )}
                      </div>
                    </td>

                    {/* 5. COORDINADOR */}
                    <td className="p-6 min-w-[200px]">
                      {canAssignCoordinator ? (
                        <select
                          disabled={isUpdating}
                          value={coordinatorId || ''}
                          onChange={(e) => handleFastAssign(t.id, 'coordinator_id', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase appearance-none outline-none text-slate-600 focus:border-blue-300 transition-colors"
                        >
                          <option value="">-- Sin Asignar --</option>
                          {coordinatorsList.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 font-bold uppercase text-[10px] italic">
                          {staff.find((s: any) => s.id === coordinatorId)?.full_name || 'Sin Asignar'}
                        </span>
                      )}
                    </td>

                    {/* 6. LÍDER TÉCNICO */}
                    <td className="p-6 min-w-[200px]">
                      {canAssignTechnician ? (
                        <select
                          disabled={isUpdating}
                          value={leaderId || ''}
                          onChange={(e) => handleFastAssign(t.id, 'leader_id', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase appearance-none outline-none text-slate-600 focus:border-blue-300 transition-colors"
                        >
                          <option value="">-- Sin Asignar --</option>
                          {operativesList.map((o: any) => (
                            <option key={o.id} value={o.id}>{o.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 font-bold uppercase text-[10px] italic">
                          {staff.find((s: any) => s.id === leaderId)?.full_name || 'Sin Asignar'}
                        </span>
                      )}
                    </td>

                    {/* 7. CLIENTE */}
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-400"><Building2 size={14} /></div>
                        <div>
                          <p className="font-black uppercase leading-none text-[#0a1e3f] text-[11px] truncate max-w-[150px]">
                              {t.company || t.organization || 'Particular'}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase truncate max-w-[150px]">
                              {t.full_name || t.contact_name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 8. SERVICIO */}
                    <td className="p-6">
                      <p className="font-black text-[#0a1e3f] uppercase text-[10px]">{t.service_type}</p>
                      <p className="text-slate-400 text-[9px] font-mono mt-0.5">#{t.codigo_servicio || t.id}</p>
                    </td>

                    {/* 9. SEGUIMIENTO */}
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-slate-400 font-medium text-[10px]">
                        <ClipboardList size={14} />
                        {t.logs?.length > 0 ? (
                            <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md">
                                {t.logs.length} REGISTROS
                            </span>
                        ) : '—'}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}