import { NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// RF-02: mostrar botones con los nombres de las personas activas.
// También indica si cada persona ya creó su PIN (sin exponer el PIN en sí).
// Usa la clave de servicio porque esta ruta corre siempre en el servidor;
// así la tabla puede quedar completamente cerrada (RLS) al navegador.
export async function GET() {
  try {
    const supabaseAdmin = obtenerSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("personal")
      .select("id, nombre, pin_hash")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      return NextResponse.json({ ok: false, mensaje: error.message }, { status: 500 });
    }

    const personal = data.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      tienePin: !!p.pin_hash,
    }));

    return NextResponse.json({ ok: true, personal });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, mensaje: "Error interno al obtener el personal." },
      { status: 500 }
    );
  }
}
