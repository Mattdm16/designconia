/**
 * Suite para la exportación Macro/Meso a texto plano y Markdown.
 * Uso: node lib/exportarCurricular.test.ts
 */

import { marcoAMarkdown, programaAMarkdown } from "./markdown.ts";
import { marcoATexto } from "./exportarMacroTexto.ts";
import { programaATexto, type ContextoProgramaTexto } from "./exportarMesoTexto.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";

let total = 0;
let fallos = 0;

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
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

function crearMarco() {
  return {
    ...normalizarMarco({ nombre: "Modelo Educativo", version: "2026" }),
    id: "marco-1",
    emisor: "Universidad",
    vigencia: { desde: "2026", hasta: null },
    estado: "vigente" as const,
    principios: [
      {
        id: "prin-1",
        texto: "Aprender es activo.",
        origen: "documento" as const,
        estado: "contrastado_con_fuente" as const,
        citas: [{ fuenteId: "f1", seccion: "Principios" }]
      }
    ]
  };
}

const FUENTES = [{ id: "f1", titulo: "Modelo Educativo 2026", tipo: "modelo_educativo" as const }];

function crearPrograma() {
  return {
    ...normalizarPrograma({ nombre: "Ingeniería", codigo: "ISW" }),
    id: "prog-1",
    resultadosPrograma: [
      {
        id: "res-1",
        texto: "Resuelve problemas.",
        origen: "docente" as const,
        estado: "confirmado_por_docente" as const,
        citas: []
      }
    ]
  };
}

function crearContexto(): ContextoProgramaTexto {
  return {
    marcoNombre: "Modelo Educativo",
    principiosPorResultado: { "res-1": ["Aprender es activo."] },
    rasPorResultado: { "res-1": ["Diseña soluciones (Fundamentos · U1)"] },
    asignaturas: ["Fundamentos de Software"],
    fuentes: FUENTES
  };
}

caso("el texto del marco incluye respaldo con localizador", () => {
  const t = marcoATexto(crearMarco(), FUENTES);
  assert(t.includes("Aprender es activo."), "principio presente");
  assert(t.includes("Modelo Educativo 2026 · secc. Principios"), "cita con localizador");
  assert(t.includes("Contrastada con fuente"), "estado legible");
});

caso("el markdown del marco no usa sintaxis rota y lista fuentes", () => {
  const md = marcoAMarkdown(crearMarco(), FUENTES);
  assert(md.startsWith("# Modelo Educativo"), "título principal");
  assert(md.includes("_Respaldo:"), "respaldo en cursiva");
  assert(md.includes("Modelo Educativo 2026"), "fuente listada");
});

caso("el texto del programa incluye trazabilidad y asignaturas", () => {
  const t = programaATexto(crearPrograma(), crearContexto());
  assert(t.includes("Resuelve problemas."), "resultado presente");
  assert(t.includes("Sostenido por:"), "bloque de sostén");
  assert(t.includes("Aprender es activo."), "principio vinculado");
  assert(t.includes("Diseña soluciones (Fundamentos · U1)"), "RA vinculado");
  assert(t.includes("Fundamentos de Software"), "asignatura listada");
});

caso("el markdown del programa resume el vínculo al marco", () => {
  const md = programaAMarkdown(crearPrograma(), crearContexto());
  assert(md.includes("**Marco que lo orienta:** Modelo Educativo"), "marco visible");
  assert(md.includes("Se concreta en:"), "trazabilidad visible");
});

caso("los vacíos usan el marcador sin romper", () => {
  const vacio = { ...crearMarco(), principios: [], afirmaciones: [] };
  const t = marcoATexto(vacio, []);
  assert(t.includes("[por definir]"), "marcador presente");
  const pVacio = { ...crearPrograma(), perfilIngreso: [], perfilEgreso: [], resultadosPrograma: [] };
  const tp = programaATexto(pVacio, { ...crearContexto(), asignaturas: [] });
  assert(tp.includes("[por definir]"), "marcador en programa vacío");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
