import { supabase } from '@/lib/supabase-browser';
import { STATUS_FLOW_BY_ROLE, PROTECTED_STATUSES, UserRole } from './tickets.rules';

const norm = (s: string) => s.trim().toUpperCase();

export async function updateTicket({
  ticketId,
  changes,
  userId,
  source,
}: {
  ticketId: number;
  changes: Record<string, any>;
  userId: string;
  source: 'TABLE' | 'PLANNER' | 'MODAL';
}) {
  try {
    // 1) Validar identidad y rol
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) throw new Error('Usuario no autorizado.');
    const role = userProfile.role as UserRole;

    // ✅ Compatibilidad temporal de columnas de coordinador
    if ('coordinator_id' in changes && !('coordinador_id' in changes)) {
      changes.coordinador_id = changes.coordinator_id;
    }

    // 2) Validar reglas de estatus si el estatus está cambiando
    if (changes.status) {
      const incoming = norm(String(changes.status));

      // Evitar cambios manuales a estatus protegidos
      const protectedSet = PROTECTED_STATUSES.map(norm);
      if (protectedSet.includes(incoming)) {
        throw new Error('Este estatus es automático y está protegido.');
      }

      // Validar si el rol tiene permiso para ese estatus
      const allowed = (STATUS_FLOW_BY_ROLE[role] || []).map(norm);
      if (!allowed.includes(incoming)) {
        throw new Error(`Tu rol de ${role} no puede asignar el estatus: ${changes.status}`);
      }

      // Decide convención final: aquí lo guardamos en MAYÚSCULAS
      changes.status = incoming;
    }

    // 3) Aplicar actualización (NO uses updated_at si no existe en DB)
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ ...changes })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    // 4) Registrar log
    await supabase.from('ticket_logs').insert({
      ticket_id: ticketId,
      user_id: userId,
      source,
      changes,
      created_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('updateTicket error:', error?.message || error);
    throw error;
  }
}
