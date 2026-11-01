/**
 * Puente puro entre la vista del Mesocurrículo y el agregado V3.
 * No accede a localStorage, window, red ni APIs de Node.
 *
 * Espejo de lib/estadoMacro.ts: la vista Meso es lo único que la página del
 * programa lee y escribe. Todo lo demás del proyecto se conserva intacto.
 *
 * El vínculo con el marco vive en el proyecto, no dentro del programa: la
 * vista lo transporta como `vinculoMarcoId` y este módulo mantiene la regla
 * de un solo principal activo por programa, conservando el historial.
 */

import { crearEstadoGuardadoV3Vacio } from "./estadoMicro.ts";
import { SECCIONES_MESO, type SeccionMeso } from "./promptMeso.ts";
import {
  esEstadoGuardadoV3,
  type ConversacionPersistida,
  type EstadoGuardadoV3,
  type ProgramaAcademico,
  type ProyectoCurricular,
  type VinculoProgramaMarco
} from "./proyecto.ts";
import type { ChatMensaje, Intencion } from "./schema.ts";

export type { SeccionMeso };
export { SECCIONES_MESO };

export type VistaMesoPersistible = {
  programa: ProgramaAcademico | null;
  /** Id del marco que orienta al programa, o null si no hay vínculo. */
  vinculoMarcoId: string | null;
  mensajes: ChatMensaje[];
  sugerencias: string[];
  intencion: Intencion;
  seccionActiva: SeccionMeso | null;
  crudo: string;
};

export type ResultadoLeerVistaMeso =
  | { ok: true; vista: VistaMesoPersistible }
  | { ok: false; motivo: "scope_no_soportado" };

const VISTA_VACIA: VistaMesoPersistible = {
  programa: null,
  vinculoMarcoId: null,
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

function scopeMeso(documentoId: string | null): string {
  return `meso:${documentoId ?? "sin-documento"}`;
}

function conversacionVaciaMeso(scopeId: string, documentoId: string | null): ConversacionPersistida {
  return {
    scopeId,
    modulo: "meso",
    documentoId,
    mensajes: [],
    sugerencias: [],
    intencion: "entender",
    seccionActiva: null,
    crudo: ""
  };
}

function esSeccionMeso(v: unknown): v is SeccionMeso {
  return typeof v === "string" && (SECCIONES_MESO as readonly string[]).includes(v);
}

/** Marco principal activo del programa, si lo hay. */
export function vinculoPrincipal(
  proyecto: ProyectoCurricular,
  programaId: string
): VinculoProgramaMarco | null {
  return (
    proyecto.vinculosProgramaMarco.find(
      (v) => v.programaId === programaId && v.principal && v.estado === "activo"
    ) ?? null
  );
}

function vistaDesdeConversacionMeso(
  programa: ProgramaAcademico | null,
  vinculoMarcoId: string | null,
  conversacion: ConversacionPersistida | undefined,
  scopeId: string,
  documentoId: string | null
): VistaMesoPersistible {
  const datos = conversacion ?? conversacionVaciaMeso(scopeId, documentoId);
  return {
    programa: programa === null ? null : clonar(programa),
    vinculoMarcoId,
    mensajes: clonar(datos.mensajes),
    sugerencias: clonar(datos.sugerencias),
    intencion: datos.intencion,
    seccionActiva: esSeccionMeso(datos.seccionActiva) ? datos.seccionActiva : null,
    crudo: datos.crudo
  };
}

/**
 * Lee el estado visible por el editor del programa sin alterar el agregado.
 * Solo responde a la selección Meso; cualquier otro módulo queda intacto.
 */
export function leerVistaMesoV3(estado: EstadoGuardadoV3): ResultadoLeerVistaMeso {
  if (!esEstadoGuardadoV3(estado)) return { ok: false, motivo: "scope_no_soportado" };
  if (estado.seleccion.modulo !== "meso") return { ok: false, motivo: "scope_no_soportado" };

  const documentoId = estado.seleccion.documentoId;
  if (documentoId === null) {
    const scopeId = scopeMeso(null);
    return {
      ok: true,
      vista: vistaDesdeConversacionMeso(null, null, estado.conversaciones[scopeId], scopeId, null)
    };
  }

  const programa = estado.proyecto.programas.find((p) => p.id === documentoId) ?? null;
  if (!programa) return { ok: false, motivo: "scope_no_soportado" };

  const scopeId = scopeMeso(documentoId);
  return {
    ok: true,
    vista: vistaDesdeConversacionMeso(
      programa,
      vinculoPrincipal(estado.proyecto, documentoId)?.marcoId ?? null,
      estado.conversaciones[scopeId],
      scopeId,
      documentoId
    )
  };
}

function idProgramaDesdeNombre(nombre: string): string {
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
  return `programa_${slug}_${sufijo}`;
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

function idProgramaLibre(proyecto: ProyectoCurricular, nombre: string): string {
  const base = idProgramaDesdeNombre(nombre || "programa");
  if (!idEstaOcupado(proyecto, base)) return base;
  let sufijo = 2;
  while (idEstaOcupado(proyecto, `${base}_${sufijo}`)) sufijo++;
  return `${base}_${sufijo}`;
}

function idsOcupadosAjenos(estado: EstadoGuardadoV3, exceptoProgramaId: string | null): Set<string> {
  const ocupados = new Set<string>();
  ocupados.add(estado.proyecto.id);
  for (const m of estado.proyecto.marcos) {
    ocupados.add(m.id);
    for (const a of [...m.principios, ...m.afirmaciones]) ocupados.add(a.id);
  }
  for (const p of estado.proyecto.programas) {
    if (p.id === exceptoProgramaId) continue;
    ocupados.add(p.id);
    for (const a of [...p.perfilIngreso, ...p.perfilEgreso, ...p.resultadosPrograma]) ocupados.add(a.id);
  }
  for (const a of estado.proyecto.asignaturas) ocupados.add(a.id);
  for (const f of estado.proyecto.fuentesCurriculares) ocupados.add(f.id);
  for (const v of estado.proyecto.vinculosProgramaMarco) ocupados.add(v.id);
  for (const a of estado.proyecto.alineaciones) ocupados.add(a.id);
  return ocupados;
}

function desambiguarIdsPrograma(
  programa: ProgramaAcademico,
  ocupados: Set<string>
): ProgramaAcademico {
  const usados = new Set(ocupados);
  const copia = clonar(programa);
  for (const lista of [copia.perfilIngreso, copia.perfilEgreso, copia.resultadosPrograma]) {
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

function clonarConversacionMeso(
  anterior: ConversacionPersistida | undefined,
  scopeId: string,
  documentoId: string | null,
  vista: VistaMesoPersistible
): ConversacionPersistida {
  return {
    ...(anterior ? clonar(anterior) : {}),
    scopeId,
    modulo: "meso",
    documentoId,
    mensajes: clonar(vista.mensajes),
    sugerencias: clonar(vista.sugerencias),
    intencion: vista.intencion,
    seccionActiva: vista.seccionActiva,
    crudo: vista.crudo
  };
}

/**
 * Aplica una vista Meso al agregado, sin mutar la base ni tocar documentos o
 * conversaciones de otros módulos. Mantiene un solo vínculo principal activo
 * por programa; el anterior se conserva como historial inactivo.
 */
export function aplicarVistaMesoV3(
  base: EstadoGuardadoV3 | null,
  vista: VistaMesoPersistible,
  idProyectoSiNuevo: string
): EstadoGuardadoV3 {
  if (base !== null && !esEstadoGuardadoV3(base)) {
    throw new Error("No se puede actualizar un estado V3 inválido.");
  }
  if (base?.seleccion.modulo === "meso" && base.seleccion.documentoId !== null && vista.programa === null) {
    throw new Error("Una vista Meso nula no puede reemplazar un programa seleccionado.");
  }

  const estado = base === null ? crearEstadoGuardadoV3Vacio(idProyectoSiNuevo) : clonar(base);
  const vistaCopia = clonar(vista);

  if (vistaCopia.programa === null) {
    const scopeId = scopeMeso(null);
    const anterior = estado.conversaciones[scopeId];
    estado.conversaciones[scopeId] = clonarConversacionMeso(anterior, scopeId, null, vistaCopia);
    estado.seleccion = { modulo: "meso", documentoId: null };
    if (!esEstadoGuardadoV3(estado)) throw new Error("La vista Meso vacía produjo un estado V3 inválido.");
    return estado;
  }

  const programaVista = vistaCopia.programa;
  let programaId: string | null = null;
  if (estado.seleccion.modulo === "meso" && estado.seleccion.documentoId !== null) {
    const seleccionada = estado.proyecto.programas.find((p) => p.id === estado.seleccion.documentoId);
    if (seleccionada) programaId = seleccionada.id;
  }

  if (programaId !== null) {
    const final = desambiguarIdsPrograma(
      { ...programaVista, id: programaId },
      idsOcupadosAjenos(estado, programaId)
    );
    estado.proyecto.programas = estado.proyecto.programas.map((p) => (p.id === programaId ? final : p));
  } else {
    programaId = idProgramaLibre(estado.proyecto, programaVista.nombre);
    const final = desambiguarIdsPrograma(
      { ...programaVista, id: programaId },
      idsOcupadosAjenos(estado, null)
    );
    estado.proyecto.programas = [...estado.proyecto.programas, final];
  }

  // Vínculo principal: solo a un marco que exista. El anterior principal se
  // conserva como historial inactivo, nunca se borra.
  const marcoId =
    vistaCopia.vinculoMarcoId && estado.proyecto.marcos.some((m) => m.id === vistaCopia.vinculoMarcoId)
      ? vistaCopia.vinculoMarcoId
      : null;
  estado.proyecto.vinculosProgramaMarco = estado.proyecto.vinculosProgramaMarco.map((v) =>
    v.programaId === programaId && v.principal && v.estado === "activo"
      ? { ...v, estado: "inactivo" as const, principal: false }
      : v
  );
  if (marcoId !== null) {
    const idVinculo = `vinculo_${programaId}_${marcoId}`;
    const previo = estado.proyecto.vinculosProgramaMarco.find((v) => v.id === idVinculo);
    if (previo) {
      estado.proyecto.vinculosProgramaMarco = estado.proyecto.vinculosProgramaMarco.map((v) =>
        v.id === idVinculo ? { ...v, estado: "activo" as const, principal: true } : v
      );
    } else {
      estado.proyecto.vinculosProgramaMarco = [
        ...estado.proyecto.vinculosProgramaMarco,
        { id: idVinculo, programaId, marcoId, vigencia: null, estado: "activo" as const, principal: true }
      ];
    }
  }

  const scopeId = scopeMeso(programaId);
  const anterior = estado.conversaciones[scopeId];
  estado.conversaciones[scopeId] = clonarConversacionMeso(anterior, scopeId, programaId, vistaCopia);
  estado.seleccion = { modulo: "meso", documentoId: programaId };

  if (!esEstadoGuardadoV3(estado)) throw new Error("La vista Meso produjo un estado V3 inválido.");
  return estado;
}

/** Defaults exportados para crear una vista sin compartir arrays mutables. */
export function vistaMesoVacia(): VistaMesoPersistible {
  return clonar(VISTA_VACIA);
}
