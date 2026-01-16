// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

// Al usar createBrowserClient, Supabase gestionará automáticamente 
// las cookies para sincronizarse con tu proxy.ts (middleware)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)