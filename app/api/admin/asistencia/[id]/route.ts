import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSesionAdmin } from "@/lib/authAdmin";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = ["normal", "permiso", "falta", "incidencia"];
const ROLES_VALIDOS = ["Encargada del área", "Jefa general"];

// RF-14/RF-17: Administración puede corregir observación, motivo y tipo
// de un registro — NUNCA la hora ni la ubicación original (eso es inmutable
// por regla del sistema). Cada corrección queda en la tabla auditoria con
// quién la hizo y los datos de antes/después.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await exigirSesionAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
  }

  try {
    const { motivo, observacion, tipo, realizadoPor } = await req.json();

    if (!ROLES_VALIDOS.includes(realizadoPor)) {
      return NextResponse.json(
        { ok: false, mensaje: "Selecciona quién realiza la corrección." },
        { status: 400 }
      );
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ ok: false, mensaje: "Tipo no válido." }, { status: 400 });
    }

    const supabaseAdmin = obtenerSupabaseAdmin();

    // Guardamos el estado anterior para la auditoría, antes de tocar nada.
    const { data: registroAnterior, error: errorLectura } = await supabaseAdmin
      .from("asistencia")
      .select("motivo, observacion, tipo")
      .eq("id", params.id)
      .single();

    if (errorLectura || !registroAnterior) {
      return NextResponse.json({ ok: false, mensaje: "Registro no encontrado." }, { status: 404 });
    }

    const datosNuevos = {
      motivo: motivo ?? registroAnterior.motivo,
      observacion: observacion ?? registroAnterior.observacion,
      tipo: tipo ?? registroAnterior.tipo,
    };

    const { error: errorUpdate } = await supabaseAdmin
      .from("asistencia")
      .update(datosNuevos)
      .eq("id", params.id);

    if (errorUpdate) throw errorUpdate;

    const { error: errorAuditoria } = await supabaseAdmin.from("auditoria").insert({
      asistencia_id: params.id,
      accion: "CORRECCIÓN",
      realizado_por: realizadoPor,
      detalle: "Corrección de observación/motivo/tipo desde el panel de Administración.",
      datos_anteriores: registroAnterior,
      datos_nuevos: datosNuevos,
    });

    if (errorAuditoria) throw errorAuditoria;

    return NextResponse.json({ ok: true, mensaje: "Registro actualizado." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, mensaje: "Error al actualizar el registro." }, { status: 500 });
  }
}
