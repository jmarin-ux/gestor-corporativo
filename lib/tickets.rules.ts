import { SupabaseClient } from '@supabase/supabase-js';

/* TIPOS UNIFICADOS */
export type UserRole = 'superadmin' | 'admin' | 'coordinador' | 'operativo' | 'cliente';

export type UserContext = {
  id: string;
  role: UserRole;
  email?: string;
  full_name?: string;
};

/* LÓGICA DE VISIBILIDAD DE DATOS */
export function ticketsVisibilityQuery(supabase: SupabaseClient, user: UserContext) {
  const query = supabase.from('tickets').select('*');

  // Administradores: Acceso total
  if (['superadmin', 'admin'].includes(user.role)) return query;

  // Filtros por Rol
  switch (user.role) {
    case 'coordinador':
      // Compatibilidad temporal si existen 2 columnas
      return query.or(`coordinator_id.eq.${user.id},coordinador_id.eq.${user.id}`);

    case 'operativo':
      return query.or(`leader_id.eq.${user.id},assistant_id.eq.${user.id}`);

    case 'cliente': {
      const email = (user.email || '').trim();
      // Ajusta si tú realmente usas client_id; si no, usa solo email
      if (!email) return query.eq('id', -1);
      return query.or(`client_email.eq.${email},customer_email.eq.${email}`);
    }

    default:
      // Bloqueo de seguridad
      return query.eq('id', -1);
  }
}

/* REGLAS DE FLUJO DE TRABAJO */
export const PROTECTED_STATUSES = [
  'REALIZADO',
  'REVISION INTERNA',
  'CANCELADO',
  'CERRADO',
  'QA',
] as const;

export const STATUS_FLOW_BY_ROLE: Record<UserRole, string[]> = {
  superadmin: ['Asignado', 'Pendiente', 'En Proceso', 'Ejecutado', 'REALIZADO', 'REVISION INTERNA', 'QA', 'CERRADO', 'CANCELADO'],
  admin: ['Asignado', 'Pendiente', 'En Proceso', 'Ejecutado', 'REALIZADO', 'REVISION INTERNA', 'QA', 'CERRADO', 'CANCELADO'],
  coordinador: ['Asignado', 'Pendiente', 'En Proceso', 'Ejecutado'],
  operativo: ['En Proceso', 'Ejecutado'],
  cliente: ['QA'],
};
