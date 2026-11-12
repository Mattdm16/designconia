/**
 * DesignConia — clave de IA aportada por el docente (BYOK).
 *
 * La clave vive solo en la memoria de la pestaña, con espejo en
 * sessionStorage para sobrevivir recargas. Nunca va a localStorage (que
 * persiste entre sesiones), nunca viaja en copias, exportaciones ni analítica,
 * y el servidor la usa solo de forma transitoria para llamar al proveedor.
 *
 * Sin ventana (pruebas Node), se usa un respaldo en memoria del módulo.
 */

export const CLAVE_SESION_CLAVE_IA = "designconia.claveIA";

let respaldoMemoria: string | null = null;

function hayAlmacenSesion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

/** Lee la clave guardada en esta sesión, o null si no hay. */
export function leerClaveSesion(): string | null {
  if (hayAlmacenSesion()) {
    try {
      const v = window.sessionStorage.getItem(CLAVE_SESION_CLAVE_IA);
      return v && v.trim() ? v : null;
    } catch {
      return respaldoMemoria;
    }
  }
  return respaldoMemoria;
}

/** Guarda la clave solo para esta sesión. Lanza si está vacía. */
export function guardarClaveSesion(clave: string): void {
  const limpia = clave.trim();
  if (!limpia) throw new Error("La clave está vacía.");
  if (hayAlmacenSesion()) {
    try {
      window.sessionStorage.setItem(CLAVE_SESION_CLAVE_IA, limpia);
    } catch {
      respaldoMemoria = limpia;
    }
  } else {
    respaldoMemoria = limpia;
  }
}

/** Olvida la clave de la sesión (al cerrar sesión o borrarla). */
export function borrarClaveSesion(): void {
  respaldoMemoria = null;
  if (hayAlmacenSesion()) {
    try {
      window.sessionStorage.removeItem(CLAVE_SESION_CLAVE_IA);
    } catch {
      /* sin almacenamiento: basta con limpiar la memoria */
    }
  }
}

/**
 * Resuelve qué clave usar para una llamada: la del docente primero, la del
 * servidor después. Devuelve la clave y si es propia del docente.
 */
export function resolverClaveIA(
  claveDocente: unknown,
  claveServidor: unknown
): { clave: string | null; esPropia: boolean } {
  const propia = typeof claveDocente === "string" && claveDocente.trim() ? claveDocente.trim() : null;
  if (propia) return { clave: propia, esPropia: true };
  const entorno =
    typeof claveServidor === "string" && claveServidor.trim() ? claveServidor.trim() : null;
  if (entorno) return { clave: entorno, esPropia: false };
  return { clave: null, esPropia: false };
}
