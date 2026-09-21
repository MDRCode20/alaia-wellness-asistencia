"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../historial/historial.module.css";

type Solicitud = {
  id: string;
  fecha: string;
  tipo: string;
  motivo: string | null;
  estado: string;
  personal: { nombre: string } | null;
};

export default function IncidenciasPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [realizadoPor, setRealizadoPor] = useState("Encargada del área");

  useEffect(() => {
    cargar();
  }, []);

  function cargar() {
    fetch("/api/admin/solicitudes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => data.ok && setSolicitudes(data.solicitudes));
  }

  async function resolver(id: string, estado: "aprobado" | "rechazado") {
    const res = await fetch(`/api/admin/solicitudes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, realizadoPor }),
    });
    const data = await res.json();
    if (data.ok) {
      cargar();
    } else {
      setMensaje(data.mensaje);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.wordmark}>Incidencias</p>
        <Link href="/admin/dashboard" className={styles.volver}>
          ← Volver al panel
        </Link>
      </div>

      <div className={styles.campo} style={{ marginBottom: 20 }}>
        <label>RESPONDER COMO</label>
        <select value={realizadoPor} onChange={(e) => setRealizadoPor(e.target.value)}>
          <option value="Encargada del área">Encargada del área</option>
          <option value="Jefa general">Jefa general</option>
        </select>
      </div>

      {solicitudes.length === 0 && (
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--color-ink-soft)" }}>
          No hay solicitudes pendientes.
        </p>
      )}

      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Persona</th>
            <th>Tipo</th>
            <th>Motivo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id}>
              <td>{s.fecha}</td>
              <td>{s.personal?.nombre ?? "—"}</td>
              <td>{s.tipo}</td>
              <td>{s.motivo}</td>
              <td style={{ display: "flex", gap: 10 }}>
                <button className={styles.editar} onClick={() => resolver(s.id, "aprobado")}>
                  Aprobar
                </button>
                <button className={styles.editar} onClick={() => resolver(s.id, "rechazado")}>
                  Rechazar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mensaje && <p style={{ marginTop: 16 }}>{mensaje}</p>}
    </main>
  );
}
