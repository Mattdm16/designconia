/**
 * Suite autónoma para el respaldo JSON descargable y restaurable.
 * Uso: node lib/respaldo.test.ts
 */

import { esEstadoGuardadoV3, type EstadoGuardadoV3 } from "./proyecto.ts";
import { nombreRespaldo, parsearRespaldo, serializarRespaldo } from "./respaldo.ts";
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
  const estado: EstadoGuardadoV3 = {
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
      alineaciones: [],
      brandKits: [],
      disenos: []
    },
    seleccion: { modulo: "micro", documentoId: "asig-1" },
    conversaciones: {}
  };
  assert(esEstadoGuardadoV3(estado), "el fixture debe ser un V3 válido");
  return estado;
}

prueba("serializar y parsear redondea el estado intacto", () => {
  const estado = estadoValido();
  const texto = serializarRespaldo(estado);
  assert(typeof texto === "string" && texto.length > 100, "produce un JSON no vacío");
  const r = parsearRespaldo(texto);
  assert(r.ok, "el propio respaldo se acepta");
  if (!r.ok) return;
  assert(
    JSON.stringify(r.estado) === JSON.stringify(estado),
    "el estado restaurado es idéntico"
  );
});

prueba("acepta un V3 sin envoltorio por compatibilidad", () => {
  const estado = estadoValido();
  const r = parsearRespaldo(JSON.stringify(estado));
  assert(r.ok, "el V3 directo se acepta");
});

prueba("rechaza basura sin tocar nada", () => {
  const mal1 = parsearRespaldo("esto no es json {");
  assert(!mal1.ok, "texto roto se rechaza");
  const mal2 = parsearRespaldo(JSON.stringify({ version: 3 }));
  assert(!mal2.ok, "objeto ajeno se rechaza");
  const mal3 = parsearRespaldo(JSON.stringify({ respaldoDesignConia: 1, guardado: { version: 2 } }));
  assert(!mal3.ok, "versión vieja se rechaza");
});

prueba("nombreRespaldo es estable y con fecha", () => {
  const nombre = nombreRespaldo(new Date(2026, 4, 9, 8, 5));
  assert(nombre === "designconia-respaldo-20260509-0805.json", `formato esperado, llegó ${nombre}`);
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
