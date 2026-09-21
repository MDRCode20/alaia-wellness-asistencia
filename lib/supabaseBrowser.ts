import { createBrowserClient } from "@supabase/ssr";

// Cliente para el navegador — se usa en la pantalla de login de Administración.
// Usa la clave pública (anon), que es la diseñada para autenticación de usuarios.
export function crearSupabaseNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
