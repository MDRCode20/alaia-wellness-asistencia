"use client";

import { useEffect, useState } from "react";
import styles from "./marcar.module.css";

type Persona = { id: string; nombre: string; tienePin: boolean };

export default function MarcacionPage() {
  const [personal, setPersonal] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [observacion, setObservacion] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [mostrarSolicitud, setMostrarSolicitud] = useState(false);
  const [solicitudFecha, setSolicitudFecha] = useState("");
  const [solicitudTipo, setSolicitudTipo] = useState<"permiso" | "falta">("permiso");
  const [solicitudMotivo, setSolicitudMotivo] = useState("");

  const [avisos, setAvisos] = useState<{ id: string; mensaje: string }[]>([]);

  useEffect(() => {
    cargarPersonal();
    fetch("/api/avisos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => data.ok && setAvisos(data.avisos));
  }, []);

  function cargarPersonal() {
    fetch("/api/personal", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPersonal(data.personal);
      });
  }

  const personaSeleccionada = personal.find((p) => p.id === personaId);

  function seleccionar(id: string) {
    setPersonaId(id);
    setPin("");
    setPinConfirmar("");
    setObservacion("");
    setMensaje(null);
    setMostrarSolicitud(false);
  }

  async function crearPin() {
    if (pin.length !== 4) {
      setMensaje("Tu PIN debe tener 4 dígitos.");
      return;
    }
    if (pin !== pinConfirmar) {
      setMensaje("Los dos PIN no coinciden.");
      return;
    }

    setCargando(true);
    setMensaje(null);

    const res = await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId, pin }),
    });
    const data = await res.json();
    setCargando(false);

    if (data.ok) {
      setMensaje("Tu PIN quedó creado. Ya puedes marcar tu asistencia.");
      setPinConfirmar("");
      setPersonal((prev) =>
        prev.map((p) => (p.id === personaId ? { ...p, tienePin: true } : p))
      );
    } else {
      setMensaje(data.mensaje);
    }
  }

  async function descargarMiReporte(periodo: "semana" | "mes", formato: "pdf" | "excel") {
    if (!personaId || pin.length !== 4) {
      setMensaje("Ingresa tu PIN antes de descargar tu reporte.");
      return;
    }

    const res = await fetch("/api/reportes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo: "personal", personaId, pin, periodo, formato }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setMensaje(data?.mensaje ?? "No se pudo generar tu reporte.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = formato === "pdf" ? "mi-reporte.pdf" : "mi-reporte.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function enviarSolicitud() {
    if (!personaId || pin.length !== 4) {
      setMensaje("Ingresa tu PIN para enviar la solicitud.");
      return;
    }
    if (!solicitudFecha || !solicitudMotivo) {
      setMensaje("Completa la fecha y el motivo de tu solicitud.");
      return;
    }

    setCargando(true);
    setMensaje(null);

    const res = await fetch("/api/solicitud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId,
        pin,
        fecha: solicitudFecha,
        tipo: solicitudTipo,
        motivo: solicitudMotivo,
      }),
    });
    const data = await res.json();
    setCargando(false);
    setMensaje(data.mensaje);

    if (data.ok) {
      setSolicitudFecha("");
      setSolicitudMotivo("");
      setMostrarSolicitud(false);
    }
  }

  function marcar(accion: "ENTRADA" | "SALIDA") {
    if (!personaId) {
      setMensaje("Selecciona tu nombre primero.");
      return;
    }
    if (pin.length !== 4) {
      setMensaje("Ingresa tu PIN de 4 dígitos.");
      return;
    }

    setCargando(true);
    setMensaje(null);

    // RF-04: solicitar ubicación solo durante el intento de marcación
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await fetch("/api/marcar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaId,
            accion,
            lat: latitude,
            lng: longitude,
            pin,
            observacion: observacion || undefined,
          }),
        });
        const data = await res.json();
        setMensaje(data.mensaje);
        setPin("");
        setObservacion("");
        setCargando(false);
      },
      () => {
        setMensaje("No se pudo obtener tu ubicación. Activa el GPS e intenta de nuevo.");
        setCargando(false);
      }
    );
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

        {avisos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {avisos.map((a) => (
              <p key={a.id} className={styles.message} style={{ marginTop: 8 }}>
                {a.mensaje}
              </p>
            ))}
          </div>
        )}

        <div className={styles.rule} />

        <p className={styles.sectionLabel}>MARCAR ASISTENCIA</p>
        <div className={styles.names} role="group" aria-label="Selecciona tu nombre">
          {personal.map((p) => (
            <button
              key={p.id}
              onClick={() => seleccionar(p.id)}
              aria-pressed={personaId === p.id}
              className={`${styles.nameRow} ${
                personaId === p.id ? styles.nameRowActive : ""
              }`}
            >
              {p.nombre}
              {personaId === p.id && <span className={styles.dot} />}
            </button>
          ))}
        </div>

        {personaId && !personaSeleccionada?.tienePin && (
          <div className={styles.pinWrap}>
            <p className={styles.sectionLabel}>PRIMERA VEZ · CREA TU PIN</p>
            <input
              className={styles.pinInput}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              aria-label="Nuevo PIN de 4 dígitos"
              style={{ marginBottom: 10 }}
            />
            <p className={styles.sectionLabel} style={{ marginTop: 4 }}>
              REPITE EL MISMO PIN
            </p>
            <input
              className={styles.pinInput}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirmar}
              onChange={(e) => setPinConfirmar(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              aria-label="Confirmar PIN de 4 dígitos"
            />
            <button
              onClick={crearPin}
              disabled={cargando}
              className={`${styles.actionTab} ${styles.actionTabActive}`}
              style={{ width: "100%", marginTop: 14 }}
            >
              GUARDAR PIN
            </button>
          </div>
        )}

        {personaId && personaSeleccionada?.tienePin && (
          <div className={styles.pinWrap}>
            <p className={styles.sectionLabel}>TU PIN</p>
            <input
              className={styles.pinInput}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              aria-label="PIN de 4 dígitos"
            />

            <p className={styles.sectionLabel} style={{ marginTop: 14 }}>
              OBSERVACIÓN (OPCIONAL)
            </p>
            <input
              className={styles.pinInput}
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: llegué tarde por tráfico"
              aria-label="Observación opcional"
              style={{ letterSpacing: "normal", fontSize: 14, textAlign: "left" }}
            />
          </div>
        )}

        {(!personaId || personaSeleccionada?.tienePin) && (
          <div className={styles.actions}>
            <button
              onClick={() => marcar("ENTRADA")}
              disabled={cargando}
              className={styles.actionTab}
            >
              ENTRADA
            </button>
            <button
              onClick={() => marcar("SALIDA")}
              disabled={cargando}
              className={styles.actionTab}
            >
              SALIDA
            </button>
          </div>
        )}

        {mensaje && <p className={styles.message}>{mensaje}</p>}

        {personaId && personaSeleccionada?.tienePin && (
          <>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <p className={styles.sectionLabel}>MI REPORTE</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button className={styles.nameRow} style={{ width: "auto", padding: "6px 12px" }} onClick={() => descargarMiReporte("semana", "pdf")}>
                  Semana (PDF)
                </button>
                <button className={styles.nameRow} style={{ width: "auto", padding: "6px 12px" }} onClick={() => descargarMiReporte("mes", "pdf")}>
                  Mes (PDF)
                </button>
                <button className={styles.nameRow} style={{ width: "auto", padding: "6px 12px" }} onClick={() => descargarMiReporte("mes", "excel")}>
                  Mes (Excel)
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                onClick={() => setMostrarSolicitud((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: "var(--color-gold-deep)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                ¿Necesitas pedir un permiso o reportar una falta?
              </button>

              {mostrarSolicitud && (
                <div style={{ marginTop: 14, textAlign: "left" }}>
                  <p className={styles.sectionLabel}>FECHA</p>
                  <input
                    className={styles.pinInput}
                    type="date"
                    value={solicitudFecha}
                    onChange={(e) => setSolicitudFecha(e.target.value)}
                    style={{ letterSpacing: "normal", fontSize: 14, textAlign: "left" }}
                  />

                  <p className={styles.sectionLabel} style={{ marginTop: 12 }}>TIPO</p>
                  <select
                    value={solicitudTipo}
                    onChange={(e) => setSolicitudTipo(e.target.value as "permiso" | "falta")}
                    className={styles.pinInput}
                    style={{ letterSpacing: "normal", fontSize: 14, textAlign: "left" }}
                  >
                    <option value="permiso">Permiso</option>
                    <option value="falta">Falta</option>
                  </select>

                  <p className={styles.sectionLabel} style={{ marginTop: 12 }}>MOTIVO</p>
                  <input
                    className={styles.pinInput}
                    type="text"
                    value={solicitudMotivo}
                    onChange={(e) => setSolicitudMotivo(e.target.value)}
                    placeholder="Cuéntanos brevemente por qué"
                    style={{ letterSpacing: "normal", fontSize: 14, textAlign: "left" }}
                  />

                  <button
                    onClick={enviarSolicitud}
                    disabled={cargando}
                    className={`${styles.actionTab} ${styles.actionTabActive}`}
                    style={{ width: "100%", marginTop: 14 }}
                  >
                    ENVIAR SOLICITUD
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
