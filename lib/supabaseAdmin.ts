import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cliente "de servicio" — SOLO se usa dentro de las rutas API (servidor),
// nunca en el navegador. Tiene permisos para escribir/validar marcaciones
// y para las funciones del panel de Administración.
//
// Se crea de forma "perezosa" (solo cuando alguna ruta lo usa de verdad),
// no apenas se importa este archivo. Esto evita que "next build" falle
// si las variables de entorno todavía no están disponibles en ese momento
// (por ejemplo, durante el análisis inicial de las rutas).

let cliente: SupabaseClient | null = null;

function variableRequerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Revisa tu archivo .env.local.`
    );
  }
  return valor;
}

export function obtenerSupabaseAdmin(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(
      variableRequerida("NEXT_PUBLIC_SUPABASE_URL"),
      variableRequerida("SUPABASE_SERVICE_ROLE_KEY")
    );
  }
  return cliente;
}
