/**
 * Suite autónoma para la clave de IA aportada por el docente (BYOK).
 * Uso: node lib/clave.test.ts
 */

import {
  borrarClaveSesion,
  guardarClaveSesion,
  leerClaveSesion,
  resolverClaveIA
} from "./clave.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

prueba("guardar y leer redondea la sesión sin localStorage", () => {
  borrarClaveSesion();
  assert(leerClaveSesion() === null, "sin clave al inicio");
  guardarClaveSesion("  sk-test-123  ");
  assert(leerClaveSesion() === "sk-test-123", "se recorta al guardar");
  borrarClaveSesion();
  assert(leerClaveSesion() === null, "borrar olvida la clave");
});

prueba("guardar vacío lanza error", () => {
  let lanzo = false;
  try {
    guardarClaveSesion("   ");
  } catch {
    lanzo = true;
  }
  assert(lanzo, "vacío no se guarda");
});

prueba("resolverClaveIA prefiere la del docente y distingue origen", () => {
  const propia = resolverClaveIA("  doc-1 ", "  srv-1 ");
  assert(propia.clave === "doc-1" && propia.esPropia, "gana la del docente, recortada");
  const entorno = resolverClaveIA("  ", "srv-1");
  assert(entorno.clave === "srv-1" && !entorno.esPropia, "cae a la del servidor");
  const ninguna = resolverClaveIA(null, undefined);
  assert(ninguna.clave === null && !ninguna.esPropia, "sin claves, null");
});

/* ---------------------------------------------------------------- */
/* Runner                                                            */
/* ---------------------------------------------------------------- */

let fallos = 0;
for (const caso of casos) {
  try {
    caso.fn();
    console.log(`✓ ${caso.nombre}`);
  } catch (error) {
    fallos++;
    console.error(`✗ ${caso.nombre}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (fallos > 0) {
  console.error(`\n${fallos}/${casos.length} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${casos.length} prueba(s) pasaron.`);
}
