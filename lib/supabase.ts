import { createClient } from '@supabase/supabase-js';

// Estas líneas leen las llaves que pusimos en el paso anterior
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Creamos y exportamos la conexión lista para usarse
export const supabase = createClient(supabaseUrl, supabaseKey);