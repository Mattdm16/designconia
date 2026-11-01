/**
 * DesignConia — normalización, fusión y parseo del Mesocurrículo.
 *
 * Igual que lib/macro.ts para el Marco, este módulo es puro: no toca React,
 * red, `window` ni APIs de Node. El vínculo con el marco vive en el proyecto,
 * no dentro del programa: el parseo lo devuelve por separado para que el
 * llamante lo aplique sin inventar relaciones.
 */

import { esIntencion, type Intencion } from "./prompt.ts";
import { SECCIONES_MESO, type SeccionMeso } from "./promptMeso.ts";
import { idAfirmacion } from "./macro.ts";
import { POR_DEFINIR, SUGERENCIAS_MAX, aislarObjeto, booleano, lista, repararJSON, texto, textoOpcional } from "./schema.ts";
import type {
  AfirmacionCurricular,
  EstadoAfirmacion,
  EstadoPrograma,
  OrigenAfirmacion,
  ProgramaAcademico
} from "./proyecto.ts";

export type { SeccionMeso };
export { SECCIONES_MESO };

/* ------------------------------------------------------------------ */
/* Topes                                                               */
/* ------------------------------------------------------------------ */

export const LIMITES_MESO = {
  ingreso: 8,
  egreso: 8,
  resultados: 12
} as const;

const ORIGENES: readonly OrigenAfirmacion[] = ["docente", "documento", "sugerencia_IA", "derivado"];
const ESTADOS_AFIRMACION: readonly EstadoAfirmacion[] = [
  "sin_confirmar",
  "confirmado_por_docente",
  "contrastado_con_fuente"
];
const ESTADOS_PROGRAMA: readonly EstadoPrograma[] = ["borrador", "pendiente_legado", "vigente", "archivado"];

export const ETIQUETA_ESTADO_PROGRAMA: Record<EstadoPrograma, string> = {
  borrador: "Borrador",
  pendiente_legado: "Pendiente de revisión",
  vigente: "Vigente",
  archivado: "Archivado"
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function textoReal(v: string): boolean {
  const t = v.trim();
  return Boolean(t) && t !== POR_DEFINIR;
}

function claveTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Normalización                                                       */
/* ------------------------------------------------------------------ */

/**
 * Normaliza citas a fuentes curriculares, igual que en el marco: conserva el
 * localizador (localizador, sección o página) y descarta las citas sin
 * localizador, que no pasan el guard del agregado. Una cita sin localizador
 * no puede respaldar una afirmación documental.
 */
function normalizarCitas(v: unknown): AfirmacionCurricular["citas"] {
  if (!Array.isArray(v)) return [];
  const salida: AfirmacionCurricular["citas"] = [];
  for (const cruda of v) {
    if (!esObjeto(cruda)) continue;
    const fuenteId = textoOpcional(cruda.fuenteId).trim();
    if (!fuenteId) continue;
    const localizador = textoOpcional(cruda.localizador).trim();
    const seccion = textoOpcional(cruda.seccion).trim();
    const pagina = cruda.pagina;
    const cita: AfirmacionCurricular["citas"][number] = { fuenteId };
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
 * Normaliza una afirmación del programa. Igual que en el marco: lo documentado
 * o contrastado sin cita se degrada a sugerencia, y la confirmación del
 * docente sobrevive a nuevas propuestas del mismo texto.
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

  if (anterior && anterior.estado === "confirmado_por_docente") {
    estado = "confirmado_por_docente";
    origen = anterior.origen === "documento" ? anterior.origen : "docente";
  }

  return {
    id: anterior?.id ?? idAfirmacion(prefijo, contenido),
    texto: contenido,
    origen,
    estado,
    citas: citas.length > 0 ? citas : anterior?.citas ?? []
  };
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

/** Programa vacío listo para editarse, sin datos inventados. */
export function crearProgramaVacio(id: string): ProgramaAcademico {
  return {
    id,
    nombre: "",
    estado: "borrador",
    perfilIngreso: [],
    perfilEgreso: [],
    resultadosPrograma: []
  };
}

/**
 * Construye un programa válido a partir de lo que devolvió el modelo,
 * conservando lo confirmado por el docente.
 */
export function normalizarPrograma(v: unknown, anterior: ProgramaAcademico | null = null): ProgramaAcademico {
  const o = esObjeto(v) ? v : {};

  const ingresoCrudo = Array.isArray(o.perfilIngreso) ? o.perfilIngreso : [];
  const egresoCrudo = Array.isArray(o.perfilEgreso) ? o.perfilEgreso : [];
  const resultadosCrudos = Array.isArray(o.resultadosPrograma)
    ? o.resultadosPrograma
    : Array.isArray(o.resultados)
      ? o.resultados
      : [];

  const estadoCrudo = o.estado;
  const estado: EstadoPrograma = ESTADOS_PROGRAMA.includes(estadoCrudo as EstadoPrograma)
    ? (estadoCrudo as EstadoPrograma)
    : anterior?.estado ?? "borrador";

  const nombre = texto(o.nombre ?? o.titulo, anterior?.nombre || "");
  const codigo = textoOpcional(o.codigo).trim() || anterior?.codigo || "";
  const id = textoOpcional(o.id).trim() || anterior?.id || "";

  return {
    id,
    nombre: textoReal(nombre) ? nombre : anterior?.nombre ?? "",
    ...(codigo ? { codigo } : {}),
    estado,
    perfilIngreso: fusionarLista(ingresoCrudo, anterior?.perfilIngreso ?? [], "ingreso", LIMITES_MESO.ingreso),
    perfilEgreso: fusionarLista(egresoCrudo, anterior?.perfilEgreso ?? [], "egreso", LIMITES_MESO.egreso),
    resultadosPrograma: fusionarLista(
      resultadosCrudos,
      anterior?.resultadosPrograma ?? [],
      "resultado",
      LIMITES_MESO.resultados
    )
  };
}

/** ¿Todavía no hay nada escrito en el programa? */
export function programaVacio(p: ProgramaAcademico): boolean {
  return (
    !textoReal(p.nombre) &&
    p.perfilIngreso.length === 0 &&
    p.perfilEgreso.length === 0 &&
    p.resultadosPrograma.length === 0
  );
}

/* ------------------------------------------------------------------ */
/* Estado por sección y avisos                                          */
/* ------------------------------------------------------------------ */

/** ¿Esta parte del programa ya tiene lo suficiente para considerarse cerrada? */
export function seccionMesoCompleta(p: ProgramaAcademico, s: SeccionMeso): boolean {
  switch (s) {
    case "identidad":
      return textoReal(p.nombre) && Boolean(p.codigo && p.codigo.trim());
    case "perfiles":
      return p.perfilIngreso.length > 0 && p.perfilEgreso.length > 0;
    case "resultados":
      return p.resultadosPrograma.length > 0;
    case "vinculo":
      return false; // El vínculo se revisa aparte: nunca cierra el documento.
  }
}

export function seccionesMesoCompletas(p: ProgramaAcademico): number {
  return SECCIONES_MESO.filter((s) => seccionMesoCompleta(p, s)).length;
}

export function resumenSeccionMeso(p: ProgramaAcademico, s: SeccionMeso): string {
  switch (s) {
    case "identidad": {
      if (!textoReal(p.nombre)) return "Sin nombre todavía";
      const partes = [
        p.codigo && p.codigo.trim() ? p.codigo : null,
        p.estado === "borrador" ? null : ETIQUETA_ESTADO_PROGRAMA[p.estado]
      ].filter(Boolean);
      return partes.length ? partes.join(" · ") : "Sin datos todavía";
    }
    case "perfiles":
      return `${p.perfilIngreso.length} ingreso · ${p.perfilEgreso.length} egreso`;
    case "resultados": {
      const n = p.resultadosPrograma.length;
      const pend = p.resultadosPrograma.filter((a) => a.estado === "sin_confirmar").length;
      if (!n) return "Sin resultados";
      return `${n} resultado${n === 1 ? "" : "s"}${pend ? ` · ${pend} sin confirmar` : ""}`;
    }
    case "vinculo":
      return "Se revisa con el marco";
  }
}

/** Afirmaciones que el asistente propuso y el docente todavía no confirmó. */
export function afirmacionesSinConfirmarMeso(p: ProgramaAcademico): number {
  return [...p.perfilIngreso, ...p.perfilEgreso, ...p.resultadosPrograma].filter(
    (a) => a.estado === "sin_confirmar"
  ).length;
}

/** Devuelve problemas legibles. Lista vacía = programa aceptable. */
export function validarPrograma(p: ProgramaAcademico): string[] {
  const problemas: string[] = [];

  if (programaVacio(p)) {
    problemas.push("El programa todavía no tiene contenido: no hay nada que mostrar.");
  }

  if (textoReal(p.nombre) === false && !programaVacio(p)) {
    problemas.push("El programa no tiene nombre. Escribí el nombre del programa académico.");
  }

  const sinConfirmar = afirmacionesSinConfirmarMeso(p);
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

export type ResultadoParseoMeso =
  | {
      ok: true;
      borrador: false;
      mensaje: string;
      sugerencias: string[];
      intencion: Intencion;
      seccionActiva: SeccionMeso | null;
    }
  | {
      ok: true;
      borrador: true;
      mensaje: string;
      sugerencias: string[];
      intencion: Intencion;
      seccionActiva: SeccionMeso | null;
      programa: ProgramaAcademico;
      /** Id del marco que orienta al programa, solo si el docente lo indicó. */
      marcoPrincipalId: string | null;
    }
  | { ok: false; motivo: string };

function esSeccionMeso(v: unknown): v is SeccionMeso {
  return typeof v === "string" && (SECCIONES_MESO as readonly string[]).includes(v);
}

/**
 * Parsea la respuesta completa del asistente para el nivel Meso.
 *
 * `marcosDisponibles` son los ids de marco del proyecto: un vínculo solo se
 * acepta si apunta a uno existente. Todo lo demás se descarta a null.
 */
export function parsearRespuestaMeso(
  crudo: string,
  anterior: ProgramaAcademico | null = null,
  marcosDisponibles: string[] = [],
  meta?: { fin?: string | null; error?: string | null }
): ResultadoParseoMeso {
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
  const seccionActiva = esSeccionMeso(datos.seccionActiva) ? datos.seccionActiva : null;

  const quiereGenerar = booleano(datos.generar, false);
  const borradorCrudo = esObjeto(datos.borrador) ? datos.borrador : null;

  if (!quiereGenerar || !borradorCrudo) {
    return { ok: true, borrador: false, mensaje, sugerencias, intencion, seccionActiva };
  }

  const programa = normalizarPrograma(borradorCrudo, anterior);
  const marcoPedido = typeof borradorCrudo.marcoPrincipalId === "string" ? borradorCrudo.marcoPrincipalId.trim() : "";
  const marcoPrincipalId = marcoPedido && marcosDisponibles.includes(marcoPedido) ? marcoPedido : null;

  if (programaVacio(programa) && anterior === null) {
    return { ok: true, borrador: false, mensaje, sugerencias, intencion, seccionActiva };
  }

  return { ok: true, borrador: true, mensaje, sugerencias, intencion, seccionActiva, programa, marcoPrincipalId };
}

/* ------------------------------------------------------------------ */
/* Fusión con el documento existente                                   */
/* ------------------------------------------------------------------ */

/**
 * Fusiona el programa entrante con el que ya existía sin destruir trabajo.
 * Un campo vacío del entrante no borra un valor real del anterior.
 */
export function fusionarPrograma(
  anterior: ProgramaAcademico | null,
  entrante: ProgramaAcademico
): ProgramaAcademico {
  if (anterior === null) return entrante;

  return {
    ...entrante,
    id: anterior.id,
    nombre: textoReal(entrante.nombre) ? entrante.nombre : anterior.nombre,
    codigo: entrante.codigo?.trim() ? entrante.codigo : anterior.codigo,
    // El "borrador" del normalizador es el valor por defecto, no una decisión:
    // nunca degrada el estado que ya tenía el documento.
    estado: entrante.estado && entrante.estado !== "borrador" ? entrante.estado : anterior.estado,
    perfilIngreso: entrante.perfilIngreso.length > 0 ? entrante.perfilIngreso : anterior.perfilIngreso,
    perfilEgreso: entrante.perfilEgreso.length > 0 ? entrante.perfilEgreso : anterior.perfilEgreso,
    resultadosPrograma:
      entrante.resultadosPrograma.length > 0 ? entrante.resultadosPrograma : anterior.resultadosPrograma
  };
}
