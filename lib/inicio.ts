/**
 * DesignConia — parseo del enrutador de inicio.
 *
 * Módulo puro: no toca React, red, `window` ni APIs de Node. Lo comparten el
 * route handler y el cliente, igual que lib/macro.ts y lib/meso.ts.
 */

import { DESTINOS_INICIO, type DestinoInicio } from "./promptInicio.ts";
import { SUGERENCIAS_MAX, aislarObjeto, lista, repararJSON, textoOpcional } from "./schema.ts";

/** Sugerencias neutras de apertura: invitan a hablar, no eligen nivel. */
export const SUGERENCIAS_APERTURA_NEUTRAS = [
  "Quiero diseñar algo nuevo en mi institución",
  "Tengo un PDF y quiero trabajarlo",
  "Ya tengo un documento y quiero retomarlo"
];

export type ResultadoInicio =
  | {
      ok: true;
      mensaje: string;
      destino: DestinoInicio;
      sugerencias: string[];
    }
  | { ok: false; motivo: string };

/**
 * Interpreta la respuesta del enrutador. Un destino desconocido o ausente se
 * trata como "aclarar": ante la duda se pregunta, nunca se cambia de nivel.
 */
export function parsearRespuestaInicio(
  crudo: string,
  meta?: { fin?: string | null; error?: string | null }
): ResultadoInicio {
  const fin = meta?.fin ?? null;

  if (!crudo || !crudo.trim()) {
    return {
      ok: false,
      motivo: meta?.error
        ? `El asistente reportó un error: ${meta.error}`
        : fin === "length"
          ? "El asistente agotó el presupuesto de tokens antes de responder. Reintenta."
          : "La IA devolvió una respuesta vacía. Vuelve a intentarlo."
    };
  }

  const aislado = aislarObjeto(crudo);
  let datos: unknown;
  try {
    datos = JSON.parse(aislado);
  } catch {
    const arreglado = repararJSON(aislado);
    if (arreglado === null) {
      return {
        ok: false,
        motivo:
          `La respuesta llegó incompleta o con JSON inválido${fin ? ` (finish_reason: ${fin})` : ""}. ` +
          "Reintenta; si se repite, reformula la petición."
      };
    }
    try {
      datos = JSON.parse(arreglado);
    } catch {
      return { ok: false, motivo: "La IA devolvió un JSON que no se pudo interpretar. Reintenta." };
    }
  }

  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return { ok: false, motivo: "La IA devolvió un JSON que no es un objeto." };
  }

  const o = datos as Record<string, unknown>;
  const mensaje = textoOpcional(o.mensaje).trim() || "Listo.";
  const sugerencias = lista(o.sugerencias, SUGERENCIAS_MAX);
  const destino = (DESTINOS_INICIO as readonly string[]).includes(o.destino as string)
    ? (o.destino as DestinoInicio)
    : "aclarar";

  return { ok: true, mensaje, destino, sugerencias };
}

/**
 * Heurística local para turnos dentro de un nivel: ¿pide cambiar de nivel?
 * Solo dispara el enrutador cuando hay verbo de cambio + mención de otro
 * nivel; en el caso común no se gasta una llamada extra.
 */
const VERBO_CAMBIO = /(cambi|pas|empez|nuev|otro|mejor|retom|sigamos? con|volv)/i;
const NOMBRE_NIVEL: { re: RegExp; nivel: "macro" | "meso" | "micro" }[] = [
  { re: /\bmarco\b|\bmacro\b|\bmodelo educativo\b|\blineamientos?\b/i, nivel: "macro" },
  { re: /\bprograma\b|\bcarrera\b|\bplan de estudios\b|\bmeso\b/i, nivel: "meso" },
  { re: /\basignatura\b|\bmateria\b|\bcurso\b|\bsyllabus\b|\bmicro\b/i, nivel: "micro" }
];

export function mencionaOtroNivel(
  texto: string,
  actual: "macro" | "meso" | "micro"
): "macro" | "meso" | "micro" | null {
  if (!VERBO_CAMBIO.test(texto)) return null;
  for (const { re, nivel } of NOMBRE_NIVEL) {
    if (nivel !== actual && re.test(texto)) return nivel;
  }
  return null;
}

const PIDE_NUEVO = /(otro|nuevo|nueva|empez|crear|empecemos|arrancar)\b.{0,40}\b(documento|marco|programa|asignatura|micro|meso|macro|ficha|borrador)\b/i;

/**
 * ¿Pide empezar otro documento (del nivel que sea)? Se usa junto al
 * enrutador: si el destino coincide con el nivel actual, se abre el lienzo
 * para un documento nuevo en vez de cambiar de nivel.
 */
export function pideNuevoDocumento(texto: string): boolean {
  return PIDE_NUEVO.test(texto);
}
