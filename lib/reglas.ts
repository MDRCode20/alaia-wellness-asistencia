import { createHash } from "crypto";

// Reglas de negocio del sistema de asistencia (ver ERS sección 3.2)

/**
 * Cifra un PIN de 4 dígitos antes de guardarlo o compararlo.
 * El PIN nunca se almacena ni se compara en texto plano (RNF de seguridad).
 */
export function hashPin(pin: string): string {
  const pepper = process.env.PIN_PEPPER ?? "alaia-default-pepper";
  return createHash("sha256").update(`${pepper}:${pin}`).digest("hex");
}

const ENTRADA_BASE_HORA = 10; // 10:00 a.m.
const SALIDA_BASE_HORA = 20; // 8:00 p.m.

/**
 * Calcula la distancia en metros entre dos coordenadas (fórmula de Haversine).
 * Se usa para validar la geocerca (RF-05).
 */
export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // radio de la Tierra en metros
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estaDentroDeLaZona(
  lat: number,
  lng: number,
  radioMetros: number
): boolean {
  const estLat = Number(process.env.ESTABLISHMENT_LAT);
  const estLng = Number(process.env.ESTABLISHMENT_LNG);
  const distancia = distanciaMetros(lat, lng, estLat, estLng);
  return distancia <= radioMetros;
}

/**
 * Calcula tardanza (minutos) según la hora de entrada real, comparada
 * contra la hora base de entrada (10:00 a.m.). Ver tabla de reglas del ERS.
 */
export function calcularTardanza(horaEntrada: Date): number {
  const base = new Date(horaEntrada);
  base.setHours(ENTRADA_BASE_HORA, 0, 0, 0);
  const diffMin = Math.round((horaEntrada.getTime() - base.getTime()) / 60000);
  return diffMin > 0 ? diffMin : 0;
}

/** Minutos a favor si la entrada fue antes de las 10:00 a.m. */
export function calcularTiempoAFavorEntrada(horaEntrada: Date): number {
  const base = new Date(horaEntrada);
  base.setHours(ENTRADA_BASE_HORA, 0, 0, 0);
  const diffMin = Math.round((base.getTime() - horaEntrada.getTime()) / 60000);
  return diffMin > 0 ? diffMin : 0;
}

/** Tiempo adicional (minutos) si la salida fue después de las 8:00 p.m. */
export function calcularTiempoAdicional(horaSalida: Date): number {
  const base = new Date(horaSalida);
  base.setHours(SALIDA_BASE_HORA, 0, 0, 0);
  const diffMin = Math.round((horaSalida.getTime() - base.getTime()) / 60000);
  return diffMin > 0 ? diffMin : 0;
}

/** Salida anticipada (minutos) si la salida fue antes de las 8:00 p.m. */
export function calcularSalidaAnticipada(horaSalida: Date): number {
  const base = new Date(horaSalida);
  base.setHours(SALIDA_BASE_HORA, 0, 0, 0);
  const diffMin = Math.round((base.getTime() - horaSalida.getTime()) / 60000);
  return diffMin > 0 ? diffMin : 0;
}

/**
 * Saldo diario = tiempo a favor - tiempo adeudado.
 * No compensa automáticamente tardanza con tiempo adicional;
 * esa política queda pendiente de definición por Administración (ver ERS sección 8).
 */
export function calcularSaldo(params: {
  tiempoAFavorEntrada: number;
  tardanza: number;
  tiempoAdicional: number;
  salidaAnticipada: number;
}): number {
  const favor = params.tiempoAFavorEntrada + params.tiempoAdicional;
  const adeudado = params.tardanza + params.salidaAnticipada;
  return favor - adeudado;
}

/**
 * Calcula el rango de fechas (YYYY-MM-DD) para un reporte, según el período
 * pedido. "personalizado" usa las fechas que venían en la petición, ya
 * validadas como strings de fecha (nunca se concatenan en una consulta SQL).
 */
export function calcularRangoReporte(
  periodo: "semana" | "mes" | "personalizado",
  desde?: string,
  hasta?: string
): { desde: string; hasta: string } {
  const hoy = new Date();

  if (periodo === "personalizado") {
    if (!desde || !hasta || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      throw new Error("Rango de fechas personalizado inválido.");
    }
    return { desde, hasta };
  }

  if (periodo === "mes") {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return { desde: formatearFecha(inicio), hasta: formatearFecha(fin) };
  }

  // "semana": lunes a domingo de la semana actual
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay(); // 1 (lunes) a 7 (domingo)
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (diaSemana - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { desde: formatearFecha(lunes), hasta: formatearFecha(domingo) };
}

function formatearFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
