import { NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Avisos vigentes (por ejemplo, "permiso aprobado"), visibles para todo el
// Personal durante 12 horas. No requiere sesión: es información pública
// pensada para mostrarse en la portada y en la pantalla de marcación.
export async function GET() {
  const supabaseAdmin = obtenerSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("avisos")
    .select("id, mensaje, creado_en")
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, mensaje: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, avisos: data });
}
