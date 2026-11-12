/**
 * DesignConia — PDF fiel al diseño (Fase 2).
 *
 * Renderiza un DisenoDocumento a PDF vectorial sin dependencias: texto real
 * (seleccionable), tamaños, negritas, colores, alineación, Carta/A4 vertical
 * u horizontal, encabezado/pie con numeración e imágenes JPEG incrustadas.
 *
 * Las imágenes llegan ya rasterizadas (ver `rasterizarImagen`): el núcleo no
 * toca el DOM y se puede testear en Node.
 */

import { aWinAnsi } from "./exportarPdf.ts";
import {
  DIMENSIONES_PAGINA,
  resolverTextoBloque,
  type AlineacionTexto,
  type DatosDiseno,
  type DisenoDocumento,
  type EstiloBloque,
  type FuenteDiseno,
  type PlantillaDiseno,
  type TipoBloque
} from "./diseno.ts";

/* ------------------------------------------------------------------ */
/* Estilos resueltos                                                   */
/* ------------------------------------------------------------------ */

export type EstiloResuelto = {
  fuente: FuenteDiseno;
  tamanoPt: number;
  negrita: boolean;
  cursiva: boolean;
  color: [number, number, number];
  alineacion: AlineacionTexto;
  espacioAntesPt: number;
  espacioDespuesPt: number;
  interlineado: number;
};

const ESTILO_BASE: EstiloResuelto = {
  fuente: "sans",
  tamanoPt: 11,
  negrita: false,
  cursiva: false,
  color: [0, 0, 0],
  alineacion: "izquierda",
  espacioAntesPt: 0,
  espacioDespuesPt: 6,
  interlineado: 1.35
};

/** `#rrggbb` a tripleta 0–1. Formatos inválidos dan negro. */
export function hexARgb(hex: string | undefined): [number, number, number] {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0];
  const n = parseInt(hex.slice(1), 16);
  const redondear = (v: number) => Math.round((v / 255) * 1000) / 1000;
  return [redondear((n >> 16) & 255), redondear((n >> 8) & 255), redondear(n & 255)];
}

/** Fusiona estilo de plantilla + override del bloque + color primario en títulos. */
export function resolverEstilo(
  tipo: TipoBloque,
  plantilla: PlantillaDiseno,
  override?: EstiloBloque
): EstiloResuelto {
  const base = plantilla.estilos[tipo] ?? {};
  const colorHex =
    override?.color ?? base.color ?? (tipo === "titulo" ? plantilla.colorPrimario : undefined);
  return {
    ...ESTILO_BASE,
    fuente: override?.fuente ?? base.fuente ?? ESTILO_BASE.fuente,
    tamanoPt: override?.tamanoPt ?? base.tamanoPt ?? ESTILO_BASE.tamanoPt,
    negrita: override?.negrita ?? base.negrita ?? false,
    cursiva: override?.cursiva ?? base.cursiva ?? false,
    color: hexARgb(colorHex),
    alineacion: override?.alineacion ?? base.alineacion ?? ESTILO_BASE.alineacion,
    espacioAntesPt: override?.espacioAntesPt ?? base.espacioAntesPt ?? ESTILO_BASE.espacioAntesPt,
    espacioDespuesPt: override?.espacioDespuesPt ?? base.espacioDespuesPt ?? ESTILO_BASE.espacioDespuesPt,
    interlineado: override?.interlineado ?? base.interlineado ?? ESTILO_BASE.interlineado
  };
}

/** Nombre de fuente base-14 según familia y variantes. */
export function fuentePara(fuente: FuenteDiseno, negrita: boolean, cursiva: boolean): string {
  if (fuente === "mono") {
    if (negrita && cursiva) return "Courier-BoldOblique";
    if (negrita) return "Courier-Bold";
    if (cursiva) return "Courier-Oblique";
    return "Courier";
  }
  if (fuente === "serif") {
    if (negrita && cursiva) return "Times-BoldItalic";
    if (negrita) return "Times-Bold";
    if (cursiva) return "Times-Italic";
    return "Times-Roman";
  }
  if (negrita && cursiva) return "Helvetica-BoldOblique";
  if (negrita) return "Helvetica-Bold";
  if (cursiva) return "Helvetica-Oblique";
  return "Helvetica";
}

/** Ancho medio relativo por familia (para envolver sin métricas reales). */
function factorAncho(fuente: FuenteDiseno, negrita: boolean): number {
  if (fuente === "mono") return 0.6;
  const base = fuente === "serif" ? 0.48 : 0.5;
  return negrita ? base + 0.04 : base;
}

/* ------------------------------------------------------------------ */
/* Elementos de flujo                                                  */
/* ------------------------------------------------------------------ */

export type ElementoPdf =
  | { kind: "texto"; texto: string; estilo: EstiloResuelto }
  | { kind: "lista"; items: { texto: string; estilo: EstiloResuelto }[] }
  | { kind: "imagen"; imagenId: string; estilo: EstiloResuelto }
  | { kind: "regla"; estilo: EstiloResuelto }
  | { kind: "espacio"; altoPt: number }
  | { kind: "salto" };

/**
 * Convierte los bloques visibles en elementos de flujo con estilos
 * resueltos. Los párrafos con saltos de línea se parten en elementos de
 * texto independientes para que la paginación los trate por separado.
 */
export function bloquesAElementos(
  diseno: DisenoDocumento,
  plantilla: PlantillaDiseno,
  datos: DatosDiseno
): ElementoPdf[] {
  const salida: ElementoPdf[] = [];
  for (const b of diseno.bloques) {
    if (!b.visible) continue;
    const estilo = resolverEstilo(b.tipo, plantilla, b.estilo);
    switch (b.tipo) {
      case "salto":
        salida.push({ kind: "salto" });
        break;
      case "espacio":
        salida.push({ kind: "espacio", altoPt: 12 });
        break;
      case "regla":
        salida.push({ kind: "regla", estilo });
        break;
      case "imagen":
        if (b.activoId) salida.push({ kind: "imagen", imagenId: b.activoId, estilo });
        break;
      case "lista":
      case "tabla": {
        const lineas = resolverTextoBloque(b, datos);
        if (lineas.length === 0) break;
        salida.push({
          kind: "lista",
          items: lineas.map((texto) => ({ texto, estilo }))
        });
        break;
      }
      default: {
        const lineas = resolverTextoBloque(b, datos);
        for (const texto of lineas) {
          if (texto) salida.push({ kind: "texto", texto, estilo });
        }
        break;
      }
    }
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Paginación                                                          */
/* ------------------------------------------------------------------ */

export type GeometriaPagina = {
  ancho: number;
  alto: number;
  margenIzq: number;
  margenDer: number;
  margenSup: number;
  margenInf: number;
};

export const MM_A_PT = 72 / 25.4;

export function geometriaPagina(diseno: DisenoDocumento): GeometriaPagina {
  const base = DIMENSIONES_PAGINA[diseno.pagina.tamano];
  const apaisado = diseno.pagina.orientacion === "horizontal";
  const ancho = apaisado ? base.alto : base.ancho;
  const alto = apaisado ? base.ancho : base.alto;
  return {
    ancho,
    alto,
    margenIzq: diseno.pagina.margenesMm.izq * MM_A_PT,
    margenDer: diseno.pagina.margenesMm.der * MM_A_PT,
    margenSup: diseno.pagina.margenesMm.arriba * MM_A_PT,
    margenInf: diseno.pagina.margenesMm.abajo * MM_A_PT
  };
}

/** Parte un texto en líneas que caben en `anchoPt`. */
export function envolverLinea(
  texto: string,
  anchoPt: number,
  tamanoPt: number,
  fuente: FuenteDiseno,
  negrita: boolean
): string[] {
  const maxChars = Math.max(12, Math.floor(anchoPt / (tamanoPt * factorAncho(fuente, negrita))));
  const salida: string[] = [];
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trimEnd();
    if (!linea.trim()) {
      salida.push("");
      continue;
    }
    if (linea.length <= maxChars) {
      salida.push(linea);
      continue;
    }
    let actual = "";
    for (const palabra of linea.split(/\s+/)) {
      if (!palabra) continue;
      if (!actual) {
        let resto = palabra;
        while (resto.length > maxChars) {
          salida.push(resto.slice(0, maxChars));
          resto = resto.slice(maxChars);
        }
        actual = resto;
        continue;
      }
      if ((actual + " " + palabra).length <= maxChars) actual += " " + palabra;
      else {
        salida.push(actual);
        actual = palabra;
      }
    }
    if (actual) salida.push(actual);
  }
  return salida;
}

export type LineaPaginada = {
  texto: string;
  estilo: EstiloResuelto;
  esViñeta?: boolean;
  conservarConSiguiente?: boolean;
};

export type PaginaPaginada = {
  lineas: LineaPaginada[];
  imagenes: { imagenId: string; altoPt: number }[];
};

export type ImagenLista = { bytes: Uint8Array; ancho: number; alto: number };

/**
 * Fluye los elementos en páginas. Los títulos viajan con lo que sigue
 * (nunca quedan huérfanos al pie) y las imágenes que no caben saltan de
 * página en vez de cortarse.
 */
export function paginar(
  elementos: ElementoPdf[],
  geo: GeometriaPagina,
  reservaSupPt: number,
  reservaInfPt: number,
  imagenes?: Map<string, ImagenLista>
): PaginaPaginada[] {
  const anchoUtil = geo.ancho - geo.margenIzq - geo.margenDer;
  const altoUtil = geo.alto - geo.margenSup - geo.margenInf - reservaSupPt - reservaInfPt;

  type Unidad =
    | { tipo: "lineas"; lineas: LineaPaginada[]; alto: number; pegajoso: boolean }
    | { tipo: "imagen"; imagenId: string; alto: number }
    | { tipo: "regla"; alto: number };

  const unidades: Unidad[] = [];
  for (let i = 0; i < elementos.length; i++) {
    const el = elementos[i];
    if (el.kind === "salto") {
      unidades.push({ tipo: "lineas", lineas: [], alto: 0, pegajoso: false });
      // Marcador interno: altura 0 + bandera de salto mediante líneas vacías.
      (unidades[unidades.length - 1] as { salto?: boolean }).salto = true;
      continue;
    }
    if (el.kind === "espacio") {
      unidades.push({
        tipo: "lineas",
        lineas: [{ texto: "", estilo: { ...ESTILO_BASE } }],
        alto: el.altoPt,
        pegajoso: false
      });
      continue;
    }
    if (el.kind === "regla") {
      unidades.push({ tipo: "regla", alto: 14 });
      continue;
    }
    if (el.kind === "imagen") {
      const info = imagenes?.get(el.imagenId);
      let alto = 180;
      if (info && info.ancho > 0 && info.alto > 0) {
        alto = Math.min((anchoUtil * info.alto) / info.ancho, altoUtil);
      }
      unidades.push({ tipo: "imagen", imagenId: el.imagenId, alto });
      continue;
    }
    if (el.kind === "lista") {
      const lineas: LineaPaginada[] = [];
      for (const item of el.items) {
        const e = item.estilo;
        const altoLinea = e.tamanoPt * e.interlineado;
        const envueltas = envolverLinea(`• ${item.texto}`, anchoUtil, e.tamanoPt, e.fuente, e.negrita);
        envueltas.forEach((texto, j) =>
          lineas.push({
            texto: j === 0 ? texto : `  ${texto}`,
            estilo: e,
            esViñeta: j === 0
          })
        );
        void altoLinea;
      }
      // Altura real por línea (puede variar si hubiera estilos mixtos).
      let alto = 0;
      for (const l of lineas) alto += l.estilo.tamanoPt * l.estilo.interlineado;
      unidades.push({ tipo: "lineas", lineas, alto, pegajoso: false });
      continue;
    }
    // kind === "texto"
    const envueltas = envolverLinea(el.texto, anchoUtil, el.estilo.tamanoPt, el.estilo.fuente, el.estilo.negrita);
    const altoLinea = el.estilo.tamanoPt * el.estilo.interlineado;
    const esTitulo = el.texto.length > 0;
    unidades.push({
      tipo: "lineas",
      lineas: envueltas.map((texto) => ({ texto, estilo: el.estilo })),
      alto: altoLinea * envueltas.length,
      pegajoso: esTitulo
    });
  }

  const paginas: PaginaPaginada[] = [];
  let actual: PaginaPaginada = { lineas: [], imagenes: [] };
  let restante = altoUtil;

  const cerrar = () => {
    paginas.push(actual);
    actual = { lineas: [], imagenes: [] };
    restante = altoUtil;
  };

  for (let i = 0; i < unidades.length; i++) {
    const u = unidades[i];
    if ((u as { salto?: boolean }).salto) {
      if (actual.lineas.length > 0 || actual.imagenes.length > 0) cerrar();
      continue;
    }
    if (u.tipo === "regla" || u.tipo === "imagen") {
      if (u.alto > restante && (actual.lineas.length > 0 || actual.imagenes.length > 0)) cerrar();
      if (u.tipo === "regla") {
        actual.lineas.push({
          texto: "__REGLA__",
          estilo: { ...ESTILO_BASE }
        });
        restante -= u.alto;
      } else {
        actual.imagenes.push({ imagenId: u.imagenId, altoPt: u.alto });
        restante -= u.alto;
      }
      continue;
    }
    // Unidad de líneas: puede partirse entre páginas.
    let lineas = u.lineas;
    let altoUnidad = u.alto;
    const esPegajosa = u.pegajoso;
    // Título huérfano: si no cabe con lo siguiente, pasa entero.
    if (esPegajosa && lineas.length > 0 && altoUnidad > restante && actual.lineas.length > 0) {
      cerrar();
    }
    // Párrafo largo al pie con una sola línea disponible: pasa entero si cabe en fresca.
    if (!esPegajosa && lineas.length > 2 && restante < lineas[0].estilo.tamanoPt * lineas[0].estilo.interlineado * 2) {
      if (altoUnidad <= altoUtil && actual.lineas.length > 0) cerrar();
    }
    while (lineas.length > 0) {
      const primera = lineas[0];
      const altoLinea = primera.texto
        ? primera.estilo.tamanoPt * primera.estilo.interlineado
        : primera.estilo.tamanoPt * 0.6;
      if (altoLinea > restante) {
        if (actual.lineas.length === 0 && actual.imagenes.length === 0) {
          // Línea más alta que la página: se emite igual para no perder texto.
          actual.lineas.push(primera);
          restante -= altoLinea;
          lineas = lineas.slice(1);
        } else {
          cerrar();
        }
        continue;
      }
      actual.lineas.push(primera);
      restante -= altoLinea;
      lineas = lineas.slice(1);
      void altoUnidad;
    }
  }
  if (actual.lineas.length > 0 || actual.imagenes.length > 0 || paginas.length === 0) {
    paginas.push(actual);
  }
  return paginas;
}

/* ------------------------------------------------------------------ */
/* Emisión PDF                                                        */
/* ------------------------------------------------------------------ */

function escaparPDF(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function cadenaDeBytes(bytes: Uint8Array): string {
  let s = "";
  const T = 8192;
  for (let i = 0; i < bytes.length; i += T) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + T)));
  }
  return s;
}

function textoCabeceraPie(
  plantilla: string,
  pagina: number,
  total: number
): string {
  return plantilla.replaceAll("{pagina}", String(pagina)).replaceAll("{paginas}", String(total));
}

/**
 * Renderiza el diseño a PDF. `imagenes` trae los activos ya rasterizados a
 * JPEG (ver `rasterizarImagen`); los bloques de imagen sinbytes se omiten.
 */
export function disenoAPdf(
  diseno: DisenoDocumento,
  plantilla: PlantillaDiseno,
  datos: DatosDiseno,
  imagenes: Map<string, ImagenLista>
): Uint8Array {
  const elementos = bloquesAElementos(diseno, plantilla, datos);
  const geo = geometriaPagina(diseno);
  const tieneCabecera = diseno.encabezadoTexto.trim().length > 0;
  const tienePie = diseno.pieTexto.trim().length > 0 || diseno.mostrarNumeroPagina;
  const reservaSup = tieneCabecera ? 26 : 0;
  const reservaInf = tienePie ? 26 : 0;
  const paginas = paginar(elementos, geo, reservaSup, reservaInf, imagenes);

  // Portada: la primera página empieza más abajo si abre con zona portada.
  const empiezaConPortada =
    diseno.bloques.length > 0 && diseno.bloques.find((b) => b.visible)?.zona === "portada";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  const objeto = (cuerpo: string) => {
    const numero = offsets.length + 1;
    offsets.push(pdf.length);
    pdf += `${numero} 0 obj\n${cuerpo}\nendobj\n`;
  };

  objeto("<< /Type /Catalog /Pages 2 0 R >>");

  // Fuentes base-14 usadas en el documento.
  const fuentesUsadas: string[] = [];
  const indiceFuente = (nombre: string): number => {
    let i = fuentesUsadas.indexOf(nombre);
    if (i === -1) {
      fuentesUsadas.push(nombre);
      i = fuentesUsadas.length - 1;
    }
    return i;
  };
  // Registra todas las que pueden aparecer (texto + cabecera/pie).
  for (const nombre of [
    "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique",
    "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic",
    "Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique"
  ]) {
    indiceFuente(nombre);
  }

  // Imágenes referenciadas por alguna página (solo las que tienen bytes).
  const imagenesUsadas: { id: string; info: ImagenLista }[] = [];
  for (const p of paginas) {
    for (const im of p.imagenes) {
      const info = imagenes.get(im.imagenId);
      if (info && !imagenesUsadas.some((x) => x.id === im.imagenId)) {
        imagenesUsadas.push({ id: im.imagenId, info });
      }
    }
  }

  const idsPaginas = paginas.map((_, i) => 3 + fuentesUsadas.length + imagenesUsadas.length + i * 2);
  objeto(
    `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginas.length} >>`
  );
  const idsFuentes = fuentesUsadas.map((_, i) => 3 + i);
  fuentesUsadas.forEach((nombre) => {
    objeto(`<< /Type /Font /Subtype /Type1 /BaseFont /${nombre} /Encoding /WinAnsiEncoding >>`);
  });
  const idsImagenes = imagenesUsadas.map((_, i) => 3 + fuentesUsadas.length + i);
  imagenesUsadas.forEach(({ info }) => {
    objeto(
      `<< /Type /XObject /Subtype /Image /Width ${info.ancho} /Height ${info.alto} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${info.bytes.length} >>\n` +
        `stream\n${cadenaDeBytes(info.bytes)}\nendstream`
    );
  });

  const recursos = (): string => {
    const f = idsFuentes.map((id, i) => `/F${i + 1} ${id} 0 R`).join(" ");
    const im = idsImagenes.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(" ");
    return `/Font << ${f} >>${im ? ` /XObject << ${im} >>` : ""}`;
  };
  const nombreFuente = (base14: string): string => `/F${fuentesUsadas.indexOf(base14) + 1}`;
  const nombreImagen = (id: string): string | null => {
    const i = imagenesUsadas.findIndex((x) => x.id === id);
    return i === -1 ? null : `/Im${i + 1}`;
  };

  const anchoUtil = geo.ancho - geo.margenIzq - geo.margenDer;

  paginas.forEach((pagina, indice) => {
    const idPagina = idsPaginas[indice];
    const idContenido = idPagina + 1;
    const contenido: string[] = ["BT"];
    const ySup = geo.alto - geo.margenSup - reservaSup;
    let y = ySup;
    // En la primera página con portada se empieza más abajo y centrado visual.
    if (indice === 0 && empiezaConPortada) y = geo.alto - geo.margenSup - 200;

    const dibujarTexto = (texto: string, estilo: EstiloResuelto, x: number, yy: number): void => {
      const base = fuentePara(estilo.fuente, estilo.negrita, estilo.cursiva);
      const [r, g, b] = estilo.color;
      contenido.push(
        `${nombreFuente(base)} ${estilo.tamanoPt} Tf ${r} ${g} ${b} rg ` +
          `1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${escaparPDF(aWinAnsi(texto))}) Tj`
      );
    };
    const anchoTexto = (texto: string, estilo: EstiloResuelto): number => {
      const factor =
        estilo.fuente === "mono" ? 0.6 : estilo.fuente === "serif" ? 0.48 : 0.5;
      return texto.length * estilo.tamanoPt * (factor + (estilo.negrita ? 0.04 : 0));
    };
    const xPara = (texto: string, estilo: EstiloResuelto): number => {
      if (estilo.alineacion === "centrado") {
        return geo.margenIzq + Math.max(0, (anchoUtil - anchoTexto(texto, estilo)) / 2);
      }
      if (estilo.alineacion === "derecha") {
        return geo.ancho - geo.margenDer - anchoTexto(texto, estilo);
      }
      return geo.margenIzq;
    };

    for (const linea of pagina.lineas) {
      if (linea.texto === "__REGLA__") {
        const yy = y - 4;
        contenido.push(
          `0.75 0.75 0.75 RG 0.75 w ${geo.margenIzq} ${yy.toFixed(2)} m ${(
            geo.ancho - geo.margenDer
          ).toFixed(2)} ${yy.toFixed(2)} l S`
        );
        y -= 14;
        continue;
      }
      const e = linea.estilo;
      y -= e.espacioAntesPt || 0;
      if (linea.texto) {
        const altoLinea = e.tamanoPt * e.interlineado;
        y -= altoLinea * 0.85;
        dibujarTexto(linea.texto, e, xPara(linea.texto, e), y);
        y -= altoLinea * 0.15 + (e.espacioDespuesPt || 0);
      } else {
        y -= e.tamanoPt * 0.6;
      }
    }
    for (const im of pagina.imagenes) {
      const nombre = nombreImagen(im.imagenId);
      const info = imagenes.get(im.imagenId);
      if (!nombre || !info) continue;
      const alto = Math.min(im.altoPt, y - geo.margenInf - reservaInf);
      if (alto < 24) continue;
      const ancho = (alto * info.ancho) / info.alto;
      const x = geo.margenIzq + Math.max(0, (anchoUtil - ancho) / 2);
      y -= alto;
      contenido.push(`q ${ancho.toFixed(2)} 0 0 ${alto.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm ${nombre} Do Q`);
    }
    contenido.push("ET");

    // Encabezado y pie con numeración.
    if (tieneCabecera || tienePie) {
      const estiloMini = {
        ...ESTILO_BASE,
        tamanoPt: 9,
        color: [0.45, 0.45, 0.45] as [number, number, number]
      };
      const total = paginas.length;
      if (tieneCabecera) {
        const t = textoCabeceraPie(diseno.encabezadoTexto, indice + 1, total);
        if (t.trim()) {
          contenido.push("BT");
          const yy = geo.alto - geo.margenSup + 12;
          dibujarTexto(t, estiloMini, geo.margenIzq, yy);
          contenido.push("ET");
        }
      }
      if (tienePie) {
        const partes: string[] = [];
        const t = textoCabeceraPie(diseno.pieTexto, indice + 1, total).trim();
        if (t) partes.push(t);
        if (diseno.mostrarNumeroPagina) partes.push(`Página ${indice + 1} de ${total}`);
        const final = partes.join(" · ");
        if (final) {
          contenido.push("BT");
          dibujarTexto(final, estiloMini, geo.margenIzq, geo.margenInf - 16);
          contenido.push("ET");
        }
      }
    }

    const flujo = contenido.join("\n");
    objeto(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${geo.ancho} ${geo.alto}] ` +
        `/Resources << ${recursos()} >> /Contents ${idContenido} 0 R >>`
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

/**
 * Rasteriza una imagen (dataURL) a JPEG apto para incrustar. Solo navegador:
 * fuera del DOM devuelve null. SVG se valida antes de dibujarlo.
 */
export async function rasterizarImagen(
  dataUrl: string,
  mime: string
): Promise<{ bytes: Uint8Array; ancho: number; alto: number } | null> {
  try {
    if (typeof document === "undefined") return null;
    if (mime === "image/svg+xml") {
      const payload = dataUrl.split(",")[1] ?? "";
      const texto = dataUrl.includes(";base64,")
        ? Buffer.from(payload, "base64").toString("utf-8")
        : decodeURIComponent(payload);
      const { esSvgSeguro } = await import("./diseno.ts");
      if (!esSvgSeguro(texto)) return null;
    }
    const img = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const el = document.createElement("img");
      el.onload = () => resolver(el);
      el.onerror = () => rechazar(new Error("no se pudo leer la imagen"));
      el.src = dataUrl;
    });
    const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);
    const jpeg = lienzo.toDataURL("image/jpeg", 0.92);
    const binario = atob(jpeg.split(",")[1] ?? "");
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return { bytes, ancho, alto };
  } catch {
    return null;
  }
}
