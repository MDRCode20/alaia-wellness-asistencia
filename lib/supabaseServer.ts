import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para el servidor — lee/escribe la sesión de Administración
// desde las cookies de la petición. Se usa en Server Components,
// Route Handlers y en el middleware que protege /admin.
export function crearSupabaseServidor() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nombre: string) {
          return cookieStore.get(nombre)?.value;
        },
        set(nombre: string, valor: string, opciones: any) {
          try {
            cookieStore.set(nombre, valor, opciones);
          } catch {
            // Se puede ignorar si se llama desde un Server Component;
            // el middleware es el que realmente refresca la cookie.
          }
        },
        remove(nombre: string, opciones: any) {
          try {
            cookieStore.set(nombre, "", { ...opciones, maxAge: 0 });
          } catch {
            // Igual que arriba.
          }
        },
      },
    }
  );
}
