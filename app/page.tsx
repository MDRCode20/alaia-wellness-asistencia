import Link from "next/link";
import { obtenerSupabaseAdmin } from "@/lib/supabaseAdmin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// Portada del sistema: desde aquí cada quien elige a dónde entrar.
// El Personal va a /marcar (sin usuario ni contraseña, solo su PIN);
// Administración va a /admin/login (con correo y contraseña).
export default async function PortadaPage() {
  const supabaseAdmin = obtenerSupabaseAdmin();
  const { data: avisos } = await supabaseAdmin
    .from("avisos")
    .select("id, mensaje")
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false });

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.markLetter} aria-hidden="true">
          A
        </div>
        <p className={styles.subwordmark}>ALAIA&nbsp;&nbsp;WELLNESS&nbsp;&nbsp;CLUB</p>

        {avisos && avisos.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            {avisos.map((a) => (
              <p
                key={a.id}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--color-ink-soft)",
                  marginTop: 6,
                }}
              >
                {a.mensaje}
              </p>
            ))}
          </div>
        )}

        <p className={styles.titulo}>Asistencia del personal</p>

        <div className={styles.rule} />
        <Link href="/marcar" className={styles.opcion}>
          PERSONAL
          <span className={styles.opcionSub}>Marcar entrada o salida</span>
        </Link>

        <div className={styles.rule} />
        <Link href="/admin/login" className={styles.opcion}>
          ADMINISTRACIÓN
          <span className={styles.opcionSub}>Historial, personal y reportes</span>
        </Link>
      </div>
    </main>
  );
}
