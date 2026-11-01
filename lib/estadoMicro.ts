/**
 * Puente puro entre la vista actual del microcurrículo y el agregado V3.
 * No accede a localStorage, window, red ni APIs de Node.
 */

import {
  esEstadoGuardadoV3,
  podarAlineacionesHuerfanas,
  type ConversacionPersistida,
  type EstadoGuardadoV3,
  type ProyectoCurricular
} from "./proyecto.ts";
import { normalizarMicrocurriculo, type ChatMensaje, type Intencion, type Microcurriculo } from "./schema.ts";

export type VistaMicroPersistible = {
  microcurriculo: Microcurriculo | null;
  mensajes: ChatMensaje[];
  sugerencias: string[];
  intencion: Intencion;
  seccionActiva: string | null;
  crudo: string;
};

export type ResultadoLeerVistaMicro =
  | { ok: true; vista: VistaMicroPersistible }
  | { ok: false; motivo: "scope_no_soportado" };

const VISTA_VACIA: VistaMicroPersistible = {
  microcurriculo: null,
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

function scopeInicio(): string {
  return "inicio";
}

function scopeMicro(documentoId: string | null): string {
  return `micro:${documentoId ?? "sin-documento"}`;
}

function conversacionVacia(
  scopeId: string,
  modulo: "inicio" | "micro",
  documentoId: string | null
): ConversacionPersistida {
  return {
    scopeId,
    modulo,
    documentoId,
    mensajes: [],
    sugerencias: [],
    intencion: "entender",
    seccionActiva: null,
    crudo: ""
  };
}

function vistaDesdeConversacion(
  microcurriculo: Microcurriculo | null,
  conversacion: ConversacionPersistida | undefined,
  scopeId: string,
  modulo: "inicio" | "micro",
  documentoId: string | null
): VistaMicroPersistible {
  const datos = conversacion ?? conversacionVacia(scopeId, modulo, documentoId);
  // Migra al leer: un micro heredado (RA como texto, actividades sin ids)
  // se entrega ya normalizado y el autosave lo persiste migrado.
  const micro = microcurriculo === null ? null : normalizarMicrocurriculo(clonar(microcurriculo));
  return {
    microcurriculo: micro,
    mensajes: clonar(datos.mensajes),
    sugerencias: clonar(datos.sugerencias),
    intencion: datos.intencion,
    seccionActiva: datos.seccionActiva,
    crudo: datos.crudo
  };
}

/** Construye el estado inicial V3 del proyecto, sin inventar documentos. */
export function crearEstadoGuardadoV3Vacio(idProyecto: string): EstadoGuardadoV3 {
  const proyecto: ProyectoCurricular = {
    id: idProyecto.trim() || "proyecto_local",
    nombre: "Proyecto curricular",
    marcos: [],
    programas: [],
    asignaturas: [],
    fuentesCurriculares: [],
    vinculosProgramaMarco: [],
    alineaciones: []
  };
  const inicio = conversacionVacia(scopeInicio(), "inicio", null);
  const estado: EstadoGuardadoV3 = {
    version: 3,
    proyecto,
    seleccion: { modulo: "inicio", documentoId: null },
    conversaciones: { [inicio.scopeId]: inicio }
  };
  if (!esEstadoGuardadoV3(estado)) throw new Error("No se pudo construir un estado V3 vacío válido.");
  return estado;
}

/**
 * Lee el estado visible por el editor Micro sin alterar el agregado.
 * Los scopes Macro/Meso no se reinterpretan como Micro: sus datos quedan intactos.
 */
export function leerVistaMicroV3(estado: EstadoGuardadoV3): ResultadoLeerVistaMicro {
  if (!esEstadoGuardadoV3(estado)) return { ok: false, motivo: "scope_no_soportado" };

  const seleccion = estado.seleccion;
  if (seleccion.modulo === "inicio") {
    const scopeId = scopeInicio();
    return {
      ok: true,
      vista: vistaDesdeConversacion(
        null,
        estado.conversaciones[scopeId],
        scopeId,
        "inicio",
        null
      )
    };
  }

  if (seleccion.modulo !== "micro") return { ok: false, motivo: "scope_no_soportado" };

  const documentoId = seleccion.documentoId;
  // La lista de Micros no corresponde a la ficha singular que representa esta vista.
  if (documentoId === null) return { ok: false, motivo: "scope_no_soportado" };
  const asignatura = estado.proyecto.asignaturas.find((item) => item.id === documentoId) ?? null;
  // Una selección concreta sin asignatura no debe convertirse en una ficha vacía.
  if (!asignatura) return { ok: false, motivo: "scope_no_soportado" };

  const scopeId = scopeMicro(documentoId);
  return {
    ok: true,
    vista: vistaDesdeConversacion(
      asignatura?.microcurriculo ?? null,
      estado.conversaciones[scopeId],
      scopeId,
      "micro",
      documentoId
    )
  };
}

function sufijoFolio(folio: string): string {
  // Doble FNV-1a: determinista en navegador/Node y sin crypto ni dependencias.
  const hash = (semilla: number) => {
    let actual = semilla >>> 0;
    for (let i = 0; i < folio.length; i++) {
      actual = Math.imul(actual ^ folio.charCodeAt(i), 0x01000193);
    }
    return (actual >>> 0).toString(36).padStart(7, "0");
  };
  return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}`;
}

function idAsignaturaDesdeFolio(folio: string): string {
  const limpio = folio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 36);
  const slug = limpio || "sin_folio";
  return `asignatura_${slug}_${sufijoFolio(folio)}`;
}

function idEstaOcupado(proyecto: ProyectoCurricular, id: string): boolean {
  return (
    proyecto.id === id ||
    proyecto.marcos.some((marco) => marco.id === id || [...marco.principios, ...marco.afirmaciones].some((item) => item.id === id)) ||
    proyecto.programas.some(
      (programa) =>
        programa.id === id ||
        [...programa.perfilIngreso, ...programa.perfilEgreso, ...programa.resultadosPrograma].some((item) => item.id === id)
    ) ||
    proyecto.asignaturas.some((asignatura) => asignatura.id === id) ||
    proyecto.fuentesCurriculares.some((fuente) => fuente.id === id) ||
    proyecto.vinculosProgramaMarco.some((vinculo) => vinculo.id === id) ||
    proyecto.alineaciones.some((alineacion) => alineacion.id === id)
  );
}

function idAsignaturaLibre(proyecto: ProyectoCurricular, folio: string): string {
  const base = idAsignaturaDesdeFolio(folio);
  if (!idEstaOcupado(proyecto, base)) return base;
  let sufijo = 2;
  while (idEstaOcupado(proyecto, `${base}_${sufijo}`)) sufijo++;
  return `${base}_${sufijo}`;
}

function clonarConversacion(
  anterior: ConversacionPersistida | undefined,
  scopeId: string,
  modulo: "inicio" | "micro",
  documentoId: string | null,
  vista: VistaMicroPersistible
): ConversacionPersistida {
  return {
    ...(anterior ? clonar(anterior) : {}),
    scopeId,
    modulo,
    documentoId,
    mensajes: clonar(vista.mensajes),
    sugerencias: clonar(vista.sugerencias),
    intencion: vista.intencion,
    seccionActiva: vista.seccionActiva,
    crudo: vista.crudo
  };
}

/**
 * Aplica una vista Micro al agregado, sin mutar la base ni tocar documentos o
 * conversaciones hermanas. La conversación de inicio se conserva al transferir
 * el hilo al primer Micro para que nunca se pierdan mensajes históricos.
 */
export function aplicarVistaMicroV3(
  base: EstadoGuardadoV3 | null,
  vista: VistaMicroPersistible,
  idProyectoSiNuevo: string
): EstadoGuardadoV3 {
  if (base !== null && !esEstadoGuardadoV3(base)) {
    throw new Error("No se puede actualizar un estado V3 inválido.");
  }
  if (base !== null && (base.seleccion.modulo === "macro" || base.seleccion.modulo === "meso")) {
    throw new Error(`No se puede aplicar una vista Micro mientras el scope ${base.seleccion.modulo} está activo.`);
  }
  if (base?.seleccion.modulo === "micro" && base.seleccion.documentoId === null) {
    throw new Error("No se puede aplicar una vista Micro desde la lista de asignaturas.");
  }
  if (base?.seleccion.modulo === "micro" && vista.microcurriculo === null) {
    throw new Error("Una vista Micro nula no puede reemplazar una asignatura seleccionada.");
  }

  const estado = base === null ? crearEstadoGuardadoV3Vacio(idProyectoSiNuevo) : clonar(base);
  const vistaCopia = clonar(vista);
  // Normaliza lo que viene del editor o del chat: asigna ids estables a RA y
  // actividades nuevas, resuelve el `mide` heredado y filtra vínculos rotos.
  if (vistaCopia.microcurriculo !== null) {
    vistaCopia.microcurriculo = normalizarMicrocurriculo(vistaCopia.microcurriculo);
  }

  if (vistaCopia.microcurriculo === null) {
    const scopeId = scopeInicio();
    const anterior = estado.conversaciones[scopeId];
    estado.conversaciones[scopeId] = clonarConversacion(anterior, scopeId, "inicio", null, vistaCopia);
    estado.seleccion = { modulo: "inicio", documentoId: null };
    if (!esEstadoGuardadoV3(estado)) throw new Error("La vista de inicio produjo un estado V3 inválido.");
    return estado;
  }

  const microcurriculo = vistaCopia.microcurriculo;
  let asignaturaId: string | null = null;
  if (estado.seleccion.modulo === "micro" && estado.seleccion.documentoId !== null) {
    const seleccionada = estado.proyecto.asignaturas.find((item) => item.id === estado.seleccion.documentoId);
    if (seleccionada) asignaturaId = seleccionada.id;
  }

  const existente = asignaturaId
    ? estado.proyecto.asignaturas.find((item) => item.id === asignaturaId) ?? null
    : null;

  if (existente) {
    // En una edición conserva el vínculo Meso existente; el texto libre
    // `microcurriculo.ident.programa` no crea ni reemplaza una relación.
    estado.proyecto.asignaturas = estado.proyecto.asignaturas.map((item) =>
      item.id === existente.id ? { ...item, microcurriculo } : item
    );
  } else {
    asignaturaId = idAsignaturaLibre(estado.proyecto, microcurriculo.folio);
    estado.proyecto.asignaturas = [
      ...estado.proyecto.asignaturas,
      { id: asignaturaId, programaId: null, microcurriculo }
    ];
  }

  // Una edición puede borrar RA o actividades vinculadas: las alineaciones
  // huérfanas se podan para no dejar el agregado inválido ni bloquear el guardado.
  estado.proyecto.alineaciones = podarAlineacionesHuerfanas(estado.proyecto);

  const scopeId = scopeMicro(asignaturaId);
  const anterior = estado.conversaciones[scopeId];
  estado.conversaciones[scopeId] = clonarConversacion(anterior, scopeId, "micro", asignaturaId, vistaCopia);
  estado.seleccion = { modulo: "micro", documentoId: asignaturaId };

  if (!esEstadoGuardadoV3(estado)) throw new Error("La vista Micro produjo un estado V3 inválido.");
  return estado;
}

/** Defaults exportados para crear una vista en el consumidor sin compartir arrays mutables. */
export function vistaMicroVacia(): VistaMicroPersistible {
  return clonar(VISTA_VACIA);
}

/** Reexporta los tipos compartidos que suelen necesitar los consumidores del puente. */
export type { ChatMensaje, Intencion, Microcurriculo };

