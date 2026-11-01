/**
 * DesignConia — proyecto curricular con niveles Macro, Meso y Micro.
 *
 * Este módulo contiene tipos, guardas de datos y una migración pura desde el
 * estado V2 del microcurrículo. No accede a localStorage, red, Node ni React.
 * El Microcurriculo se importa del contrato canónico: aquí no se replica su
 * estructura de ocho secciones.
 */

import {
  POR_DEFINIR,
  esEstadoGuardado,
  esMicrocurriculo,
  type ChatMensaje,
  type EstadoGuardado,
  type Intencion,
  type Microcurriculo
} from "./schema.ts";

/* -------------------------------------------------------------------------- */
/* Dominio curricular                                                         */
/* -------------------------------------------------------------------------- */

export type OrigenAfirmacion = "docente" | "documento" | "sugerencia_IA" | "derivado";
export type EstadoAfirmacion = "sin_confirmar" | "confirmado_por_docente" | "contrastado_con_fuente";
export type EstadoMarco = "borrador" | "vigente" | "archivado";
export type EstadoPrograma = "borrador" | "pendiente_legado" | "vigente" | "archivado";
export type EstadoVinculo = "propuesto" | "activo" | "inactivo";
export type EstadoAlineacion = "propuesto" | "aceptado";
export type TipoFuenteCurricular = "modelo_educativo" | "lineamiento" | "plan_institucional" | "otro";

export type Vigencia = {
  desde: string | null;
  hasta: string | null;
};

/** Referencia puntual a una fuente curricular, separada de la bibliografía. */
export type CitaFuenteCurricular = {
  fuenteId: string;
  localizador?: string;
  pagina?: number | string;
  seccion?: string;
};

/** Afirmación trazable; nunca equivale por sí sola a un dato oficial. */
export type AfirmacionCurricular = {
  id: string;
  texto: string;
  origen: OrigenAfirmacion;
  estado: EstadoAfirmacion;
  citas: CitaFuenteCurricular[];
};

/** Fuente institucional, no referencia bibliográfica de una asignatura. */
export type FuenteCurricular = {
  id: string;
  titulo: string;
  tipo: TipoFuenteCurricular;
  emisor?: string;
  identificador?: string;
  url?: string;
  fechaPublicacion?: string;
  /**
   * Año del documento (metadatos del PDF, lastModified o declarado por el
   * docente). Solo se integran PDFs de como máximo 3 años de antigüedad.
   */
  anio?: number;
  /** Nombre del archivo PDF integrado, si la fuente viene de un adjunto. */
  nombreArchivo?: string;
  /** Texto extraído del PDF, recortado para no reventar el almacenamiento. */
  textoExtraido?: string;
  /** Páginas del PDF integrado. */
  paginas?: number;
};

/** Macrocurrículo: marco educativo institucional/versionado. */
export type MarcoEducativoInstitucional = {
  id: string;
  nombre: string;
  emisor?: string;
  version: string;
  vigencia: Vigencia | null;
  estado: EstadoMarco;
  principios: AfirmacionCurricular[];
  afirmaciones: AfirmacionCurricular[];
};

/** Mesocurrículo: programa académico. */
export type ProgramaAcademico = {
  id: string;
  nombre: string;
  codigo?: string;
  estado: EstadoPrograma;
  perfilIngreso: AfirmacionCurricular[];
  perfilEgreso: AfirmacionCurricular[];
  resultadosPrograma: AfirmacionCurricular[];
};

/** Microcurrículo canónico asociado opcionalmente a un programa. */
export type Asignatura = {
  id: string;
  programaId: string | null;
  microcurriculo: Microcurriculo;
};

/** Un programa puede conservar varios marcos/versiones, con uno principal activo. */
export type VinculoProgramaMarco = {
  id: string;
  programaId: string;
  marcoId: string;
  vigencia: Vigencia | null;
  estado: EstadoVinculo;
  principal: boolean;
};

export type TipoNodoCurricular =
  | "principio_marco"
  | "resultado_programa"
  | "ra_micro"
  | "actividad_evaluacion";

export type NodoCurricular = {
  tipo: TipoNodoCurricular;
  id: string;
  /**
   * Documento que contiene al nodo, para desambiguar ids repetidos entre
   * micros: programa id para resultado_programa, asignatura id para ra_micro
   * y actividad_evaluacion. Ausente en datos heredados: se resuelve global.
   */
  contextoId?: string;
};

/** Alineación entre entidades que ya tienen identidad estable en el proyecto. */
export type AlineacionCurricular = {
  id: string;
  origen: NodoCurricular;
  destino: NodoCurricular;
  estado: EstadoAlineacion;
  justificacion?: string;
};

/** Agregado raíz local del proyecto; no representa una institución global. */
export type ProyectoCurricular = {
  id: string;
  nombre: string;
  marcos: MarcoEducativoInstitucional[];
  programas: ProgramaAcademico[];
  asignaturas: Asignatura[];
  fuentesCurriculares: FuenteCurricular[];
  vinculosProgramaMarco: VinculoProgramaMarco[];
  alineaciones: AlineacionCurricular[];
};

/* -------------------------------------------------------------------------- */
/* Estado persistido V3                                                       */
/* -------------------------------------------------------------------------- */

export type ModuloProyecto = "inicio" | "macro" | "meso" | "micro";

export type SeleccionProyecto = {
  modulo: ModuloProyecto;
  /**
   * null en inicio o en la pantalla de lista del módulo Macro/Meso/Micro,
   * cuando todavía no se seleccionó un documento concreto.
   */
  documentoId: string | null;
};

/** Una conversación independiente por scope (p. ej. micro:<asignaturaId>). */
export type ConversacionPersistida = {
  scopeId: string;
  modulo: ModuloProyecto;
  documentoId: string | null;
  mensajes: ChatMensaje[];
  sugerencias: string[];
  intencion: Intencion;
  /** Texto abierto para permitir secciones propias de Macro y Meso. */
  seccionActiva: string | null;
  /** Contrato activo del módulo V3; nunca se inicializa con la respuesta V2. */
  crudo: string;
  /** Respuesta original V2, preservada solo para auditoría/recuperación. */
  crudoLegado?: string;
};

export type EstadoGuardadoV3 = {
  version: 3;
  proyecto: ProyectoCurricular;
  seleccion: SeleccionProyecto;
  conversaciones: Record<string, ConversacionPersistida>;
};

/* -------------------------------------------------------------------------- */
/* Guardas y validación de invariantes                                        */
/* -------------------------------------------------------------------------- */

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string";
}

function esTextoOpcional(valor: unknown): boolean {
  return valor === undefined || esTexto(valor);
}

function esVigencia(valor: unknown): valor is Vigencia | null {
  if (valor === null) return true;
  if (!esRegistro(valor)) return false;
  return (
    (valor.desde === null || esTexto(valor.desde)) &&
    (valor.hasta === null || esTexto(valor.hasta))
  );
}

const ORIGENES: readonly OrigenAfirmacion[] = ["docente", "documento", "sugerencia_IA", "derivado"];
const ESTADOS_AFIRMACION: readonly EstadoAfirmacion[] = [
  "sin_confirmar",
  "confirmado_por_docente",
  "contrastado_con_fuente"
];
const TIPOS_FUENTE: readonly TipoFuenteCurricular[] = [
  "modelo_educativo",
  "lineamiento",
  "plan_institucional",
  "otro"
];

function esCitaFuente(valor: unknown): valor is CitaFuenteCurricular {
  if (!esRegistro(valor) || !esTexto(valor.fuenteId) || !valor.fuenteId.trim()) return false;
  if (!esTextoOpcional(valor.localizador) || !esTextoOpcional(valor.seccion)) return false;
  const paginaOk =
    valor.pagina === undefined ||
    esTexto(valor.pagina) ||
    (typeof valor.pagina === "number" && Number.isFinite(valor.pagina));
  if (!paginaOk) return false;
  return Boolean(
    (typeof valor.localizador === "string" && valor.localizador.trim()) ||
      (typeof valor.seccion === "string" && valor.seccion.trim()) ||
      (typeof valor.pagina === "string" && valor.pagina.trim()) ||
      (typeof valor.pagina === "number" && Number.isFinite(valor.pagina))
  );
}

function esAfirmacion(valor: unknown): valor is AfirmacionCurricular {
  if (!esRegistro(valor)) return false;
  const requiereCita = valor.origen === "documento" || valor.estado === "contrastado_con_fuente";
  return (
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esTexto(valor.texto) &&
    ORIGENES.includes(valor.origen as OrigenAfirmacion) &&
    ESTADOS_AFIRMACION.includes(valor.estado as EstadoAfirmacion) &&
    Array.isArray(valor.citas) &&
    valor.citas.every(esCitaFuente) &&
    (!requiereCita || valor.citas.length > 0)
  );
}

function esAnio(valor: unknown): boolean {
  return (
    valor === undefined ||
    (typeof valor === "number" && Number.isInteger(valor) && valor >= 1900 && valor <= 2100)
  );
}

function esPaginas(valor: unknown): boolean {
  return valor === undefined || (typeof valor === "number" && Number.isInteger(valor) && valor > 0);
}

function esFuente(valor: unknown): valor is FuenteCurricular {
  if (!esRegistro(valor)) return false;
  return (
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esTexto(valor.titulo) &&
    TIPOS_FUENTE.includes(valor.tipo as TipoFuenteCurricular) &&
    esTextoOpcional(valor.emisor) &&
    esTextoOpcional(valor.identificador) &&
    esTextoOpcional(valor.url) &&
    esTextoOpcional(valor.fechaPublicacion) &&
    esAnio(valor.anio) &&
    esTextoOpcional(valor.nombreArchivo) &&
    esTextoOpcional(valor.textoExtraido) &&
    esPaginas(valor.paginas)
  );
}

function esMarco(valor: unknown): valor is MarcoEducativoInstitucional {
  if (!esRegistro(valor)) return false;
  return (
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esTexto(valor.nombre) &&
    esTextoOpcional(valor.emisor) &&
    esTexto(valor.version) &&
    esVigencia(valor.vigencia) &&
    ["borrador", "vigente", "archivado"].includes(String(valor.estado)) &&
    Array.isArray(valor.principios) &&
    valor.principios.every(esAfirmacion) &&
    Array.isArray(valor.afirmaciones) &&
    valor.afirmaciones.every(esAfirmacion)
  );
}

function esPrograma(valor: unknown): valor is ProgramaAcademico {
  if (!esRegistro(valor)) return false;
  return (
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esTexto(valor.nombre) &&
    esTextoOpcional(valor.codigo) &&
    ["borrador", "pendiente_legado", "vigente", "archivado"].includes(String(valor.estado)) &&
    Array.isArray(valor.perfilIngreso) &&
    valor.perfilIngreso.every(esAfirmacion) &&
    Array.isArray(valor.perfilEgreso) &&
    valor.perfilEgreso.every(esAfirmacion) &&
    Array.isArray(valor.resultadosPrograma) &&
    valor.resultadosPrograma.every(esAfirmacion)
  );
}

function esVinculo(valor: unknown): valor is VinculoProgramaMarco {
  if (!esRegistro(valor)) return false;
  return (
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esTexto(valor.programaId) &&
    esTexto(valor.marcoId) &&
    esVigencia(valor.vigencia) &&
    ["propuesto", "activo", "inactivo"].includes(String(valor.estado)) &&
    typeof valor.principal === "boolean"
  );
}

const TIPOS_NODO: readonly TipoNodoCurricular[] = [
  "principio_marco",
  "resultado_programa",
  "ra_micro",
  "actividad_evaluacion"
];

function esNodo(valor: unknown): valor is NodoCurricular {
  return (
    esRegistro(valor) &&
    TIPOS_NODO.includes(valor.tipo as TipoNodoCurricular) &&
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esTextoOpcional(valor.contextoId)
  );
}

function esAlineacion(valor: unknown): valor is AlineacionCurricular {
  if (!esRegistro(valor)) return false;
  return (
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    esNodo(valor.origen) &&
    esNodo(valor.destino) &&
    ["propuesto", "aceptado"].includes(String(valor.estado)) &&
    esTextoOpcional(valor.justificacion)
  );
}

/**
 * Valida la trazabilidad anidada del micro: RA con id y texto, actividades con
 * id, `mideIds` que apuntan a RA del mismo micro e ids únicos por micro.
 * Acepta el formato heredado (RA como string, actividad sin ids) porque la
 * normalización lo migra al leer; aquí solo se exige coherencia interna.
 */
function esTrazabilidadMicro(valor: unknown): boolean {
  if (!esRegistro(valor) || !esRegistro(valor.contenido) || !esRegistro(valor.evaluacion)) return false;
  const unidades = (valor.contenido as Registro).unidades;
  const cortes = (valor.evaluacion as Registro).cortes;
  if (!Array.isArray(unidades) || !Array.isArray(cortes)) return false;

  const idsRa = new Set<string>();
  for (const u of unidades) {
    if (!esRegistro(u) || !Array.isArray(u.resultadosAprendizaje)) return false;
    for (const ra of u.resultadosAprendizaje as unknown[]) {
      // Formato heredado: string suelto, migrado al leer.
      if (typeof ra === "string") continue;
      if (!esRegistro(ra) || !esTexto(ra.id) || !ra.id.trim() || typeof ra.texto !== "string") {
        return false;
      }
      if (idsRa.has(ra.id)) return false;
      idsRa.add(ra.id);
    }
  }

  const idsAct = new Set<string>();
  for (const c of cortes) {
    if (!esRegistro(c) || !Array.isArray(c.actividades)) return false;
    for (const a of c.actividades as unknown[]) {
      if (!esRegistro(a)) return false;
      if (a.id !== undefined && (!esTexto(a.id) || !a.id.trim())) return false;
      if (a.id !== undefined) {
        if (idsAct.has(a.id)) return false;
        idsAct.add(a.id);
      }
      if (a.mideIds !== undefined) {
        if (!Array.isArray(a.mideIds) || !(a.mideIds as unknown[]).every(esTexto)) return false;
        if ((a.mideIds as string[]).some((id) => !idsRa.has(id))) return false;
      }
    }
  }
  return true;
}

function esAsignatura(valor: unknown): valor is Asignatura {
  return (
    esRegistro(valor) &&
    esTexto(valor.id) &&
    Boolean(valor.id.trim()) &&
    (valor.programaId === null || esTexto(valor.programaId)) &&
    esMicrocurriculo(valor.microcurriculo) &&
    esTrazabilidadMicro(valor.microcurriculo)
  );
}

function afirmacionesDelProyecto(proyecto: ProyectoCurricular): AfirmacionCurricular[] {
  return [
    ...proyecto.marcos.flatMap((m) => [...m.principios, ...m.afirmaciones]),
    ...proyecto.programas.flatMap((p) => [...p.perfilIngreso, ...p.perfilEgreso, ...p.resultadosPrograma])
  ];
}

/** RA de un micro por id, limitado a una asignatura si hay contexto. */
function tieneRa(proyecto: ProyectoCurricular, id: string, contextoId?: string): boolean {
  const asignaturas = contextoId
    ? proyecto.asignaturas.filter((a) => a.id === contextoId)
    : proyecto.asignaturas;
  // Con contexto de una asignatura inexistente no hay nodo.
  if (contextoId && asignaturas.length === 0) return false;
  return asignaturas.some((a) =>
    a.microcurriculo.contenido.unidades.some((u) =>
      u.resultadosAprendizaje.some((ra) => ra.id === id)
    )
  );
}

/** Actividad de evaluación por id, limitada a una asignatura si hay contexto. */
function tieneActividad(proyecto: ProyectoCurricular, id: string, contextoId?: string): boolean {
  const asignaturas = contextoId
    ? proyecto.asignaturas.filter((a) => a.id === contextoId)
    : proyecto.asignaturas;
  if (contextoId && asignaturas.length === 0) return false;
  return asignaturas.some((a) =>
    a.microcurriculo.evaluacion.cortes.some((c) => c.actividades.some((act) => act.id === id))
  );
}

function tieneNodo(proyecto: ProyectoCurricular, nodo: NodoCurricular): boolean {
  switch (nodo.tipo) {
    case "principio_marco":
      return proyecto.marcos.some((m) => m.principios.some((a) => a.id === nodo.id));
    case "resultado_programa":
      return proyecto.programas.some((p) => p.resultadosPrograma.some((a) => a.id === nodo.id));
    case "ra_micro":
      return tieneRa(proyecto, nodo.id, nodo.contextoId);
    case "actividad_evaluacion":
      return tieneActividad(proyecto, nodo.id, nodo.contextoId);
  }
}

/** Pares ordenados permitidos en una alineación curricular. */
const BORDES_ALINEACION: ReadonlyArray<[TipoNodoCurricular, TipoNodoCurricular]> = [
  ["principio_marco", "resultado_programa"],
  ["resultado_programa", "ra_micro"],
  ["ra_micro", "actividad_evaluacion"]
];

function esBordePermitido(origen: TipoNodoCurricular, destino: TipoNodoCurricular): boolean {
  return BORDES_ALINEACION.some(([o, d]) => o === origen && d === destino);
}

/** ¿Este par ordenado de nodos puede alinearse? (puerta pública del invariante). */
export function esBordeAlineacionValido(
  origen: TipoNodoCurricular,
  destino: TipoNodoCurricular
): boolean {
  return esBordePermitido(origen, destino);
}

/** ¿Existe este nodo en el proyecto (respetando su contexto si lo trae)? */
export function existeNodoCurricular(proyecto: ProyectoCurricular, nodo: NodoCurricular): boolean {
  return tieneNodo(proyecto, nodo);
}

/**
 * Filtra las alineaciones cuyos extremos ya no existen (p. ej. se borró un
 * principio, un resultado, un RA o una actividad). Evita que una edición
 * legítima deje el agregado en un estado inválido que bloquearía el guardado.
 */
export function podarAlineacionesHuerfanas(proyecto: ProyectoCurricular): AlineacionCurricular[] {
  return proyecto.alineaciones.filter((a) => tieneNodo(proyecto, a.origen) && tieneNodo(proyecto, a.destino));
}

function idsUnicos(ids: string[]): boolean {
  return ids.every((id) => Boolean(id.trim())) && new Set(ids).size === ids.length;
}

function idsDelProyecto(proyecto: ProyectoCurricular): string[] {
  return [
    ...proyecto.marcos.flatMap((m) => [m.id, ...m.principios.map((a) => a.id), ...m.afirmaciones.map((a) => a.id)]),
    ...proyecto.programas.flatMap((p) => [
      p.id,
      ...p.perfilIngreso.map((a) => a.id),
      ...p.perfilEgreso.map((a) => a.id),
      ...p.resultadosPrograma.map((a) => a.id)
    ]),
    ...proyecto.asignaturas.map((a) => a.id),
    ...proyecto.fuentesCurriculares.map((f) => f.id),
    ...proyecto.vinculosProgramaMarco.map((v) => v.id),
    ...proyecto.alineaciones.map((a) => a.id)
  ];
}

function esProyectoCurricular(valor: unknown): valor is ProyectoCurricular {
  if (!esRegistro(valor)) return false;
  if (
    !esTexto(valor.id) ||
    !valor.id.trim() ||
    !esTexto(valor.nombre) ||
    !Array.isArray(valor.marcos) ||
    !valor.marcos.every(esMarco) ||
    !Array.isArray(valor.programas) ||
    !valor.programas.every(esPrograma) ||
    !Array.isArray(valor.asignaturas) ||
    !valor.asignaturas.every(esAsignatura) ||
    !Array.isArray(valor.fuentesCurriculares) ||
    !valor.fuentesCurriculares.every(esFuente) ||
    !Array.isArray(valor.vinculosProgramaMarco) ||
    !valor.vinculosProgramaMarco.every(esVinculo) ||
    !Array.isArray(valor.alineaciones) ||
    !valor.alineaciones.every(esAlineacion)
  ) {
    return false;
  }

  const proyecto = valor as unknown as ProyectoCurricular;
  if (!idsUnicos(idsDelProyecto(proyecto))) return false;

  const fuentes = new Set(proyecto.fuentesCurriculares.map((f) => f.id));
  if (afirmacionesDelProyecto(proyecto).some((a) => a.citas.some((c) => !fuentes.has(c.fuenteId)))) return false;

  const programas = new Set(proyecto.programas.map((p) => p.id));
  const marcos = new Set(proyecto.marcos.map((m) => m.id));
  if (proyecto.asignaturas.some((a) => a.programaId !== null && !programas.has(a.programaId))) return false;
  if (
    proyecto.vinculosProgramaMarco.some(
      (v) => !programas.has(v.programaId) || !marcos.has(v.marcoId) || (v.principal && v.estado !== "activo")
    )
  ) {
    return false;
  }

  const principalesActivos = new Set<string>();
  for (const vinculo of proyecto.vinculosProgramaMarco) {
    if (vinculo.estado !== "activo" || !vinculo.principal) continue;
    if (principalesActivos.has(vinculo.programaId)) return false;
    principalesActivos.add(vinculo.programaId);
  }

  return proyecto.alineaciones.every(
    (a) =>
      esBordePermitido(a.origen.tipo, a.destino.tipo) &&
      tieneNodo(proyecto, a.origen) &&
      tieneNodo(proyecto, a.destino)
  );
}

function documentoExiste(proyecto: ProyectoCurricular, modulo: ModuloProyecto, id: string): boolean {
  if (modulo === "macro") return proyecto.marcos.some((m) => m.id === id);
  if (modulo === "meso") return proyecto.programas.some((p) => p.id === id);
  if (modulo === "micro") return proyecto.asignaturas.some((a) => a.id === id);
  return false;
}

function esSeleccion(valor: unknown, proyecto: ProyectoCurricular): valor is SeleccionProyecto {
  if (!esRegistro(valor) || !["inicio", "macro", "meso", "micro"].includes(String(valor.modulo))) return false;
  if (valor.documentoId !== null && !esTexto(valor.documentoId)) return false;
  if (valor.modulo === "inicio") return valor.documentoId === null;
  return valor.documentoId === null || documentoExiste(proyecto, valor.modulo as ModuloProyecto, valor.documentoId);
}

function esMensaje(valor: unknown): valor is ChatMensaje {
  return (
    esRegistro(valor) &&
    esTexto(valor.id) &&
    esTexto(valor.texto) &&
    (valor.role === "usuario" || valor.role === "asistente") &&
    (valor.incompleto === undefined || typeof valor.incompleto === "boolean")
  );
}

function esConversacion(valor: unknown, scopeKey: string, proyecto: ProyectoCurricular): valor is ConversacionPersistida {
  if (!esRegistro(valor)) return false;
  if (
    valor.scopeId !== scopeKey ||
    !esTexto(valor.scopeId) ||
    !["inicio", "macro", "meso", "micro"].includes(String(valor.modulo)) ||
    (valor.documentoId !== null && !esTexto(valor.documentoId)) ||
    !Array.isArray(valor.mensajes) ||
    !valor.mensajes.every(esMensaje) ||
    !Array.isArray(valor.sugerencias) ||
    !valor.sugerencias.every(esTexto) ||
    !["entender", "crear", "editar", "consultar"].includes(String(valor.intencion)) ||
    (valor.seccionActiva !== null && !esTexto(valor.seccionActiva)) ||
    !esTexto(valor.crudo) ||
    !esTextoOpcional(valor.crudoLegado)
  ) {
    return false;
  }
  const modulo = valor.modulo as ModuloProyecto;
  const documentoId = valor.documentoId as string | null;
  if (scopeKey !== scopeConversacion(modulo, documentoId)) return false;
  if (modulo === "inicio") return documentoId === null;
  return documentoId === null || documentoExiste(proyecto, modulo, documentoId);
}

/** Valida el estado V3 persistido antes de hidratarlo. */
export function esEstadoGuardadoV3(valor: unknown): valor is EstadoGuardadoV3 {
  if (!esRegistro(valor) || valor.version !== 3 || !esProyectoCurricular(valor.proyecto)) return false;
  const proyecto = valor.proyecto;
  if (!esSeleccion(valor.seleccion, proyecto) || !esRegistro(valor.conversaciones)) return false;
  return Object.entries(valor.conversaciones).every(([scope, conversacion]) =>
    esConversacion(conversacion, scope, proyecto)
  );
}

/* -------------------------------------------------------------------------- */
/* Migración determinista V2 → V3                                            */
/* -------------------------------------------------------------------------- */

function clonarJson<T>(valor: T): T {
  const serializado = JSON.stringify(valor);
  if (serializado === undefined) throw new Error("Estado no serializable");
  return JSON.parse(serializado) as T;
}

/** Hash FNV-1a doble, determinista en navegador/Node y sin crypto. */
function sufijoDeterminista(semilla: string): string {
  const fnv = (inicio: number) => {
    let hash = inicio >>> 0;
    for (let i = 0; i < semilla.length; i++) hash = Math.imul(hash ^ semilla.charCodeAt(i), 0x01000193);
    return (hash >>> 0).toString(36).padStart(7, "0");
  };
  return `${fnv(0x811c9dc5)}${fnv(0x9e3779b9)}`;
}

function idDeterminista(prefijo: string, semilla: string): string {
  return `${prefijo}_${sufijoDeterminista(semilla)}`;
}

function textoCurricularReal(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  const limpio = valor.trim();
  return Boolean(limpio) && limpio.toLocaleLowerCase() !== POR_DEFINIR.toLocaleLowerCase();
}

function scopeConversacion(modulo: ModuloProyecto, documentoId: string | null): string {
  return modulo === "inicio" ? "inicio" : `${modulo}:${documentoId ?? "sin-documento"}`;
}

function proyectoVacio(id: string, nombre: string): ProyectoCurricular {
  return {
    id,
    nombre,
    marcos: [],
    programas: [],
    asignaturas: [],
    fuentesCurriculares: [],
    vinculosProgramaMarco: [],
    alineaciones: []
  };
}

/** Normaliza los dos campos poco estrictos que aceptaba el guard V2. */
function normalizarMensajesV2(mensajes: unknown, scopeId: string): ChatMensaje[] {
  if (!Array.isArray(mensajes)) return [];
  const salida: ChatMensaje[] = [];

  mensajes.forEach((valor, indice) => {
    if (
      !esRegistro(valor) ||
      !esTexto(valor.texto) ||
      (valor.role !== "usuario" && valor.role !== "asistente")
    ) {
      return;
    }
    const id = esTexto(valor.id) && valor.id.trim()
      ? valor.id
      : idDeterminista("mensaje", `${scopeId}\u241f${indice}\u241f${valor.role}\u241f${valor.texto}`);
    const mensaje: ChatMensaje = { id, role: valor.role, texto: valor.texto };
    if (typeof valor.incompleto === "boolean") mensaje.incompleto = valor.incompleto;
    salida.push(mensaje);
  });

  return salida;
}

/**
 * Migra un estado V2 sin inventar Macro/Meso. Acepta V3 válido para que una
 * segunda pasada sea idempotente; los formatos corruptos o desconocidos dan null.
 */
export function migrarEstadoV2(valor: unknown): EstadoGuardadoV3 | null {
  if (!esRegistro(valor)) return null;

  if (valor.version === 3) {
    if (!esEstadoGuardadoV3(valor)) return null;
    try {
      return clonarJson(valor);
    } catch {
      return null;
    }
  }

  if (valor.version !== 2 || !esEstadoGuardado(valor)) return null;

  let v2: EstadoGuardado;
  try {
    v2 = clonarJson(valor);
  } catch {
    return null;
  }

  const micro = v2.microcurriculo;
  const folioLegado = micro?.folio.trim() ?? "";
  // V2 solo puede representar un proyecto local; sin folio se usa un slot legado
  // singleton fijo, no una identidad inferida del chat o del contenido editable.
  const semillaProyecto = folioLegado ? `v2:folio:${folioLegado}` : "v2:singleton-legado";
  const idProyecto = idDeterminista("proyecto", semillaProyecto);
  const nombreAsignatura = micro && textoCurricularReal(micro.ident.asignatura) ? micro.ident.asignatura.trim() : "";
  const proyecto = proyectoVacio(idProyecto, nombreAsignatura || "Proyecto curricular");

  let seleccion: SeleccionProyecto;
  let modulo: ModuloProyecto;
  let documentoId: string | null;

  if (micro) {
    const slotAsignatura = folioLegado ? `folio:${folioLegado}` : "slot:singleton-legado";
    const idAsignatura = idDeterminista("asignatura", `${idProyecto}\u241f${slotAsignatura}`);
    const programaLegado = textoCurricularReal(micro.ident.programa) ? micro.ident.programa.trim() : "";
    let programaId: string | null = null;

    if (programaLegado) {
      programaId = idDeterminista("programa", `${idProyecto}\u241fprograma-legado\u241f${programaLegado}`);
      proyecto.programas.push({
        id: programaId,
        nombre: programaLegado,
        estado: "pendiente_legado",
        perfilIngreso: [],
        perfilEgreso: [],
        resultadosPrograma: []
      });
    }

    proyecto.asignaturas.push({ id: idAsignatura, programaId, microcurriculo: micro });
    modulo = "micro";
    documentoId = idAsignatura;
    seleccion = { modulo, documentoId };
  } else {
    modulo = "inicio";
    documentoId = null;
    seleccion = { modulo, documentoId };
  }

  const scopeId = scopeConversacion(modulo, documentoId);
  const conversacion: ConversacionPersistida = {
    scopeId,
    modulo,
    documentoId,
    mensajes: normalizarMensajesV2(v2.mensajes, scopeId),
    sugerencias: v2.sugerencias.filter(esTexto),
    intencion: v2.intencion,
    seccionActiva: modulo === "inicio" ? null : v2.seccionActiva,
    crudo: "",
    crudoLegado: v2.crudo
  };

  const resultado: EstadoGuardadoV3 = {
    version: 3,
    proyecto,
    seleccion,
    conversaciones: { [scopeId]: conversacion }
  };

  return esEstadoGuardadoV3(resultado) ? resultado : null;
}

/** Reexporta los tipos usados por la conversación sin duplicar sus contratos. */
export type { ChatMensaje, Intencion, Microcurriculo, EstadoGuardado };

/** Alias explícito del formato fuente para los llamadores de la migración. */
export type EstadoGuardadoV2 = EstadoGuardado;