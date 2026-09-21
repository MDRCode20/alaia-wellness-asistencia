"use client";

import { useRouter } from "next/navigation";
import { crearSupabaseNavegador } from "@/lib/supabaseBrowser";
import styles from "./dashboard.module.css";

export default function CerrarSesionBoton() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = crearSupabaseNavegador();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={cerrarSesion} className={styles.salir}>
      Cerrar sesión
    </button>
  );
}
