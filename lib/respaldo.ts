/**
 * DesignConia — respaldo JSON descargable y restaurable del proyecto.
 *
 * El respaldo guarda el agregado V3 completo (proyecto, selección y
 * conversaciones) tal como está en memoria. Al restaurar, se valida con el
 * mismo guard que la carga normal: un archivo corrupto o ajeno se rechaza
 * sin tocar el estado actual.
 */

import { esEstadoGuardadoV3, type EstadoGuardadoV3 } from "./proyecto.ts";

export type ResultadoRespaldo =
  | { ok: true; estado: EstadoGuardadoV3 }
  | { ok: false; motivo: string };

/** Serializa el estado para descargar. Lanza si no es serializable. */
export function serializarRespaldo(estado: EstadoGuardadoV3): string {
  return JSON.stringify({ respaldoDesignConia: 1, version: 3, guardado: estado }, null, 2);
}

/** Valida un texto de respaldo y devuelve el estado, o el motivo del rechazo. */
export function parsearRespaldo(texto: string): ResultadoRespaldo {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: "El archivo no es un JSON válido." };
  }
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return { ok: false, motivo: "El archivo no trae un respaldo válido." };
  }
  const o = datos as Record<string, unknown>;
  // Acepta el respaldo con o sin envoltorio, por compatibilidad.
  const candidato = esEstadoGuardadoV3(o.guardado) ? o.guardado : esEstadoGuardadoV3(o) ? o : null;
  if (!candidato) {
    return {
      ok: false,
      motivo: "El archivo no contiene un proyecto DesignConia válido (V3)."
    };
  }
  return { ok: true, estado: candidato };
}

/** Nombre sugerido para el archivo descargado. */
export function nombreRespaldo(ahora = new Date()): string {
  const f = (n: number) => String(n).padStart(2, "0");
  return `designconia-respaldo-${ahora.getFullYear()}${f(ahora.getMonth() + 1)}${f(ahora.getDate())}-${f(ahora.getHours())}${f(ahora.getMinutes())}.json`;
}
