import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSesionAdmin } from "@/lib/authAdmin";
import { calcularRangoReporte, hashPin } from "@/lib/reglas";
import { generarExcelReporte, generarPdfReporte, FilaReporte } from "@/lib/reportes";

export const dynamic = "force-dynamic";

// RF-16: reportes semanales, mensuales o de período personalizado, en PDF o Excel.
// Dos formas de pedirlo, sin mezclar sus permisos:
//   - "admin": requiere sesión de Administración; puede ver a todo el personal
//     y cualquier rango de fechas (incluido personalizado).
//   - "personal": requiere el PIN de esa persona; solo puede ver SU PROPIO
//     reporte (nunca el de otra), y solo semana o mes actual.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modo, formato, periodo } = body;

    if (formato !== "pdf" && formato !== "excel") {
      return NextResponse.json({ ok: false, mensaje: "Formato no válido." }, { status: 400 });
    }

    const supabaseAdmin = obtenerSupabaseAdmin();
    let personaIdFiltro: string | null = null;
    let titulo = "";

    if (modo === "admin") {
      const user = await exigirSesionAdmin();
      if (!user) {
        return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
      }
      if (periodo !== "semana" && periodo !== "mes" && periodo !== "personalizado") {
        return NextResponse.json({ ok: false, mensaje: "Período no válido." }, { status: 400 });
      }
      personaIdFiltro = body.personaId ?? null; // null = todo el personal
      titulo = "Reporte de asistencia — Alaia Wellness Club";
    } else if (modo === "personal") {
      const { personaId, pin } = body;
      if (!personaId || !pin) {
        return NextResponse.json({ ok: false, mensaje: "Faltan datos." }, { status: 400 });
      }
      if (periodo !== "semana" && periodo !== "mes") {
        return NextResponse.json({ ok: false, mensaje: "Período no válido." }, { status: 400 });
      }

      const { data: persona } = await supabaseAdmin
        .from("personal")
        .select("id, pin_hash")
        .eq("id", personaId)
        .single();

      if (!persona || !persona.pin_hash || persona.pin_hash !== hashPin(pin)) {
        return NextResponse.json({ ok: false, mensaje: "PIN incorrecto." }, { status: 401 });
      }

      personaIdFiltro = personaId; // SIEMPRE su propio id, nunca otro
      titulo = "Mi reporte de asistencia";
    } else {
      return NextResponse.json({ ok: false, mensaje: "Modo no válido." }, { status: 400 });
    }

    const { desde, hasta } = calcularRangoReporte(periodo, body.desde, body.hasta);

    let consulta = supabaseAdmin
      .from("asistencia")
      .select("fecha, hora_entrada, hora_salida, tardanza_minutos, tiempo_adicional_minutos, saldo_minutos, tipo, motivo, personal(nombre)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true });

    if (personaIdFiltro) {
      consulta = consulta.eq("persona_id", personaIdFiltro);
    }

    const { data, error } = await consulta;
    if (error) throw error;

    const filas: FilaReporte[] = (data ?? []).map((fila: any) => ({
      fecha: fila.fecha,
      nombre: fila.personal?.nombre ?? "—",
      hora_entrada: fila.hora_entrada,
      hora_salida: fila.hora_salida,
      tardanza_minutos: fila.tardanza_minutos,
      tiempo_adicional_minutos: fila.tiempo_adicional_minutos,
      tipo: fila.tipo,
      motivo: fila.motivo,
      saldo_minutos: fila.saldo_minutos,
    }));

    const tituloConRango = `${titulo} (${desde} a ${hasta})`;

    if (formato === "excel") {
      const buffer = await generarExcelReporte(filas, tituloConRango);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="asistencia_${desde}_a_${hasta}.xlsx"`,
        },
      });
    }

    const buffer = await generarPdfReporte(filas, tituloConRango);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="asistencia_${desde}_a_${hasta}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, mensaje: "Error al generar el reporte." }, { status: 500 });
  }
}
