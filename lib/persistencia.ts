/**
 * Persistencia pura del estado curricular mediante un almacén inyectable.
 * No accede a `window` ni conoce localStorage.
 *
 * Los reemplazos de V3 usan staging, respaldo del último V3 válido o copia de
 * recuperación del V3 corrupto. La migración nunca borra un legado antes de
 * verificar el commit canónico y la eliminación posterior.
 */

import { esEstadoGuardado, migrarEstadoV1 } from "./schema.ts";
import {
  esEstadoGuardadoV3,
  migrarEstadoV2,
  type EstadoGuardadoV3
} from "./proyecto.ts";

export const CLAVE_PROYECTO_V3 = "designconia.proyecto.v3";
export const CLAVE_PROYECTO_V3_TEMP = "designconia.proyecto.v3.tmp";
export const CLAVE_PROYECTO_V3_TEMP_RECUPERACION = "designconia.proyecto.v3.tmp.recuperacion";
export const CLAVE_PROYECTO_V3_RESPALDO = "designconia.proyecto.v3.respaldo";
export const CLAVE_PROYECTO_V3_RECUPERACION = "designconia.proyecto.v3.recuperacion";
export const CLAVE_MICRO_V2 = "designconia.micro.v2";
export const CLAVE_MICRO_V1 = "designconia.micro.v1";

export type AlmacenPersistencia = {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
};

export type ErrorPersistencia =
  | "estado_invalido"
  | "serializacion"
  | "almacen_inaccesible"
  | "respaldo_no_verificable"
  | "recuperacion_conflictiva"
  | "temporal_conflictiva"
  | "escritura_temporal"
  | "verificacion_temporal"
  | "escritura"
  | "lectura_verificacion";

export type ResultadoGuardadoV3 =
  | {
      ok: true;
      guardado: true;
      estado: EstadoGuardadoV3;
      clavesTemporalesPendientes: string[];
    }
  | {
      ok: false;
      guardado: false;
      estado: null;
      error: ErrorPersistencia;
      clavesTemporalesPendientes: string[];
    };

export type OrigenCarga = "v3" | "respaldo_v3" | "temporal_v3" | "v2" | "v1" | "ninguno";
export type EstadoCarga = "cargado" | "migrado" | "sin_datos" | "datos_no_migrables" | "almacen_inaccesible";

type DiagnosticoCarga = {
  clavesConflictivas: string[];
  clavesInaccesibles: string[];
};

export type ResultadoCarga =
  | (DiagnosticoCarga & {
      /** `ok` indica que hay un V3 utilizable, aunque solo viva en memoria. */
      ok: true;
      estado: EstadoGuardadoV3;
      origen: Exclude<OrigenCarga, "ninguno">;
      estadoCarga: "cargado" | "migrado";
      migrado: boolean;
      guardado: boolean;
      error?: ErrorPersistencia;
      clavesLegadasEliminadas: string[];
      clavesLegadasPendientes: string[];
      clavesTemporalesPendientes: string[];
    })
  | (DiagnosticoCarga & {
      ok: false;
      estado: null;
      origen: "ninguno";
      estadoCarga: "sin_datos" | "datos_no_migrables" | "almacen_inaccesible";
      migrado: false;
      guardado: false;
      clavesLegadasEliminadas: [];
      clavesLegadasPendientes: [];
      clavesTemporalesPendientes: [];
    });

type LecturaCruda = { accesible: boolean; valor: string | null };
type LecturaJson = LecturaCruda & { parseable: boolean; json: unknown };
type MigracionLegada = { estado: EstadoGuardadoV3; origen: "v1" | "v2" };
type LimpiezaLegada = {
  eliminadas: string[];
  pendientes: string[];
  conflictivas: string[];
  inaccesibles: string[];
};

function unico(items: string[]): string[] {
  return Array.from(new Set(items));
}

function leerCrudo(almacen: AlmacenPersistencia, clave: string): LecturaCruda {
  try {
    return { accesible: true, valor: almacen.getItem(clave) };
  } catch {
    return { accesible: false, valor: null };
  }
}

function leerJson(almacen: AlmacenPersistencia, clave: string): LecturaJson {
  const crudo = leerCrudo(almacen, clave);
  if (!crudo.accesible || crudo.valor === null) return { ...crudo, parseable: false, json: null };
  try {
    return { ...crudo, parseable: true, json: JSON.parse(crudo.valor) as unknown };
  } catch {
    return { ...crudo, parseable: false, json: null };
  }
}

function esEstadoV3Crudo(crudo: string | null): crudo is string {
  if (crudo === null) return false;
  try {
    return esEstadoGuardadoV3(JSON.parse(crudo) as unknown);
  } catch {
    return false;
  }
}

function estadoDesdeCrudoV3(crudo: string): EstadoGuardadoV3 | null {
  try {
    const estado = JSON.parse(crudo) as unknown;
    return esEstadoGuardadoV3(estado) ? estado : null;
  } catch {
    return null;
  }
}

function verificarV3(almacen: AlmacenPersistencia, clave: string, esperado: string): boolean {
  const readback = leerCrudo(almacen, clave);
  return readback.accesible && readback.valor === esperado && esEstadoV3Crudo(readback.valor);
}

function quitarYVerificar(
  almacen: AlmacenPersistencia,
  clave: string
): { eliminado: boolean; inaccesible: boolean } {
  try {
    almacen.removeItem(clave);
  } catch {
    // Se verifica igualmente: algunos almacenes eliminan y luego arrojan error.
  }
  const readback = leerCrudo(almacen, clave);
  return {
    eliminado: readback.accesible && readback.valor === null,
    inaccesible: !readback.accesible
  };
}

function guardarRespaldoV3Valido(almacen: AlmacenPersistencia, actual: string): boolean {
  const existente = leerCrudo(almacen, CLAVE_PROYECTO_V3_RESPALDO);
  if (!existente.accesible) return false;
  if (existente.valor === actual) return esEstadoV3Crudo(existente.valor);
  // La clave de respaldo es rotativa, pero nunca se destruye una entrada que
  // no sea un V3 reconocido. Si el respaldo anterior es válido, puede rotarse.
  if (existente.valor !== null && !esEstadoV3Crudo(existente.valor)) return false;

  try {
    almacen.setItem(CLAVE_PROYECTO_V3_RESPALDO, actual);
  } catch {
    return false;
  }
  return verificarV3(almacen, CLAVE_PROYECTO_V3_RESPALDO, actual);
}

function preservarV3Corrupto(almacen: AlmacenPersistencia, actual: string): boolean {
  const existente = leerCrudo(almacen, CLAVE_PROYECTO_V3_RECUPERACION);
  if (!existente.accesible) return false;
  if (existente.valor !== null && existente.valor !== actual) return false;

  if (existente.valor === null) {
    try {
      almacen.setItem(CLAVE_PROYECTO_V3_RECUPERACION, actual);
    } catch {
      return false;
    }
  }

  const verificacion = leerCrudo(almacen, CLAVE_PROYECTO_V3_RECUPERACION);
  return verificacion.accesible && verificacion.valor === actual;
}

function preservarTemporal(almacen: AlmacenPersistencia, actual: string): boolean {
  const existente = leerCrudo(almacen, CLAVE_PROYECTO_V3_TEMP_RECUPERACION);
  if (!existente.accesible) return false;
  if (existente.valor !== null && existente.valor !== actual) return false;

  if (existente.valor === null) {
    try {
      almacen.setItem(CLAVE_PROYECTO_V3_TEMP_RECUPERACION, actual);
    } catch {
      return false;
    }
  }

  const verificacion = leerCrudo(almacen, CLAVE_PROYECTO_V3_TEMP_RECUPERACION);
  return verificacion.accesible && verificacion.valor === actual;
}

function restaurarCrudoAnterior(almacen: AlmacenPersistencia, anterior: string): boolean {
  try {
    almacen.setItem(CLAVE_PROYECTO_V3, anterior);
  } catch {
    // Se intenta y verifica readback aun si el adapter reporta error tras escribir.
  }
  const readback = leerCrudo(almacen, CLAVE_PROYECTO_V3);
  return readback.accesible && readback.valor === anterior;
}

function resultadoNoGuardado(error: ErrorPersistencia, clavesTemporalesPendientes: string[] = []): ResultadoGuardadoV3 {
  return { ok: false, guardado: false, estado: null, error, clavesTemporalesPendientes };
}

/**
 * Guarda V3 con staging. Antes de reemplazar un V3 válido lo copia y verifica
 * en el respaldo rotativo; antes de reemplazar uno inválido preserva su texto
 * crudo en la clave de recuperación. Si cualquiera de esas garantías falla,
 * no toca la clave canónica.
 */
export function guardarEstadoV3(
  almacen: AlmacenPersistencia,
  valor: unknown
): ResultadoGuardadoV3 {
  if (!esEstadoGuardadoV3(valor)) return resultadoNoGuardado("estado_invalido");

  let serializado: string;
  try {
    serializado = JSON.stringify(valor);
  } catch {
    return resultadoNoGuardado("serializacion");
  }

  const actual = leerCrudo(almacen, CLAVE_PROYECTO_V3);
  if (!actual.accesible) return resultadoNoGuardado("almacen_inaccesible");
  if (actual.valor === serializado && esEstadoV3Crudo(actual.valor)) {
    const recuperado = estadoDesdeCrudoV3(actual.valor);
    if (!recuperado) return resultadoNoGuardado("lectura_verificacion");
    const tempExistente = leerCrudo(almacen, CLAVE_PROYECTO_V3_TEMP);
    if (!tempExistente.accesible) {
      return { ok: true, guardado: true, estado: recuperado, clavesTemporalesPendientes: [CLAVE_PROYECTO_V3_TEMP] };
    }
    if (tempExistente.valor === null) {
      return { ok: true, guardado: true, estado: recuperado, clavesTemporalesPendientes: [] };
    }
    if (tempExistente.valor === serializado && esEstadoV3Crudo(tempExistente.valor)) {
      const retiro = quitarYVerificar(almacen, CLAVE_PROYECTO_V3_TEMP);
      return {
        ok: true,
        guardado: true,
        estado: recuperado,
        clavesTemporalesPendientes: retiro.eliminado ? [] : [CLAVE_PROYECTO_V3_TEMP]
      };
    }
    // Canonical ya está comprometido. No se descarta un staging diferente o
    // corrupto en el fast path; la carga posterior lo tratará como candidato.
    return { ok: true, guardado: true, estado: recuperado, clavesTemporalesPendientes: [CLAVE_PROYECTO_V3_TEMP] };
  }

  const tempExistente = leerCrudo(almacen, CLAVE_PROYECTO_V3_TEMP);
  if (!tempExistente.accesible) return resultadoNoGuardado("almacen_inaccesible", [CLAVE_PROYECTO_V3_TEMP]);
  const stagingYaCoincide = tempExistente.valor === serializado && esEstadoV3Crudo(tempExistente.valor);
  if (tempExistente.valor !== null && !stagingYaCoincide && !preservarTemporal(almacen, tempExistente.valor)) {
    return resultadoNoGuardado("temporal_conflictiva", [CLAVE_PROYECTO_V3_TEMP]);
  }

  if (actual.valor !== null) {
    if (esEstadoV3Crudo(actual.valor)) {
      if (!guardarRespaldoV3Valido(almacen, actual.valor)) {
        return resultadoNoGuardado("respaldo_no_verificable", tempExistente.valor !== null ? [CLAVE_PROYECTO_V3_TEMP] : []);
      }
    } else if (!preservarV3Corrupto(almacen, actual.valor)) {
      return resultadoNoGuardado("recuperacion_conflictiva", tempExistente.valor !== null ? [CLAVE_PROYECTO_V3_TEMP] : []);
    }
  }

  if (!stagingYaCoincide) {
    try {
      almacen.setItem(CLAVE_PROYECTO_V3_TEMP, serializado);
    } catch {
      const temp = leerCrudo(almacen, CLAVE_PROYECTO_V3_TEMP);
      return resultadoNoGuardado("escritura_temporal", !temp.accesible || temp.valor !== null ? [CLAVE_PROYECTO_V3_TEMP] : []);
    }
    if (!verificarV3(almacen, CLAVE_PROYECTO_V3_TEMP, serializado)) {
      return resultadoNoGuardado("verificacion_temporal", [CLAVE_PROYECTO_V3_TEMP]);
    }
  }

  try {
    almacen.setItem(CLAVE_PROYECTO_V3, serializado);
  } catch {
    if (actual.valor !== null) restaurarCrudoAnterior(almacen, actual.valor);
    return resultadoNoGuardado("escritura", [CLAVE_PROYECTO_V3_TEMP]);
  }

  const readback = leerCrudo(almacen, CLAVE_PROYECTO_V3);
  const recuperado = readback.accesible && readback.valor === serializado
    ? estadoDesdeCrudoV3(readback.valor)
    : null;
  if (!recuperado) {
    if (actual.valor !== null) restaurarCrudoAnterior(almacen, actual.valor);
    return resultadoNoGuardado("lectura_verificacion", [CLAVE_PROYECTO_V3_TEMP]);
  }

  const retiroTemporal = quitarYVerificar(almacen, CLAVE_PROYECTO_V3_TEMP);
  return {
    ok: true,
    guardado: true,
    estado: recuperado,
    clavesTemporalesPendientes: retiroTemporal.eliminado ? [] : [CLAVE_PROYECTO_V3_TEMP]
  };
}

function migrarPayloadLegado(json: unknown): MigracionLegada | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return null;
  const registro = json as Record<string, unknown>;
  if (registro.version === 2) {
    try {
      const estado = migrarEstadoV2(registro);
      return estado && esEstadoGuardadoV3(estado) ? { estado, origen: "v2" } : null;
    } catch {
      return null;
    }
  }
  if (registro.version === 1) {
    try {
      const v2 = migrarEstadoV1(registro);
      if (!v2 || !esEstadoGuardado(v2)) return null;
      const estado = migrarEstadoV2(v2);
      return estado && esEstadoGuardadoV3(estado) ? { estado, origen: "v1" } : null;
    } catch {
      return null;
    }
  }
  return null;
}

function inspeccionarLegados(almacen: AlmacenPersistencia): LimpiezaLegada {
  const salida: LimpiezaLegada = { eliminadas: [], pendientes: [], conflictivas: [], inaccesibles: [] };
  for (const clave of [CLAVE_MICRO_V2, CLAVE_MICRO_V1]) {
    const lectura = leerJson(almacen, clave);
    if (!lectura.accesible) {
      salida.inaccesibles.push(clave);
      salida.conflictivas.push(clave);
      continue;
    }
    if (lectura.valor === null) continue;
    if (!lectura.parseable || !migrarPayloadLegado(lectura.json)) {
      // Versiones desconocidas o corruptas se conservan para recuperación.
      salida.conflictivas.push(clave);
      continue;
    }
    salida.pendientes.push(clave);
  }
  salida.pendientes = unico(salida.pendientes);
  salida.conflictivas = unico(salida.conflictivas);
  salida.inaccesibles = unico(salida.inaccesibles);
  return salida;
}

function limpiarLegadosReconocidos(almacen: AlmacenPersistencia): LimpiezaLegada {
  const inspeccion = inspeccionarLegados(almacen);
  const salida: LimpiezaLegada = {
    eliminadas: [],
    pendientes: [...inspeccion.pendientes],
    conflictivas: [...inspeccion.conflictivas],
    inaccesibles: [...inspeccion.inaccesibles]
  };
  for (const clave of inspeccion.pendientes) {
    const retiro = quitarYVerificar(almacen, clave);
    if (retiro.eliminado) {
      salida.eliminadas.push(clave);
      salida.pendientes = salida.pendientes.filter((pendiente) => pendiente !== clave);
    } else if (retiro.inaccesible) {
      salida.inaccesibles.push(clave);
    }
  }
  salida.eliminadas = unico(salida.eliminadas);
  salida.pendientes = unico(salida.pendientes);
  salida.conflictivas = unico(salida.conflictivas);
  salida.inaccesibles = unico(salida.inaccesibles);
  return salida;
}

function agregarConflictoPorError(error: ErrorPersistencia, conflictos: string[]): void {
  const clavePorError: Partial<Record<ErrorPersistencia, string>> = {
    respaldo_no_verificable: CLAVE_PROYECTO_V3_RESPALDO,
    recuperacion_conflictiva: CLAVE_PROYECTO_V3_RECUPERACION,
    temporal_conflictiva: CLAVE_PROYECTO_V3_TEMP_RECUPERACION,
    escritura_temporal: CLAVE_PROYECTO_V3_TEMP,
    verificacion_temporal: CLAVE_PROYECTO_V3_TEMP,
    lectura_verificacion: CLAVE_PROYECTO_V3,
    escritura: CLAVE_PROYECTO_V3
  };
  const clave = clavePorError[error];
  if (clave) conflictos.push(clave);
}

function resultadoCargado(
  estado: EstadoGuardadoV3,
  origen: Exclude<OrigenCarga, "ninguno">,
  migrado: boolean,
  guardado: boolean,
  limpieza: LimpiezaLegada,
  clavesConflictivas: string[],
  clavesInaccesibles: string[],
  error?: ErrorPersistencia,
  clavesTemporalesPendientes: string[] = []
): ResultadoCarga {
  return {
    ok: true,
    estado,
    origen,
    estadoCarga: migrado ? "migrado" : "cargado",
    migrado,
    guardado,
    ...(error ? { error } : {}),
    clavesLegadasEliminadas: limpieza.eliminadas,
    clavesLegadasPendientes: limpieza.pendientes,
    clavesTemporalesPendientes,
    clavesConflictivas: unico([...clavesConflictivas, ...limpieza.conflictivas]),
    clavesInaccesibles: unico([...clavesInaccesibles, ...limpieza.inaccesibles])
  };
}

function migrarYGuardar(
  almacen: AlmacenPersistencia,
  migracion: MigracionLegada,
  conflictos: string[],
  inaccesibles: string[]
): ResultadoCarga {
  const guardado = guardarEstadoV3(almacen, migracion.estado);
  if (!guardado.ok) {
    const legados = inspeccionarLegados(almacen);
    const conflictosConError = [...conflictos];
    agregarConflictoPorError(guardado.error, conflictosConError);
    return resultadoCargado(
      migracion.estado,
      migracion.origen,
      true,
      false,
      legados,
      conflictosConError,
      inaccesibles,
      guardado.error,
      guardado.clavesTemporalesPendientes
    );
  }
  const limpieza = limpiarLegadosReconocidos(almacen);
  return resultadoCargado(
    guardado.estado,
    migracion.origen,
    true,
    true,
    limpieza,
    conflictos,
    inaccesibles,
    undefined,
    guardado.clavesTemporalesPendientes
  );
}

function recuperarV3(
  almacen: AlmacenPersistencia,
  crudo: string,
  origen: "respaldo_v3" | "temporal_v3",
  conflictos: string[],
  inaccesibles: string[]
): ResultadoCarga {
  const estado = estadoDesdeCrudoV3(crudo);
  if (!estado) throw new Error("recuperarV3 requiere un V3 válido");
  const guardado = guardarEstadoV3(almacen, estado);
  if (!guardado.ok) {
    const legados = inspeccionarLegados(almacen);
    const conflictosConError = [...conflictos];
    agregarConflictoPorError(guardado.error, conflictosConError);
    return resultadoCargado(
      estado,
      origen,
      false,
      false,
      legados,
      conflictosConError,
      inaccesibles,
      guardado.error,
      guardado.clavesTemporalesPendientes
    );
  }
  const limpieza = limpiarLegadosReconocidos(almacen);
  return resultadoCargado(
    guardado.estado,
    origen,
    false,
    true,
    limpieza,
    conflictos,
    inaccesibles,
    undefined,
    guardado.clavesTemporalesPendientes
  );
}

function resultadoSinEstado(conflictos: string[], inaccesibles: string[]): ResultadoCarga {
  const clavesConflictivas = unico(conflictos);
  const clavesInaccesibles = unico(inaccesibles);
  const estadoCarga: "sin_datos" | "datos_no_migrables" | "almacen_inaccesible" = clavesInaccesibles.length
    ? "almacen_inaccesible"
    : clavesConflictivas.length
      ? "datos_no_migrables"
      : "sin_datos";
  return {
    ok: false,
    estado: null,
    origen: "ninguno",
    estadoCarga,
    migrado: false,
    guardado: false,
    clavesLegadasEliminadas: [],
    clavesLegadasPendientes: [],
    clavesTemporalesPendientes: [],
    clavesConflictivas,
    clavesInaccesibles
  };
}

function registrarClaveNoV3(
  almacen: AlmacenPersistencia,
  clave: string,
  conflictos: string[],
  inaccesibles: string[]
): LecturaJson {
  const lectura = leerJson(almacen, clave);
  if (!lectura.accesible) {
    conflictos.push(clave);
    inaccesibles.push(clave);
  } else if (lectura.valor !== null && (!lectura.parseable || !migrarPayloadLegado(lectura.json))) {
    conflictos.push(clave);
  }
  return lectura;
}

/**
 * Carga primero el V3 canónico; si se perdió o dañó, intenta su respaldo/temporal,
 * y después las claves legadas. Reconoce el contenido por `version`, aunque V1
 * aparezca bajo el nombre de clave V2 (y viceversa).
 */
export function cargarEstadoPersistido(almacen: AlmacenPersistencia): ResultadoCarga {
  const conflictos: string[] = [];
  const inaccesibles: string[] = [];
  const canonico = leerJson(almacen, CLAVE_PROYECTO_V3);
  const temporal = leerJson(almacen, CLAVE_PROYECTO_V3_TEMP);

  if (!canonico.accesible) {
    conflictos.push(CLAVE_PROYECTO_V3);
    inaccesibles.push(CLAVE_PROYECTO_V3);
  } else if (canonico.valor !== null && (!canonico.parseable || !esEstadoGuardadoV3(canonico.json))) {
    conflictos.push(CLAVE_PROYECTO_V3);
  }

  if (!temporal.accesible) {
    conflictos.push(CLAVE_PROYECTO_V3_TEMP);
    inaccesibles.push(CLAVE_PROYECTO_V3_TEMP);
  } else if (temporal.valor !== null && (!temporal.parseable || !esEstadoGuardadoV3(temporal.json))) {
    conflictos.push(CLAVE_PROYECTO_V3_TEMP);
  }

  const estadoCanonico = canonico.parseable && esEstadoGuardadoV3(canonico.json) ? canonico.json : null;
  const estadoTemporal = temporal.parseable && esEstadoGuardadoV3(temporal.json) ? temporal.json : null;
  const canonicoValido = estadoCanonico !== null;
  const temporalValido = estadoTemporal !== null;

  if (canonicoValido && temporalValido && temporal.valor !== canonico.valor) {
    // El staging válido es una promoción pendiente más reciente que el canónico.
    return recuperarV3(almacen, temporal.valor!, "temporal_v3", conflictos, inaccesibles);
  }

  if (canonicoValido) {
    let temporalesPendientes: string[] = [];
    if (temporalValido && temporal.valor === canonico.valor) {
      const retiro = quitarYVerificar(almacen, CLAVE_PROYECTO_V3_TEMP);
      if (!retiro.eliminado) temporalesPendientes = [CLAVE_PROYECTO_V3_TEMP];
      if (retiro.inaccesible) inaccesibles.push(CLAVE_PROYECTO_V3_TEMP);
    } else if (temporal.valor !== null || !temporal.accesible) {
      // El canónico sí es válido; conservar el staging conflictivo y reportarlo.
      temporalesPendientes = [CLAVE_PROYECTO_V3_TEMP];
    }

    const limpieza = limpiarLegadosReconocidos(almacen);
    return resultadoCargado(
      estadoCanonico,
      "v3",
      false,
      true,
      limpieza,
      conflictos,
      inaccesibles,
      undefined,
      temporalesPendientes
    );
  }

  // Sin canónico válido, un staging completo tiene prioridad sobre el respaldo
  // rotativo y los formatos V1/V2: es el intento más reciente de escritura.
  if (temporalValido) {
    return recuperarV3(almacen, temporal.valor!, "temporal_v3", conflictos, inaccesibles);
  }

  const respaldo = leerJson(almacen, CLAVE_PROYECTO_V3_RESPALDO);
  if (!respaldo.accesible) {
    conflictos.push(CLAVE_PROYECTO_V3_RESPALDO);
    inaccesibles.push(CLAVE_PROYECTO_V3_RESPALDO);
  } else if (respaldo.valor !== null && (!respaldo.parseable || !esEstadoGuardadoV3(respaldo.json))) {
    conflictos.push(CLAVE_PROYECTO_V3_RESPALDO);
  }
  if (respaldo.parseable && esEstadoGuardadoV3(respaldo.json)) {
    return recuperarV3(almacen, respaldo.valor!, "respaldo_v3", conflictos, inaccesibles);
  }

  // Inspecciona ambas claves antes de elegir: la versión del payload prevalece
  // sobre el nombre de la clave; en empate gana la clave V2 actual.
  const legadoV2 = registrarClaveNoV3(almacen, CLAVE_MICRO_V2, conflictos, inaccesibles);
  const legadoV1 = registrarClaveNoV3(almacen, CLAVE_MICRO_V1, conflictos, inaccesibles);
  const candidatos: Array<{ prioridadClave: number; migracion: MigracionLegada }> = [];
  const migradoDesdeClaveV2 = legadoV2.parseable ? migrarPayloadLegado(legadoV2.json) : null;
  const migradoDesdeClaveV1 = legadoV1.parseable ? migrarPayloadLegado(legadoV1.json) : null;
  if (migradoDesdeClaveV2) candidatos.push({ prioridadClave: 0, migracion: migradoDesdeClaveV2 });
  if (migradoDesdeClaveV1) candidatos.push({ prioridadClave: 1, migracion: migradoDesdeClaveV1 });

  candidatos.sort((a, b) => {
    const versionA = a.migracion.origen === "v2" ? 2 : 1;
    const versionB = b.migracion.origen === "v2" ? 2 : 1;
    return versionB - versionA || a.prioridadClave - b.prioridadClave;
  });
  if (candidatos[0]) return migrarYGuardar(almacen, candidatos[0].migracion, conflictos, inaccesibles);

  for (const clave of [CLAVE_PROYECTO_V3_RECUPERACION, CLAVE_PROYECTO_V3_TEMP_RECUPERACION]) {
    const recuperacion = leerCrudo(almacen, clave);
    if (!recuperacion.accesible) {
      conflictos.push(clave);
      inaccesibles.push(clave);
    } else if (recuperacion.valor !== null) {
      // Estas claves guardan bytes previos sin autoridad canónica; nunca son vacío.
      conflictos.push(clave);
    }
  }

  return resultadoSinEstado(conflictos, inaccesibles);
}
