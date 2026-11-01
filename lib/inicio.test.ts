/**
 * Suite para el enrutador de inicio (parseo + heurística de cambio de nivel).
 * Uso: node lib/inicio.test.ts
 */

import { mencionaOtroNivel, pideNuevoDocumento, parsearRespuestaInicio } from "./inicio.ts";

let total = 0;
let fallos = 0;

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function igual(actual: unknown, esperado: unknown, mensaje: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  assert(a === e, `${mensaje}\nEsperado: ${e}\nRecibido: ${a}`);
}

function caso(nombre: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`✓ ${nombre}`);
  } catch (error) {
    fallos++;
    console.error(`✗ ${nombre}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

caso("clasifica un destino claro", () => {
  const r = parsearRespuestaInicio(
    JSON.stringify({ mensaje: "Vamos con el programa.", destino: "meso", sugerencias: ["a", "b"] })
  );
  assert(r.ok, "ok");
  if (!r.ok) return;
  igual(r.destino, "meso", "destino");
  igual(r.mensaje, "Vamos con el programa.", "mensaje");
  igual(r.sugerencias, ["a", "b"], "sugerencias");
});

caso("un destino desconocido cae a aclarar en vez de cambiar de nivel", () => {
  const r = parsearRespuestaInicio(JSON.stringify({ mensaje: "Mmm.", destino: "doctorado" }));
  assert(r.ok, "sigue ok");
  if (!r.ok) return;
  igual(r.destino, "aclarar", "aclarar por defecto");
});

caso("una respuesta vacía o rota da motivo legible", () => {
  const vacia = parsearRespuestaInicio("   ", { fin: "length" });
  assert(!vacia.ok, "vacía falla");
  const rota = parsearRespuestaInicio('{"mensaje":', {});
  assert(!rota.ok, "rota falla");
});

caso("la heurística solo dispara con verbo de cambio + otro nivel", () => {
  igual(mencionaOtroNivel("mejor cambiemos al programa", "micro"), "meso", "cambio explícito");
  igual(mencionaOtroNivel("el programa de la asignatura", "micro"), null, "sin verbo no dispara");
  igual(mencionaOtroNivel("sigamos con la asignatura", "micro"), null, "mismo nivel no dispara");
  igual(mencionaOtroNivel("quiero empezar el marco desde cero", "meso"), "macro", "empezar otro nivel");
  igual(mencionaOtroNivel("", "micro"), null, "vacío no dispara");
});

caso("pideNuevoDocumento detecta arranques sin confundir ediciones", () => {
  assert(pideNuevoDocumento("quiero otro programa"), "otro programa");
  assert(pideNuevoDocumento("empecemos un marco nuevo"), "empezar marco");
  assert(pideNuevoDocumento("crear una asignatura desde cero"), "crear asignatura");
  assert(!pideNuevoDocumento("corrige la justificación"), "editar no es nuevo");
  assert(!pideNuevoDocumento(""), "vacío no es nuevo");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
