/**
 * Generador de PDF mínimo para texto plano. Sin dependencias.
 *
 * Por qué a mano: este entorno no permite descargar paquetes, y lo único que
 * hace falta es un documento legible de texto corrido. Un PDF 1.4 con
 * Helvetica y codificación WinAnsi cubre acentos y ñ sin incrustar fuentes.
 *
 * El emisor está separado del contenido a propósito: el día que se pueda
 * instalar una librería decente, se cambia este archivo y `exportarTexto.ts`
 * queda intacto.
 */

/** Ancho de página Letter en puntos. */
const ANCHO = 612;
const ALTO = 792;
const MARGEN = 56;
const TAMANO = 10.5;
/** Interlineado en puntos. */
const INTERLINEADO = 14;
/** Caracteres por línea: 0.52 em de ancho medio para Helvetica. */
const MAX_CARACTERES = Math.floor((ANCHO - MARGEN * 2) / (TAMANO * 0.52));
const LINEAS_POR_PAGINA = Math.floor((ALTO - MARGEN * 2) / INTERLINEADO);

/**
 * Caracteres que WinAnsi no tiene. Se sustituyen por equivalentes ASCII:
 * un guion largo vale menos que un PDF que no abre.
 */
const SUSTITUCIONES: Record<string, string> = {
  "—": "-",
  "–": "-",
  "•": "-",
  "·": "-",
  "…": "...",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "→": "->",
  "←": "<-",
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "×": "x",
  "\t": "    ",
  "\u00a0": " "
};

/**
 * Deja el texto en Latin-1 imprimible, que es lo que entiende WinAnsi en el
 * rango que usamos (á é í ó ú ñ ü ¿ ¡ ç y todo el ASCII).
 */
export function aWinAnsi(texto: string): string {
  let salida = "";
  for (const ch of texto) {
    const code = ch.codePointAt(0) ?? 63;
    if (code === 10 || code === 13) {
      salida += ch;
      continue;
    }
    if (code >= 32 && code <= 126) {
      salida += ch;
      continue;
    }
    const sust = SUSTITUCIONES[ch];
    if (sust !== undefined) {
      salida += sust;
      continue;
    }
    // Latin-1 imprimible (á, é, ñ, ¿, ¡…), salvo el rango de control 0x80-0x9F
    // que en WinAnsi tiene otros glifos.
    if (code >= 160 && code <= 255) {
      salida += ch;
      continue;
    }
    salida += "?";
  }
  return salida;
}

/** Escapa lo que rompería una cadena literal de PDF. */
function escaparPDF(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

type Linea = { texto: string; negrita: boolean };

/** ¿Esta línea es un encabezado que conviene destacar? */
function esTitulo(t: string, indice: number): boolean {
  if (indice === 0) return true;
  if (/^\d+\.\s+\S/.test(t)) return true; // "1. DATOS DE IDENTIFICACIÓN"
  if (/^(Unidad|Sesión)\s+\d/.test(t)) return true;
  if (/^(Generales|Específicas|Obligatorias|Complementarias|Recursos y herramientas):$/.test(t)) return true;
  return false;
}

/** Parte un texto en líneas de como máximo `max` caracteres, por palabras. */
export function envolver(texto: string, max = MAX_CARACTERES): string[] {
  const limpio = texto.replace(/\s+$/g, "");
  // La sangría se conserva: al partir por palabras se perdía y los ítems
  // anidados acababan al ras del margen.
  const sangria = (limpio.match(/^\s*/) ?? [""])[0];
  const cuerpo = limpio.slice(sangria.length);
  const disponible = Math.max(12, max - sangria.length);

  if (cuerpo.length <= disponible) return [sangria + cuerpo];

  const lineas: string[] = [];
  let actual = "";

  for (const palabra of cuerpo.split(/\s+/)) {
    if (!palabra) continue;
    if (!actual) {
      // Una palabra sola más larga que la línea se corta por fuerza.
      let resto = palabra;
      while (resto.length > disponible) {
        lineas.push(sangria + resto.slice(0, disponible));
        resto = resto.slice(disponible);
      }
      actual = resto;
      continue;
    }
    if ((actual + " " + palabra).length <= disponible) {
      actual += " " + palabra;
    } else {
      lineas.push(sangria + actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(sangria + actual);
  return lineas;
}

/** Convierte el texto plano en líneas del PDF, respetando los saltos. */
export function construirLineas(texto: string): Linea[] {
  const salida: Linea[] = [];
  const crudas = aWinAnsi(texto).split(/\r?\n/);

  crudas.forEach((cruda, indice) => {
    const negrita = esTitulo(cruda, indice);
    if (!cruda.trim()) {
      salida.push({ texto: "", negrita: false });
      return;
    }
    for (const trozo of envolver(cruda)) salida.push({ texto: trozo, negrita });
  });

  return salida;
}

/**
 * Construye el PDF. Todo se arma como cadena Latin-1, de modo que el largo de
 * la cadena es el offset en bytes que necesita la tabla xref.
 */
export function textoAPdf(texto: string): Uint8Array {
  const lineas = construirLineas(texto);

  const paginas: Linea[][] = [];
  let i = 0;
  while (i < lineas.length) {
    let fin = Math.min(i + LINEAS_POR_PAGINA, lineas.length);
    // Un encabezado al pie de página queda huérfano de su contenido: se pasa
    // a la página siguiente con lo que le siga.
    while (fin < lineas.length && fin > i + 1 && lineas[fin - 1].negrita) fin--;
    paginas.push(lineas.slice(i, fin));
    i = fin;
  }
  if (paginas.length === 0) paginas.push([]);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  const objeto = (cuerpo: string) => {
    const numero = offsets.length + 1;
    offsets.push(pdf.length);
    pdf += `${numero} 0 obj\n${cuerpo}\nendobj\n`;
  };

  // 1: catálogo, 2: árbol de páginas, 3-4: fuentes
  objeto("<< /Type /Catalog /Pages 2 0 R >>");

  const idsPaginas = paginas.map((_, i) => 5 + i * 2);
  objeto(
    `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginas.length} >>`
  );
  objeto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objeto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  paginas.forEach((lineasPagina, indice) => {
    const idPagina = idsPaginas[indice];
    const idContenido = idPagina + 1;

    const contenido: string[] = [];
    contenido.push("BT");
    let y = ALTO - MARGEN;
    for (const linea of lineasPagina) {
      if (linea.texto) {
        const fuente = linea.negrita ? "/F2" : "/F1";
        contenido.push(`${fuente} ${TAMANO} Tf 1 0 0 1 ${MARGEN} ${y} Tm (${escaparPDF(linea.texto)}) Tj`);
      }
      y -= INTERLINEADO;
    }
    contenido.push("ET");
    const flujo = contenido.join("\n");

    // La página se declara antes que su contenido, pero el contenido tiene que
    // estar numerado justo después: por eso se reserva el número del flujo.
    objeto(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idContenido} 0 R >>`
    );
    objeto(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
  });

  const inicioXref = pdf.length;
  const total = offsets.length + 1;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

/** Nombre de archivo sugerido a partir del folio. */
export function nombreArchivo(folio: string, extension: string): string {
  const base = (folio || "microcurriculo").replace(/[^\w-]+/g, "-");
  return `${base}.${extension}`;
}
