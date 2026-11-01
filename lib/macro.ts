/**
 * DesignConia — normalización, fusión y parseo del Macrocurrículo.
 *
 * Igual que lib/schema.ts para el Micro, este módulo es puro: no toca React,
 * red, `window` ni APIs de Node. Lo comparten el route handler y el cliente, y
 * por eso se puede testear aislado con el runner propio del proyecto.
 *
 * Regla de oro del nivel: lo que propone el modelo es **sugerencia**. Una
 * afirmación solo deja de serlo cuando el docente la confirma, y una fuente
 * solo existe si el docente la aportó. Este módulo no inventa ninguna de las dos.
 */

import { esIntencion, type Intencion } from "./prompt.ts";
import { SECCIONES_MACRO, type SeccionMacro } from "./promptMacro.ts";
import { POR_DEFINIR, SUGERENCIAS_MAX, aislarObjeto, booleano, lista, repararJSON, texto, textoOpcional } from "./schema.ts";
import type {
  AfirmacionCurricular,
  CitaFuenteCurricular,
  EstadoAfirmacion,
  EstadoMarco,
  FuenteCurricular,
  MarcoEducativoInstitucional,
  OrigenAfirmacion,
  TipoFuenteCurricular,
  Vigencia
} from "./proyecto.ts";

export type { SeccionMacro };
export { SECCIONES_MACRO };

/* ------------------------------------------------------------------ */
/* Topes                                                               */
/* ------------------------------------------------------------------ */

export const LIMITES_MACRO = {
  principios: 12,
  orientaciones: 12,
  fuentes: 8
} as const;

const ORIGENES: readonly OrigenAfirmacion[] = ["docente", "documento", "sugerencia_IA", "derivado"];
const ESTADOS_AFIRMACION: readonly EstadoAfirmacion[] = [
  "sin_confirmar",
  "confirmado_por_docente",
  "contrastado_con_fuente"
];
const ESTADOS_MARCO: readonly EstadoMarco[] = ["borrador", "vigente", "archivado"];
const TIPOS_FUENTE: readonly TipoFuenteCurricular[] = [
  "modelo_educativo",
  "lineamiento",
  "plan_institucional",
  "otro"
];

export const ETIQUETA_ESTADO_MARCO: Record<EstadoMarco, string> = {
  borrador: "Borrador",
  vigente: "Vigente",
  archivado: "Archivado"
};

export const ETIQUETA_ORIGEN: Record<OrigenAfirmacion, string> = {
  docente: "Del docente",
  documento: "De documento",
  sugerencia_IA: "Sugerencia de IA",
  derivado: "Derivada"
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** ¿Este texto tiene contenido real, y no es el marcador de «falta»? */
function textoReal(v: string): boolean {
  const t = v.trim();
  return Boolean(t) && t !== POR_DEFINIR;
}

/** Clave para comparar afirmaciones sin depender de tildes ni espacios. */
function claveTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Doble FNV-1a: determinista en navegador y Node, sin crypto ni dependencias. */
function sufijoDeterminista(semilla: string): string {
  const fnv = (inicio: number) => {
    let hash = inicio >>> 0;
    for (let i = 0; i < semilla.length; i++) hash = Math.imul(hash ^ semilla.charCodeAt(i), 0x01000193);
    return (hash >>> 0).toString(36).padStart(7, "0");
  };
  return `${fnv(0x811c9dc5)}${fnv(0x9e3779b9)}`;
}

/** Identificador estable derivado del propio texto de la afirmación. */
export function idAfirmacion(prefijo: string, textoAfirmacion: string): string {
  return `${prefijo}_${sufijoDeterminista(claveTexto(textoAfirmacion))}`;
}

/* ------------------------------------------------------------------ */
/* Normalización                                                       */
/* ------------------------------------------------------------------ */

function normalizarVigencia(v: unknown): Vigencia | null {
  if (!esObjeto(v)) return null;
  const desde = typeof v.desde === "string" && v.desde.trim() ? v.desde.trim() : null;
  const hasta = typeof v.hasta === "string" && v.hasta.trim() ? v.hasta.trim() : null;
  if (!desde && !hasta) return null;
  return { desde, hasta };
}

/**
 * Normaliza citas a fuentes curriculares. Solo se conservan las citas con
 * localizador (localizador, sección o página): una cita sin localizador no
 * pasa el guard del agregado y bloquearía el guardado, así que se descarta y
 * la afirmación que la necesitaba se degrada a sugerencia.
 */
function normalizarCitas(v: unknown): CitaFuenteCurricular[] {
  if (!Array.isArray(v)) return [];
  const salida: CitaFuenteCurricular[] = [];
  for (const cruda of v) {
    if (!esObjeto(cruda)) continue;
    const fuenteId = textoOpcional(cruda.fuenteId).trim();
    if (!fuenteId) continue;
    const cita: CitaFuenteCurricular = { fuenteId };
    const localizador = textoOpcional(cruda.localizador).trim();
    const seccion = textoOpcional(cruda.seccion).trim();
    const pagina = cruda.pagina;
    if (localizador) cita.localizador = localizador;
    if (seccion) cita.seccion = seccion;
    if (typeof pagina === "number" && Number.isFinite(pagina)) cita.pagina = pagina;
    else if (typeof pagina === "string" && pagina.trim()) cita.pagina = pagina.trim();
    if (!cita.localizador && !cita.seccion && cita.pagina === undefined) continue;
    salida.push(cita);
  }
  return salida;
}

/**
 * Normaliza una afirmación. Si el modelo la marca como documentada o
 * contrastada pero no trae cita, se degrada a sugerencia: una afirmación sin
 * respaldo no puede parecer verificada.
 */
function normalizarAfirmacion(
  v: unknown,
  prefijo: string,
  anterior: AfirmacionCurricular | null
): AfirmacionCurricular | null {
  const crudo = typeof v === "string" ? { texto: v } : esObjeto(v) ? v : null;
  if (!crudo) return null;

  const contenido = texto(crudo.texto ?? crudo.afirmacion ?? crudo.descripcion ?? crudo.nombre, "");
  if (!textoReal(contenido)) return null;

  const citas = normalizarCitas(crudo.citas);
  const origenCrudo = crudo.origen;
  let origen: OrigenAfirmacion = ORIGENES.includes(origenCrudo as OrigenAfirmacion)
    ? (origenCrudo as OrigenAfirmacion)
    : "sugerencia_IA";
  let estado: EstadoAfirmacion = ESTADOS_AFIRMACION.includes(crudo.estado as EstadoAfirmacion)
    ? (crudo.estado as EstadoAfirmacion)
    : "sin_confirmar";

  const exigeRespaldo = origen === "documento" || estado === "contrastado_con_fuente";
  if (exigeRespaldo && citas.length === 0) {
    origen = "sugerencia_IA";
    estado = "sin_confirmar";
  }

  // El docente manda: si ya había confirmado este texto, se conserva.
  if (anterior && anterior.estado === "confirmado_por_docente") {
    estado = "confirmado_por_docente";
    origen = anterior.origen === "documento" ? anterior.origen : "docente";
  }

  const citasFinales = citas.length > 0 ? citas : anterior?.citas ?? [];

  return {
    id: anterior?.id ?? idAfirmacion(prefijo, contenido),
    texto: contenido,
    origen,
    estado,
    citas: citasFinales
  };
}

function normalizarFuente(v: unknown): FuenteCurricular | null {
  const crudo = typeof v === "string" ? { titulo: v } : esObjeto(v) ? v : null;
  if (!crudo) return null;
  const titulo = texto(crudo.titulo ?? crudo.nombre, "");
  if (!textoReal(titulo)) return null;
  const tipoCrudo = crudo.tipo;
  const tipo: TipoFuenteCurricular = TIPOS_FUENTE.includes(tipoCrudo as TipoFuenteCurricular)
    ? (tipoCrudo as TipoFuenteCurricular)
    : "otro";
  // El id deriva solo del título: dos entradas con el mismo título son la
  // misma fuente y colapsan al deduplicar, sin importar su posición.
  const fuente: FuenteCurricular = {
    id: `fuente_${sufijoDeterminista(claveTexto(titulo))}`,
    titulo,
    tipo
  };
  const emisor = textoOpcional(crudo.emisor).trim();
  const url = textoOpcional(crudo.url).trim();
  const identificador = textoOpcional(crudo.identificador).trim();
  const fecha = textoOpcional(crudo.fechaPublicacion).trim();
  if (emisor) fuente.emisor = emisor;
  if (url) fuente.url = url;
  if (identificador) fuente.identificador = identificador;
  if (fecha) fuente.fechaPublicacion = fecha;
  // Campos de PDFs integrados: se conservan si ya venían validados, nunca se
  // inventan desde el modelo.
  if (typeof crudo.anio === "number" && Number.isInteger(crudo.anio)) fuente.anio = crudo.anio;
  const nombreArchivo = textoOpcional(crudo.nombreArchivo).trim();
  if (nombreArchivo) fuente.nombreArchivo = nombreArchivo;
  const textoExtraido = textoOpcional(crudo.textoExtraido);
  if (textoExtraido) fuente.textoExtraido = textoExtraido;
  if (typeof crudo.paginas === "number" && Number.isInteger(crudo.paginas) && crudo.paginas > 0) {
    fuente.paginas = crudo.paginas;
  }
  return fuente;
}

function fusionarLista(
  crudas: unknown[],
  anteriores: AfirmacionCurricular[],
  prefijo: string,
  max: number
): AfirmacionCurricular[] {
  const salida: AfirmacionCurricular[] = [];
  const vistos = new Set<string>();

  for (const cruda of crudas) {
    const crudo = typeof cruda === "string" ? { texto: cruda } : esObjeto(cruda) ? cruda : null;
    if (!crudo) continue;
    const contenido = texto(crudo.texto ?? crudo.afirmacion ?? crudo.descripcion ?? crudo.nombre, "");
    if (!textoReal(contenido)) continue;
    const clave = claveTexto(contenido);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const previa = anteriores.find((a) => claveTexto(a.texto) === clave) ?? null;
    const normalizada = normalizarAfirmacion(crudo, prefijo, previa);
    if (normalizada) salida.push(normalizada);
    if (salida.length >= max) break;
  }

  return salida;
}

/**
 * Normaliza la lista de fuentes del borrador. Las fuentes viven en el
 * proyecto, no dentro del marco: esta función devuelve la lista para que el
 * llamante la agregue a `proyecto.fuentesCurriculares` sin duplicar.
 */
export function normalizarFuentes(v: unknown): FuenteCurricular[] {
  if (!Array.isArray(v)) return [];
  const salida: FuenteCurricular[] = [];
  const vistos = new Set<string>();
  v.forEach((cruda) => {
    const fuente = normalizarFuente(cruda);
    if (!fuente || vistos.has(fuente.id)) return;
    vistos.add(fuente.id);
    salida.push(fuente);
  });
  return salida.slice(0, LIMITES_MACRO.fuentes);
}

/** Marco vacío listo para editarse, sin datos inventados. */
export function crearMarcoVacio(id: string): MarcoEducativoInstitucional {
  return {
    id,
    nombre: "",
    version: "",
    vigencia: null,
    estado: "borrador",
    principios: [],
    afirmaciones: []
  };
}

/**
 * Construye un marco válido a partir de lo que devolvió el modelo, conservando
 * lo confirmado por el docente y sin inventar fuentes.
 */
export function normalizarMarco(v: unknown, anterior: MarcoEducativoInstitucional | null = null): MarcoEducativoInstitucional {
  const o = esObjeto(v) ? v : {};

  const principiosCrudos = Array.isArray(o.principios) ? o.principios : [];
  const orientacionesCrudas = Array.isArray(o.orientaciones)
    ? o.orientaciones
    : Array.isArray(o.afirmaciones)
      ? o.afirmaciones
      : [];

  const estadoCrudo = o.estado;
  const estado: EstadoMarco = ESTADOS_MARCO.includes(estadoCrudo as EstadoMarco)
    ? (estadoCrudo as EstadoMarco)
    : anterior?.estado ?? "borrador";

  const nombre = texto(o.nombre ?? o.titulo, anterior?.nombre || "");
  const version = texto(o.version, anterior?.version || "");
  const emisor = textoOpcional(o.emisor).trim() || anterior?.emisor || "";
  const id = textoOpcional(o.id).trim() || anterior?.id || `marco_${sufijoDeterminista(nombre || "sin-nombre")}`;

  return {
    id,
    nombre: textoReal(nombre) ? nombre : anterior?.nombre ?? "",
    ...(emisor ? { emisor } : {}),
    version: textoReal(version) ? version : anterior?.version ?? "",
    vigencia: normalizarVigencia(o.vigencia) ?? anterior?.vigencia ?? null,
    estado,
    principios: fusionarLista(principiosCrudos, anterior?.principios ?? [], "principio", LIMITES_MACRO.principios),
    afirmaciones: fusionarLista(
      orientacionesCrudas,
      anterior?.afirmaciones ?? [],
      "orientacion",
      LIMITES_MACRO.orientaciones
    )
  };
}

/** ¿Todavía no hay nada escrito en el marco? */
export function marcoVacio(m: MarcoEducativoInstitucional): boolean {
  return (
    !textoReal(m.nombre) &&
    m.principios.length === 0 &&
    m.afirmaciones.length === 0
  );
}

/* ------------------------------------------------------------------ */
/* Estado por sección y avisos                                          */
/* ------------------------------------------------------------------ */

/** ¿Esta parte del marco ya tiene lo suficiente para considerarse cerrada? */
export function seccionMacroCompleta(m: MarcoEducativoInstitucional, s: SeccionMacro): boolean {
  switch (s) {
    case "identidad":
      return textoReal(m.nombre) && textoReal(m.version) && Boolean(m.emisor && m.emisor.trim());
    case "principios":
      return m.principios.length > 0;
    case "orientaciones":
      return m.afirmaciones.length > 0;
    case "fuentes":
      return false; // Las fuentes son opcionales: nunca cierran el documento.
  }
}

export function seccionesMacroCompletas(m: MarcoEducativoInstitucional): number {
  return SECCIONES_MACRO.filter((s) => seccionMacroCompleta(m, s)).length;
}

export function resumenSeccionMacro(m: MarcoEducativoInstitucional, s: SeccionMacro): string {
  switch (s) {
    case "identidad": {
      const partes = [
        textoReal(m.version) ? `v. ${m.version}` : null,
        m.emisor && m.emisor.trim() ? m.emisor : null,
        ETIQUETA_ESTADO_MARCO[m.estado]
      ].filter(Boolean);
      return textoReal(m.nombre) ? partes.join(" · ") || "Sin datos todavía" : "Sin nombre todavía";
    }
    case "principios": {
      const n = m.principios.length;
      const pend = m.principios.filter((a) => a.estado === "sin_confirmar").length;
      if (!n) return "Sin principios";
      return `${n} principio${n === 1 ? "" : "s"}${pend ? ` · ${pend} sin confirmar` : ""}`;
    }
    case "orientaciones": {
      const n = m.afirmaciones.length;
      const pend = m.afirmaciones.filter((a) => a.estado === "sin_confirmar").length;
      if (!n) return "Sin orientaciones";
      return `${n} orientación${n === 1 ? "" : "es"}${pend ? ` · ${pend} sin confirmar` : ""}`;
    }
    case "fuentes": {
      return "Las fuentes se registran aparte";
    }
  }
}

/** Afirmaciones que el asistente propuso y el docente todavía no confirmó. */
export function afirmacionesSinConfirmar(m: MarcoEducativoInstitucional): number {
  return [...m.principios, ...m.afirmaciones].filter((a) => a.estado === "sin_confirmar").length;
}

/** Devuelve problemas legibles. Lista vacía = marco aceptable. */
export function validarMarco(m: MarcoEducativoInstitucional): string[] {
  const problemas: string[] = [];

  if (marcoVacio(m)) {
    problemas.push("El marco todavía no tiene contenido: no hay nada que mostrar.");
  }

  if (textoReal(m.nombre) === false && !marcoVacio(m)) {
    problemas.push("El marco no tiene nombre. Escribí el nombre del documento institucional.");
  }

  const sinConfirmar = afirmacionesSinConfirmar(m);
  if (sinConfirmar > 0) {
    problemas.push(
      `${sinConfirmar} afirmación${sinConfirmar === 1 ? "" : "es"} son sugerencias del asistente y todavía no están confirmadas.`
    );
  }

  return problemas.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Parseo de la respuesta                                              */
/* ------------------------------------------------------------------ */

export type ResultadoParseoMacro =
  | {
      ok: true;
      borrador: false;
      mensaje: string;
      sugerencias: string[];
      intencion: Intencion;
      seccionActiva: SeccionMacro | null;
    }
  | {
      ok: true;
      borrador: true;
      mensaje: string;
      sugerencias: string[];
      intencion: Intencion;
      seccionActiva: SeccionMacro | null;
      marco: MarcoEducativoInstitucional;
      /** Fuentes del borrador: viven en el proyecto, no dentro del marco. */
      fuentes: FuenteCurricular[];
    }
  | { ok: false; motivo: string };

function esSeccionMacro(v: unknown): v is SeccionMacro {
  return typeof v === "string" && (SECCIONES_MACRO as readonly string[]).includes(v);
}

/**
 * Parsea la respuesta completa del asistente para el nivel Macro.
 *
 * `anterior` permite fusionar: lo que el docente ya confirmó sobrevive a un
 * turno que vuelve a proponer el mismo texto.
 */
export function parsearRespuestaMacro(
  crudo: string,
  anterior: MarcoEducativoInstitucional | null = null,
  meta?: { fin?: string | null; error?: string | null }
): ResultadoParseoMacro {
  const fin = meta?.fin ?? null;

  if (!crudo || !crudo.trim()) {
    return {
      ok: false,
      motivo: meta?.error
        ? `El asistente reportó un error: ${meta.error}`
        : fin === "length"
          ? "El asistente agotó el presupuesto de tokens antes de escribir nada. Pide un alcance más pequeño."
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
          "Reintenta; si se repite, pide una modificación más acotada."
      };
    }
    try {
      datos = JSON.parse(arreglado);
    } catch {
      return { ok: false, motivo: "La IA devolvió un JSON que no se pudo interpretar. Reintenta." };
    }
  }

  if (!esObjeto(datos)) {
    return { ok: false, motivo: "La IA devolvió un JSON que no es un objeto." };
  }

  const mensaje = textoOpcional(datos.mensaje).trim() || "Listo.";
  const sugerencias = lista(datos.sugerencias, SUGERENCIAS_MAX);
  const intencion = esIntencion(datos.intencion) ? datos.intencion : "entender";
  const seccionActiva = esSeccionMacro(datos.seccionActiva) ? datos.seccionActiva : null;

  const quiereGenerar = booleano(datos.generar, false);
  const borradorCrudo = esObjeto(datos.borrador) ? datos.borrador : null;

  if (!quiereGenerar || !borradorCrudo) {
    return { ok: true, borrador: false, mensaje, sugerencias, intencion, seccionActiva };
  }

  const marco = normalizarMarco(borradorCrudo, anterior);
  const fuentes = normalizarFuentes(borradorCrudo.fuentes);

  // Guardia: un marco vacío es peor que no tenerlo. Si el modelo dijo que
  // generaba pero no trajo sustancia, conservamos lo que había.
  if (marcoVacio(marco) && anterior === null) {
    return { ok: true, borrador: false, mensaje, sugerencias, intencion, seccionActiva };
  }

  return { ok: true, borrador: true, mensaje, sugerencias, intencion, seccionActiva, marco, fuentes };
}

/* ------------------------------------------------------------------ */
/* Fusión con el documento existente                                   */
/* ------------------------------------------------------------------ */

/**
 * Fusiona el marco entrante con el que ya existía sin destruir trabajo.
 * Un campo vacío del entrante no borra un valor real del anterior.
 */
export function fusionarMarco(
  anterior: MarcoEducativoInstitucional | null,
  entrante: MarcoEducativoInstitucional
): MarcoEducativoInstitucional {
  if (anterior === null) return entrante;

  return {
    ...entrante,
    id: anterior.id,
    nombre: textoReal(entrante.nombre) ? entrante.nombre : anterior.nombre,
    emisor: entrante.emisor?.trim() ? entrante.emisor : anterior.emisor,
    version: textoReal(entrante.version) ? entrante.version : anterior.version,
    vigencia: entrante.vigencia ?? anterior.vigencia,
    // El "borrador" del normalizador es el valor por defecto, no una decisión:
    // nunca degrada el estado que ya tenía el documento.
    estado: entrante.estado && entrante.estado !== "borrador" ? entrante.estado : anterior.estado,
    principios: entrante.principios.length > 0 ? entrante.principios : anterior.principios,
    afirmaciones: entrante.afirmaciones.length > 0 ? entrante.afirmaciones : anterior.afirmaciones
  };
}
