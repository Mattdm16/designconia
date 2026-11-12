/**
 * Suite autónoma para la capa nube (construcción y validación del payload).
 * Uso: node lib/nube.test.ts
 *
 * No toca red ni variables de entorno: solo las funciones puras.
 */

import { construirFilaProyecto, validarFilaProyecto } from "./nube.ts";
import type { EstadoGuardadoV3 } from "./proyecto.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function estadoValido(): EstadoGuardadoV3 {
  return {
    version: 3,
    proyecto: {
      id: "proyecto-1",
      nombre: "Proyecto",
      marcos: [],
      programas: [],
      asignaturas: [
        {
          id: "asig-1",
          programaId: null,
          microcurriculo: normalizarMicrocurriculo({
            folio: "MC-1",
            ident: {
              asignatura: "Álgebra",
              codigo: "MAT-101",
              programa: "Ingeniería",
              creditos: 3,
              horas: { teoricas: 32, practicas: 32, independientes: 64 },
              prerrequisitos: ["Ninguno"],
              semestre: "Primero"
            },
            justificacion: "Base del razonamiento formal en la carrera universitaria.",
            objetivos: { generales: ["Razonar"], especificas: ["Demostrar"] },
            contenido: { unidades: [] },
            secuencia: { sesiones: [] },
            metodologia: { estrategias: [] },
            evaluacion: { cortes: [] },
            bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
          }),
          finalizado: false,
          origenCopia: null
        }
      ],
      fuentesCurriculares: [],
      vinculosProgramaMarco: [],
      alineaciones: []
    },
    seleccion: { modulo: "micro", documentoId: "asig-1" },
    conversaciones: {}
  };
}

prueba("construirFilaProyecto arma la fila del propietario", () => {
  const fila = construirFilaProyecto("uid-1", estadoValido(), "0.1.0");
  assert(fila.owner_id === "uid-1", "propietario intacto");
  assert(fila.app_version === "0.1.0", "versión registrada");
  assert(fila.datos.proyecto.id === "proyecto-1", "el agregado viaja completo");
});

prueba("construirFilaProyecto rechaza estado inválido o sin dueño", () => {
  let lanzoEstado = false;
  try {
    construirFilaProyecto("uid-1", { version: 2 } as never, "0.1.0");
  } catch {
    lanzoEstado = true;
  }
  assert(lanzoEstado, "estado no V3 se rechaza");
  let lanzoDueno = false;
  try {
    construirFilaProyecto("  ", estadoValido(), "0.1.0");
  } catch {
    lanzoDueno = true;
  }
  assert(lanzoDueno, "sin propietario se rechaza");
});

prueba("validarFilaProyecto solo acepta V3", () => {
  const estado = estadoValido();
  assert(validarFilaProyecto({ datos: estado }) !== null, "fila válida se acepta");
  assert(validarFilaProyecto({ datos: { version: 2 } }) === null, "versión vieja se rechaza");
  assert(validarFilaProyecto(null) === null, "nulo se rechaza");
  assert(validarFilaProyecto("texto") === null, "texto se rechaza");
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
