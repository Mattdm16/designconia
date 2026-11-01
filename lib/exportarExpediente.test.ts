/**
 * Suite para el expediente curricular conjunto.
 * Uso: node lib/exportarExpediente.test.ts
 */

import { expedienteAMarkdown, expedienteATexto } from "./exportarExpediente.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";
import type { ProyectoCurricular } from "./proyecto.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

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

function crearProyecto(): ProyectoCurricular {
  const micro = normalizarMicrocurriculo({
    folio: "DCN-EXP-01",
    ident: {
      asignatura: "Fundamentos",
      codigo: "ISW-101",
      programa: "Ingeniería",
      creditos: 4,
      horas: { teoricas: 32, practicas: 0, independientes: 32 },
      prerrequisitos: ["Ninguno"],
      semestre: "Primero"
    },
    justificacion: "Justificación suficientemente larga para el mínimo exigido.",
    objetivos: { generales: ["Diseñar"], especificas: ["Modelar"] },
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña soluciones"], temas: [] }] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  });
  return {
    id: "proyecto-1",
    nombre: "Proyecto excedente",
    marcos: [
      {
        ...normalizarMarco({ nombre: "Modelo", version: "2026" }),
        id: "marco-1",
        principios: [
          { id: "prin-1", texto: "Aprender es activo.", origen: "docente", estado: "confirmado_por_docente", citas: [] }
        ]
      }
    ],
    programas: [
      {
        ...normalizarPrograma({ nombre: "Ingeniería", codigo: "ISW" }),
        id: "prog-1",
        resultadosPrograma: [
          { id: "res-1", texto: "Resuelve problemas.", origen: "docente", estado: "confirmado_por_docente", citas: [] }
        ]
      }
    ],
    asignaturas: [{ id: "asig-1", programaId: "prog-1", microcurriculo: micro }],
    fuentesCurriculares: [],
    vinculosProgramaMarco: [
      { id: "v1", programaId: "prog-1", marcoId: "marco-1", vigencia: null, estado: "activo", principal: true }
    ],
    alineaciones: [
      {
        id: "ali-1",
        origen: { tipo: "principio_marco", id: "prin-1" },
        destino: { tipo: "resultado_programa", id: "res-1", contextoId: "prog-1" },
        estado: "aceptado"
      }
    ]
  };
}

caso("el texto reúne marcos, programas, asignaturas y alineaciones", () => {
  const t = expedienteATexto(crearProyecto());
  assert(t.includes("EXPEDIENTE CURRICULAR"), "portada");
  assert(t.includes("Aprender es activo."), "principio del marco");
  assert(t.includes("Resuelve problemas."), "resultado del programa");
  assert(t.includes("Fundamentos"), "asignatura presente");
  assert(t.includes("→"), "alineación listada");
  assert(t.includes("propuesta, no un documento aprobado"), "advertencia de trabajo");
});

caso("el markdown mantiene la estructura por niveles", () => {
  const md = expedienteAMarkdown(crearProyecto());
  assert(md.startsWith("# Expediente curricular"), "título principal");
  assert(md.includes("## Marcos educativos"), "sección marcos");
  assert(md.includes("## Programas académicos"), "sección programas");
  assert(md.includes("## Asignaturas"), "sección asignaturas");
  assert(md.includes("## Alineaciones"), "sección alineaciones");
});

caso("el proyecto vacío no rompe y usa el marcador", () => {
  const p = crearProyecto();
  const vacio: ProyectoCurricular = {
    ...p,
    marcos: [],
    programas: [],
    asignaturas: [],
    vinculosProgramaMarco: [],
    alineaciones: []
  };
  const t = expedienteATexto(vacio);
  assert(t.includes("0 marco(s)"), "conteo en cero");
  assert(t.includes("[por definir]"), "marcador presente");
  const md = expedienteAMarkdown(vacio);
  assert(md.includes("Sin alineaciones registradas."), "alineaciones vacías");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
