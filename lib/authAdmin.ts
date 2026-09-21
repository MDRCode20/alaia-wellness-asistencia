import { crearSupabaseServidor } from "./supabaseServer";

/**
 * Confirma que quien llama a una ruta API de Administración tiene una
 * sesión válida (RF-11). Se usa en TODAS las rutas bajo /api/admin,
 * como segunda capa además del middleware (que protege las páginas,
 * no las rutas API directamente).
 */
export async function exigirSesionAdmin() {
  const supabase = crearSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user; // null si no hay sesión válida
}
