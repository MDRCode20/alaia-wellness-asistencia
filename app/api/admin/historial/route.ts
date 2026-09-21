import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSesionAdmin } from "@/lib/authAdmin";

export const dynamic = "force-dynamic";

// RF-13: consultar y filtrar el historial combinando persona, tipo/motivo
// y rango de fechas. Los filtros llegan como query params y se pasan al
// query builder de Supabase (nunca como texto SQL armado a mano).
export async function GET(req: NextRequest) {
  const user = await exigirSesionAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const personaId = params.get("personaId");
  const tipo = params.get("tipo");
  const desde = params.get("desde");
  const hasta = params.get("hasta");

  const supabaseAdmin = obtenerSupabaseAdmin();
  let consulta = supabaseAdmin
    .from("asistencia")
    .select(
      "id, fecha, hora_entrada, hora_salida, tardanza_minutos, tiempo_adicional_minutos, saldo_minutos, tipo, motivo, observacion, persona_id, personal(nombre)"
    )
    .order("fecha", { ascending: false });

  if (personaId) consulta = consulta.eq("persona_id", personaId);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (desde) consulta = consulta.gte("fecha", desde);
  if (hasta) consulta = consulta.lte("fecha", hasta);

  const { data, error } = await consulta.limit(500);

  if (error) {
    return NextResponse.json({ ok: false, mensaje: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, registros: data });
}
