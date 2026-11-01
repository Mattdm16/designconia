/**
 * Puente puro entre la vista del Macrocurrículo y el agregado V3.
 * No accede a localStorage, window, red ni APIs de Node.
 *
 * Espejo de lib/estadoMicro.ts: la vista Macro es lo único que la página del
 * marco lee y escribe. Todo lo demás del proyecto (micros, conversaciones
 * hermanas, vínculos, alineaciones) se conserva intacto.
 *
 * Las fuentes curriculares viven en el proyecto, no dentro del marco: la vista
 * las transporta para que el editor las gestione en el mismo guardado.
 */

import { crearEstadoGuardadoV3Vacio } from "./estadoMicro.ts";
import { SECCIONES_MACRO, type SeccionMacro } from "./promptMacro.ts";
import {
  esEstadoGuardadoV3,
  podarAlineacionesHuerfanas,
  type ConversacionPersistida,
  type EstadoGuardadoV3,
  type FuenteCurricular,
  type MarcoEducativoInstitucional,
  type ProyectoCurricular
} from "./proyecto.ts";
import type { ChatMensaje, Intencion } from "./schema.ts";

export type { SeccionMacro };
export { SECCIONES_MACRO };

export type VistaMacroPersistible = {
  marco: MarcoEducativoInstitucional | null;
  fuentes: FuenteCurricular[];
  mensajes: ChatMensaje[];
  sugerencias: string[];
  intencion: Intencion;
  seccionActiva: SeccionMacro | null;
  crudo: string;
};

export type ResultadoLeerVistaMacro =
  | { ok: true; vista: VistaMacroPersistible }
  | { ok: false; motivo: "scope_no_soportado" };

const VISTA_VACIA: VistaMacroPersistible = {
  marco: null,
  fuentes: [],
  mensajes: [],
  sugerencias: [],
  intencion: "entender",
  seccionActiva: null,
  crudo: ""
};

function clonar<T>(valor: T): T {
  const serializado = JSON.stringify(valor);
  if (serializado === undefined) throw new Error("El estado curricular no es serializable.");
  return JSON.parse(serializado) as T;
}

function scopeMacro(documentoId: string | null): string {
  return `macro:${documentoId ?? "sin-documento"}`;
}

function conversacionVaciaMacro(scopeId: string, documentoId: string | null): ConversacionPersistida {
  return {
    scopeId,
    modulo: "macro",
    documentoId,
    mensajes: [],
    sugerencias: [],
    intencion: "entender",
    seccionActiva: null,
    crudo: ""
  };
}

function esSeccionMacro(v: unknown): v is SeccionMacro {
  return typeof v === "string" && (SECCIONES_MACRO as readonly string[]).includes(v);
}

function vistaDesdeConversacionMacro(
  marco: MarcoEducativoInstitucional | null,
  fuentes: FuenteCurricular[],
  conversacion: ConversacionPersistida | undefined,
  scopeId: string,
  documentoId: string | null
): VistaMacroPersistible {
  const datos = conversacion ?? conversacionVaciaMacro(scopeId, documentoId);
  return {
    marco: marco === null ? null : clonar(marco),
    fuentes: clonar(fuentes),
    mensajes: clonar(datos.mensajes),
    sugerencias: clonar(datos.sugerencias),
    intencion: datos.intencion,
    seccionActiva: esSeccionMacro(datos.seccionActiva) ? datos.seccionActiva : null,
    crudo: datos.crudo
  };
}

/**
 * Lee el estado visible por el editor del marco sin alterar el agregado.
 * Solo responde a la selección Macro; cualquier otro módulo queda intacto.
 */
export function leerVistaMacroV3(estado: EstadoGuardadoV3): ResultadoLeerVistaMacro {
  if (!esEstadoGuardadoV3(estado)) return { ok: false, motivo: "scope_no_soportado" };
  if (estado.seleccion.modulo !== "macro") return { ok: false, motivo: "scope_no_soportado" };

  const documentoId = estado.seleccion.documentoId;
  if (documentoId === null) {
    // Todavía no hay un marco elegido: la vista es el lienzo de entrada.
    const scopeId = scopeMacro(null);
    return {
      ok: true,
      vista: vistaDesdeConversacionMacro(
        null,
        estado.proyecto.fuentesCurriculares,
        estado.conversaciones[scopeId],
        scopeId,
        null
      )
    };
  }

  const marco = estado.proyecto.marcos.find((m) => m.id === documentoId) ?? null;
  // Una selección concreta sin marco no se convierte en un documento vacío.
  if (!marco) return { ok: false, motivo: "scope_no_soportado" };

  const scopeId = scopeMacro(documentoId);
  return {
    ok: true,
    vista: vistaDesdeConversacionMacro(
      marco,
      estado.proyecto.fuentesCurriculares,
      estado.conversaciones[scopeId],
      scopeId,
      documentoId
    )
  };
}

/** Identificador legible y estable derivado del nombre del marco. */
function idMarcoDesdeNombre(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 36);
  const slug = limpio || "sin_nombre";
  let hash = 0x811c9dc5;
  for (let i = 0; i < nombre.length; i++) hash = Math.imul(hash ^ nombre.charCodeAt(i), 0x01000193);
  const sufijo = (hash >>> 0).toString(36).padStart(7, "0");
  return `marco_${slug}_${sufijo}`;
}

function idEstaOcupado(proyecto: ProyectoCurricular, id: string): boolean {
  return (
    proyecto.id === id ||
    proyecto.marcos.some((m) => m.id === id || [...m.principios, ...m.afirmaciones].some((a) => a.id === id)) ||
    proyecto.programas.some(
      (p) =>
        p.id === id ||
        [...p.perfilIngreso, ...p.perfilEgreso, ...p.resultadosPrograma].some((a) => a.id === id)
    ) ||
    proyecto.asignaturas.some((a) => a.id === id) ||
    proyecto.fuentesCurriculares.some((f) => f.id === id) ||
    proyecto.vinculosProgramaMarco.some((v) => v.id === id) ||
    proyecto.alineaciones.some((a) => a.id === id)
  );
}

function idMarcoLibre(proyecto: ProyectoCurricular, nombre: string): string {
  const base = idMarcoDesdeNombre(nombre || "marco");
  if (!idEstaOcupado(proyecto, base)) return base;
  let sufijo = 2;
  while (idEstaOcupado(proyecto, `${base}_${sufijo}`)) sufijo++;
  return `${base}_${sufijo}`;
}

/**
 * Ids ya usados en el proyecto, salvo los del marco que se está reemplazando.
 * Los ids de afirmación derivan del texto, así que dos marcos pueden traer el
 * mismo texto: sin esta pasada, el segundo invalidaría el agregado.
 */
function idsOcupadosAjenos(estado: EstadoGuardadoV3, exceptoMarcoId: string | null): Set<string> {
  const ocupados = new Set<string>();
  ocupados.add(estado.proyecto.id);
  for (const m of estado.proyecto.marcos) {
    if (m.id === exceptoMarcoId) continue;
    ocupados.add(m.id);
    for (const a of [...m.principios, ...m.afirmaciones]) ocupados.add(a.id);
  }
  for (const p of estado.proyecto.programas) {
    ocupados.add(p.id);
    for (const a of [...p.perfilIngreso, ...p.perfilEgreso, ...p.resultadosPrograma]) ocupados.add(a.id);
  }
  for (const a of estado.proyecto.asignaturas) ocupados.add(a.id);
  for (const f of estado.proyecto.fuentesCurriculares) ocupados.add(f.id);
  for (const v of estado.proyecto.vinculosProgramaMarco) ocupados.add(v.id);
  for (const a of estado.proyecto.alineaciones) ocupados.add(a.id);
  return ocupados;
}

/**
 * Da identidad propia a las afirmaciones del marco que colisionen con ids de
 * otros documentos. Sin esto, dos marcos con el mismo texto romperían la
 * unicidad global de ids que exige el agregado V3.
 */
function desambiguarIdsMarco(
  marco: MarcoEducativoInstitucional,
  ocupados: Set<string>
): MarcoEducativoInstitucional {
  const usados = new Set(ocupados);
  const copia = clonar(marco);
  for (const lista of [copia.principios, copia.afirmaciones]) {
    const vistos = new Set<string>();
    for (const a of lista) {
      const base = a.id;
      let id = base;
      let n = 2;
      while (usados.has(id) || vistos.has(id)) {
        id = `${base}_${n}`;
        n++;
      }
      a.id = id;
      usados.add(id);
      vistos.add(id);
    }
  }
  return copia;
}

function clonarConversacionMacro(
  anterior: ConversacionPersistida | undefined,
  scopeId: string,
  documentoId: string | null,
  vista: VistaMacroPersistible
): ConversacionPersistida {
  return {
    ...(anterior ? clonar(anterior) : {}),
    scopeId,
    modulo: "macro",
    documentoId,
    mensajes: clonar(vista.mensajes),
    sugerencias: clonar(vista.sugerencias),
    intencion: vista.intencion,
    seccionActiva: vista.seccionActiva,
    crudo: vista.crudo
  };
}

/**
 * Aplica una vista Macro al agregado, sin mutar la base ni tocar documentos o
 * conversaciones de otros módulos. La vista es la fuente de verdad para el
 * marco seleccionado y para la lista de fuentes del proyecto.
 */
export function aplicarVistaMacroV3(
  base: EstadoGuardadoV3 | null,
  vista: VistaMacroPersistible,
  idProyectoSiNuevo: string
): EstadoGuardadoV3 {
  if (base !== null && !esEstadoGuardadoV3(base)) {
    throw new Error("No se puede actualizar un estado V3 inválido.");
  }
  if (base !== null && base.seleccion.modulo === "meso") {
    throw new Error("No se puede aplicar una vista Macro mientras el scope meso está activo.");
  }

  const estado = base === null ? crearEstadoGuardadoV3Vacio(idProyectoSiNuevo) : clonar(base);
  const vistaCopia = clonar(vista);

  if (vistaCopia.marco === null) {
    // Lienzo de entrada: solo se guarda la conversación, sin crear documento.
    // Las fuentes sí se guardan: el docente puede registrarlas antes del marco.
    estado.proyecto.fuentesCurriculares = clonar(vistaCopia.fuentes);
    const scopeId = scopeMacro(null);
    const anterior = estado.conversaciones[scopeId];
    estado.conversaciones[scopeId] = clonarConversacionMacro(anterior, scopeId, null, vistaCopia);
    estado.seleccion = { modulo: "macro", documentoId: null };
    if (!esEstadoGuardadoV3(estado)) throw new Error("La vista Macro vacía produjo un estado V3 inválido.");
    return estado;
  }

  const marcoVista = vistaCopia.marco;
  // Solo se edita el marco que la selección apunta. Sin selección concreta
  // (lienzo o inicio) siempre se crea un documento nuevo: reutilizar por
  // coincidencia de id o de nombre podría sobrescribir un marco hermano.
  let marcoId: string | null = null;
  if (estado.seleccion.modulo === "macro" && estado.seleccion.documentoId !== null) {
    const seleccionada = estado.proyecto.marcos.find((m) => m.id === estado.seleccion.documentoId);
    if (seleccionada) marcoId = seleccionada.id;
  }

  if (marcoId !== null) {
    const final = desambiguarIdsMarco(
      { ...marcoVista, id: marcoId },
      idsOcupadosAjenos(estado, marcoId)
    );
    estado.proyecto.marcos = estado.proyecto.marcos.map((m) => (m.id === marcoId ? final : m));
  } else {
    marcoId = idMarcoLibre(estado.proyecto, marcoVista.nombre);
    const final = desambiguarIdsMarco(
      { ...marcoVista, id: marcoId },
      idsOcupadosAjenos(estado, null)
    );
    estado.proyecto.marcos = [...estado.proyecto.marcos, final];
  }

  // La vista transporta la lista completa de fuentes: el editor Macro es quien
  // las gestiona en este corte, así que altas, ediciones y bajas se reflejan.
  estado.proyecto.fuentesCurriculares = clonar(vistaCopia.fuentes);

  // Si la edición borró principios vinculados, se podan las huérfanas.
  estado.proyecto.alineaciones = podarAlineacionesHuerfanas(estado.proyecto);

  const scopeId = scopeMacro(marcoId);
  const anterior = estado.conversaciones[scopeId];
  estado.conversaciones[scopeId] = clonarConversacionMacro(anterior, scopeId, marcoId, vistaCopia);
  estado.seleccion = { modulo: "macro", documentoId: marcoId };

  if (!esEstadoGuardadoV3(estado)) throw new Error("La vista Macro produjo un estado V3 inválido.");
  return estado;
}

/** Defaults exportados para crear una vista sin compartir arrays mutables. */
export function vistaMacroVacia(): VistaMacroPersistible {
  return clonar(VISTA_VACIA);
}
