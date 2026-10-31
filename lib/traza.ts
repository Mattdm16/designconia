/**
 * Traza de las últimas peticiones al asistente.
 *
 * Existe para poder responder «¿por qué la respuesta vino vacía?» sin acceso
 * a la consola del servidor ni al navegador del usuario.
 *
 * Ojo: en Next.js cada route handler se compila en su propio bundle, así que
 * un array a nivel de módulo NO se comparte entre /api/chat y /api/diagnostico
 * —cada ruta ve el suyo, vacío—. Por eso el estado vive en globalThis, que sí
 * es único por proceso.
 *
 * Nunca describe el contenido ni la clave: solo tamaños, estado y motivo.
 */

export type Traza = {
  en: string;
  ok: boolean;
  /** Estado HTTP del proveedor. */
  upstream?: number;
  mensajeChars?: number;
  historiaChars?: number;
  borradorEnviado?: boolean;
  eventos?: number;
  contenido?: number;
  fin?: string | null;
  error?: string | null;
  /** Primeros caracteres del stream del proveedor, para ver qué mandó. */
  crudoInicio?: string;
};

type Estado = { trazas: Traza[]; total: number };

const MAX = 20;

/** globalThis es el único punto compartido entre bundles de ruta. */
function estado(): Estado {
  const g = globalThis as unknown as { __designconiaTrazas?: Estado };
  if (!g.__designconiaTrazas) g.__designconiaTrazas = { trazas: [], total: 0 };
  return g.__designconiaTrazas;
}

export function registrarTraza(t: Traza) {
  if (process.env.NODE_ENV === "production") return;
  const e = estado();
  e.trazas.push(t);
  e.total += 1;
  if (e.trazas.length > MAX) e.trazas.shift();
}

export function ultimasTrazas(): Traza[] {
  return estado().trazas.slice(-10);
}

/** Cuántas peticiones se registraron en total desde que arrancó el proceso. */
export function totalTrazas(): number {
  return estado().total;
}
