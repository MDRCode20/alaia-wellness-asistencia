import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPin } from "@/lib/reglas";

export const dynamic = "force-dynamic";

// RF-10: el Personal registra una solicitud de permiso o falta (fecha y
// motivo), que queda "pendiente" hasta que Administración la apruebe o
// rechace. Nunca toca hora_entrada/hora_salida/ubicaciones — esos campos
// son inmutables y solo se llenan al marcar de verdad.
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = obtenerSupabaseAdmin();
    const { personaId, pin, fecha, tipo, motivo } = await req.json();

    if (!personaId || !pin || !fecha || !tipo || !motivo) {
      return NextResponse.json({ ok: false, mensaje: "Faltan datos." }, { status: 400 });
    }
    if (tipo !== "permiso" && tipo !== "falta") {
      return NextResponse.json({ ok: false, mensaje: "Tipo no válido." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ ok: false, mensaje: "Fecha no válida." }, { status: 400 });
    }

    const { data: persona, error: errorPersona } = await supabaseAdmin
      .from("personal")
      .select("id, pin_hash")
      .eq("id", personaId)
      .single();

    if (errorPersona || !persona || !persona.pin_hash || persona.pin_hash !== hashPin(pin)) {
      return NextResponse.json({ ok: false, mensaje: "PIN incorrecto." }, { status: 401 });
    }

    const { data: registroExistente } = await supabaseAdmin
      .from("asistencia")
      .select("id, hora_entrada, hora_salida")
      .eq("persona_id", personaId)
      .eq("fecha", fecha)
      .maybeSingle();

    if (registroExistente) {
      // Ya hay un registro ese día (por ejemplo, ya marcó entrada):
      // solo actualizamos tipo/motivo/estado, nunca la hora ni la ubicación.
      const { error } = await supabaseAdmin
        .from("asistencia")
        .update({ tipo, motivo, estado: "pendiente" })
        .eq("id", registroExistente.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("asistencia").insert({
        persona_id: personaId,
        fecha,
        tipo,
        motivo,
        estado: "pendiente",
      });

      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Tu solicitud quedó registrada y está pendiente de aprobación.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, mensaje: "Error al registrar la solicitud." }, { status: 500 });
  }
}
