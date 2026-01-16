import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ✅ CAMBIO: Se renombró la función de 'middleware' a 'proxy' 
// para cumplir con el requisito del archivo proxy.ts
export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Obtener el usuario de la sesión de Auth
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Definir rutas protegidas
  const isStaffPath = path.startsWith('/dashboard-staff')
  const isKioskPath = path.startsWith('/kiosk')
  const isClientPath = path.startsWith('/dashboard')
  const isLoginPath = path === '/login'

  // 3. Si no hay usuario y trata de entrar a rutas protegidas -> login
  if (!user && (isStaffPath || isKioskPath || isClientPath)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 4. Si hay usuario, verificar su ROL en la tabla profiles
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id) // ID UUID sincronizado
      .single()

    const role = profile?.role

    // Redirección si ya está logueado e intenta ir a /login
    if (isLoginPath) {
      if (['superadmin', 'admin', 'coordinador', 'operativo'].includes(role || '')) {
        return NextResponse.redirect(new URL('/dashboard-staff', req.url))
      }
      if (role === 'kiosk_master') {
        return NextResponse.redirect(new URL('/kiosk', req.url))
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Protección de rutas por ROL específico
    if (isStaffPath && !['superadmin', 'admin', 'coordinador', 'operativo'].includes(role || '')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (isKioskPath && role !== 'kiosk_master' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard-staff/:path*', '/dashboard/:path*', '/kiosk/:path*', '/login'],
}