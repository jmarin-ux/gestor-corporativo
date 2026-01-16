import { SupabaseClient } from '@supabase/supabase-js';

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'coordinador'
  | 'operativo'
  | 'cliente';

export interface UserContext {
  id: string;
  role: UserRole;
}

/**
 * FUNCIÓN ÚNICA DE VISIBILIDAD DE OTs
 * Usada por:
 * - Tabla de Operaciones
 * - Planner
 */
export function ticketsVisibilityQuery(
  supabase: SupabaseClient,
  user: UserContext
) {
  let query = supabase.from('tickets').select('*');

  // Admins ven todo
  if (['superadmin', 'admin'].includes(user.role)) {
    return query;
  }

  switch (user.role) {
    case 'coordinador':
      return query.eq('coordinator_id', user.id);

    case 'operativo':
      return query.or(
        `leader_id.eq.${user.id},assistant_id.eq.${user.id}`
      );

    case 'cliente':
      return query.eq('client_id', user.id);

    default:
      // No ve nada
      return query.eq('id', -1);
  }
}
