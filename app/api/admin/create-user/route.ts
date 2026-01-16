import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      id, // solo para staff update
      email,
      password,
      full_name,
      role,
      position,
      kiosk_pin,
      coordinator_id,
      isUpdate,
      status,
      technical_level // ✅ Campo nuevo para nivel técnico
    } = body

    // -----------------------------
    // Normalización de datos
    // -----------------------------
    const normalizedEmail = (email || '').trim().toLowerCase()
    const normalizedRole = (role || '').trim().toLowerCase()
    const normalizedName = (full_name || '').trim()
    const normalizedStatus = (status || 'active').trim().toLowerCase()

    const isClient = normalizedRole === 'client' || normalizedRole === 'cliente'

    // -----------------------------
    // Inicializar Supabase Admin (Service Role)
    // -----------------------------
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // =============================
    // VALIDACIONES GENERALES
    // =============================
    if (!normalizedEmail) throw new Error('El email es obligatorio')
    if (!normalizedName) throw new Error('El nombre es obligatorio')

    // ==========================================================
    // 🔴 LÓGICA PARA CLIENTES
    // ==========================================================
    if (isClient) {
      if (isUpdate) throw new Error('Los clientes no pueden actualizarse desde este endpoint')
      if (!password) throw new Error('La contraseña es obligatoria para crear un cliente')
      if (!coordinator_id) throw new Error('Debe asignarse un coordinador para aprobar un cliente')

      // 1. Crear usuario en Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: normalizedName,
          role: 'client',
        },
      })

      if (authError) throw authError
      const authId = authUser.user.id

      // 2. Upsert en tabla clients (para evitar errores si ya existe)
      const { error: clientError } = await supabaseAdmin
        .from('clients')
        .upsert({
          id: authId,
          full_name: normalizedName.toUpperCase(),
          email: normalizedEmail,
          status: 'active',
          coordinator_id,
        }, { onConflict: 'id' })

      if (clientError) {
        await supabaseAdmin.auth.admin.deleteUser(authId)
        throw clientError
      }

      return NextResponse.json({ ok: true, user_id: authId, message: 'Cliente creado y aprobado correctamente' })
    }

    // ==========================================================
    // 🟢 STAFF → ACTUALIZAR (UPDATE)
    // ==========================================================
    if (isUpdate && id) {
      // Si mandan password, lo actualizamos en Auth
      if (password) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
        if (error) throw error
      }

      // Actualizamos perfil con Upsert
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id,
            email: normalizedEmail,
            full_name: normalizedName.toUpperCase(),
            role: normalizedRole,
            position: position || undefined,
            technical_level: technical_level || 'Auxiliar',
            kiosk_pin: kiosk_pin ?? null,
            status: normalizedStatus,
          },
          { onConflict: 'id' }
        )

      if (profileError) throw profileError
      return NextResponse.json({ ok: true, message: 'Staff actualizado correctamente' })
    }

    // ==========================================================
    // 🟢 STAFF → CREAR NUEVO (CREATE)
    // ==========================================================
    if (!password) throw new Error('La contraseña es obligatoria para crear staff')

    // 1. Crear en Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: normalizedName,
          role: normalizedRole,
        },
      })

    if (authError) throw authError
    const authId = authUser.user.id

    // 2. Crear en Profiles usando UPSERT (Solución al error duplicate key)
    // Si el Trigger ya creó el perfil, esto lo sobrescribe con los datos correctos.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authId,
        email: normalizedEmail,
        full_name: normalizedName.toUpperCase(),
        role: normalizedRole,
        position: position || 'OPERATIVO GENERAL',
        technical_level: technical_level || 'Auxiliar', // Guardamos el nivel técnico
        kiosk_pin: kiosk_pin ?? null,
        status: normalizedStatus,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      // Si falla el upsert, no borramos el usuario de auth inmediatamente 
      // porque podría ser un error de conexión, pero lanzamos el error.
      console.error("Error al guardar perfil:", profileError)
      throw profileError
    }

    return NextResponse.json({ ok: true, user_id: authId, message: 'Staff creado correctamente' })
    
  } catch (error: any) {
    console.error('Error en API create-user:', error.message)
    let customMessage = error.message || 'Error interno del servidor'
    let httpStatus = 500

    if (customMessage.includes('already been registered')) {
      customMessage = 'Este correo ya tiene una cuenta de acceso activa.'
      httpStatus = 409
    }
    
    return NextResponse.json({ error: customMessage }, { status: httpStatus })
  }
}