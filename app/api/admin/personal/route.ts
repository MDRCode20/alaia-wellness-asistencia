import { NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSesionAdmin } from "@/lib/authAdmin";

export const dynamic = "force-dynamic";

// Lista de personal para los filtros del panel de Administración.
// A diferencia de /api/personal (que usa el Personal para marcar),
// esta requiere sesión de Administración y no expone tienePin.
export async function GET() {
  const user = await exigirSesionAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
  }

  const supabaseAdmin = obtenerSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("personal")
    .select("id, nombre, activo")
    .order("nombre");

  if (error) {
    return NextResponse.json({ ok: false, mensaje: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, personal: data });
}
