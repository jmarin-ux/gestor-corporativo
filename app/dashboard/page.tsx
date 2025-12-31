'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

// IMPORTAMOS LA BARRA DE NAVEGACIÓN
import Header from '@/components/ui/Header';

// IMPORTAMOS LAS VISTAS
// --- CAMBIO AQUÍ: Apuntamos a la nueva carpeta super-admin ---
import SuperAdminView from '@/components/dashboard/super-admin/SuperAdminView'; 
import ClientView from '@/components/dashboard/ClientView';
import CoordinatorView from '@/components/dashboard/CoordinatorView';
import ManagementView from '@/components/dashboard/ManagementView';
import OperativeView from '@/components/dashboard/OperativeView';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. Obtener datos de sesión
    const sessionData = localStorage.getItem('kiosco_user');

    if (!sessionData) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(sessionData);
    setUser(userData); 

    // 2. Limpiar el parámetro de la URL (Evita el error 'undefined')
    let urlRole = searchParams.get('role');
    if (urlRole === 'undefined' || urlRole === 'null') urlRole = null;

    // 3. Lógica de asignación de Rol
    const isMasterAdmin = userData.email === 'jmarin@cmw.com.mx';

    if (urlRole) {
      // Si hay un rol en la URL y es el Master Admin, lo permitimos
      if (isMasterAdmin) {
        setRole(urlRole);
      } else {
        // Si no es Master Admin, forzamos su rol real (o 'client' si no tiene)
        const realRole = userData.role || 'client';
        setRole(realRole);
        // Limpiamos la URL si estaba intentando acceder a algo indebido
        if (urlRole !== realRole) router.replace(`/dashboard?role=${realRole}`);
      }
    } else {
      // Si no hay rol en la URL, usamos el de la base de datos
      const finalRole = userData.role || 'client';
      setRole(finalRole);
    }
  }, [searchParams, router]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    router.push(`/dashboard?role=${newRole}`);
  };

  // Pantalla de carga mientras se define el rol
  if (!role) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-slate-400 text-xs uppercase tracking-widest">Cargando perfil...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      
      {/* 1. BARRA SUPERIOR */}
      <Header 
        user={user} 
        currentRole={role} 
        onChangeRole={handleRoleChange} 
      />

      {/* 2. CONTENIDO SEGÚN ROL */}
      <div className="animate-in fade-in duration-500">
        {(role === 'superadmin' || role === 'admin') && <SuperAdminView />}
        {role === 'coordinador' && <CoordinatorView />}
        {role === 'operativo' && <OperativeView />}
        
        {/* Aquí caerán los clientes y también las cuentas 'kiosk_master' si se loguean directo */}
        {(role === 'client' || role === 'kiosk_master') && <ClientView />}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}