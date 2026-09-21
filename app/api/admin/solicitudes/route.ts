import { NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSesionAdmin } from "@/lib/authAdmin";

export const dynamic = "force-dynamic";

// RF-15: revisar las solicitudes de permiso/falta enviadas por el Personal.
export async function GET() {
  const user = await exigirSesionAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
  }

  const supabaseAdmin = obtenerSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("asistencia")
    .select("id, fecha, tipo, motivo, estado, personal(nombre)")
    .eq("estado", "pendiente")
    .order("fecha", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, mensaje: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, solicitudes: data });
}
