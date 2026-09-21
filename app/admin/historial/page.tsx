"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./historial.module.css";

type Registro = {
  id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  tardanza_minutos: number;
  tiempo_adicional_minutos: number;
  saldo_minutos: number;
  tipo: string;
  motivo: string | null;
  observacion: string | null;
  persona_id: string;
  personal: { nombre: string } | null;
};

type Persona = { id: string; nombre: string; activo: boolean };

export default function HistorialPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [personal, setPersonal] = useState<Persona[]>([]);
  const [filtroPersona, setFiltroPersona] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [editando, setEditando] = useState<Registro | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/personal", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => data.ok && setPersonal(data.personal));
    cargarHistorial();
  }, []);

  function cargarHistorial() {
    const params = new URLSearchParams();
    if (filtroPersona) params.set("personaId", filtroPersona);
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroDesde) params.set("desde", filtroDesde);
    if (filtroHasta) params.set("hasta", filtroHasta);

    fetch(`/api/admin/historial?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => data.ok && setRegistros(data.registros));
  }

  function formatearHora(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  }

  async function guardarEdicion(realizadoPor: string, tipo: string, motivo: string, observacion: string) {
    if (!editando) return;
    setCargando(true);
    const res = await fetch(`/api/admin/asistencia/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ realizadoPor, tipo, motivo, observacion }),
    });
    const data = await res.json();
    setCargando(false);
    if (data.ok) {
      setEditando(null);
      cargarHistorial();
    } else {
      setMensaje(data.mensaje);
    }
  }

  async function exportar(formato: "pdf" | "excel") {
    const res = await fetch("/api/reportes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modo: "admin",
        formato,
        periodo: filtroDesde && filtroHasta ? "personalizado" : "mes",
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        personaId: filtroPersona || undefined,
      }),
    });

    if (!res.ok) {
      setMensaje("No se pudo generar el reporte.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = formato === "pdf" ? "reporte.pdf" : "reporte.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.wordmark}>Historial</p>
        <Link href="/admin/dashboard" className={styles.volver}>
          ← Volver al panel
        </Link>
      </div>

      <div className={styles.filtros}>
        <div className={styles.campo}>
          <label>PERSONA</label>
          <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)}>
            <option value="">Todas</option>
            {personal.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label>TIPO</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="normal">Normal</option>
            <option value="permiso">Permiso</option>
            <option value="falta">Falta</option>
            <option value="incidencia">Incidencia</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label>DESDE</label>
          <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        </div>
        <div className={styles.campo}>
          <label>HASTA</label>
          <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
        </div>
        <button className={styles.botonExportar} onClick={cargarHistorial}>
          FILTRAR
        </button>
        <button className={styles.botonExportar} onClick={() => exportar("excel")}>
          EXCEL
        </button>
        <button className={styles.botonExportar} onClick={() => exportar("pdf")}>
          PDF
        </button>
      </div>

      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Persona</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Tardanza</th>
            <th>Adicional</th>
            <th>Tipo</th>
            <th>Saldo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id}>
              <td>{r.fecha}</td>
              <td>{r.personal?.nombre ?? "—"}</td>
              <td>{formatearHora(r.hora_entrada)}</td>
              <td>{formatearHora(r.hora_salida)}</td>
              <td>{r.tardanza_minutos} min</td>
              <td>{r.tiempo_adicional_minutos} min</td>
              <td>{r.tipo}</td>
              <td>{r.saldo_minutos} min</td>
              <td>
                <button className={styles.editar} onClick={() => setEditando(r)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mensaje && <p style={{ marginTop: 16 }}>{mensaje}</p>}

      {editando && (
        <ModalEdicion
          registro={editando}
          cargando={cargando}
          onCancelar={() => setEditando(null)}
          onGuardar={guardarEdicion}
        />
      )}
    </main>
  );
}

function ModalEdicion({
  registro,
  cargando,
  onCancelar,
  onGuardar,
}: {
  registro: Registro;
  cargando: boolean;
  onCancelar: () => void;
  onGuardar: (realizadoPor: string, tipo: string, motivo: string, observacion: string) => void;
}) {
  const [tipo, setTipo] = useState(registro.tipo);
  const [motivo, setMotivo] = useState(registro.motivo ?? "");
  const [observacion, setObservacion] = useState(registro.observacion ?? "");
  const [realizadoPor, setRealizadoPor] = useState("Encargada del área");

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Corregir registro — {registro.personal?.nombre}</h3>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-ink-soft)" }}>
          La hora y la ubicación originales no se pueden modificar.
        </p>

        <label>TIPO</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="normal">Normal</option>
          <option value="permiso">Permiso</option>
          <option value="falta">Falta</option>
          <option value="incidencia">Incidencia</option>
        </select>

        <label>MOTIVO</label>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />

        <label>OBSERVACIÓN</label>
        <textarea rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} />

        <label>REALIZADO POR</label>
        <select value={realizadoPor} onChange={(e) => setRealizadoPor(e.target.value)}>
          <option value="Encargada del área">Encargada del área</option>
          <option value="Jefa general">Jefa general</option>
        </select>

        <div className={styles.modalAcciones}>
          <button className={styles.cancelar} onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className={styles.guardar}
            disabled={cargando}
            onClick={() => onGuardar(realizadoPor, tipo, motivo, observacion)}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
