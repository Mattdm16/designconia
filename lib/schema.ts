/**
 * DesignConia — contrato de datos del microcurrículo universitario.
 *
 * Este módulo es deliberadamente puro: no importa Node, React ni red.
 * Lo comparten el route handler (servidor) y el cliente, y por eso las
 * mismas funciones de parseo y normalización se pueden testear aisladas.
 *
 * Nota: la ruta es relativa a propósito. El runner de pruebas es un script
 * Node pelado (ver lib/schema.test.ts) y no resuelve el alias "@/".
 */

import { esIntencion, type Intencion } from "./prompt.ts";

export type { Intencion };

export const POR_DEFINIR = "[por definir]";
export const SIN_PRERREQUISITOS = "Sin prerrequisitos";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Horas = {
  teoricas: number;
  practicas: number;
  independientes: number;
};

export type Identificacion = {
  asignatura: string;
  codigo: string;
  programa: string;
  creditos: number;
  horas: Horas;
  prerrequisitos: string[];
  semestre: string;
};

export type Tema = {
  nombre: string;
  subtemas: string[];
};

/** Resultado de aprendizaje con identidad estable para trazar la evaluación. */
export type ResultadoAprendizaje = {
  /** Identificador estable (p. ej. ra_abc1234); lo usa la trazabilidad. */
  id: string;
  /** Desempeño observable y medible: verbo de acción + qué logra el estudiante. */
  texto: string;
};

export type Unidad = {
  numero: number;
  titulo: string;
  /** Resultados de aprendizaje de la unidad, con verbos medibles. */
  resultadosAprendizaje: ResultadoAprendizaje[];
  temas: Tema[];
};

export type Estrategia = {
  nombre: string;
  descripcion: string;
};

/** Una fila de una fase: qué hace cada uno con qué recursos. */
export type FilaSesion = {
  docente: string;
  estudiante: string;
  recursos: string[];
};

export type TipoSesion = "teorica" | "practica" | "independiente";

export const TIPOS_SESION: TipoSesion[] = ["teorica", "practica", "independiente"];

export const ETIQUETA_TIPO_SESION: Record<TipoSesion, string> = {
  teorica: "Teórica",
  practica: "Práctica",
  independiente: "Trabajo independiente"
};

export type Sesion = {
  numero: number;
  /** Unidad a la que pertenece la sesión; la interfaz la muestra como insignia. */
  unidad: number;
  tema: string;
  duracionMin: number;
  tipo: TipoSesion;
  inicio: FilaSesion[];
  desarrollo: FilaSesion[];
  cierre: FilaSesion[];
};

export type ActividadEvaluacion = {
  /** Identificador estable (p. ej. act_abc1234); lo usa la trazabilidad. */
  id: string;
  nombre: string;
  descripcion: string;
  /** Rúbrica analítica, lista de cotejo, guía de observación… */
  instrumento: string;
  /** Herramientas que el entregable exige usar (GitHub, Jira…). */
  herramientas: string[];
  /**
   * Nota libre heredada sobre qué resultado mide. Se conserva por
   * compatibilidad; el vínculo trazable vive en `mideIds`.
   */
  mide: string;
  /** Ids de resultados de aprendizaje del mismo micro que esta actividad mide. */
  mideIds: string[];
};

export type Corte = {
  nombre: string;
  porcentaje: number;
  actividades: ActividadEvaluacion[];
};

export type Referencia = {
  autor: string;
  titulo: string;
  dato: string;
  anio: string;
  edicion: string;
  /**
   * El ISBN NO lo propone el asistente: un ISBN inventado parece autoritativo
   * y se puede comprobar como falso. Se pide o se escribe a mano.
   */
  isbn: string;
  /** false = sugerencia del asistente; true = el docente la confirmó. */
  confirmada: boolean;
};

export type Microcurriculo = {
  folio: string;
  ident: Identificacion;
  justificacion: string;
  objetivos: {
    generales: string[];
    especificas: string[];
  };
  contenido: {
    unidades: Unidad[];
  };
  secuencia: {
    sesiones: Sesion[];
  };
  metodologia: {
    estrategias: Estrategia[];
  };
  evaluacion: {
    cortes: Corte[];
  };
  bibliografia: {
    obligatorias: Referencia[];
    complementarias: Referencia[];
    recursos: string[];
  };
};

/** Turno del chat. Se persiste junto al microcurrículo en localStorage. */
export type ChatMensaje = {
  id: string;
  role: "usuario" | "asistente";
  texto: string;
  /** Una respuesta que se cortó antes de completarse. */
  incompleto?: boolean;
};

/* ------------------------------------------------------------------ */
/* Las ocho secciones                                                  */
/* ------------------------------------------------------------------ */

export const SECCIONES = [
  "justificacion",
  "objetivos",
  "contenido",
  "secuencia",
  "metodologia",
  "evaluacion",
  "ident",
  "bibliografia"
] as const;

export type SeccionId = (typeof SECCIONES)[number];

export const ETIQUETA_SECCION: Record<SeccionId, string> = {
  justificacion: "Justificación",
  objetivos: "Objetivos o competencias",
  contenido: "Contenido temático",
  secuencia: "Secuencia didáctica",
  metodologia: "Metodología",
  evaluacion: "Sistema de evaluación",
  ident: "Datos de identificación",
  bibliografia: "Bibliografía y recursos"
};

export const DESCRIPCION_SECCION: Record<SeccionId, string> = {
  justificacion: "Propósito de la asignatura y su lugar en el perfil de egreso",
  objetivos: "Meta del curso y destrezas, actitudes y conocimientos puntuales",
  contenido: "Unidades o módulos con sus temas, subtemas y resultados de aprendizaje",
  secuencia: "Las horas clase por clase, con Inicio, Desarrollo y Cierre",
  metodologia: "Estrategias pedagógicas que se aplicarán",
  evaluacion: "Cortes, actividades, instrumentos y porcentajes (deben sumar 100)",
  ident: "Asignatura, código, programa, créditos, horas, prerrequisitos y semestre",
  bibliografia: "Textos obligatorios y complementarios, bases de datos y software"
};

/** Límites sanos: evitan fichas absurdas si el modelo se desmanda. */
export const LIMITES = {
  unidades: 8,
  temasPorUnidad: 10,
  subtemasPorTema: 10,
  resultadosPorUnidad: 6,
  sesiones: 24,
  filasPorFase: 8,
  cortes: 5,
  actividadesPorCorte: 8,
  objetivos: 12,
  estrategias: 10,
  referencias: 10,
  recursos: 12,
  horas: 200,
  prerrequisitos: 8
} as const;

/* ------------------------------------------------------------------ */
/* Utilidades de coerción defensiva                                    */
/* ------------------------------------------------------------------ */

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Texto no vacío, o el marcador indicado. */
export function texto(v: unknown, respaldo = POR_DEFINIR): string {
  if (typeof v === "string") {
    const t = v.trim();
    if (t && t !== "null" && t !== "undefined") return t;
    return respaldo;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return respaldo;
}

/** Texto que puede quedar legítimamente vacío. */
export function textoOpcional(v: unknown): string {
  return texto(v, "");
}

/** Número finito acotado a [min, max]; descarta NaN, null y basura. */
export function numero(v: unknown, respaldo: number, min = 0, max: number): number {
  let n: number;
  if (typeof v === "number" && Number.isFinite(v)) n = v;
  else if (typeof v === "string") {
    // Ojo: limpiar los caracteres no numéricos deja "" en "tres", y Number("")
    // es 0, que es finito. Sin este guardia, "tres" se convertiría en 0.
    const limpio = v.replace(",", ".").replace(/[^\d.-]/g, "");
    if (!limpio) return respaldo;
    const parsed = Number(limpio);
    if (!Number.isFinite(parsed)) return respaldo;
    n = parsed;
  } else return respaldo;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Booleano tolerante a "true"/"sí"/1 que a veces devuelven los modelos. */
export function booleano(v: unknown, respaldo = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["true", "1", "sí", "si", "yes"].includes(t)) return true;
    if (["false", "0", "no", ""].includes(t)) return false;
  }
  return respaldo;
}

/** Lista de textos: descarta vacíos, recorta y acota la longitud. */
export function lista(v: unknown, max: number): string[] {
  const fuente = Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v] : [];
  const salida: string[] = [];
  for (const item of fuente) {
    const t =
      typeof item === "string"
        ? item.trim()
        : esObjeto(item)
          ? texto(item.nombre ?? item.texto ?? item.descripcion ?? item.valor, "")
          : "";
    if (t) salida.push(t);
    if (salida.length >= max) break;
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Normalización                                                       */
/* ------------------------------------------------------------------ */

function normalizarHoras(v: unknown): Horas {
  const o = esObjeto(v) ? v : {};
  return {
    teoricas: numero(o.teoricas ?? o.ht ?? o.horasTeoricas, 0, 0, LIMITES.horas),
    practicas: numero(o.practicas ?? o.hp ?? o.horasPracticas, 0, 0, LIMITES.horas),
    independientes: numero(
      o.independientes ?? o.hti ?? o.horasIndependientes ?? o.horasTrabajoIndependiente,
      0,
      0,
      LIMITES.horas
    )
  };
}

function normalizarIdent(v: unknown): Identificacion {
  const o = esObjeto(v) ? v : {};
  return {
    asignatura: texto(o.asignatura ?? o.nombre ?? o.materia),
    codigo: texto(o.codigo ?? o.clave ?? o.codigoAsignatura),
    programa: texto(o.programa ?? o.programaAcademico ?? o.carrera),
    creditos: numero(o.creditos ?? o.credito, 0, 0, 60),
    horas: normalizarHoras(o.horas ?? o.cargaHoraria),
    prerrequisitos: lista(o.prerrequisitos ?? o.requisitos, LIMITES.prerrequisitos),
    semestre: texto(o.semestre ?? o.nivel ?? o.ciclo)
  };
}

function normalizarTema(v: unknown): Tema {
  const o = esObjeto(v) ? v : {};
  return {
    nombre: texto(o.nombre ?? o.tema ?? o.titulo, ""),
    subtemas: lista(o.subtemas ?? o.contenidos, LIMITES.subtemasPorTema)
  };
}

/**
 * Hash FNV-1a corto para ids estables sin crypto ni dependencias.
 * Determinista en navegador y Node: el mismo texto da el mismo id.
 */
function hashCorto(semilla: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i++) hash = Math.imul(hash ^ semilla.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

/** Id base de un RA a partir de su texto normalizado. */
function idRaDesdeTexto(textoNormalizado: string): string {
  return `ra_${hashCorto(`ra:${textoNormalizado}`)}`;
}

/** Id base de una actividad a partir de su nombre normalizado. */
function idActividadDesdeNombre(nombreNormalizado: string): string {
  return `act_${hashCorto(`act:${nombreNormalizado}`)}`;
}

function esIdTrazable(v: unknown): v is string {
  return typeof v === "string" && /^[a-z]+_[a-z0-9]+(?:_[0-9]+)?$/.test(v.trim());
}

/** Crea un RA nuevo con id único (para altas desde el editor). */
export function crearResultado(texto: string): ResultadoAprendizaje {
  const limpio = texto.trim().replace(/\s+/g, " ");
  const base = limpio ? idRaDesdeTexto(limpio.toLowerCase()) : `ra_nuevo_${hashCorto(`${Date.now()}:${Math.random()}`)}`;
  return { id: base, texto: limpio };
}

/** Crea una actividad de evaluación vacía con id único (para altas desde el editor). */
export function nuevaActividadEvaluacion(): ActividadEvaluacion {
  return {
    id: `act_nueva_${hashCorto(`${Date.now()}:${Math.random()}`)}`,
    nombre: "",
    descripcion: "",
    instrumento: "",
    herramientas: [],
    mide: "",
    mideIds: []
  };
}

/**
 * Normaliza un resultado de aprendizaje aceptando el formato heredado
 * (string suelto) y el nuevo ({ id?, texto }). El id se conserva si es
 * válido; si falta, deriva del texto para que sea estable entre turnos.
 */
function normalizarResultado(v: unknown): ResultadoAprendizaje | null {
  if (typeof v === "string") {
    const textoNormalizado = v.trim().replace(/\s+/g, " ");
    if (!textoNormalizado) return null;
    return { id: idRaDesdeTexto(textoNormalizado.toLowerCase()), texto: textoNormalizado };
  }
  if (!esObjeto(v)) return null;
  const textoNormalizado = texto(
    v.texto ?? v.nombre ?? v.resultado ?? v.descripcion ?? v.valor,
    ""
  ).replace(/\s+/g, " ");
  if (!textoNormalizado) return null;
  const id =
    esIdTrazable(v.id) ? (v.id as string).trim() : idRaDesdeTexto(textoNormalizado.toLowerCase());
  return { id, texto: textoNormalizado };
}

/**
 * Las unidades se renumeran siempre: la numeración es responsabilidad de la
 * interfaz, no del modelo, que puede repetir números o saltearlos.
 */
function normalizarUnidad(v: unknown, indice: number): Unidad {
  const o = esObjeto(v) ? v : {};
  const temasCrudos = Array.isArray(o.temas) ? o.temas : Array.isArray(o.contenidos) ? o.contenidos : [];
  const crudos = o.resultadosAprendizaje ?? o.resultados ?? o.ra;
  const listaCruda = Array.isArray(crudos) ? crudos : typeof crudos === "string" ? [crudos] : [];
  const vistos = new Set<string>();
  const resultadosAprendizaje: ResultadoAprendizaje[] = [];
  for (const item of listaCruda.slice(0, LIMITES.resultadosPorUnidad)) {
    const ra = normalizarResultado(item);
    if (!ra) continue;
    // Mismo id dentro de la unidad: se conserva el primero.
    if (vistos.has(ra.id)) continue;
    vistos.add(ra.id);
    resultadosAprendizaje.push(ra);
  }
  return {
    numero: indice + 1,
    titulo: texto(o.titulo ?? o.nombre ?? o.unidad, ""),
    resultadosAprendizaje,
    temas: temasCrudos
      .slice(0, LIMITES.temasPorUnidad)
      .map(normalizarTema)
      .filter((t) => t.nombre || t.subtemas.length > 0)
  };
}

function normalizarEstrategia(v: unknown): Estrategia {
  if (typeof v === "string") return { nombre: v.trim(), descripcion: "" };
  const o = esObjeto(v) ? v : {};
  return {
    nombre: texto(o.nombre ?? o.estrategia ?? o.metodo, ""),
    descripcion: textoOpcional(o.descripcion ?? o.detalle)
  };
}

function normalizarFila(v: unknown): FilaSesion {
  const o = esObjeto(v) ? v : {};
  return {
    docente: textoOpcional(o.docente ?? o.actividadDocente),
    estudiante: textoOpcional(o.estudiante ?? o.actividadEstudiante),
    recursos: lista(o.recursos ?? o.recursosDidacticos, LIMITES.recursos)
  };
}

function normalizarFase(v: unknown): FilaSesion[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, LIMITES.filasPorFase).map(normalizarFila);
}

/** Quita los acentos para comparar de forma tolerante ("práctica" → "practica"). */
function sinAcentos(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Las sesiones se renumeran siempre y se ordenan por unidad: la cronología es
 * responsabilidad de la interfaz, no del modelo, que puede devolverlas
 * desordenadas o con números repetidos.
 */
function normalizarSesion(v: unknown, indice: number): Sesion {
  const o = esObjeto(v) ? v : {};
  const tipoCrudo = sinAcentos(textoOpcional(o.tipo).toLowerCase());
  const tipo: TipoSesion = tipoCrudo.includes("pract")
    ? "practica"
    : tipoCrudo.includes("indep") || tipoCrudo.includes("auto") || tipoCrudo.includes("trabajo")
      ? "independiente"
      : "teorica";
  return {
    numero: indice + 1,
    unidad: numero(o.unidad ?? o.unidadRef ?? o.modulo, 1, 1, LIMITES.unidades),
    tema: textoOpcional(o.tema ?? o.titulo),
    duracionMin: numero(o.duracionMin ?? o.duracion ?? o.minutos, 60, 1, 600),
    tipo,
    inicio: normalizarFase(o.inicio),
    desarrollo: normalizarFase(o.desarrollo),
    cierre: normalizarFase(o.cierre)
  };
}

function normalizarActividad(v: unknown): ActividadEvaluacion {
  if (typeof v === "string") {
    const nombre = v.trim();
    return {
      id: idActividadDesdeNombre(nombre.toLowerCase() || "sin_nombre"),
      nombre,
      descripcion: "",
      instrumento: "",
      herramientas: [],
      mide: "",
      mideIds: []
    };
  }
  const o = esObjeto(v) ? v : {};
  const nombre = texto(o.nombre ?? o.actividad ?? o.evidencia, "");
  const crudos = o.mideIds ?? o.mide_ids ?? o.raIds;
  const listaCruda = Array.isArray(crudos) ? crudos : [];
  const vistos = new Set<string>();
  const mideIds: string[] = [];
  for (const item of listaCruda) {
    if (!esIdTrazable(item) || vistos.has((item as string).trim())) continue;
    vistos.add((item as string).trim());
    mideIds.push((item as string).trim());
  }
  return {
    id: esIdTrazable(o.id) ? (o.id as string).trim() : idActividadDesdeNombre(nombre.toLowerCase() || "sin_nombre"),
    nombre,
    descripcion: textoOpcional(o.descripcion ?? o.detalle ?? o.criterio),
    instrumento: textoOpcional(o.instrumento ?? o.instrumentoEvaluacion),
    herramientas: lista(o.herramientas, LIMITES.recursos),
    mide: textoOpcional(o.mide ?? o.resultadoQueMide ?? o.ra),
    mideIds
  };
}

function normalizarCorte(v: unknown): Corte {
  const o = esObjeto(v) ? v : {};
  const actividadesCrudas = Array.isArray(o.actividades) ? o.actividades : [];
  return {
    nombre: texto(o.nombre ?? o.corte ?? o.titulo, "",),
    porcentaje: numero(o.porcentaje ?? o.peso, 0, 0, 100),
    actividades: actividadesCrudas.slice(0, LIMITES.actividadesPorCorte).map(normalizarActividad)
  };
}

/**
 * Las referencias que propone el modelo son SIEMPRE sugerencias. Solo una
 * confirmación explícita del docente las vuelve obligatorias, y eso se
 * restaura en mergeMicrocurriculo comparando con lo que ya había.
 *
 * El ISBN se acepta si llegó, pero el prompt prohíbe que el asistente lo
 * invente: un número que parece autoritativo y es falso es peor que un vacío.
 */
function normalizarReferencia(v: unknown): Referencia {
  if (typeof v === "string") {
    return { autor: "", titulo: v.trim(), dato: "", anio: "", edicion: "", isbn: "", confirmada: false };
  }
  const o = esObjeto(v) ? v : {};
  const anioCrudo = o.anio ?? o.año ?? o.year;
  return {
    autor: textoOpcional(o.autor ?? o.autores),
    titulo: texto(o.titulo ?? o.nombre ?? o.referencia, ""),
    dato: textoOpcional(o.dato ?? o.editorial ?? o.detalle),
    anio: anioCrudo === undefined ? "" : String(numero(anioCrudo, 0, 0, 9999) || "").trim(),
    edicion: textoOpcional(o.edicion ?? o.edición),
    isbn: textoOpcional(o.isbn),
    confirmada: false
  };
}

function normalizarSecuencia(v: unknown): Microcurriculo["secuencia"] {
  const o = esObjeto(v) ? v : {};
  const crudas = Array.isArray(o.sesiones) ? o.sesiones : Array.isArray(o.sesion) ? o.sesion : [];
  const sesiones = crudas
    .slice(0, LIMITES.sesiones)
    .map(normalizarSesion)
    .filter((s) => s.tema || s.inicio.length || s.desarrollo.length || s.cierre.length)
    // Orden cronológico: por unidad, y dentro de cada unidad se respeta el
    // orden en que llegaron las sesiones.
    .sort((a, b) => a.unidad - b.unidad)
    .map((s, i) => ({ ...s, numero: i + 1 }));

  return { sesiones };
}

function normalizarObjetivos(v: unknown): Microcurriculo["objetivos"] {
  const o = esObjeto(v) ? v : {};
  // Acepta también la forma plana { general, especificos }.
  const generales = o.generales ?? o.general ?? o.generale;
  const especificas = o.especificas ?? o.especificos ?? o.especifica ?? o.especifico;
  return {
    generales: lista(generales, LIMITES.objetivos),
    especificas: lista(especificas, LIMITES.objetivos)
  };
}

function normalizarContenido(v: unknown): Microcurriculo["contenido"] {
  const o = esObjeto(v) ? v : {};
  const crudas = Array.isArray(o.unidades) ? o.unidades : Array.isArray(o.modulos) ? o.modulos : [];
  return {
    unidades: crudas
      .slice(0, LIMITES.unidades)
      .map(normalizarUnidad)
      .filter((u) => u.titulo || u.temas.length > 0 || u.resultadosAprendizaje.length > 0)
  };
}

function normalizarMetodologia(v: unknown): Microcurriculo["metodologia"] {
  const o = esObjeto(v) ? v : {};
  const crudas = Array.isArray(o.estrategias) ? o.estrategias : Array.isArray(o.metodologia) ? o.metodologia : [];
  return {
    estrategias: crudas
      .slice(0, LIMITES.estrategias)
      .map(normalizarEstrategia)
      .filter((e) => e.nombre)
  };
}

function normalizarEvaluacion(v: unknown): Microcurriculo["evaluacion"] {
  const o = esObjeto(v) ? v : {};
  const crudos = Array.isArray(o.cortes) ? o.cortes : Array.isArray(o.actividades) ? o.actividades : [];
  return {
    cortes: crudos
      .slice(0, LIMITES.cortes)
      .map(normalizarCorte)
      .filter((c) => c.nombre || c.actividades.length > 0)
  };
}

function normalizarBibliografia(v: unknown): Microcurriculo["bibliografia"] {
  const o = esObjeto(v) ? v : {};
  return {
    obligatorias: (Array.isArray(o.obligatorias) ? o.obligatorias : [])
      .slice(0, LIMITES.referencias)
      .map(normalizarReferencia)
      .filter((r) => r.titulo),
    complementarias: (Array.isArray(o.complementarias) ? o.complementarias : [])
      .slice(0, LIMITES.referencias)
      .map(normalizarReferencia)
      .filter((r) => r.titulo),
    recursos: lista(o.recursos, LIMITES.recursos)
  };
}

/**
 * Garantiza los invariantes de trazabilidad dentro de un micro ya normalizado:
 * ids de RA únicos en todo el micro, ids de actividad únicos, `mideIds` que
 * apuntan a RA existentes y resolución del `mide` heredado (texto libre) al RA
 * con el mismo texto, cuando hay coincidencia exacta.
 */
function asegurarTrazabilidadMicro(m: Microcurriculo): Microcurriculo {
  const usadosRa = new Set<string>();
  for (const u of m.contenido.unidades) {
    for (const ra of u.resultadosAprendizaje) {
      const base = ra.id;
      let id = base;
      let n = 2;
      while (usadosRa.has(id)) {
        id = `${base}_${n}`;
        n++;
      }
      ra.id = id;
      usadosRa.add(id);
    }
  }

  const porTexto = new Map<string, string>();
  for (const u of m.contenido.unidades) {
    for (const ra of u.resultadosAprendizaje) {
      const clave = ra.texto.trim().toLowerCase().replace(/\s+/g, " ");
      if (!porTexto.has(clave)) porTexto.set(clave, ra.id);
    }
  }

  const usadosAct = new Set<string>();
  for (const c of m.evaluacion.cortes) {
    for (const a of c.actividades) {
      const base = a.id;
      let id = base;
      let n = 2;
      while (usadosAct.has(id)) {
        id = `${base}_${n}`;
        n++;
      }
      a.id = id;
      usadosAct.add(id);

      let ids = a.mideIds.filter((x) => usadosRa.has(x));
      if (ids.length === 0 && a.mide.trim()) {
        const clave = a.mide.trim().toLowerCase().replace(/\s+/g, " ");
        const exacto = porTexto.get(clave);
        if (exacto) ids = [exacto];
      }
      a.mideIds = ids;
    }
  }
  return m;
}

/** Reconstruye un Microcurriculo válido a partir de lo que devolvió el modelo. */
export function normalizarMicrocurriculo(v: unknown): Microcurriculo {
  const o = esObjeto(v) ? v : {};
  return asegurarTrazabilidadMicro({
    folio: texto(o.folio, ""),
    ident: normalizarIdent(o.ident ?? o.identificacion),
    justificacion: texto(o.justificacion ?? o.proposito, ""),
    objetivos: normalizarObjetivos(o.objetivos ?? o.competencias),
    contenido: normalizarContenido(o.contenido ?? o.contenidoTematico),
    secuencia: normalizarSecuencia(o.secuencia ?? o.secuenciaDidactica),
    metodologia: normalizarMetodologia(o.metodologia),
    evaluacion: normalizarEvaluacion(o.evaluacion ?? o.sistemaEvaluacion),
    bibliografia: normalizarBibliografia(o.bibliografia ?? o.recursos)
  });
}

/* ------------------------------------------------------------------ */
/* Estado por sección (lo que se ve como progreso en la ficha)         */
/* ------------------------------------------------------------------ */

const MINIMO_JUSTIFICACION = 30;

function textoReal(v: string): boolean {
  const t = v.trim();
  return Boolean(t) && t !== POR_DEFINIR;
}

function totalHoras(h: Horas): number {
  return h.teoricas + h.practicas + h.independientes;
}

/** ¿Esta sección ya tiene lo suficiente para considerarse cerrada? */
export function seccionCompleta(m: Microcurriculo, s: SeccionId): boolean {
  switch (s) {
    case "ident":
      return (
        textoReal(m.ident.asignatura) &&
        textoReal(m.ident.codigo) &&
        textoReal(m.ident.programa) &&
        m.ident.creditos > 0 &&
        totalHoras(m.ident.horas) > 0 &&
        textoReal(m.ident.semestre) &&
        m.ident.prerrequisitos.length > 0
      );
    case "justificacion":
      return m.justificacion.trim().length >= MINIMO_JUSTIFICACION && textoReal(m.justificacion);
    case "objetivos":
      return m.objetivos.generales.length > 0 && m.objetivos.especificas.length > 0;
    case "contenido":
      // Los resultados de aprendizaje NO son opcionales: sin ellos la unidad
      // no se conecta con la evaluación y el microcurrículo queda cojo.
      return (
        m.contenido.unidades.length > 0 &&
        m.contenido.unidades.every(
          (u) => textoReal(u.titulo) && u.temas.length > 0 && u.resultadosAprendizaje.length > 0
        )
      );
    case "secuencia":
      // Cada unidad con contenido necesita al menos una sesión que la dicte.
      return (
        m.secuencia.sesiones.length > 0 &&
        m.contenido.unidades.every(
          (u) => u.temas.length === 0 || m.secuencia.sesiones.some((s) => s.unidad === u.numero)
        )
      );
    case "metodologia":
      return m.metodologia.estrategias.length > 0;
    case "evaluacion":
      // Un entregable sin instrumento no se puede calificar de forma auditable.
      return (
        m.evaluacion.cortes.length > 0 &&
        totalPorcentaje(m.evaluacion.cortes) === 100 &&
        m.evaluacion.cortes.every((c) =>
          c.actividades.every((a) => !a.nombre.trim() || a.instrumento.trim().length > 0)
        )
      );
    case "bibliografia":
      return m.bibliografia.obligatorias.length > 0;
  }
}

/** ¿Quedan unidades sin resultados de aprendizaje? */
export function unidadesSinResultados(m: Microcurriculo): number {
  return m.contenido.unidades.filter((u) => u.resultadosAprendizaje.length === 0).length;
}

/** ¿Quedan unidades con temas y sin ninguna sesión? */
export function unidadesSinSesiones(m: Microcurriculo): number {
  return m.contenido.unidades.filter(
    (u) => u.temas.length > 0 && !m.secuencia.sesiones.some((s) => s.unidad === u.numero)
  ).length;
}

/** Actividades de evaluación que todavía no declaran instrumento. */
export function actividadesSinInstrumento(m: Microcurriculo): number {
  return m.evaluacion.cortes.reduce(
    (a, c) => a + c.actividades.filter((x) => x.nombre.trim() && !x.instrumento.trim()).length,
    0
  );
}

/* ------------------------------------------------------------------ */
/* Trazabilidad Micro: RA con identidad y su vínculo con la evaluación  */
/* ------------------------------------------------------------------ */

/** Un RA con la unidad a la que pertenece, para matrices y resoluciones. */
export type RaTrazable = {
  id: string;
  texto: string;
  unidad: number;
};

/** Todos los RA del micro, en orden de unidades. */
export function rasDelMicro(m: Microcurriculo): RaTrazable[] {
  return m.contenido.unidades.flatMap((u) =>
    u.resultadosAprendizaje.map((ra) => ({ id: ra.id, texto: ra.texto, unidad: u.numero }))
  );
}

/** Busca un RA por id en todo el micro. */
export function raPorId(m: Microcurriculo, id: string): RaTrazable | null {
  for (const u of m.contenido.unidades) {
    const ra = u.resultadosAprendizaje.find((r) => r.id === id);
    if (ra) return { id: ra.id, texto: ra.texto, unidad: u.numero };
  }
  return null;
}

/** Texto de un RA por id, o null si no existe. */
export function textoRa(m: Microcurriculo, id: string): string | null {
  return raPorId(m, id)?.texto ?? null;
}

/** Todas las actividades con su corte y sus vínculos, en orden. */
export function actividadesDelMicro(
  m: Microcurriculo
): { id: string; nombre: string; corte: string; mideIds: string[]; instrumento: string }[] {
  return m.evaluacion.cortes.flatMap((c) =>
    c.actividades.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      corte: c.nombre,
      mideIds: [...a.mideIds],
      instrumento: a.instrumento
    }))
  );
}

/** Actividades con nombre que no miden ningún RA por id. */
export function actividadesSinVinculo(m: Microcurriculo): number {
  return m.evaluacion.cortes.reduce(
    (a, c) => a + c.actividades.filter((x) => x.nombre.trim() && x.mideIds.length === 0).length,
    0
  );
}

/** RA que ninguna actividad dice medir. */
export function rasSinMedir(m: Microcurriculo): number {
  const medidos = new Set(m.evaluacion.cortes.flatMap((c) => c.actividades.flatMap((a) => a.mideIds)));
  return rasDelMicro(m).filter((ra) => !medidos.has(ra.id)).length;
}

/**
 * Horas mapeadas en la secuencia, por tipo. Sirve para avisar —nunca para
 * bloquear— si lo planificado no cuadra con la carga horaria declarada.
 */
export function horasPorTipo(sesiones: Sesion[]): Horas {
  const acc: Horas = { teoricas: 0, practicas: 0, independientes: 0 };
  for (const s of sesiones) {
    const horas = Math.round((s.duracionMin / 60) * 10) / 10;
    if (s.tipo === "practica") acc.practicas += horas;
    else if (s.tipo === "independiente") acc.independientes += horas;
    else acc.teoricas += horas;
  }
  return {
    teoricas: Math.round(acc.teoricas * 10) / 10,
    practicas: Math.round(acc.practicas * 10) / 10,
    independientes: Math.round(acc.independientes * 10) / 10
  };
}

/** Horas totales de un conjunto de sesiones, en horas con un decimal. */
export function horasTotales(sesiones: Sesion[]): number {
  return Math.round(sesiones.reduce((a, s) => a + s.duracionMin / 60, 0) * 10) / 10;
}

/** Sesiones de una unidad, en el orden en que están guardadas. */
export function sesionesDeUnidad(m: Microcurriculo, unidad: number): Sesion[] {
  return m.secuencia.sesiones.filter((s) => s.unidad === unidad);
}

/** Grupo de la lista de unidades de la sección Secuencia didáctica. */
export type GrupoSecuencia = {
  /** Número de unidad; -1 para el grupo de sesiones sin unidad existente. */
  numero: number;
  titulo: string;
  temas: number;
  sesiones: number;
  horas: number;
  /** false = la sesión apunta a una unidad que ya no existe. */
  existe: boolean;
};

/** Número reservado para las sesiones que quedaron sin unidad. */
export const GRUPO_SIN_UNIDAD = -1;

/**
 * Agrupa la secuencia por unidad para la vista de dos niveles.
 *
 * Devuelve SIEMPRE una entrada por unidad del contenido temático, tenga
 * sesiones o no: ver las unidades vacías es lo que le dice al docente qué le
 * falta planificar. Las sesiones huérfanas (su unidad se borró) no se pierden:
 * viajan en un grupo residual al final.
 */
export function unidadesDeSecuencia(m: Microcurriculo): GrupoSecuencia[] {
  const porUnidad = new Map<number, Sesion[]>();
  for (const s of m.secuencia.sesiones) {
    const lista = porUnidad.get(s.unidad) ?? [];
    lista.push(s);
    porUnidad.set(s.unidad, lista);
  }

  const grupos: GrupoSecuencia[] = m.contenido.unidades.map((u) => {
    const sesiones = porUnidad.get(u.numero) ?? [];
    return {
      numero: u.numero,
      titulo: u.titulo,
      temas: u.temas.length,
      sesiones: sesiones.length,
      horas: horasTotales(sesiones),
      existe: true
    };
  });

  /**
   * Sin unidades cargadas no tiene sentido hablar de «huérfanas»: todas lo
   * serían y el grupo residual se tragaría el trabajo del docente. En ese
   * caso se agrupa por el número que traen las sesiones, para que siga viendo
   * lo que planificó.
   */
  if (m.contenido.unidades.length === 0) {
    const numeros = Array.from(new Set(m.secuencia.sesiones.map((s) => s.unidad))).sort((a, b) => a - b);
    for (const n of numeros) {
      const sesiones = porUnidad.get(n) ?? [];
      grupos.push({
        numero: n,
        titulo: `Unidad ${n}`,
        temas: 0,
        sesiones: sesiones.length,
        horas: horasTotales(sesiones),
        existe: false
      });
    }
    return grupos;
  }

  // Huérfanas: sesiones cuyo número de unidad no está en el contenido.
  const numerosValidos = new Set(m.contenido.unidades.map((u) => u.numero));
  const huerfanas = m.secuencia.sesiones.filter((s) => !numerosValidos.has(s.unidad));
  if (huerfanas.length > 0) {
    grupos.push({
      numero: GRUPO_SIN_UNIDAD,
      titulo: "Sesiones sin unidad",
      temas: 0,
      sesiones: huerfanas.length,
      horas: horasTotales(huerfanas),
      existe: false
    });
  }

  return grupos;
}

/** Unidades que ya tienen al menos una sesión (para el indicador del acordeón). */
export function unidadesConSesiones(m: Microcurriculo): number {
  return m.contenido.unidades.filter((u) => m.secuencia.sesiones.some((s) => s.unidad === u.numero)).length;
}

/**
 * Recursos declarados que no aparecen en ninguna actividad de evaluación ni
 * en ninguna sesión. Alimenta el aviso suave de alineación de herramientas.
 */
export function recursosSinUso(m: Microcurriculo): string[] {
  const enActividades = new Set(
    m.evaluacion.cortes.flatMap((c) => c.actividades.flatMap((a) => a.herramientas.map((h) => h.toLowerCase())))
  );
  const enSesiones = new Set(
    m.secuencia.sesiones.flatMap((s) =>
      [...s.inicio, ...s.desarrollo, ...s.cierre].flatMap((f) => f.recursos.map((r) => r.toLowerCase()))
    )
  );
  return m.bibliografia.recursos.filter((r) => {
    const clave = r.toLowerCase();
    return !enActividades.has(clave) && !enSesiones.has(clave);
  });
}

/** Cuántas actividades mencionan una herramienta concreta (para la insignia). */
export function usosDeRecurso(m: Microcurriculo, recurso: string): number {
  const clave = recurso.toLowerCase();
  const enAct = m.evaluacion.cortes.reduce(
    (a, c) => a + c.actividades.filter((x) => x.herramientas.some((h) => h.toLowerCase() === clave)).length,
    0
  );
  const enSes = m.secuencia.sesiones.filter((s) =>
    [...s.inicio, ...s.desarrollo, ...s.cierre].some((f) => f.recursos.some((r) => r.toLowerCase() === clave))
  ).length;
  return enAct + enSes;
}

export function seccionesCompletas(m: Microcurriculo): number {
  return SECCIONES.filter((s) => seccionCompleta(m, s)).length;
}

export function primeraIncompleta(m: Microcurriculo): SeccionId | null {
  return SECCIONES.find((s) => !seccionCompleta(m, s)) ?? null;
}

/** Cuántas referencias siguen siendo sugerencia sin confirmar. */
export function referenciasSinConfirmar(m: Microcurriculo): number {
  return [...m.bibliografia.obligatorias, ...m.bibliografia.complementarias].filter((r) => !r.confirmada).length;
}

/** Resumen de una línea por sección, para la cabecera plegada. */
export function resumenSeccion(m: Microcurriculo, s: SeccionId): string {
  switch (s) {
    case "ident": {
      const partes = [
        textoReal(m.ident.codigo) ? m.ident.codigo : null,
        textoReal(m.ident.programa) ? m.ident.programa : null,
        m.ident.creditos > 0 ? `${m.ident.creditos} cr.` : null,
        totalHoras(m.ident.horas) > 0 ? `${totalHoras(m.ident.horas)} h` : null,
        textoReal(m.ident.semestre) ? m.ident.semestre : null
      ].filter(Boolean);
      return partes.length ? partes.join(" · ") : "Sin datos todavía";
    }
    case "justificacion":
      return textoReal(m.justificacion) ? m.justificacion.slice(0, 90) + (m.justificacion.length > 90 ? "…" : "") : "Sin justificar";
    case "objetivos":
      return `${m.objetivos.generales.length} general${m.objetivos.generales.length === 1 ? "" : "es"} · ${m.objetivos.especificas.length} específica${m.objetivos.especificas.length === 1 ? "" : "s"}`;
    case "contenido": {
      const temas = m.contenido.unidades.reduce((a, u) => a + u.temas.length, 0);
      const sinRa = unidadesSinResultados(m);
      const base = `${m.contenido.unidades.length} unidad${m.contenido.unidades.length === 1 ? "" : "es"} · ${temas} tema${temas === 1 ? "" : "s"}`;
      return sinRa ? `${base} · ${sinRa} sin RA` : base;
    }
    case "secuencia": {
      const n = m.secuencia.sesiones.length;
      if (n === 0) return "Sin sesiones";
      const horas = horasPorTipo(m.secuencia.sesiones);
      const total = Math.round((horas.teoricas + horas.practicas + horas.independientes) * 10) / 10;
      const sinSesiones = unidadesSinSesiones(m);
      const base = `${n} sesión${n === 1 ? "" : "es"} · ${total} h`;
      return sinSesiones ? `${base} · ${sinSesiones} unidad sin sesiones` : base;
    }
    case "metodologia":
      return m.metodologia.estrategias.length
        ? m.metodologia.estrategias.map((e) => e.nombre).join(" · ").slice(0, 90)
        : "Sin estrategias";
    case "evaluacion": {
      const total = totalPorcentaje(m.evaluacion.cortes);
      const n = m.evaluacion.cortes.length;
      const sinInst = actividadesSinInstrumento(m);
      const sinVinc = actividadesSinVinculo(m);
      if (!n) return "Sin cortes";
      let base = `${n} corte${n === 1 ? "" : "s"} · ${total}%`;
      if (sinInst) base += ` · ${sinInst} sin instrumento`;
      if (sinVinc) base += ` · ${sinVinc} sin RA`;
      return base;
    }
    case "bibliografia": {
      const n = m.bibliografia.obligatorias.length + m.bibliografia.complementarias.length;
      const pend = referenciasSinConfirmar(m);
      return n ? `${n} referencia${n === 1 ? "" : "s"}${pend ? ` · ${pend} sin confirmar` : ""}` : "Sin referencias";
    }
  }
}

/* ------------------------------------------------------------------ */
/* Porcentajes de evaluación                                           */
/* ------------------------------------------------------------------ */

/** Suma actual de los porcentajes (puede no ser 100). */
export function totalPorcentaje(cortes: Corte[]): number {
  return cortes.reduce((a, c) => a + (Number.isFinite(c.porcentaje) ? c.porcentaje : 0), 0);
}

/**
 * Reparte 100 en enteros de forma que la suma sea exactamente 100, usando el
 * método del resto mayor. Sin esto, redondear cada corte por separado deja
 * sumas de 99 o 101 y la ficha muestra un desbalance que el docente no creó.
 */
function repartir100(pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  const suma = pesos.reduce((a, b) => a + Math.max(0, b), 0);
  const base =
    suma > 0
      ? pesos.map((p) => (Math.max(0, p) * 100) / suma)
      : pesos.map(() => 100 / pesos.length);

  const suelos = base.map((v) => Math.floor(v));
  const resto = 100 - suelos.reduce((a, b) => a + b, 0);
  const orden = base
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const salida = [...suelos];
  for (let k = 0; k < resto; k++) salida[orden[k % orden.length].i] += 1;
  return salida;
}

/** Devuelve los cortes con porcentajes que suman exactamente 100. */
export function ajustarCortesA100(cortes: Corte[]): Corte[] {
  if (cortes.length === 0) return cortes;
  const nuevos = repartir100(cortes.map((c) => c.porcentaje));
  return cortes.map((c, i) => ({ ...c, porcentaje: nuevos[i] }));
}

/* ------------------------------------------------------------------ */
/* Validación                                                          */
/* ------------------------------------------------------------------ */

/** Devuelve problemas legibles. Lista vacía = microcurrículo aceptable. */
export function validarMicrocurriculo(m: Microcurriculo): string[] {
  const problemas: string[] = [];

  if (microcurriculoVacio(m)) {
    problemas.push("La respuesta no trae ninguna sección con contenido: no hay nada que mostrar en la ficha.");
  }

  const total = totalPorcentaje(m.evaluacion.cortes);
  if (m.evaluacion.cortes.length > 0 && total !== 100) {
    problemas.push(
      `Los porcentajes de evaluación suman ${total}% en lugar de 100%. Puedes ajustarlos con un botón en la ficha.`
    );
  }

  m.contenido.unidades.forEach((u) => {
    if (!textoReal(u.titulo)) problemas.push(`La unidad ${u.numero} no tiene título.`);
  });

  const sinRa = unidadesSinResultados(m);
  if (sinRa > 0) {
    problemas.push(
      `${sinRa} unidad${sinRa === 1 ? "" : "es"} sin resultados de aprendizaje. Sin ellos no se puede trazar la evaluación.`
    );
  }

  const sinSesiones = unidadesSinSesiones(m);
  if (sinSesiones > 0) {
    problemas.push(
      `${sinSesiones} unidad${sinSesiones === 1 ? "" : "es"} sin sesiones en la secuencia didáctica.`
    );
  }

  const sinInstrumento = actividadesSinInstrumento(m);
  if (sinInstrumento > 0) {
    problemas.push(
      `${sinInstrumento} actividad${sinInstrumento === 1 ? "" : "es"} de evaluación sin instrumento declarado.`
    );
  }

  const sinVinculo = actividadesSinVinculo(m);
  if (sinVinculo > 0) {
    problemas.push(
      `${sinVinculo} actividad${sinVinculo === 1 ? "" : "es"} sin RA vinculado: no se sabe qué resultado mide.`
    );
  }

  const huerfanos = rasSinMedir(m);
  if (huerfanos > 0 && actividadesDelMicro(m).length > 0) {
    problemas.push(
      `${huerfanos} resultado${huerfanos === 1 ? "" : "s"} de aprendizaje sin actividad que lo mida.`
    );
  }

  return problemas.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Fusión: una iteración no debe borrar lo ya establecido              */
/* ------------------------------------------------------------------ */

function conservarSiVacio(nuevo: string, anterior: string): string {
  if (!nuevo || nuevo === POR_DEFINIR) return anterior || nuevo;
  return nuevo;
}

function claveReferencia(r: Referencia): string {
  return `${r.autor}|${r.titulo}`.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Las confirmaciones del docente viven solo en su navegador: el modelo siempre
 * devuelve las referencias como sugerencia. Al fusionar, se restauran las que
 * el docente ya había confirmado, comparando autor y título.
 */
function fusionarReferencias(nuevas: Referencia[], anteriores: Referencia[]): Referencia[] {
  const confirmadas = new Set(anteriores.filter((r) => r.confirmada).map(claveReferencia));
  return nuevas.map((r) => (confirmadas.has(claveReferencia(r)) ? { ...r, confirmada: true } : r));
}

/**
 * La secuencia se acumula por unidad: si el docente pide «las sesiones de la
 * unidad 2», las de la unidad 1 no pueden desaparecer. Las sesiones de una
 * unidad que viene en la respuesta se reemplazan completas, porque el modelo
 * devuelve el conjunto de esa unidad entero.
 */
function fusionarSesiones(anteriores: Sesion[], nuevas: Sesion[]): Sesion[] {
  const unidadesNuevas = new Set(nuevas.map((s) => s.unidad));
  const conservadas = anteriores.filter((s) => !unidadesNuevas.has(s.unidad));
  return [...conservadas, ...nuevas]
    .sort((a, b) => a.unidad - b.unidad || a.numero - b.numero)
    .map((s, i) => ({ ...s, numero: i + 1 }));
}

function claveTexto(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Fusiona unidades preservando los ids de RA ya asignados: si un RA entrante
 * tiene el mismo texto que uno anterior, hereda su id para no romper los
 * vínculos de evaluación ni las alineaciones del proyecto.
 */
function fusionarUnidades(anteriores: Unidad[], nuevas: Unidad[]): Unidad[] {
  const porTexto = new Map<string, string>();
  for (const u of anteriores) {
    for (const ra of u.resultadosAprendizaje) {
      const clave = claveTexto(ra.texto);
      if (clave && !porTexto.has(clave)) porTexto.set(clave, ra.id);
    }
  }
  const copiadas: Unidad[] = nuevas.map((u) => ({
    ...u,
    resultadosAprendizaje: u.resultadosAprendizaje.map((ra) => {
      const heredado = porTexto.get(claveTexto(ra.texto));
      return heredado && heredado !== ra.id ? { ...ra, id: heredado } : ra;
    })
  }));
  // Reordena colisiones de ids dentro del conjunto nuevo.
  const usados = new Set<string>();
  for (const u of copiadas) {
    for (const ra of u.resultadosAprendizaje) {
      const base = ra.id;
      let id = base;
      let n = 2;
      while (usados.has(id)) {
        id = `${base}_${n}`;
        n++;
      }
      ra.id = id;
      usados.add(id);
    }
  }
  return copiadas;
}

/**
 * Fusiona cortes preservando los ids de actividad ya asignados (por nombre) y
 * los vínculos `mideIds` cuando la respuesta no trae unos nuevos. Los ids
 * huérfanos se filtran contra los RA del micro resultante.
 */
function fusionarCortes(
  anteriores: Corte[],
  nuevos: Corte[],
  rasDisponibles: Set<string>
): Corte[] {
  const porNombre = new Map<string, ActividadEvaluacion>();
  for (const c of anteriores) {
    for (const a of c.actividades) {
      const clave = claveTexto(a.nombre);
      if (clave && !porNombre.has(clave)) porNombre.set(clave, a);
    }
  }
  return nuevos.map((c) => ({
    ...c,
    actividades: c.actividades.map((a) => {
      const previa = porNombre.get(claveTexto(a.nombre));
      if (!previa) return { ...a, mideIds: a.mideIds.filter((x) => rasDisponibles.has(x)) };
      const mideIds = a.mideIds.length
        ? a.mideIds.filter((x) => rasDisponibles.has(x))
        : previa.mideIds.filter((x) => rasDisponibles.has(x));
      return { ...a, id: previa.id, mideIds };
    })
  }));
}

/**
 * Aplica el microcurrículo que devolvió la IA sobre el anterior.
 * Conserva folio y evita que una iteración parcial borre secciones que el
 * docente ya tenía (incluidas sus confirmaciones de bibliografía).
 */
export function mergeMicrocurriculo(anterior: Microcurriculo | null, nueva: Microcurriculo): Microcurriculo {
  if (!anterior) return nueva;

  const ident = nueva.ident;
  const prev = anterior.ident;

  const unidades = nueva.contenido.unidades.length
    ? fusionarUnidades(anterior.contenido.unidades, nueva.contenido.unidades)
    : anterior.contenido.unidades;
  const rasDisponibles = new Set(unidades.flatMap((u) => u.resultadosAprendizaje.map((ra) => ra.id)));

  return {
    folio: anterior.folio || nueva.folio,
    ident: {
      asignatura: conservarSiVacio(ident.asignatura, prev.asignatura),
      codigo: conservarSiVacio(ident.codigo, prev.codigo),
      programa: conservarSiVacio(ident.programa, prev.programa),
      creditos: ident.creditos || prev.creditos,
      horas: {
        teoricas: ident.horas.teoricas || prev.horas.teoricas,
        practicas: ident.horas.practicas || prev.horas.practicas,
        independientes: ident.horas.independientes || prev.horas.independientes
      },
      prerrequisitos: ident.prerrequisitos.length ? ident.prerrequisitos : prev.prerrequisitos,
      semestre: conservarSiVacio(ident.semestre, prev.semestre)
    },
    justificacion: conservarSiVacio(nueva.justificacion, anterior.justificacion),
    objetivos: {
      generales: nueva.objetivos.generales.length ? nueva.objetivos.generales : anterior.objetivos.generales,
      especificas: nueva.objetivos.especificas.length
        ? nueva.objetivos.especificas
        : anterior.objetivos.especificas
    },
    contenido: { unidades },
    secuencia: {
      // La secuencia se acumula: pedir las sesiones de la unidad 2 no puede
      // borrar las de la unidad 1.
      sesiones: nueva.secuencia.sesiones.length
        ? fusionarSesiones(anterior.secuencia.sesiones, nueva.secuencia.sesiones)
        : anterior.secuencia.sesiones
    },
    metodologia: {
      estrategias: nueva.metodologia.estrategias.length
        ? nueva.metodologia.estrategias
        : anterior.metodologia.estrategias
    },
    evaluacion: {
      // Si los cortes vienen, se respetan tal cual (aunque sumen distinto de
      // 100): el desbalance lo señala la ficha y lo corrige el docente.
      // Los ids de actividad y sus vínculos se preservan por nombre.
      cortes: nueva.evaluacion.cortes.length
        ? fusionarCortes(anterior.evaluacion.cortes, nueva.evaluacion.cortes, rasDisponibles)
        : anterior.evaluacion.cortes
    },
    bibliografia: {
      obligatorias: nueva.bibliografia.obligatorias.length
        ? fusionarReferencias(nueva.bibliografia.obligatorias, anterior.bibliografia.obligatorias)
        : anterior.bibliografia.obligatorias,
      complementarias: nueva.bibliografia.complementarias.length
        ? fusionarReferencias(nueva.bibliografia.complementarias, anterior.bibliografia.complementarias)
        : anterior.bibliografia.complementarias,
      recursos: nueva.bibliografia.recursos.length
        ? nueva.bibliografia.recursos
        : anterior.bibliografia.recursos
    }
  };
}

/* ------------------------------------------------------------------ */
/* Extracción de "mensaje" mientras el JSON todavía está llegando      */
/* ------------------------------------------------------------------ */

const CLAVE = /"mensaje"\s*:\s*"/;

/**
 * Lee incrementalmente el valor de la clave "mensaje" del JSON que aún se
 * está recibiendo, para poder mostrar texto conversacional legible en
 * streaming en vez de llaves crudas.
 *
 * @param textoAcumulado todo el buffer recibido hasta ahora
 * @returns el texto ya decodificado, o "" si la clave todavía no aparece
 */
export function extraerMensajeParcial(textoAcumulado: string): string {
  if (!textoAcumulado) return "";

  const m = CLAVE.exec(textoAcumulado);
  if (!m) return "";

  let i = m.index + m[0].length;
  let salida = "";

  while (i < textoAcumulado.length) {
    const ch = textoAcumulado[i];

    if (ch === '"') return salida; // cierre real de la cadena

    if (ch !== "\\") {
      salida += ch;
      i++;
      continue;
    }

    // Secuencia de escape: necesita al menos un carácter más.
    if (i + 1 >= textoAcumulado.length) return salida;

    const esc = textoAcumulado[i + 1];
    switch (esc) {
      case "n": salida += "\n"; i += 2; break;
      case "t": salida += "\t"; i += 2; break;
      case "r": salida += "\r"; i += 2; break;
      case "b": salida += "\b"; i += 2; break;
      case "f": salida += "\f"; i += 2; break;
      case '"': salida += '"'; i += 2; break;
      case "\\": salida += "\\"; i += 2; break;
      case "/": salida += "/"; i += 2; break;
      case "u": {
        const hex = textoAcumulado.slice(i + 2, i + 6);
        if (hex.length < 4) return salida; // todavía está llegando
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return salida; // esperando más dígitos
        salida += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        break;
      }
      default:
        // Escape incompleto o desconocido: no inventes, espera el próximo chunk.
        return salida;
    }
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Parseo de la respuesta completa                                     */
/* ------------------------------------------------------------------ */

/**
 * Resultado de un turno. La unión es discriminada por `borrador`:
 * solo cuando es true existe `microcurriculo`, y solo entonces el llamante
 * puede tocar el estado. Una respuesta conversacional NO trae ficha.
 */
export type ResultadoParseo =
  | {
      ok: true;
      borrador: false;
      mensaje: string;
      sugerencias: string[];
      intencion: Intencion;
      seccionActiva: SeccionId | null;
    }
  | {
      ok: true;
      borrador: true;
      mensaje: string;
      sugerencias: string[];
      intencion: Intencion;
      seccionActiva: SeccionId | null;
      microcurriculo: Microcurriculo;
    }
  | { ok: false; motivo: string };

/** Cuántas sugerencias clicables se muestran como máximo. */
export const SUGERENCIAS_MAX = 4;

/** Quita vallas de código y se queda con el primer objeto balanceado. */
export function aislarObjeto(crudo: string): string {
  let t = crudo.trim();
  const valla = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (valla) t = valla[1].trim();

  const inicio = t.indexOf("{");
  if (inicio === -1) return t;

  let profundidad = 0;
  let enCadena = false;
  for (let i = inicio; i < t.length; i++) {
    const ch = t[i];
    if (enCadena) {
      if (ch === "\\") i++;
      else if (ch === '"') enCadena = false;
      continue;
    }
    if (ch === '"') enCadena = true;
    else if (ch === "{") profundidad++;
    else if (ch === "}") {
      profundidad--;
      if (profundidad === 0) return t.slice(inicio, i + 1);
    }
  }
  return t.slice(inicio);
}

/**
 * Repara un JSON que quedó desbalanceado al final.
 *
 * Pasa de verdad: el modelo corta el objeto a mitad, o se le escapa un cierre.
 * Cuando el desbalance es solo del final (falta cerrar cadenas, corchetes o
 * llaves), se puede completar de forma determinista sin inventar contenido:
 * se cierra la cadena abierta, se quita la coma colgante y se cierran las
 * estructuras abiertas en orden inverso. Si el desbalance es interno, no se
 * toca nada: ahí sí hay que reintentar.
 *
 * @returns el JSON reparado si queda parseable, o null si no se puede.
 */
export function repararJSON(crudo: string): string | null {
  const t = crudo.trim();
  if (!t) return null;

  const pila: string[] = [];
  let enCadena = false;
  let salida = t;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (enCadena) {
      if (ch === "\\") i++;
      else if (ch === '"') enCadena = false;
      continue;
    }
    if (ch === '"') enCadena = true;
    else if (ch === "{" || ch === "[") pila.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (pila[pila.length - 1] === ch) pila.pop();
      else return null; // cierre de más: el daño es interno
    }
  }

  if (enCadena) salida += '"';
  // Una coma antes del cierre dejaría el JSON inválido.
  salida = salida.replace(/,\s*$/, "");

  while (pila.length > 0) salida += pila.pop();

  try {
    JSON.parse(salida);
    return salida;
  } catch {
    return null;
  }
}

/**
 * Parsea la respuesta completa de la IA.
 *
 * `meta` es opcional y llega del servidor: el `finish_reason` del proveedor.
 * Con él, un JSON cortado deja de ser un misterio: "length" significa que se
 * agotó el presupuesto de tokens, no que el modelo se rompió.
 */
export function parsearRespuesta(
  crudo: string,
  meta?: { fin?: string | null; tokens?: number | null; error?: string | null }
): ResultadoParseo {
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
  let reparado = false;
  try {
    datos = JSON.parse(aislado);
  } catch {
    // Segundo intento: cerrar lo que quedó abierto al final.
    const arreglado = repararJSON(aislado);
    if (arreglado === null) {
      if (fin === "length") {
        return {
          ok: false,
          motivo:
            "La respuesta se cortó porque se agotó el presupuesto de tokens (finish_reason: length). " +
            "Pide una unidad por vez, o reduce el número de unidades y referencias."
        };
      }
      return {
        ok: false,
        motivo:
          `La respuesta llegó incompleta o con JSON inválido${fin ? ` (finish_reason: ${fin})` : ""}. ` +
          `Lo recibido empieza así: ${crudo.slice(0, 160).replace(/\s+/g, " ")}… ` +
          "Reintenta; si se repite, pide una modificación más acotada."
      };
    }
    try {
      datos = JSON.parse(arreglado);
      reparado = true;
    } catch {
      return { ok: false, motivo: "La IA devolvió un JSON que no se pudo interpretar. Reintenta." };
    }
  }

  if (!esObjeto(datos)) {
    return { ok: false, motivo: "La IA devolvió un JSON que no es un objeto." };
  }

  // `reparado` no cambia el resultado, pero se conserva en el tipo por si la
  // interfaz quiere avisar de que la respuesta venía incompleta.
  void reparado;

  const mensajeBruto = typeof datos.mensaje === "string" ? datos.mensaje : "";
  const mensaje = mensajeBruto.trim() || "Listo.";
  const sugerencias = lista(datos.sugerencias, SUGERENCIAS_MAX);
  const intencion = esIntencion(datos.intencion) ? datos.intencion : "entender";
  const seccionActiva =
    typeof datos.seccionActiva === "string" && (SECCIONES as readonly string[]).includes(datos.seccionActiva)
      ? (datos.seccionActiva as SeccionId)
      : null;

  const quiereGenerar = booleano(datos.generar, false);
  const tieneBorrador = esObjeto(datos.borrador);

  // Sin borrador: es un turno conversacional. Nada que normalizar, nada que tocar.
  if (!quiereGenerar || !tieneBorrador) {
    return { ok: true, borrador: false, mensaje, sugerencias, intencion, seccionActiva };
  }

  const microcurriculo = normalizarMicrocurriculo(datos.borrador);

  // Guardia: un borrador vacío es peor que no tenerlo. Si el modelo dijo que
  // generaba pero no trajo sustancia, preferimos conservar lo que había.
  if (microcurriculoVacio(microcurriculo)) {
    return { ok: true, borrador: false, mensaje, sugerencias, intencion, seccionActiva };
  }

  return { ok: true, borrador: true, mensaje, sugerencias, intencion, seccionActiva, microcurriculo };
}

/* ------------------------------------------------------------------ */
/* Estado inicial (vacío, sin datos de ejemplo)                        */
/* ------------------------------------------------------------------ */

export function folioNuevo(ahora = new Date()): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MC-${ahora.getFullYear()}-${n}`;
}

export function microcurriculoVacioEstructura(): Microcurriculo {
  return {
    folio: folioNuevo(),
    ident: {
      asignatura: POR_DEFINIR,
      codigo: POR_DEFINIR,
      programa: POR_DEFINIR,
      creditos: 0,
      horas: { teoricas: 0, practicas: 0, independientes: 0 },
      prerrequisitos: [],
      semestre: POR_DEFINIR
    },
    justificacion: "",
    objetivos: { generales: [], especificas: [] },
    contenido: { unidades: [] },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  };
}

/** ¿Todavía no hay nada escrito? */
export function microcurriculoVacio(m: Microcurriculo): boolean {
  return (
    !textoReal(m.ident.asignatura) &&
    !textoReal(m.justificacion) &&
    m.objetivos.generales.length === 0 &&
    m.objetivos.especificas.length === 0 &&
    m.contenido.unidades.length === 0 &&
    m.secuencia.sesiones.length === 0 &&
    m.metodologia.estrategias.length === 0 &&
    m.evaluacion.cortes.length === 0 &&
    m.bibliografia.obligatorias.length === 0 &&
    m.bibliografia.complementarias.length === 0
  );
}

/* ------------------------------------------------------------------ */
/* Apertura de la conversación                                         */
/* ------------------------------------------------------------------ */

/**
 * Saludo de apertura. Es texto fijo del cliente, NO lo genera la IA: así el
 * primer mensaje visible no pide datos ni propone enfoques, y no depende
 * de la latencia ni del humor del modelo. Solo invita a decir qué se necesita.
 */
export const SALUDO_APERTURA =
  "Hola. Soy tu asistente de diseño curricular para educación superior. ¿Qué querés hacer hoy?";

/**
 * Sugerencias semilla del estado inicial. Apuntan al microcurrículo completo,
 * que es el alcance de esta entrega.
 */
export const SUGERENCIAS_APERTURA = [
  "Necesito armar el microcurrículo de una asignatura",
  "Tengo el syllabus y quiero ordenarlo",
  "Me pidieron actualizar el microcurrículo de mi materia"
];

/* ------------------------------------------------------------------ */
/* Persistencia                                                        */
/* ------------------------------------------------------------------ */

export type EstadoGuardado = {
  version: number;
  microcurriculo: Microcurriculo | null;
  mensajes: ChatMensaje[];
  sugerencias: string[];
  intencion: Intencion;
  seccionActiva: SeccionId | null;
  crudo: string;
};

function esSeccion(v: unknown): v is SeccionId {
  return typeof v === "string" && (SECCIONES as readonly string[]).includes(v);
}

/** ¿Este objeto tiene la forma mínima de un Microcurriculo guardado? */
export function esMicrocurriculo(v: unknown): v is Microcurriculo {
  if (!esObjeto(v)) return false;
  const o = v;

  const referenciaOk = (r: unknown) =>
    esObjeto(r) && typeof r.titulo === "string" && typeof r.confirmada === "boolean";
  const listaRefsOk = (arr: unknown) => Array.isArray(arr) && arr.every(referenciaOk);
  const temaOk = (t: unknown) => esObjeto(t) && typeof t.nombre === "string" && Array.isArray(t.subtemas);
  const unidadOk = (u: unknown) =>
    esObjeto(u) &&
    typeof u.numero === "number" &&
    typeof u.titulo === "string" &&
    Array.isArray(u.resultadosAprendizaje) &&
    Array.isArray(u.temas) &&
    u.temas.every(temaOk);
  const corteOk = (c: unknown) =>
    esObjeto(c) && typeof c.porcentaje === "number" && Array.isArray(c.actividades);
  const filaOk = (f: unknown) => esObjeto(f) && Array.isArray(f.recursos);
  const sesionOk = (s: unknown) =>
    esObjeto(s) &&
    typeof s.numero === "number" &&
    typeof s.unidad === "number" &&
    typeof s.duracionMin === "number" &&
    Array.isArray(s.inicio) &&
    Array.isArray(s.desarrollo) &&
    Array.isArray(s.cierre) &&
    [...s.inicio, ...s.desarrollo, ...s.cierre].every(filaOk);

  return (
    typeof o.folio === "string" &&
    esObjeto(o.ident) &&
    esObjeto(o.ident.horas) &&
    typeof o.justificacion === "string" &&
    esObjeto(o.objetivos) &&
    Array.isArray(o.objetivos.generales) &&
    Array.isArray(o.objetivos.especificas) &&
    esObjeto(o.contenido) &&
    Array.isArray(o.contenido.unidades) &&
    o.contenido.unidades.every(unidadOk) &&
    esObjeto(o.secuencia) &&
    Array.isArray(o.secuencia.sesiones) &&
    o.secuencia.sesiones.every(sesionOk) &&
    esObjeto(o.metodologia) &&
    Array.isArray(o.metodologia.estrategias) &&
    esObjeto(o.evaluacion) &&
    Array.isArray(o.evaluacion.cortes) &&
    o.evaluacion.cortes.every(corteOk) &&
    esObjeto(o.bibliografia) &&
    listaRefsOk(o.bibliografia.obligatorias) &&
    listaRefsOk(o.bibliografia.complementarias)
  );
}

/**
 * Migra un estado guardado de la primera versión (sin secuencia didáctica, sin
 * instrumentos ni campos de bibliografía ampliados) a la forma actual.
 *
 * Se migra en vez de descartar: el trabajo del docente no debe perderse porque
 * hayamos añadido campos. Lo que falta se rellena con los valores por defecto
 * del normalizador.
 *
 * Ojo con la bibliografía: el normalizador fuerza `confirmada: false` porque el
 * modelo nunca puede confirmar por el docente. Al migrar, las confirmaciones ya
 * existentes sí se conservan, restaurándolas por autor y título.
 */
export function migrarEstadoV1(v: unknown): EstadoGuardado | null {
  if (!esObjeto(v)) return null;
  if (!Array.isArray(v.mensajes)) return null;

  const micro =
    v.microcurriculo === null || v.microcurriculo === undefined
      ? null
      : normalizarMicrocurriculo(v.microcurriculo);

  if (micro && esObjeto(v.microcurriculo)) {
    const original = v.microcurriculo;
    const biblio = esObjeto(original.bibliografia) ? original.bibliografia : null;
    if (biblio) {
      const confirmadas = new Set(
        [...(Array.isArray(biblio.obligatorias) ? biblio.obligatorias : []),
         ...(Array.isArray(biblio.complementarias) ? biblio.complementarias : [])]
          .filter((r) => esObjeto(r) && r.confirmada === true)
          .map((r) => `${textoOpcional((r as Record<string, unknown>).autor)}|${textoOpcional((r as Record<string, unknown>).titulo)}`.toLowerCase())
      );
      const marcar = (refs: Referencia[]) =>
        refs.map((r) => (confirmadas.has(claveReferencia(r)) ? { ...r, confirmada: true } : r));
      micro.bibliografia = {
        ...micro.bibliografia,
        obligatorias: marcar(micro.bibliografia.obligatorias),
        complementarias: marcar(micro.bibliografia.complementarias)
      };
    }
  }

  return {
    version: 2,
    microcurriculo: micro,
    mensajes: v.mensajes as ChatMensaje[],
    sugerencias: lista(v.sugerencias, SUGERENCIAS_MAX),
    intencion: esIntencion(v.intencion) ? v.intencion : "entender",
    seccionActiva: esSeccion(v.seccionActiva) ? v.seccionActiva : null,
    crudo: typeof v.crudo === "string" ? v.crudo : ""
  };
}

/** Valida el estado guardado sin confiar en localStorage. */
export function esEstadoGuardado(v: unknown): v is EstadoGuardado {
  if (!esObjeto(v)) return false;
  const o = v;
  const microOk = o.microcurriculo === null || esMicrocurriculo(o.microcurriculo);
  const mensajesOk =
    Array.isArray(o.mensajes) &&
    o.mensajes.every(
      (m) =>
        esObjeto(m) &&
        typeof m.texto === "string" &&
        (m.role === "usuario" || m.role === "asistente")
    );
  return (
    o.version === 2 &&
    microOk &&
    mensajesOk &&
    Array.isArray(o.sugerencias) &&
    typeof o.crudo === "string" &&
    esIntencion(o.intencion) &&
    (o.seccionActiva === null || esSeccion(o.seccionActiva))
  );
}
