'use client';

import { useState } from 'react';
import { 
  Zap, Building2, Calendar, CheckCircle2, 
  AlertTriangle, ClipboardList, Loader2 
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
  const allowedStatuses = STATUS_FLOW_BY_ROLE[role] || [];

  const canAssignCoordinator = role === 'superadmin' || role === 'admin';
  const canAssignTechnician = role === 'superadmin' || role === 'admin' || role === 'coordinador';

  const coordinatorsList = staff.filter((s: any) =>
    ['coordinador', 'admin', 'superadmin'].includes((s.role || '').toString().toLowerCase().trim())
  );

  const operativesList = staff.filter((s: any) =>
    ['operativo', 'tecnico', 'kiosk_master'].includes((s.role || '').toString().toLowerCase().trim())
  );

  const getOperationalState = (t: any) => {
    const missing: string[] = [];
    const coordinatorId = t.coordinator_id || t.coordinador_id;

    if (!t.scheduled_date) missing.push('Fecha');
    if (!coordinatorId) missing.push('Coordinador');
    if (!t.leader_id) missing.push('Líder');

    return { ready: missing.length === 0, missing };
  };

  const handleFastAssign = async (ticketId: number, field: string, value: string) => {
    setUpdatingId(ticketId);
    try {
      // ✅ (B) Armado de payload con compatibilidad temporal para coordinador
      const payload: any = {};
      if (field === 'coordinator_id') {
        payload.coordinator_id = value || null;
        payload.coordinador_id = value || null; // Sincroniza ambas columnas
      } else {
        payload[field] = value || null;
      }

      // Lógica automática: Pasar a "En Proceso" al asignar líder
      if (field === 'leader_id' && value && allowedStatuses.includes('En Proceso')) {
        payload.status = 'En Proceso';
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
      {/* ✅ (A) pb-4 para separar la barra de scroll del contenido */}
      <div className="overflow-x-auto pb-4">
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

                return (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-6">
                      <button
                        onClick={() => onOpenDetails?.(t)}
                        className="bg-[#0a1e3f] text-white px-5 py-2.5 rounded-xl font-black uppercase flex items-center gap-2 hover:bg-[#00C897] transition-all shadow-md active:scale-95"
                      >
                        <Zap size={14} /> Detalle
                      </button>
                    </td>

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

                    <td className="p-6 text-center">
                      {isReadOnlyUser ? (
                        <span className={`inline-block px-4 py-2 rounded-full font-black uppercase text-[10px] ${getStatusColor(t.status)}`}>
                          {t.status || 'Pendiente'}
                        </span>
                      ) : (
                        <div className="relative inline-block">
                          <select
                            value={t.status || 'Pendiente'}
                            disabled={isUpdating}
                            onChange={(e) => handleFastAssign(t.id, 'status', e.target.value)}
                            className={`px-4 py-2 rounded-full font-black border uppercase text-[10px] appearance-none text-center pr-8 outline-none cursor-pointer ${getStatusColor(t.status)}`}
                          >
                            <option value={t.status}>{t.status || 'Pendiente'}</option>
                            {allowedStatuses
                              .filter((s: string) => s !== t.status && !PROTECTED_STATUSES.includes(s as any))
                              .map((s: string) => (
                                <option key={s} value={s} className="bg-white text-slate-700">{s}</option>
                              ))}
                          </select>
                          {isUpdating && <Loader2 size={10} className="absolute right-2 top-3 animate-spin" />}
                        </div>
                      )}
                    </td>

                    <td className="p-6 font-bold text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-300" />
                        {t.scheduled_date ? (
                          new Date(t.scheduled_date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        ) : (
                          <span className="text-rose-400 font-black">POR AGENDAR</span>
                        )}
                      </div>
                    </td>

                    <td className="p-6 min-w-[220px]">
                      {canAssignCoordinator ? (
                        <select
                          disabled={isUpdating}
                          value={coordinatorId || ''}
                          onChange={(e) => handleFastAssign(t.id, 'coordinator_id', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-black uppercase appearance-none outline-none text-slate-600"
                        >
                          <option value="">-- Sin Coordinador --</option>
                          {coordinatorsList.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 font-black uppercase text-[10px] px-2 italic">
                          {staff.find((s: any) => s.id === coordinatorId)?.full_name || 'Sin Coordinador'}
                        </span>
                      )}
                    </td>

                    <td className="p-6 min-w-[220px]">
                      {canAssignTechnician ? (
                        <select
                          disabled={isUpdating}
                          value={t.leader_id || ''}
                          onChange={(e) => handleFastAssign(t.id, 'leader_id', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-black uppercase appearance-none outline-none text-slate-600"
                        >
                          <option value="">-- Sin Líder --</option>
                          {operativesList.map((o: any) => (
                            <option key={o.id} value={o.id}>{o.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 font-black uppercase text-[10px] px-2 italic">
                          {staff.find((s: any) => s.id === t.leader_id)?.full_name || 'Sin Líder'}
                        </span>
                      )}
                    </td>

                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-slate-300" />
                        <div>
                          <p className="font-black uppercase leading-none text-[#0a1e3f]">{t.full_name || t.contact_name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase truncate max-w-[150px]">{t.organization || 'Particular'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-6">
                      <p className="font-black text-[#0a1e3f] uppercase">{t.service_type}</p>
                      <p className="text-slate-400 text-[10px]">ID: {t.codigo_servicio || t.id.toString().slice(0, 8)}</p>
                    </td>

                    <td className="p-6">
                      <div className="flex items-center gap-2 text-slate-400 font-medium">
                        <ClipboardList size={14} />
                        {t.logs?.length > 0 ? <span className="text-emerald-600 font-black">{t.logs.length} MOVIMIENTOS</span> : 'SIN REGISTROS'}
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