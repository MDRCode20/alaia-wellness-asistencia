import { crearSupabaseServidor } from "@/lib/supabaseServer";
import Link from "next/link";
import CerrarSesionBoton from "./CerrarSesionBoton";
import styles from "./dashboard.module.css";

// RF-12: inicio administrativo con un resumen del período.
// Por ahora es una base mínima; historial, personal, incidencias y reportes
// se construyen encima de esta misma pantalla en los siguientes pasos.
export default async function DashboardPage() {
  const supabase = crearSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.wordmark}>Alaia · Administración</p>
        <CerrarSesionBoton />
      </div>

      <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--color-ink-soft)", marginBottom: 24 }}>
        Sesión iniciada como {user?.email}
      </p>

      <div className={styles.grid}>
        <Link href="/admin/historial" className={styles.card} style={{ textDecoration: "none" }}>
          <p className={styles.cardTitle}>HISTORIAL</p>
          <p className={styles.cardBody}>Ver y filtrar</p>
        </Link>
        <div className={styles.card}>
          <p className={styles.cardTitle}>PERSONAL</p>
          <p className={styles.cardBody}>Próximamente</p>
        </div>
        <Link href="/admin/incidencias" className={styles.card} style={{ textDecoration: "none" }}>
          <p className={styles.cardTitle}>INCIDENCIAS</p>
          <p className={styles.cardBody}>Aprobar solicitudes</p>
        </Link>
        <div className={styles.card}>
          <p className={styles.cardTitle}>REPORTES</p>
          <p className={styles.cardBody}>Próximamente</p>
        </div>
      </div>
    </main>
  );
}
