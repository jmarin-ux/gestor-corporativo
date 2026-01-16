import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, full_name, organization } = await req.json()

    // Usamos SERVICE_ROLE para tener permisos de administrador
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    )

    // 1) Enviar invitación oficial por correo
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: 'client' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`
    })

    if (inviteError || !inviteData.user) throw new Error(inviteError?.message || 'Error al invitar')

    // 2) Crear el registro en la tabla CLIENTS vinculado al nuevo UUID
    const { error: clientErr } = await admin.from('clients').upsert({
      id: inviteData.user.id, // Sincronizado con Auth
      email,
      full_name,
      organization,
      status: 'active'
    }, { onConflict: 'email' })

    if (clientErr) throw clientErr

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}