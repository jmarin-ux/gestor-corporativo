import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser'; // ⚠️ Verifica que esta ruta sea correcta en tu proyecto

export const useRBAC = (currentUserRole: string | undefined) => {
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no hay rol, no hacemos nada (o esperamos a que cargue)
    if (currentUserRole === undefined) return;

    // Si es Superadmin, no perdemos tiempo consultando: tiene acceso total por defecto.
    if (currentUserRole === 'superadmin') {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Consultamos la tabla "role_settings" buscando por el nombre del rol
        const { data, error } = await supabase
          .from('role_settings')
          .select('permissions')
          .eq('role', currentUserRole.toLowerCase().trim()) 
          .single();

        if (data) {
          setPermissions(data.permissions || {});
        }
      } catch (error) {
        console.error("Error cargando permisos RBAC:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [currentUserRole]);

  // --- LA FUNCIÓN "MAGICA" ---
  // Uso: can('attendance', 'read') -> devuelve true o false
  const can = (module: string, action: string) => {
    // 1. Superadmin siempre pasa
    if (currentUserRole === 'superadmin') return true; 
    
    // 2. Verificamos si existe el permiso explícito en el JSON de la base de datos
    // Estructura esperada: permissions: { "attendance": { "read": true } }
    return permissions?.[module]?.[action] === true;
  };

  return { can, loading };
};