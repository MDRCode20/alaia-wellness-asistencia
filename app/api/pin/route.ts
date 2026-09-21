import { NextRequest, NextResponse } from "next/server";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPin } from "@/lib/reglas";

export const dynamic = "force-dynamic";

// RF-02c: cada persona crea su propio PIN la primera vez que ingresa.
// Solo funciona si esa persona todavía NO tiene un PIN (pin_hash es null).
// Una vez creado, ni Administración puede volver a verlo: solo restablecerlo
// (dejarlo en null) para que la persona cree uno nuevo.
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = obtenerSupabaseAdmin();
    const { personaId, pin } = await req.json();

    if (!personaId || !pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { ok: false, mensaje: "El PIN debe tener exactamente 4 dígitos." },
        { status: 400 }
      );
    }

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

    // Si ya tiene PIN, no se puede crear otro por esta vía (evita que
    // cualquiera lo sobrescriba). Solo Administración puede restablecerlo.
    if (persona.pin_hash) {
      return NextResponse.json(
        { ok: false, mensaje: "Esta persona ya tiene un PIN creado." },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from("personal")
      .update({ pin_hash: hashPin(pin) })
      .eq("id", personaId);

    if (error) throw error;

    return NextResponse.json({ ok: true, mensaje: "PIN creado correctamente." });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, mensaje: "Error interno al crear el PIN." },
      { status: 500 }
    );
  }
}
