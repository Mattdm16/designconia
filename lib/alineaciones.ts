/**
 * Operaciones puras sobre alineaciones curriculares del agregado V3.
 * No accede a localStorage, window, red ni APIs de Node.
 *
 * Las alineaciones conectan la cadena Macro → Meso → Micro → evaluación:
 * principio_marco → resultado_programa → ra_micro → actividad_evaluacion.
 * Cada operación valida el borde y la existencia de los extremos; nunca
 * inventa nodos ni deja el agregado en un estado inválido.
 */

import {
  esBordeAlineacionValido,
  esEstadoGuardadoV3,
  existeNodoCurricular,
  type AlineacionCurricular,
  type EstadoAlineacion,
  type EstadoGuardadoV3,
  type NodoCurricular
} from "./proyecto.ts";

export type BordeAlineacion = {
  origen: NodoCurricular;
  destino: NodoCurricular;
};

function clonar<T>(valor: T): T {
  const serializado = JSON.stringify(valor);
  if (serializado === undefined) throw new Error("La alineación no es serializable.");
  return JSON.parse(serializado) as T;
}

function hashCorto(semilla: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i++) hash = Math.imul(hash ^ semilla.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function semillaNodo(nodo: NodoCurricular): string {
  return `${nodo.tipo}:${nodo.contextoId ?? ""}:${nodo.id}`;
}

/** Id determinista para un borde, estable entre sesiones. */
export function idAlineacionPara(origen: NodoCurricular, destino: NodoCurricular): string {
  return `ali_${hashCorto(`${semillaNodo(origen)}>${semillaNodo(destino)}`)}`;
}

/** ¿Existe ya una alineación para este borde? */
export function existeAlineacion(
  proyecto: EstadoGuardadoV3["proyecto"],
  origen: NodoCurricular,
  destino: NodoCurricular
): boolean {
  return proyecto.alineaciones.some(
    (a) =>
      a.origen.tipo === origen.tipo &&
      a.origen.id === origen.id &&
      (a.origen.contextoId ?? undefined) === (origen.contextoId ?? undefined) &&
      a.destino.tipo === destino.tipo &&
      a.destino.id === destino.id &&
      (a.destino.contextoId ?? undefined) === (destino.contextoId ?? undefined)
  );
}

/**
 * Crea o actualiza la alineación de un borde. Devuelve el agregado actualizado
 * sin mutar la base, o null si la base es inválida, el borde no está permitido
 * o algún extremo no existe en el proyecto.
 */
export function definirAlineacion(
  base: EstadoGuardadoV3,
  origen: NodoCurricular,
  destino: NodoCurricular,
  estado: EstadoAlineacion = "aceptado",
  justificacion?: string
): EstadoGuardadoV3 | null {
  if (!esEstadoGuardadoV3(base)) return null;
  if (!esBordeAlineacionValido(origen.tipo, destino.tipo)) return null;
  if (!existeNodoCurricular(base.proyecto, origen)) return null;
  if (!existeNodoCurricular(base.proyecto, destino)) return null;

  const estadoNuevo = clonar(base);
  const id = idAlineacionPara(origen, destino);
  const existente = estadoNuevo.proyecto.alineaciones.find(
    (a) =>
      a.origen.tipo === origen.tipo &&
      a.origen.id === origen.id &&
      (a.origen.contextoId ?? undefined) === (origen.contextoId ?? undefined) &&
      a.destino.tipo === destino.tipo &&
      a.destino.id === destino.id &&
      (a.destino.contextoId ?? undefined) === (destino.contextoId ?? undefined)
  );
  const alineacion: AlineacionCurricular = {
    id: existente?.id ?? id,
    origen: clonar(origen),
    destino: clonar(destino),
    estado,
    ...(justificacion === undefined ? {} : { justificacion })
  };
  estadoNuevo.proyecto.alineaciones = existente
    ? estadoNuevo.proyecto.alineaciones.map((a) => (a.id === existente.id ? alineacion : a))
    : [...estadoNuevo.proyecto.alineaciones, alineacion];
  return esEstadoGuardadoV3(estadoNuevo) ? estadoNuevo : null;
}

/**
 * Elimina la alineación de un borde. Devuelve el agregado actualizado sin
 * mutar la base, o null si la base es inválida. Si no existía, devuelve una
 * copia intacta.
 */
export function quitarAlineacion(
  base: EstadoGuardadoV3,
  origen: NodoCurricular,
  destino: NodoCurricular
): EstadoGuardadoV3 | null {
  if (!esEstadoGuardadoV3(base)) return null;
  const estadoNuevo = clonar(base);
  estadoNuevo.proyecto.alineaciones = estadoNuevo.proyecto.alineaciones.filter(
    (a) =>
      !(
        a.origen.tipo === origen.tipo &&
        a.origen.id === origen.id &&
        (a.origen.contextoId ?? undefined) === (origen.contextoId ?? undefined) &&
        a.destino.tipo === destino.tipo &&
        a.destino.id === destino.id &&
        (a.destino.contextoId ?? undefined) === (destino.contextoId ?? undefined)
      )
  );
  return esEstadoGuardadoV3(estadoNuevo) ? estadoNuevo : null;
}

/** Alineaciones que salen de un nodo concreto. */
export function alineacionesDesde(
  proyecto: EstadoGuardadoV3["proyecto"],
  origen: NodoCurricular
): AlineacionCurricular[] {
  return proyecto.alineaciones.filter(
    (a) =>
      a.origen.tipo === origen.tipo &&
      a.origen.id === origen.id &&
      (a.origen.contextoId ?? undefined) === (origen.contextoId ?? undefined)
  );
}

/** Alineaciones que llegan a un nodo concreto. */
export function alineacionesHacia(
  proyecto: EstadoGuardadoV3["proyecto"],
  destino: NodoCurricular
): AlineacionCurricular[] {
  return proyecto.alineaciones.filter(
    (a) =>
      a.destino.tipo === destino.tipo &&
      a.destino.id === destino.id &&
      (a.destino.contextoId ?? undefined) === (destino.contextoId ?? undefined)
  );
}
