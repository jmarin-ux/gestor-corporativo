import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const full_name = String(body.full_name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = body.phone ? String(body.phone).trim() : null
    const company = body.company ? String(body.company).trim() : null
    const message = body.message ? String(body.message).trim() : null
    const password = String(body.password || '')

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, correo y contraseña son obligatorios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 1) Si ya existe en AUTH, no volvemos a crearlo.
    //    (Supabase devuelve error de already registered)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'client' },
    })

    let userId: string | null = created?.user?.id || null

    if (createErr) {
      // Si ya está registrado, intentamos obtenerlo por email
      const msg = (createErr as any)?.message || ''
      if (!msg.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: msg || 'No se pudo crear el usuario' }, { status: 400 })
      }

      // Buscar user por email
      const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
      if (listErr) {
        return NextResponse.json({ error: 'Ya existe una cuenta con este correo. Contacta a soporte.' }, { status: 409 })
      }
      const found = (users?.users || []).find((u) => (u.email || '').toLowerCase() === email)
      if (!found?.id) {
        return NextResponse.json({ error: 'Ya existe una cuenta con este correo.' }, { status: 409 })
      }
      userId = found.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'No se pudo determinar el ID del usuario.' }, { status: 500 })
    }

    // 2) profiles: cliente queda PENDIENTE hasta aprobación
    await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: full_name.toUpperCase(),
          role: 'client',
          status: 'pending',
        },
        { onConflict: 'id' }
      )

    // 3) clients: también PENDIENTE (para que el admin los vea)
    await supabaseAdmin
      .from('clients')
      .upsert(
        {
          id: userId,
          email,
          full_name: full_name.toUpperCase(),
          phone,
          organization: company ? company.toUpperCase() : null,
          status: 'pending',
          coordinator_id: null,
        },
        { onConflict: 'id' }
      )

    // 4) (Opcional) tabla de solicitudes SOLO para auditoría
    //    Si no tienes client_requests, comenta este bloque.
    try {
      await supabaseAdmin.from('client_requests').insert({
        user_id: userId,
        email,
        full_name: full_name.toUpperCase(),
        phone,
        company,
        message,
        status: 'pending',
      })
    } catch {
      // silencioso: si no existe tabla, no rompemos el flujo
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error al enviar solicitud' },
      { status: 500 }
    )
  }
}
