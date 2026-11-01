/**
 * Flujos completos de extremo a extremo a nivel de datos: el recorrido
 * institucional Marco → programa → asignatura → alineaciones → expediente,
 * con varios documentos, poda y migración heredada.
 * Uso: node lib/flujos.test.ts
 */

import { definirAlineacion } from "./alineaciones.ts";
import { aplicarVistaMacroV3, vistaMacroVacia } from "./estadoMacro.ts";
import { aplicarVistaMesoV3, vincularAsignaturaAPrograma, vistaMesoVacia } from "./estadoMeso.ts";
import { aplicarVistaMicroV3, crearEstadoGuardadoV3Vacio } from "./estadoMicro.ts";
import { expedienteATexto } from "./exportarExpediente.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";
import { esEstadoGuardadoV3, type EstadoGuardadoV3 } from "./proyecto.ts";
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

function microBase(folio: string, asignatura: string, ra: string[]) {
  return normalizarMicrocurriculo({
    folio,
    ident: {
      asignatura,
      codigo: "ISW-101",
      programa: "Ingeniería",
      creditos: 4,
      horas: { teoricas: 32, practicas: 0, independientes: 32 },
      prerrequisitos: ["Ninguno"],
      semestre: "Primero"
    },
    justificacion: "Justificación suficientemente larga para el mínimo exigido.",
    objetivos: { generales: ["Diseñar"], especificas: ["Modelar"] },
    contenido: { unidades: [{ titulo: "Unidad 1", resultadosAprendizaje: ra, temas: [] }] },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  });
}

caso("flujo institucional completo termina en un expediente válido", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-flujo");

  // 1. Marco con un principio documentado y su fuente.
  const vistaMarco = vistaMacroVacia();
  vistaMarco.marco = {
    ...normalizarMarco({ nombre: "Modelo Educativo", version: "2026" }),
    id: "marco-flujo",
    principios: [
      {
        id: "prin-flujo",
        texto: "Aprender es activo.",
        origen: "documento",
        estado: "contrastado_con_fuente",
        citas: [{ fuenteId: "f-flujo", localizador: "Cap. 2" }]
      }
    ]
  };
  vistaMarco.fuentes = [{ id: "f-flujo", titulo: "Modelo 2026", tipo: "modelo_educativo" }];
  estado = aplicarVistaMacroV3(estado, vistaMarco, "proyecto-flujo");
  assert(esEstadoGuardadoV3(estado), "marco válido");

  // 2. Programa vinculado al marco.
  const vistaMeso = vistaMesoVacia();
  vistaMeso.programa = {
    ...normalizarPrograma({ nombre: "Ingeniería", codigo: "ISW" }),
    id: "prog-flujo",
    resultadosPrograma: [
      { id: "res-flujo", texto: "Resuelve problemas.", origen: "docente", estado: "confirmado_por_docente", citas: [] }
    ]
  };
  vistaMeso.vinculoMarcoId = estado.proyecto.marcos[0].id;
  estado = aplicarVistaMesoV3(estado, vistaMeso, "proyecto-flujo");
  assert(esEstadoGuardadoV3(estado), "programa vinculado válido");
  const progId = estado.seleccion.documentoId as string;

  // 3. Asignatura desde inicio y vínculo al programa.
  estado.seleccion = { modulo: "inicio", documentoId: null };
  estado = aplicarVistaMicroV3(
    estado,
    { microcurriculo: microBase("DCN-FLUJO-1", "Fundamentos", ["Diseña soluciones"]), mensajes: [], sugerencias: [], intencion: "crear", seccionActiva: null, crudo: "" },
    "proyecto-flujo"
  );
  assert(esEstadoGuardadoV3(estado), "micro creado válido");
  const asigId = estado.seleccion.documentoId as string;
  const vinculado = vincularAsignaturaAPrograma(estado, progId, asigId);
  assert(vinculado !== null && esEstadoGuardadoV3(vinculado), "vínculo válido");
  estado = vinculado;

  // 4. Alineaciones Macro → programa → RA.
  const marcoId = estado.proyecto.marcos[0].id;
  const raId = estado.proyecto.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje[0].id;
  const a1 = definirAlineacion(
    estado,
    { tipo: "principio_marco", id: marcoId === "marco-flujo" ? "prin-flujo" : estado.proyecto.marcos[0].principios[0].id },
    { tipo: "resultado_programa", id: "res-flujo", contextoId: progId }
  );
  assert(a1 !== null, "alineación marco→programa");
  const a2 = definirAlineacion(
    a1,
    { tipo: "resultado_programa", id: "res-flujo", contextoId: progId },
    { tipo: "ra_micro", id: raId, contextoId: asigId }
  );
  assert(a2 !== null && esEstadoGuardadoV3(a2), "alineación programa→RA");
  estado = a2;

  // 5. El expediente reúne todo con trazabilidad.
  const texto = expedienteATexto(estado.proyecto);
  assert(texto.includes("Modelo Educativo"), "marco en el expediente");
  assert(texto.includes("Ingeniería"), "programa en el expediente");
  assert(texto.includes("Fundamentos"), "asignatura en el expediente");
  assert(texto.includes("Aprender es activo."), "principio trazado");
  assert(texto.includes("Resuelve problemas."), "resultado trazado");
  assert(texto.includes("Diseña soluciones"), "RA trazado");
});

caso("segundo documento, borrado con poda y dato heredado conviven", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-flujo-2");
  estado = aplicarVistaMesoV3(
    estado,
    {
      ...vistaMesoVacia(),
      programa: {
        ...normalizarPrograma({ nombre: "Diseño", codigo: "DIS" }),
        id: "prog-2",
        resultadosPrograma: [
          { id: "res-viejo", texto: "Viejo.", origen: "docente", estado: "sin_confirmar", citas: [] },
          { id: "res-nuevo", texto: "Nuevo.", origen: "docente", estado: "sin_confirmar", citas: [] }
        ]
      }
    },
    "proyecto-flujo-2"
  );
  const progId = estado.seleccion.documentoId as string;

  // Dos asignaturas con el mismo texto de RA: no rompen el guard.
  estado.seleccion = { modulo: "inicio", documentoId: null };
  estado = aplicarVistaMicroV3(
    estado,
    { microcurriculo: microBase("DCN-F2-A", "Primera", ["Mismo texto"]), mensajes: [], sugerencias: [], intencion: "crear", seccionActiva: null, crudo: "" },
    "proyecto-flujo-2"
  );
  const primera = estado.seleccion.documentoId as string;
  estado.seleccion = { modulo: "inicio", documentoId: null };
  estado = aplicarVistaMicroV3(
    estado,
    { microcurriculo: microBase("DCN-F2-B", "Segunda", ["Mismo texto"]), mensajes: [], sugerencias: [], intencion: "crear", seccionActiva: null, crudo: "" },
    "proyecto-flujo-2"
  );
  assert(estado.proyecto.asignaturas.length === 2, "dos documentos");
  assert(esEstadoGuardadoV3(estado), "RA repetidos entre micros no invalidan");

  // Alineación al resultado viejo + borrado del resultado → poda.
  const raId = estado.proyecto.asignaturas.find((a) => a.id === primera)?.microcurriculo.contenido.unidades[0]
    .resultadosAprendizaje[0].id as string;
  const ali = definirAlineacion(
    estado,
    { tipo: "resultado_programa", id: "res-viejo", contextoId: progId },
    { tipo: "ra_micro", id: raId, contextoId: primera }
  );
  assert(ali !== null && ali.proyecto.alineaciones.length === 1, "alineada");
  ali.seleccion = { modulo: "meso", documentoId: progId };
  const programa = ali.proyecto.programas.find((p) => p.id === progId) as EstadoGuardadoV3["proyecto"]["programas"][number];
  const editado = aplicarVistaMesoV3(
    ali,
    {
      ...vistaMesoVacia(),
      programa: { ...programa, resultadosPrograma: programa.resultadosPrograma.filter((r) => r.id === "res-nuevo") },
      vinculoMarcoId: null
    },
    "proyecto-flujo-2"
  );
  assert(esEstadoGuardadoV3(editado), "válido tras borrar el resultado");
  assert(editado.proyecto.alineaciones.length === 0, "huérfana podada");
  assert(editado.proyecto.asignaturas.length === 2, "documentos preservados");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
