import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export type FilaReporte = {
  fecha: string;
  nombre: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  tardanza_minutos: number;
  tiempo_adicional_minutos: number;
  tipo: string;
  motivo: string | null;
  saldo_minutos: number;
};

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function resumenPorPersona(filas: FilaReporte[]) {
  const resumen = new Map<
    string,
    { tardanza: number; adicional: number; saldo: number; permisos: number; faltas: number }
  >();

  for (const fila of filas) {
    const actual = resumen.get(fila.nombre) ?? {
      tardanza: 0,
      adicional: 0,
      saldo: 0,
      permisos: 0,
      faltas: 0,
    };
    actual.tardanza += fila.tardanza_minutos;
    actual.adicional += fila.tiempo_adicional_minutos;
    actual.saldo += fila.saldo_minutos;
    if (fila.tipo === "permiso") actual.permisos += 1;
    if (fila.tipo === "falta") actual.faltas += 1;
    resumen.set(fila.nombre, actual);
  }

  return resumen;
}

export async function generarExcelReporte(
  filas: FilaReporte[],
  titulo: string
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Asistencia");

  hoja.addRow([titulo]);
  hoja.mergeCells("A1:H1");
  hoja.getRow(1).font = { bold: true, size: 14 };
  hoja.addRow([]);

  const encabezado = hoja.addRow([
    "Fecha",
    "Persona",
    "Entrada",
    "Salida",
    "Tardanza (min)",
    "Adicional (min)",
    "Permiso/Falta",
    "Saldo (min)",
  ]);
  encabezado.font = { bold: true };

  for (const fila of filas) {
    hoja.addRow([
      fila.fecha,
      fila.nombre,
      formatearHora(fila.hora_entrada),
      formatearHora(fila.hora_salida),
      fila.tardanza_minutos,
      fila.tiempo_adicional_minutos,
      fila.tipo === "normal" ? "—" : `${fila.tipo}${fila.motivo ? `: ${fila.motivo}` : ""}`,
      fila.saldo_minutos,
    ]);
  }

  hoja.addRow([]);
  hoja.addRow(["Resumen por persona"]).font = { bold: true };
  hoja.addRow(["Persona", "Tardanza total", "Adicional total", "Permisos", "Faltas", "Saldo total"]);

  const resumen = resumenPorPersona(filas);
  for (const [nombre, r] of resumen) {
    hoja.addRow([nombre, r.tardanza, r.adicional, r.permisos, r.faltas, r.saldo]);
  }

  hoja.columns.forEach((columna) => (columna.width = 16));

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generarPdfReporte(filas: FilaReporte[], titulo: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(titulo, { align: "center" });
    doc.moveDown(1.5);

    const colX = [40, 100, 180, 230, 280, 340, 400, 480];
    const encabezados = ["Fecha", "Persona", "Entrada", "Salida", "Tard.", "Adic.", "Tipo", "Saldo"];

    doc.fontSize(9).font("Helvetica-Bold");
    encabezados.forEach((texto, i) => doc.text(texto, colX[i], doc.y, { continued: i < encabezados.length - 1 }));
    doc.moveDown(0.5);
    doc.font("Helvetica");

    for (const fila of filas) {
      const y = doc.y;
      doc.text(fila.fecha, colX[0], y, { width: 55 });
      doc.text(fila.nombre, colX[1], y, { width: 75 });
      doc.text(formatearHora(fila.hora_entrada), colX[2], y, { width: 45 });
      doc.text(formatearHora(fila.hora_salida), colX[3], y, { width: 45 });
      doc.text(String(fila.tardanza_minutos), colX[4], y, { width: 50 });
      doc.text(String(fila.tiempo_adicional_minutos), colX[5], y, { width: 55 });
      doc.text(fila.tipo === "normal" ? "—" : fila.tipo, colX[6], y, { width: 70 });
      doc.text(String(fila.saldo_minutos), colX[7], y, { width: 50 });
      doc.moveDown(0.6);
      if (doc.y > 760) doc.addPage();
    }

    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(11).text("Resumen por persona");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(9);

    const resumen = resumenPorPersona(filas);
    for (const [nombre, r] of resumen) {
      doc.text(
        `${nombre} — Tardanza: ${r.tardanza} min · Adicional: ${r.adicional} min · Permisos: ${r.permisos} · Faltas: ${r.faltas} · Saldo: ${r.saldo} min`
      );
    }

    doc.end();
  });
}
