import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  estaDentroDeLaZona,
  calcularTardanza,
  calcularTiempoAFavorEntrada,
  calcularTiempoAdicional,
  calcularSalidaAnticipada,
  calcularSaldo,
  hashPin,
} from "@/lib/reglas";

const RADIO_AUTORIZADO = Number(process.env.ESTABLISHMENT_RADIUS_METERS ?? 100);

// Evita que Next.js intente ejecutar esta ruta durante "next build" para
// optimizarla como contenido estático — necesita correr solo en tiempo real,
// con las variables de entorno ya disponibles.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = obtenerSupabaseAdmin();
    const { personaId, accion, lat, lng, pin, observacion } = await req.json();

    if (!personaId || !accion || lat === undefined || lng === undefined || !pin) {
      return NextResponse.json(
        { ok: false, mensaje: "Faltan datos para procesar la marcación." },
        { status: 400 }
      );
    }

    // RF-02b: validar que el PIN corresponda a la persona seleccionada
    const { data: persona, error: errorPersona } = await supabaseAdmin
      .from("personal")
      .select("id, pin_hash")
      .eq("id", personaId)
      .single();

    if (errorPersona || !persona) {
      return NextResponse.json(
        { ok: false, mensaje: "Persona no encontrada." },
        { status: 404 }
      );
    }

    if (!persona.pin_hash) {
      return NextResponse.json(
        { ok: false, mensaje: "Esta persona aún no tiene un PIN. Créalo primero." },
        { status: 428 }
      );
    }

    if (persona.pin_hash !== hashPin(pin)) {
      return NextResponse.json(
        { ok: false, mensaje: "PIN incorrecto." },
        { status: 401 }
      );
    }

    // RF-05: validar geocerca
    if (!estaDentroDeLaZona(lat, lng, RADIO_AUTORIZADO)) {
      return NextResponse.json(
        { ok: false, mensaje: "Marcación rechazada: fuera de la zona autorizada." },
        { status: 403 }
      );
    }

    // RF-06: la hora oficial la genera el servidor, nunca el celular
    const ahora = new Date();
    const fechaHoy = ahora.toISOString().slice(0, 10); // YYYY-MM-DD

    // Buscar si ya existe un registro de hoy para esta persona
    const { data: registroExistente } = await supabaseAdmin
      .from("asistencia")
      .select("*")
      .eq("persona_id", personaId)
      .eq("fecha", fechaHoy)
      .maybeSingle();

    if (accion === "ENTRADA") {
      // RF-07: bloquear doble entrada
      if (registroExistente?.hora_entrada) {
        return NextResponse.json(
          { ok: false, mensaje: "Ya existe una entrada registrada hoy para esta persona." },
          { status: 409 }
        );
      }

      const tardanza = calcularTardanza(ahora);
      const tiempoAFavor = calcularTiempoAFavorEntrada(ahora);

      const { error } = await supabaseAdmin.from("asistencia").upsert(
        {
          persona_id: personaId,
          fecha: fechaHoy,
          hora_entrada: ahora.toISOString(),
          ubicacion_entrada: { lat, lng },
          tardanza_minutos: tardanza,
          saldo_minutos: tiempoAFavor - tardanza,
          // Si había una solicitud de permiso/falta pendiente para hoy y al
          // final sí vino a trabajar, la marcación normal tiene prioridad.
          tipo: "normal",
          estado: "aprobado",
          observacion: observacion || null,
        },
        { onConflict: "persona_id,fecha" }
      );

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        mensaje: `Entrada registrada a las ${ahora.toLocaleTimeString("es-PE")}.`,
        tardanza,
      });
    }

    if (accion === "SALIDA") {
      // RF-07: no permitir salida sin entrada previa; queda como incidencia
      if (!registroExistente?.hora_entrada) {
        return NextResponse.json(
          {
            ok: false,
            mensaje: "No hay una entrada registrada hoy. La salida no puede procesarse (incidencia).",
          },
          { status: 409 }
        );
      }

      // RF-07: bloquear doble salida
      if (registroExistente?.hora_salida) {
        return NextResponse.json(
          { ok: false, mensaje: "Ya existe una salida registrada hoy para esta persona." },
          { status: 409 }
        );
      }

      const tiempoAdicional = calcularTiempoAdicional(ahora);
      const salidaAnticipada = calcularSalidaAnticipada(ahora);
      const tiempoAFavorEntrada = calcularTiempoAFavorEntrada(
        new Date(registroExistente.hora_entrada)
      );

      const saldo = calcularSaldo({
        tiempoAFavorEntrada,
        tardanza: registroExistente.tardanza_minutos ?? 0,
        tiempoAdicional,
        salidaAnticipada,
      });

      const observacionCombinada = observacion
        ? registroExistente.observacion
          ? `${registroExistente.observacion} | ${observacion}`
          : observacion
        : registroExistente.observacion;

      const { error } = await supabaseAdmin
        .from("asistencia")
        .update({
          hora_salida: ahora.toISOString(),
          ubicacion_salida: { lat, lng },
          tiempo_adicional_minutos: tiempoAdicional,
          salida_anticipada_minutos: salidaAnticipada,
          saldo_minutos: saldo,
          observacion: observacionCombinada,
        })
        .eq("id", registroExistente.id);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        mensaje: `Salida registrada a las ${ahora.toLocaleTimeString("es-PE")}.`,
        saldo,
      });
    }

    return NextResponse.json(
      { ok: false, mensaje: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, mensaje: "Error interno al procesar la marcación." },
      { status: 500 }
    );
  }
}
