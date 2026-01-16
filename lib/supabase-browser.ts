// lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr'

// ✅ Lee envs
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ Validación segura (ayuda a detectar el típico error api.supabase.com)
function assertEnv() {
  if (!SUPABASE_URL) {
    console.error(
      '[supabase-browser] Falta NEXT_PUBLIC_SUPABASE_URL en .env.local'
    )
  }

  if (!SUPABASE_ANON_KEY) {
    console.error(
      '[supabase-browser] Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
    )
  }

  if (SUPABASE_URL && SUPABASE_URL.includes('api.supabase.com')) {
    console.error(
      '[supabase-browser] NEXT_PUBLIC_SUPABASE_URL está MAL. No debe ser api.supabase.com.\n' +
        'Debe ser: https://TU_PROJECT_REF.supabase.co'
    )
  }

  if (SUPABASE_URL && !SUPABASE_URL.startsWith('http')) {
    console.error(
      '[supabase-browser] NEXT_PUBLIC_SUPABASE_URL debe iniciar con https://'
    )
  }
}

assertEnv()

export const supabase = createBrowserClient(
  SUPABASE_URL!,
  SUPABASE_ANON_KEY!
)
