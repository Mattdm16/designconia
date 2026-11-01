/**
 * DesignConia — ingesta local de PDFs como fuentes curriculares.
 *
 * Las funciones puras (validación, fechas, antigüedad, recortes) viven aquí y
 * se prueban aisladas. La extracción de texto usa pdfjs-dist solo en el
 * navegador; nunca se envía el binario a ningún servidor.
 */

export const PDF_MIME = "application/pdf";
export const LIMITE_PDF_BYTES = 10 * 1024 * 1024; // 10 MB por archivo
export const MAX_PDFS_POR_ENVIO = 3;
export const MAX_PAGINAS_PDF = 150;
export const MAX_CHARS_POR_PAGINA = 12_000;
export const MAX_CHARS_TEXTO_PDF = 120_000;
/** Antigüedad máxima de un PDF integrado, en años calendario. */
export const ANTIGUEDAD_MAX_ANIOS = 3;

/** Cabecera mágica de todo PDF válido: los primeros bytes son "%PDF". */
const FIRMA_PDF = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

export type MotivoRechazoPdf =
  | "no_pdf"
  | "demasiado_grande"
  | "demasiadas_paginas"
  | "sin_texto"
  | "antiguo"
  | "ilegible";

export type AdjuntoPdfValidado = {
  id: string;
  nombre: string;
  paginas: number;
  /** Año del documento (metadatos del PDF, lastModified o declarado). */
  anio: number | null;
  /** Texto extraído por página, ya recortado. */
  textoPorPagina: string[];
};

export function mensajeRechazoPdf(motivo: MotivoRechazoPdf, nombre: string): string {
  switch (motivo) {
    case "no_pdf":
      return `«${nombre}» no es un PDF válido. Solo se admiten archivos PDF.`;
    case "demasiado_grande":
      return `«${nombre}» supera los 10 MB. Divídelo o usa sus capítulos por separado.`;
    case "demasiadas_paginas":
      return `«${nombre}» supera las ${MAX_PAGINAS_PDF} páginas. Usa un capítulo o un extracto.`;
    case "sin_texto":
      return `«${nombre}» no contiene texto seleccionable (parece escaneado). Por ahora no hay OCR: si puedes, aporta la versión con texto.`;
    case "antiguo":
      return `«${nombre}» supera los ${ANTIGUEDAD_MAX_ANIOS} años de antigüedad. Solo se integran documentos recientes.`;
    case "ilegible":
      return `«${nombre}» no se pudo leer. Revisa que el archivo no esté dañado.`;
  }
}

/** ¿El nombre y el MIME declaran un PDF? (La firma se verifica con los bytes.) */
export function parecePdf(nombre: string, mime: string): boolean {
  return nombre.trim().toLowerCase().endsWith(".pdf") || mime === PDF_MIME;
}

/** ¿Los primeros bytes corresponden a la firma "%PDF"? */
export function tieneFirmaPdfprimeros(_bytes: Uint8Array): boolean {
  const bytes = _bytes;
  if (bytes.length < FIRMA_PDF.length) return false;
  return FIRMA_PDF.every((b, i) => bytes[i] === b);
}

/**
 * Año a partir de una fecha de metadatos PDF ("D:20231105120000Z", "2023-…",
 * "2023") o de un timestamp. Devuelve null si no se puede determinar.
 */
export function anioDeFechaPdf(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor) && valor > 0) {
    return new Date(valor).getUTCFullYear();
  }
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  // Formato propio de PDF: D:YYYYMMDDHHmmSSOHH'mm — basta el año.
  const m = /^D:(\d{4})/.exec(t);
  if (m) return Number(m[1]);
  const m2 = /^(\d{4})-\d{2}-\d{2}/.exec(t);
  if (m2) return Number(m2[1]);
  const m3 = /^(\d{4})$/.exec(t);
  if (m3) return Number(m3[1]);
  const n = Date.parse(t);
  if (!Number.isNaN(n)) return new Date(n).getUTCFullYear();
  return null;
}

/**
 * ¿El año cumple la antigüedad máxima respecto a `ahora` (inyectable en
 * pruebas)? Un año futuro cuenta como válido; sin año no se puede decidir.
 */
export function anioVigente(anio: number | null, ahora: Date = new Date()): boolean {
  if (anio === null) return false;
  return ahora.getUTCFullYear() - anio <= ANTIGUEDAD_MAX_ANIOS;
}

/** Recorta el texto de una página para no reventar el contexto del modelo. */
export function recortarPagina(texto: string): string {
  const limpio = texto.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return limpio.length > MAX_CHARS_POR_PAGINA ? limpio.slice(0, MAX_CHARS_POR_PAGINA) : limpio;
}

/** Recorta el conjunto de páginas al tope total de caracteres. */
export function recortarTextoPorPagina(paginas: string[]): string[] {
  const salida: string[] = [];
  let acumulado = 0;
  for (const p of paginas) {
    if (acumulado >= MAX_CHARS_TEXTO_PDF) break;
    const resto = MAX_CHARS_TEXTO_PDF - acumulado;
    const trozo = p.length > resto ? p.slice(0, resto) : p;
    salida.push(trozo);
    acumulado += trozo.length;
  }
  return salida;
}

/** ¿El PDF extraído trae algo aprovechable o viene vacío/escaneado? */
export function tieneTextoAprovechable(textoPorPagina: string[]): boolean {
  const letras = textoPorPagina.join("\n").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  return letras.length >= 50;
}

/**
 * Extrae el texto de un PDF en el navegador con pdfjs-dist.
 *
 * Import dinámico a propósito: pdfjs-dist solo existe en cliente y el worker
 * se sirve desde /pdf.worker.min.mjs (ver scripts/copy-pdf-worker.mjs).
 * Devuelve el texto por página y el año detectado en metadatos.
 */
export async function extraerTextoPdf(
  datos: Uint8Array,
  nombre: string
): Promise<{ textoPorPagina: string[]; anio: number | null; paginas: number }> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  const copia = new Uint8Array(datos);
  const doc = await pdfjs.getDocument({ data: copia, isEvalSupported: false }).promise;
  try {
    if (doc.numPages > MAX_PAGINAS_PDF) {
      const error: Error & { motivo?: MotivoRechazoPdf } = new Error("demasiadas_paginas");
      error.motivo = "demasiadas_paginas";
      throw error;
    }
    let anio: number | null = null;
    try {
      const meta = await doc.getMetadata();
      const info: Record<string, unknown> =
        meta && typeof meta === "object" && meta.info && typeof meta.info === "object"
          ? (meta.info as Record<string, unknown>)
          : {};
      anio =
        anioDeFechaPdf(info["CreationDate"]) ??
        anioDeFechaPdf(info["ModDate"]) ??
        anioDeFechaPdf(info["Creation"] ?? info["Mod"]);
    } catch {
      /* sin metadatos: el año lo aporta lastModified o el docente */
    }
    const textoPorPagina: string[] = [];
    const limite = Math.min(doc.numPages, MAX_PAGINAS_PDF);
    for (let n = 1; n <= limite; n++) {
      const pagina = await doc.getPage(n);
      const contenido = await pagina.getTextContent();
      const piezas = contenido.items.map((it) => textoDePieza(it)).join(" ");
      textoPorPagina.push(recortarPagina(piezas));
      pagina.cleanup();
    }
    return { textoPorPagina: recortarTextoPorPagina(textoPorPagina), anio, paginas: doc.numPages };
  } finally {
    await doc.destroy().catch(() => undefined);
  }
}

/** Texto de una pieza de pdf.js (TextItem trae `str`; lo demás se ignora). */
function textoDePieza(it: unknown): string {
  if (typeof it !== "object" || it === null) return "";
  const rec: Record<string, unknown> = it as Record<string, unknown>;
  return typeof rec["str"] === "string" ? (rec["str"] as string) : "";
}

/** Tope del texto guardado por fuente: protege el almacenamiento local. */
export const MAX_CHARS_TEXTO_FUENTE = 60_000;

export type DatosPdfParaFuente = {
  nombre: string;
  paginas: number;
  anio: number;
  textoPorPagina: string[];
};

/**
 * Construye la fuente curricular de un PDF validado. El año llega resuelto
 * (metadatos o declarado por el docente); sin año no se integra. Rechaza lo
 * que supere la antigüedad máxima.
 */
export function construirFuentePdf(
  datos: DatosPdfParaFuente,
  ahora: Date = new Date()
): { ok: true; fuente: { id: string; titulo: string; tipo: "otro"; anio: number; nombreArchivo: string; textoExtraido: string; paginas: number } } | { ok: false; motivo: "antiguo" } {
  if (!anioVigente(datos.anio, ahora)) return { ok: false, motivo: "antiguo" };
  const base = datos.nombre.trim().replace(/\.pdf$/i, "").trim() || "Documento PDF";
  const texto = recortarTextoPorPagina(datos.textoPorPagina).join("\n\n").slice(0, MAX_CHARS_TEXTO_FUENTE);
  return {
    ok: true,
    fuente: {
      id: `fuente_${idAdjunto(datos.nombre, texto.length)}`,
      titulo: base.slice(0, 120),
      tipo: "otro",
      anio: datos.anio,
      nombreArchivo: datos.nombre,
      textoExtraido: texto,
      paginas: datos.paginas
    }
  };
}

/**
 * Elige las páginas más relevantes para una petición (solape de palabras
 * significativas) y las devuelve como "(p. N) extracto", ya acotadas.
 */
export function extractosRelevantes(
  textoPorPagina: string[],
  mensaje: string,
  maxPaginas = 3,
  maxChars = 1500
): string[] {
  const palabras = mensaje
    .toLowerCase()
    .split(/[^a-záéíóúüñ]+/i)
    .filter((w) => w.length >= 4);
  const unicas = palabras.filter((w, i) => palabras.indexOf(w) === i).slice(0, 40);
  const puntuadas = textoPorPagina.map((texto, i) => {
    const bajo = texto.toLowerCase();
    let puntos = 0;
    for (const w of unicas) if (bajo.includes(w)) puntos++;
    return { i, puntos };
  });
  const elegidas = puntuadas
    .filter((p) => p.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, maxPaginas)
    .sort((a, b) => a.i - b.i);
  const respaldo = elegidas.length > 0 ? elegidas : textoPorPagina.slice(0, 1).map((_, i) => ({ i, puntos: 0 }));
  const salida: string[] = [];
  let acumulado = 0;
  for (const { i } of respaldo) {
    if (acumulado >= maxChars * maxPaginas) break;
    const trozo = textoPorPagina[i].slice(0, maxChars);
    salida.push(`(p. ${i + 1}) ${trozo}`);
    acumulado += trozo.length;
  }
  return salida;
}

/** Id estable para un adjunto a partir de nombre + tamaño. */
export function idAdjunto(nombre: string, tamano: number): string {
  let hash = 0x811c9dc5;
  const semilla = `${nombre.trim().toLowerCase()}::${tamano}`;
  for (let i = 0; i < semilla.length; i++) hash = Math.imul(hash ^ semilla.charCodeAt(i), 0x01000193);
  return `pdf_${(hash >>> 0).toString(36)}`;
}
