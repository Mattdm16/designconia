/**
 * DesignConia — propuestas de diseño con IA (Fase 2).
 *
 * La IA nunca reescribe el documento: propone CAMBIOS contra el diseño
 * actual y el docente los revisa antes de aplicarlos. El contrato solo
 * admite apariencia y organización (plantilla, página, estilos por tipo o
 * por bloque, orden, visibilidad y colores/fuentes del kit). No existe
 * ninguna operación que toque el contenido curricular: ni `refContenido`,
 * ni textos, ni imágenes, ni bloques nuevos o eliminados. Esos cambios
 * siguen siendo manuales.
 *
 * Todo es puro y testeable: no toca red, localStorage ni DOM.
 */

import {
  PLANTILLAS_BASE,
  type AlineacionTexto,
  type BloqueDiseno,
  type BrandKit,
  type DisenoDocumento,
  type EstiloBloque,
  type FuenteDiseno,
  type OrientacionPagina,
  type TamanoPagina,
  type TipoBloque,
  type ZonaBloque
} from "./diseno.ts";
import { repararJSON } from "./schema.ts";

/* ------------------------------------------------------------------ */
/* Cambios admisibles                                                  */
/* ------------------------------------------------------------------ */

/** Parche de página: los mismos límites que la edición manual. */
export type ParchePaginaPropuesto = {
  tamano?: TamanoPagina;
  orientacion?: OrientacionPagina;
  margenesMm?: { arriba?: number; abajo?: number; izq?: number; der?: number };
  encabezadoTexto?: string;
  pieTexto?: string;
  mostrarNumeroPagina?: boolean;
};

export type CambioDiseno =
  | { op: "plantilla"; plantillaId: string }
  | { op: "pagina"; parche: ParchePaginaPropuesto }
  | { op: "estiloTipo"; tipo: TipoBloque; estilo: EstiloBloque }
  | { op: "estiloBloque"; bloqueId: string; estilo: EstiloBloque }
  /** Reordena una zona: los ids deben ser exactamente los de la zona, sin más ni menos. */
  | { op: "orden"; zona: ZonaBloque; ids: string[] }
  | { op: "moverBloque"; bloqueId: string; zona: ZonaBloque }
  | { op: "visibilidad"; bloqueId: string; visible: boolean }
  | {
      op: "kit";
      colores?: { primario?: string; secundario?: string; acento?: string };
      fuenteTitulos?: FuenteDiseno;
      fuenteCuerpo?: FuenteDiseno;
    };

export type PropuestaDiseno = {
  /** Lo que la IA le cuenta al docente. Natural, en español, máximo 3 frases. */
  mensaje: string;
  cambios: CambioDiseno[];
};

/* ------------------------------------------------------------------ */
/* Validación de forma (lo que la IA devuelve)                         */
/* ------------------------------------------------------------------ */

const TIPOS: readonly string[] = [
  "titulo", "subtitulo", "parrafo", "lista", "cita", "tabla", "imagen",
  "regla", "espacio", "salto", "firma"
];
const ZONAS: readonly string[] = ["portada", "encabezado", "cuerpo", "pie"];
const FUENTES: readonly string[] = ["serif", "sans", "mono"];
const ALINEACIONES: readonly string[] = ["izquierda", "centrado", "derecha"];

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function esHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function enRango(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

/** Estilo propuesto con los mismos rangos que la edición manual. */
function esEstiloPropuesto(v: unknown): v is EstiloBloque {
  if (!esRegistro(v)) return false;
  if (v.fuente !== undefined && !FUENTES.includes(v.fuente as string)) return false;
  if (v.alineacion !== undefined && !ALINEACIONES.includes(v.alineacion as string)) return false;
  if (v.color !== undefined && !esHex(v.color)) return false;
  if (v.tamanoPt !== undefined && !enRango(v.tamanoPt, 6, 72)) return false;
  if (v.espacioAntesPt !== undefined && !enRango(v.espacioAntesPt, 0, 72)) return false;
  if (v.espacioDespuesPt !== undefined && !enRango(v.espacioDespuesPt, 0, 72)) return false;
  if (v.interlineado !== undefined && !enRango(v.interlineado, 1, 3)) return false;
  if (v.negrita !== undefined && typeof v.negrita !== "boolean") return false;
  if (v.cursiva !== undefined && typeof v.cursiva !== "boolean") return false;
  return true;
}

function esParchePagina(v: unknown): v is ParchePaginaPropuesto {
  if (!esRegistro(v)) return false;
  if (v.tamano !== undefined && v.tamano !== "carta" && v.tamano !== "a4") return false;
  if (v.orientacion !== undefined && v.orientacion !== "vertical" && v.orientacion !== "horizontal") return false;
  if (v.mostrarNumeroPagina !== undefined && typeof v.mostrarNumeroPagina !== "boolean") return false;
  if (v.encabezadoTexto !== undefined && (typeof v.encabezadoTexto !== "string" || v.encabezadoTexto.length > 200)) return false;
  if (v.pieTexto !== undefined && (typeof v.pieTexto !== "string" || v.pieTexto.length > 200)) return false;
  if (v.margenesMm !== undefined) {
    if (!esRegistro(v.margenesMm)) return false;
    for (const k of ["arriba", "abajo", "izq", "der"] as const) {
      const n = (v.margenesMm as Record<string, unknown>)[k];
      if (n !== undefined && !enRango(n, 5, 60)) return false;
    }
  }
  return true;
}

function esCambio(v: unknown): v is CambioDiseno {
  if (!esRegistro(v) || typeof v.op !== "string") return false;
  switch (v.op) {
    case "plantilla":
      return typeof v.plantillaId === "string" && Boolean(v.plantillaId.trim());
    case "pagina":
      return esParchePagina(v.parche);
    case "estiloTipo":
      return typeof v.tipo === "string" && TIPOS.includes(v.tipo) && esEstiloPropuesto(v.estilo);
    case "estiloBloque":
      return typeof v.bloqueId === "string" && Boolean(v.bloqueId.trim()) && esEstiloPropuesto(v.estilo);
    case "orden":
      return (
        typeof v.zona === "string" &&
        ZONAS.includes(v.zona) &&
        Array.isArray(v.ids) &&
        v.ids.length > 0 &&
        (v.ids as unknown[]).every((id) => typeof id === "string" && Boolean((id as string).trim()))
      );
    case "moverBloque":
      return (
        typeof v.bloqueId === "string" &&
        Boolean(v.bloqueId.trim()) &&
        typeof v.zona === "string" &&
        ZONAS.includes(v.zona)
      );
    case "visibilidad":
      return typeof v.bloqueId === "string" && Boolean(v.bloqueId.trim()) && typeof v.visible === "boolean";
    case "kit": {
      if (v.colores !== undefined) {
        if (!esRegistro(v.colores)) return false;
        for (const k of ["primario", "secundario", "acento"] as const) {
          const c = (v.colores as Record<string, unknown>)[k];
          if (c !== undefined && !esHex(c)) return false;
        }
      }
      if (v.fuenteTitulos !== undefined && !FUENTES.includes(v.fuenteTitulos as string)) return false;
      if (v.fuenteCuerpo !== undefined && !FUENTES.includes(v.fuenteCuerpo as string)) return false;
      return true;
    }
    default:
      // Operación desconocida (incluida cualquier que toque contenido): se rechaza.
      return false;
  }
}

/**
 * Parsea la respuesta cruda de la IA. Acepta JSON con preámbulo o vallas de
 * código y repara un JSON cortado al final; un daño interno se rechaza con
 * motivo legible en vez de romper. Nunca lanza.
 */
export function parsearPropuestaDiseno(
  bruto: string
): { ok: true; propuesta: PropuestaDiseno } | { ok: false; motivo: string } {
  if (!bruto || !bruto.trim()) {
    return { ok: false, motivo: "La IA devolvió una respuesta vacía. Vuelve a intentarlo." };
  }
  let texto = bruto.trim();
  // Vallas de código o preámbulo: empieza donde abre el objeto.
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin < inicio) {
    return { ok: false, motivo: "La IA no devolvió una propuesta válida. Vuelve a intentarlo." };
  }
  texto = texto.slice(inicio, fin + 1);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(texto);
  } catch {
    const reparado = repararJSON(texto);
    if (!reparado) {
      return { ok: false, motivo: "La propuesta llegó incompleta o dañada. Pide una modificación más acotada." };
    }
    try {
      parsed = JSON.parse(reparado);
    } catch {
      return { ok: false, motivo: "La propuesta llegó incompleta o dañada. Pide una modificación más acotada." };
    }
  }
  if (!esRegistro(parsed)) {
    return { ok: false, motivo: "La IA no devolvió una propuesta válida. Vuelve a intentarlo." };
  }
  const mensaje = typeof parsed.mensaje === "string" && parsed.mensaje.trim() ? parsed.mensaje.trim() : "";
  if (!Array.isArray(parsed.cambios) || parsed.cambios.length === 0) {
    return {
      ok: false,
      motivo: mensaje || "La IA no propuso ningún cambio. Describe con más detalle qué quieres ajustar."
    };
  }
  if (parsed.cambios.length > 30) {
    return { ok: false, motivo: "La propuesta trae demasiados cambios. Pide una modificación más acotada." };
  }
  const cambios: CambioDiseno[] = [];
  for (const c of parsed.cambios) {
    if (!esCambio(c)) {
      return { ok: false, motivo: "La propuesta trae un cambio que no está permitido. Vuelve a intentarlo." };
    }
    cambios.push(c);
  }
  return {
    ok: true,
    propuesta: {
      mensaje: mensaje || "Propongo estos ajustes al diseño. Revísalos antes de aplicarlos.",
      cambios
    }
  };
}

/* ------------------------------------------------------------------ */
/* Aplicación pura sobre el diseño actual                              */
/* ------------------------------------------------------------------ */

export type ResultadoAplicacion = {
  diseno: DisenoDocumento;
  kit: BrandKit;
  /** Resumen legible de lo aplicado, para la revisión del docente. */
  aplicados: string[];
  /** Motivos legibles de lo rechazado (ids que ya no existen, etc.). */
  rechazados: string[];
};

const ETIQUETA_TIPO: Record<string, string> = {
  titulo: "títulos", subtitulo: "subtítulos", parrafo: "párrafos", lista: "listas",
  cita: "citas", tabla: "tablas", imagen: "imágenes", regla: "líneas",
  espacio: "espacios", salto: "saltos de página", firma: "firmas"
};

const ETIQUETA_ZONA: Record<string, string> = {
  portada: "Portada", encabezado: "Encabezado", cuerpo: "Cuerpo", pie: "Pie"
};

const ETIQUETA_FUENTE: Record<string, string> = {
  serif: "Serif formal", sans: "Sans neutra", mono: "Mono datos"
};

function etiquetaBloqueCorto(b: BloqueDiseno): string {
  const base = ETIQUETA_TIPO[b.tipo] ?? b.tipo;
  const detalle = (b.texto?.trim() || "").slice(0, 28);
  return detalle ? `${base} (“${detalle}”)` : base;
}

function describirEstilo(e: EstiloBloque): string[] {
  const partes: string[] = [];
  if (e.fuente) partes.push(`fuente ${ETIQUETA_FUENTE[e.fuente] ?? e.fuente}`);
  if (e.tamanoPt !== undefined) partes.push(`${e.tamanoPt} pt`);
  if (e.negrita !== undefined) partes.push(e.negrita ? "negrita" : "sin negrita");
  if (e.cursiva !== undefined) partes.push(e.cursiva ? "cursiva" : "sin cursiva");
  if (e.color) partes.push(`color ${e.color}`);
  if (e.alineacion) partes.push(`alineación ${e.alineacion}`);
  if (e.interlineado !== undefined) partes.push(`interlineado ${e.interlineado}`);
  return partes;
}

/**
 * Aplica los cambios admitidos sobre copias del diseño y el kit: nunca muta
 * la entrada. Cada cambio inválido contra el diseño actual (bloque que ya
 * no existe, orden que no coincide) se rechaza con motivo y no frena los
 * demás. El diseño original queda intacto si nada aplica.
 */
export function aplicarPropuesta(
  diseno: DisenoDocumento,
  kit: BrandKit,
  cambios: CambioDiseno[]
): ResultadoAplicacion {
  const aplicados: string[] = [];
  const rechazados: string[] = [];
  let bloques: BloqueDiseno[] = diseno.bloques.map((b) => ({ ...b, estilo: { ...(b.estilo ?? {}) } }));
  let pagina = { ...diseno.pagina, margenesMm: { ...diseno.pagina.margenesMm } };
  let plantillaId = diseno.plantillaId;
  let encabezadoTexto = diseno.encabezadoTexto;
  let pieTexto = diseno.pieTexto;
  let mostrarNumeroPagina = diseno.mostrarNumeroPagina;
  let colores = { ...kit.colores };
  let fuenteTitulos = kit.fuenteTitulos;
  let fuenteCuerpo = kit.fuenteCuerpo;

  for (const cambio of cambios) {
    switch (cambio.op) {
      case "plantilla": {
        const nueva = PLANTILLAS_BASE.find((p) => p.id === cambio.plantillaId);
        if (!nueva) {
          rechazados.push(`La plantilla “${cambio.plantillaId}” no existe.`);
          break;
        }
        plantillaId = nueva.id;
        pagina = { ...nueva.pagina, margenesMm: { ...nueva.pagina.margenesMm } };
        aplicados.push(`Plantilla → ${nueva.nombre}.`);
        break;
      }
      case "pagina": {
        const p = cambio.parche;
        const partes: string[] = [];
        if (p.tamano) {
          pagina = { ...pagina, tamano: p.tamano };
          partes.push(p.tamano === "carta" ? "tamaño Carta" : "tamaño A4");
        }
        if (p.orientacion) {
          pagina = { ...pagina, orientacion: p.orientacion };
          partes.push(p.orientacion === "vertical" ? "orientación vertical" : "orientación horizontal");
        }
        if (p.margenesMm) {
          pagina = { ...pagina, margenesMm: { ...pagina.margenesMm, ...p.margenesMm } };
          partes.push("márgenes ajustados");
        }
        if (p.encabezadoTexto !== undefined) {
          encabezadoTexto = p.encabezadoTexto;
          partes.push(p.encabezadoTexto.trim() ? "encabezado actualizado" : "encabezado vaciado");
        }
        if (p.pieTexto !== undefined) {
          pieTexto = p.pieTexto;
          partes.push(p.pieTexto.trim() ? "pie actualizado" : "pie vaciado");
        }
        if (p.mostrarNumeroPagina !== undefined) {
          mostrarNumeroPagina = p.mostrarNumeroPagina;
          partes.push(p.mostrarNumeroPagina ? "páginas numeradas" : "sin numeración");
        }
        aplicados.push(partes.length ? `Página: ${partes.join(", ")}.` : "Página sin cambios.");
        break;
      }
      case "estiloTipo": {
        bloques = bloques.map((b) =>
          b.tipo === cambio.tipo ? { ...b, estilo: { ...(b.estilo ?? {}), ...cambio.estilo } } : b
        );
        const n = bloques.filter((b) => b.tipo === cambio.tipo).length;
        const desc = describirEstilo(cambio.estilo);
        aplicados.push(
          desc.length
            ? `${ETIQUETA_TIPO[cambio.tipo] ?? cambio.tipo} (${n}): ${desc.join(", ")}.`
            : `Estilo de ${ETIQUETA_TIPO[cambio.tipo] ?? cambio.tipo} sin cambios.`
        );
        break;
      }
      case "estiloBloque": {
        const b = bloques.find((x) => x.id === cambio.bloqueId);
        if (!b) {
          rechazados.push("Un cambio apunta a un bloque que ya no existe.");
          break;
        }
        bloques = bloques.map((x) =>
          x.id === cambio.bloqueId ? { ...x, estilo: { ...(x.estilo ?? {}), ...cambio.estilo } } : x
        );
        const desc = describirEstilo(cambio.estilo);
        aplicados.push(
          desc.length
            ? `${etiquetaBloqueCorto(b)}: ${desc.join(", ")}.`
            : `${etiquetaBloqueCorto(b)} sin cambios.`
        );
        break;
      }
      case "orden": {
        const actuales = bloques.filter((b) => b.zona === cambio.zona).map((b) => b.id);
        const propuestos = [...cambio.ids];
        const coinciden =
          propuestos.length === actuales.length &&
          propuestos.every((id) => actuales.includes(id)) &&
          new Set(propuestos).size === propuestos.length;
        if (!coinciden) {
          rechazados.push(`El reorden de ${ETIQUETA_ZONA[cambio.zona] ?? cambio.zona} no coincide con los bloques actuales.`);
          break;
        }
        const posicion = new Map(propuestos.map((id, i) => [id, i]));
        const reordenados = bloques
          .filter((b) => b.zona === cambio.zona)
          .sort((a, b) => (posicion.get(a.id) ?? 0) - (posicion.get(b.id) ?? 0));
        // Reinsertar la zona reordenada donde estaba.
        const primera = bloques.findIndex((b) => b.zona === cambio.zona);
        bloques = [...bloques.slice(0, primera), ...reordenados, ...bloques.slice(primera + actuales.length)];
        aplicados.push(`${ETIQUETA_ZONA[cambio.zona] ?? cambio.zona} reordenada (${propuestos.length} bloques).`);
        break;
      }
      case "moverBloque": {
        const b = bloques.find((x) => x.id === cambio.bloqueId);
        if (!b) {
          rechazados.push("Un cambio apunta a un bloque que ya no existe.");
          break;
        }
        if (b.zona === cambio.zona) {
          rechazados.push(`${etiquetaBloqueCorto(b)} ya está en ${ETIQUETA_ZONA[cambio.zona] ?? cambio.zona}.`);
          break;
        }
        const sinEl = bloques.filter((x) => x.id !== cambio.bloqueId);
        const movido: BloqueDiseno = { ...b, zona: cambio.zona };
        let insertar = sinEl.length;
        for (let i = sinEl.length - 1; i >= 0; i--) {
          if (sinEl[i].zona === cambio.zona) {
            insertar = i + 1;
            break;
          }
        }
        sinEl.splice(insertar, 0, movido);
        bloques = sinEl;
        aplicados.push(`${etiquetaBloqueCorto(b)} → ${ETIQUETA_ZONA[cambio.zona] ?? cambio.zona}.`);
        break;
      }
      case "visibilidad": {
        const b = bloques.find((x) => x.id === cambio.bloqueId);
        if (!b) {
          rechazados.push("Un cambio apunta a un bloque que ya no existe.");
          break;
        }
        bloques = bloques.map((x) => (x.id === cambio.bloqueId ? { ...x, visible: cambio.visible } : x));
        aplicados.push(`${etiquetaBloqueCorto(b)} ${cambio.visible ? "visible" : "oculto"}.`);
        break;
      }
      case "kit": {
        const partes: string[] = [];
        if (cambio.colores) {
          colores = { ...colores, ...cambio.colores };
          if (cambio.colores.primario) partes.push(`primario ${cambio.colores.primario}`);
          if (cambio.colores.secundario) partes.push(`secundario ${cambio.colores.secundario}`);
          if (cambio.colores.acento) partes.push(`acento ${cambio.colores.acento}`);
        }
        if (cambio.fuenteTitulos) {
          fuenteTitulos = cambio.fuenteTitulos;
          partes.push(`títulos en ${ETIQUETA_FUENTE[cambio.fuenteTitulos] ?? cambio.fuenteTitulos}`);
        }
        if (cambio.fuenteCuerpo) {
          fuenteCuerpo = cambio.fuenteCuerpo;
          partes.push(`cuerpo en ${ETIQUETA_FUENTE[cambio.fuenteCuerpo] ?? cambio.fuenteCuerpo}`);
        }
        aplicados.push(partes.length ? `Marca: ${partes.join(", ")}.` : "Marca sin cambios.");
        break;
      }
    }
  }

  return {
    diseno: {
      ...diseno,
      plantillaId,
      pagina,
      encabezadoTexto,
      pieTexto,
      mostrarNumeroPagina,
      bloques,
      actualizadoEn: new Date().toISOString()
    },
    kit: { ...kit, colores, fuenteTitulos, fuenteCuerpo },
    aplicados,
    rechazados
  };
}
