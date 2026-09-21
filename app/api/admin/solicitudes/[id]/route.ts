import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSesionAdmin } from "@/lib/authAdmin";

export const dynamic = "force-dynamic";

const ROLES_VALIDOS = ["Encargada del área", "Jefa general"];

// RF-15: aprobar o rechazar una solicitud de permiso/falta. Queda registrado
// en auditoría quién decidió y qué estado tenía antes/después.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await exigirSesionAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
  }

  try {
    const { estado, realizadoPor } = await req.json();

    if (estado !== "aprobado" && estado !== "rechazado") {
      return NextResponse.json({ ok: false, mensaje: "Estado no válido." }, { status: 400 });
    }
    if (!ROLES_VALIDOS.includes(realizadoPor)) {
      return NextResponse.json(
        { ok: false, mensaje: "Selecciona quién realiza la acción." },
        { status: 400 }
      );
    }

    const supabaseAdmin = obtenerSupabaseAdmin();

    const { data: registroAnterior, error: errorLectura } = await supabaseAdmin
      .from("asistencia")
      .select("estado, fecha, tipo, motivo, personal(nombre)")
      .eq("id", params.id)
      .single();

    if (errorLectura || !registroAnterior) {
      return NextResponse.json({ ok: false, mensaje: "Solicitud no encontrada." }, { status: 404 });
    }

    const { error: errorUpdate } = await supabaseAdmin
      .from("asistencia")
      .update({ estado })
      .eq("id", params.id);

    if (errorUpdate) throw errorUpdate;

    const { error: errorAuditoria } = await supabaseAdmin.from("auditoria").insert({
      asistencia_id: params.id,
      accion: estado === "aprobado" ? "APROBACIÓN" : "RECHAZO",
      realizado_por: realizadoPor,
      detalle: `Solicitud marcada como ${estado} desde el panel de Administración.`,
      datos_anteriores: { estado: registroAnterior.estado },
      datos_nuevos: { estado },
    });

    if (errorAuditoria) throw errorAuditoria;

    // Si se aprobó, se genera un aviso visible para todo el Personal
    // durante 12 horas, para que todas estén informadas.
    if (estado === "aprobado") {
      const nombre = (registroAnterior as any).personal?.nombre ?? "Alguien del equipo";
      const fechaLegible = new Date(`${registroAnterior.fecha}T00:00:00`).toLocaleDateString("es-PE", {
        day: "numeric",
        month: "long",
      });
      const sustantivo = registroAnterior.tipo === "falta" ? "una falta" : "un permiso";
      const mensaje = `Por motivos personales, ${nombre} tiene aprobado ${sustantivo} para el ${fechaLegible}.`;

      const expiraEn = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin.from("avisos").insert({ mensaje, expira_en: expiraEn });
    }

    return NextResponse.json({ ok: true, mensaje: "Solicitud actualizada." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, mensaje: "Error al actualizar la solicitud." }, { status: 500 });
  }
}
