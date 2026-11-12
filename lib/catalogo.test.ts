/**
 * Suite autónoma para el catálogo personal de documentos curriculares.
 * Uso: node lib/catalogo.test.ts
 */

import {
  buscarCatalogo,
  catalogar,
  duplicarDocumento,
  marcarFinalizado,
  normalizarBusqueda
} from "./catalogo.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";
import type { ProyectoCurricular } from "./proyecto.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function proyectoBase(): ProyectoCurricular {
  const marco = normalizarMarco({
    nombre: "Modelo Educativo",
    version: "2026",
    emisor: "Universidad",
    principios: [{ texto: "Aprender es activo.", origen: "docente" }],
    orientaciones: [{ texto: "Declarar el perfil.", origen: "docente" }]
  });
  marco.principios[0].estado = "confirmado_por_docente";
  const programa = normalizarPrograma({
    nombre: "Ingeniería de Sistemas",
    codigo: "IS-2026",
    perfilIngreso: [{ texto: "Trae lógica.", origen: "docente" }],
    perfilEgreso: [{ texto: "Diseña sistemas.", origen: "docente" }],
    resultadosPrograma: [{ texto: "Modela sistemas.", origen: "docente" }]
  });
  const micro = normalizarMicrocurriculo({
    folio: "MC-1",
    ident: {
      asignatura: "Matemáticas Discretas",
      codigo: "MAT-201",
      programa: "Ingeniería de Sistemas",
      creditos: 3,
      horas: { teoricas: 45, practicas: 15, independientes: 90 },
      prerrequisitos: ["Álgebra"],
      semestre: "Primero"
    },
    justificacion: "Base del razonamiento formal en la carrera.",
    objetivos: { generales: ["Razonar"], especificas: ["Demostrar"] },
    contenido: {
      unidades: [{ numero: 1, titulo: "Lógica", resultadosAprendizaje: ["Demuestra teoremas"], temas: [{ nombre: "Proposiciones" }] }]
    },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: {
      cortes: [
        {
          nombre: "Corte 1",
          porcentaje: 100,
          actividades: [{ nombre: "Parcial", instrumento: "Rúbrica analítica", mideIds: [] }]
        }
      ]
    },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  });
  // Vincula la actividad al RA para verificar que la copia remapea mideIds.
  const raId = micro.contenido.unidades[0].resultadosAprendizaje[0].id;
  micro.evaluacion.cortes[0].actividades[0].mideIds = [raId];
  return {
    id: "proyecto-1",
    nombre: "Proyecto",
    marcos: [marco],
    programas: [programa],
    asignaturas: [
      { id: "asig-1", programaId: programa.id, microcurriculo: micro, finalizado: false, origenCopia: null }
    ],
    fuentesCurriculares: [],
    vinculosProgramaMarco: [],
    alineaciones: []
  };
}

prueba("catalogar lista los tres niveles con nombre y código", () => {
  const items = catalogar(proyectoBase());
  assert(items.length === 3, "un item por documento");
  const micro = items.find((i) => i.nivel === "micro");
  assert(micro?.nombre === "Matemáticas Discretas", "nombre del micro");
  assert(micro?.codigo === "MAT-201", "código del micro");
  const meso = items.find((i) => i.nivel === "meso");
  assert(meso?.codigo === "IS-2026", "código del programa");
  assert(items.every((i) => i.finalizado === false), "nada finalizado al inicio");
});

prueba("buscar ignora tildes, mayúsculas y distingue código de nombre", () => {
  const items = catalogar(proyectoBase());
  assert(buscarCatalogo(items, "matematicas").length === 1, "sin tilde encuentra");
  assert(buscarCatalogo(items, "MAT-201")[0].nivel === "micro", "código exacto");
  assert(buscarCatalogo(items, "is-2026")[0].nivel === "meso", "código en minúsculas");
  assert(buscarCatalogo(items, "").length === 3, "vacío devuelve todo");
  assert(buscarCatalogo(items, "inexistente").length === 0, "sin coincidencias vacío");
  assert(normalizarBusqueda("  Matemáticas  ") === "matematicas", "normaliza espacios y tildes");
});

prueba("marcarFinalizado alterna sin tocar el resto", () => {
  const base = proyectoBase();
  const r = marcarFinalizado(base, "micro", "asig-1", true);
  assert(r.ok, "marca válida");
  if (!r.ok) return;
  assert(r.proyecto.asignaturas[0].finalizado === true, "quedó finalizado");
  assert(base.asignaturas[0].finalizado === false, "la base no muta");
  assert(catalogar(r.proyecto).find((i) => i.nivel === "micro")?.finalizado === true, "el catálogo lo refleja");
  const mal = marcarFinalizado(base, "micro", "no-existe", true);
  assert(!mal.ok, "id inexistente da error");
});

prueba("duplicar el micro remapea RA y mideIds y no toca el original", () => {
  const base = proyectoBase();
  const raOriginal = base.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje[0].id;
  const r = duplicarDocumento(base, "micro", "asig-1");
  assert(r.ok, "duplicado válido");
  if (!r.ok) return;
  assert(r.proyecto.asignaturas.length === 2, "hay copia además del original");
  const copia = r.proyecto.asignaturas.find((a) => a.id === r.nuevoId);
  assert(copia !== undefined, "la copia tiene id nuevo");
  assert(copia.microcurriculo.ident.codigo === "", "el código se limpia para redefinir");
  assert(copia.microcurriculo.ident.asignatura.includes("(copia)"), "el nombre distingue la copia");
  assert(copia.finalizado === false, "la copia nace sin finalizar");
  assert(copia.origenCopia?.id === "asig-1", "registra de cuál nació");
  const raCopia = copia.microcurriculo.contenido.unidades[0].resultadosAprendizaje[0].id;
  assert(raCopia !== raOriginal, "el RA tiene id propio");
  const mide = copia.microcurriculo.evaluacion.cortes[0].actividades[0].mideIds;
  assert(mide.length === 1 && mide[0] === raCopia, "mideIds apunta al RA de la copia");
  assert(
    base.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje[0].id === raOriginal,
    "el original no muta"
  );
  assert(r.proyecto.alineaciones.length === 0, "la copia no hereda alineaciones");
});

prueba("duplicar macro y meso conserva contenido con ids propios", () => {
  const base = proyectoBase();
  const r1 = duplicarDocumento(base, "macro", base.marcos[0].id);
  assert(r1.ok, "macro duplicado");
  if (!r1.ok) return;
  const copiaMacro = r1.proyecto.marcos.find((m) => m.id === r1.nuevoId);
  assert(copiaMacro !== undefined && copiaMacro.principios.length === 1, "conserva principios");
  assert(
    copiaMacro.principios[0].id !== base.marcos[0].principios[0].id,
    "ids de afirmación propios"
  );
  const r2 = duplicarDocumento(base, "meso", base.programas[0].id);
  assert(r2.ok, "programa duplicado");
  if (!r2.ok) return;
  const copiaMeso = r2.proyecto.programas.find((p) => p.id === r2.nuevoId);
  assert(copiaMeso !== undefined && copiaMeso.codigo === undefined, "código limpio en la copia");
  assert(r2.proyecto.vinculosProgramaMarco.length === 0, "sin vínculos heredados");
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
