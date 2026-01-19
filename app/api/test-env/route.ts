import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("--- DIAGNÓSTICO DE VARIABLES ---");
  console.log("URL:", url ? "✅ Existe" : "❌ Falta");
  console.log("KEY:", key ? "✅ Existe" : "❌ Falta");
  
  // Verificamos si la clave tiene caracteres "raros" al inicio o final sin mostrarla
  let keyStatus = "❌ No definida";
  if (key) {
    const startsWithQuote = key.startsWith('"') || key.startsWith("'");
    const endsWithQuote = key.endsWith('"') || key.endsWith("'");
    keyStatus = `✅ Definida (${key.length} caracteres). Comillas detectadas: ${startsWithQuote || endsWithQuote ? "SI (Error)" : "NO (Correcto)"}`;
  }

  return NextResponse.json({
    status: "Diagnóstico completado",
    supa_url: url ? "OK" : "MISSING",
    supa_key: keyStatus,
    timestamp: new Date().toISOString()
  });
}