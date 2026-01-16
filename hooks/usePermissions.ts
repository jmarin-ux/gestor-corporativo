import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

export function usePermissions(currentUser: any) {
  const [perms, setPerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!currentUser?.role) {
        setLoading(false);
        return;
      }
      
      // SUPERADMIN SIEMPRE TIENE ACCESO TOTAL
      if (currentUser.role === 'superadmin') {
          if (isMounted) {
            setPerms({ all: true });
            setLoading(false);
          }
          return;
      }

      const { data } = await supabase
        .from('role_settings')
        .select('permissions')
        .eq('role', currentUser.role)
        .single();

      if (isMounted) {
        setPerms(data?.permissions || {});
        setLoading(false);
      }
    }

    load();

    return () => { isMounted = false; };
  }, [currentUser]);

  const can = (module: string, action: string) => {
    if (loading) return false;
    if (perms?.all === true) return true;
    return perms?.[module]?.[action] === true;
  };

  return { can, loading };
}