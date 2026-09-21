"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearSupabaseNavegador } from "@/lib/supabaseBrowser";
import styles from "./login.module.css";

export default function LoginAdministracionPage() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = crearSupabaseNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    setCargando(false);

    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.mark}>
          <div className={styles.markLetter} aria-hidden="true">
            A
          </div>
          <p className={styles.subwordmark}>ALAIA&nbsp;&nbsp;WELLNESS&nbsp;&nbsp;CLUB</p>
        </div>
        <p className={styles.label}>ADMINISTRACIÓN</p>

        <div className={styles.rule} />

        <form onSubmit={iniciarSesion}>
          <p className={styles.fieldLabel}>CORREO</p>
          <input
            className={styles.input}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="username"
          />

          <p className={styles.fieldLabel}>CONTRASEÑA</p>
          <input
            className={styles.input}
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            autoComplete="current-password"
          />

          <button type="submit" disabled={cargando} className={styles.boton}>
            {cargando ? "INGRESANDO..." : "INGRESAR"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </main>
  );
}
