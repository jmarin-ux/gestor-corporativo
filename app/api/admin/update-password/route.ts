import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // ----------------------------------------------------------------
    // PASO 0: VERIFICACIÓN CRÍTICA DE VARIABLES DE ENTORNO
    // Esto evita el error "supabaseKey is required" y nos dice qué falta.
    // ----------------------------------------------------------------
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("🚨 ERROR CRÍTICO EN SERVIDOR: Faltan variables de entorno.");
      console.error("- NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✅ Cargada" : "❌ Faltante");
      console.error("- SUPABASE_SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "✅ Cargada" : "❌ Faltante (Esta es la causa del error)");
      
      return NextResponse.json(
        { error: 'Error de configuración del servidor. Contacte al desarrollador.' },
        { status: 500 }
      );
    }

    // ----------------------------------------------------------------
    // PASO 1: VERIFICAR LA SESIÓN DEL USUARIO QUE HACE LA PETICIÓN
    // Usamos el cliente normal (anónimo) para leer las cookies.
    // ----------------------------------------------------------------
    const cookieStore = await cookies();

    const supabase = createServerClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignorar errores en componentes de servidor
            }
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    // ----------------------------------------------------------------
    // PASO 2: VERIFICAR QUE EL SOLICITANTE SEA SUPERADMIN
    // ----------------------------------------------------------------
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de Superadmin.' }, { status: 403 });
    }

    // ----------------------------------------------------------------
    // PASO 3: OBTENER DATOS Y VALIDAR
    // ----------------------------------------------------------------
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    // ----------------------------------------------------------------
    // PASO 4: EJECUTAR EL CAMBIO USANDO LA "LLAVE MAESTRA"
    // Aquí usamos createClient de 'supabase-js' con la SERVICE_ROLE_KEY validada arriba.
    // ----------------------------------------------------------------
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY, 
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error de Supabase al actualizar:", updateError);
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente.' });

  } catch (error: any) {
    console.error('Error general en endpoint update-password:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}