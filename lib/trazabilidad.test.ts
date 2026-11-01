/**
 * Suite para la trazabilidad curricular: RA con ids estables, actividades con
 * mideIds, bordes de alineación extendidos y poda de huérfanas.
 * Uso: node lib/trazabilidad.test.ts
 */

import {
  definirAlineacion,
  existeAlineacion,
  idAlineacionPara,
  quitarAlineacion
} from "./alineaciones.ts";
import { aplicarVistaMesoV3 } from "./estadoMeso.ts";
import {
  aplicarVistaMicroV3,
  crearEstadoGuardadoV3Vacio,
  leerVistaMicroV3
} from "./estadoMicro.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";
import {
  esEstadoGuardadoV3,
  podarAlineacionesHuerfanas,
  type EstadoGuardadoV3,
  type NodoCurricular
} from "./proyecto.ts";
import {
  actividadesSinVinculo,
  mergeMicrocurriculo,
  normalizarMicrocurriculo,
  rasDelMicro,
  rasSinMedir,
  textoRa,
  validarMicrocurriculo,
  type Microcurriculo
} from "./schema.ts";

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

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function crearMicroBase(cambios?: Record<string, unknown>): Microcurriculo {
  return normalizarMicrocurriculo({
    folio: "DCN-TRAZ-01",
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
    contenido: { unidades: [] },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] },
    ...cambios
  });
}

/** Proyecto con marco (2 principios), programa (2 resultados) y micro (2 RA, 1 actividad). */
function crearProyectoTrazable(): EstadoGuardadoV3 {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-trazable");
  estado.proyecto.marcos.push({
    ...normalizarMarco({ nombre: "Marco", version: "2026" }),
    id: "marco-1",
    principios: [
      { id: "prin-1", texto: "Formación integral", origen: "docente", estado: "confirmado_por_docente", citas: [] },
      { id: "prin-2", texto: "Pensamiento crítico", origen: "docente", estado: "confirmado_por_docente", citas: [] }
    ]
  });
  estado = aplicarVistaMesoV3(
    estado,
    {
      programa: {
        ...normalizarPrograma({ nombre: "Programa", codigo: "P-1" }),
        id: "prog-1",
        resultadosPrograma: [
          { id: "res-1", texto: "Resuelve problemas", origen: "docente", estado: "confirmado_por_docente", citas: [] },
          { id: "res-2", texto: "Comunica resultados", origen: "docente", estado: "confirmado_por_docente", citas: [] }
        ]
      },
      vinculoMarcoId: "marco-1",
      mensajes: [],
      sugerencias: [],
      intencion: "entender",
      seccionActiva: null,
      crudo: ""
    },
    "proyecto-trazable"
  );
  const micro = crearMicroBase({
    contenido: {
      unidades: [
        {
          titulo: "Unidad 1",
          resultadosAprendizaje: ["Diseña soluciones de software", "Evalúa alternativas"],
          temas: []
        }
      ]
    },
    evaluacion: { cortes: [] }
  });
  // La actividad cita el RA por texto heredado: debe resolverse al normalizar.
  const raId = micro.contenido.unidades[0].resultadosAprendizaje[0].id;
  micro.evaluacion.cortes.push({
    nombre: "Corte 1",
    porcentaje: 100,
    actividades: [
      {
        id: "act-1",
        nombre: "Proyecto",
        descripcion: "",
        instrumento: "Rúbrica analítica",
        herramientas: [],
        mide: "",
        mideIds: [raId]
      }
    ]
  });
  estado.seleccion = { modulo: "inicio", documentoId: null };
  estado = aplicarVistaMicroV3(
    estado,
    { microcurriculo: micro, mensajes: [], sugerencias: [], intencion: "entender", seccionActiva: null, crudo: "" },
    "proyecto-trazable"
  );
  assert(esEstadoGuardadoV3(estado), "el fixture trazable debe ser V3 válido");
  return estado;
}

function microId(estado: EstadoGuardadoV3): string {
  const id = estado.proyecto.asignaturas[0]?.id;
  assert(id !== undefined, "debe existir una asignatura");
  return id;
}

/* ---------------- normalización ---------------- */

caso("los RA como texto reciben ids estables y deterministas", () => {
  const a = crearMicroBase({
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña soluciones"], temas: [] }] }
  });
  const b = crearMicroBase({
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña soluciones"], temas: [] }] }
  });
  const ra = a.contenido.unidades[0].resultadosAprendizaje[0];
  assert(ra.id.startsWith("ra_"), "prefijo ra_");
  assert(ra.texto === "Diseña soluciones", "conserva el texto");
  igual(ra.id, b.contenido.unidades[0].resultadosAprendizaje[0].id, "mismo texto, mismo id");
});

caso("los objetos RA conservan su id y el mide heredado se resuelve por texto", () => {
  const micro = normalizarMicrocurriculo({
    folio: "DCN-TRAZ-02",
    contenido: {
      unidades: [{ titulo: "U1", resultadosAprendizaje: [{ id: "ra_mio", texto: "Diseña soluciones" }], temas: [] }]
    },
    evaluacion: {
      cortes: [
        {
          nombre: "C1",
          porcentaje: 100,
          actividades: [{ nombre: "Proyecto", instrumento: "Rúbrica", mide: "Diseña soluciones" }]
        }
      ]
    }
  });
  const ra = micro.contenido.unidades[0].resultadosAprendizaje[0];
  igual(ra.id, "ra_mio", "conserva el id aportado");
  const act = micro.evaluacion.cortes[0].actividades[0];
  assert(act.id.startsWith("act_"), "la actividad recibe id");
  igual(act.mideIds, ["ra_mio"], "el mide heredado se resuelve al RA");
});

caso("los mideIds huérfanos se filtran y los duplicados se conservan una vez", () => {
  const micro = normalizarMicrocurriculo({
    folio: "DCN-TRAZ-03",
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña soluciones"], temas: [] }] },
    evaluacion: {
      cortes: [
        {
          nombre: "C1",
          porcentaje: 100,
          actividades: [{ nombre: "A", mideIds: ["ra_fantasma", "ra_fantasma"] }]
        }
      ]
    }
  });
  igual(micro.evaluacion.cortes[0].actividades[0].mideIds, [], "filtra huérfanos");
});

caso("la fusión preserva ids de RA y actividades aunque el modelo regenere", () => {
  const anterior = crearMicroBase({
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña soluciones"], temas: [] }] }
  });
  const idRa = anterior.contenido.unidades[0].resultadosAprendizaje[0].id;
  const conActividad: Microcurriculo = {
    ...clonar(anterior),
    evaluacion: {
      cortes: [
        {
          nombre: "C1",
          porcentaje: 100,
          actividades: [
            { id: "act_vieja", nombre: "Proyecto", descripcion: "", instrumento: "Rúbrica", herramientas: [], mide: "", mideIds: [idRa] }
          ]
        }
      ]
    }
  };
  // El modelo devuelve los mismos textos sin ids: la fusión debe heredarlos.
  const entrante = normalizarMicrocurriculo({
    folio: "DCN-TRAZ-01",
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña soluciones"], temas: [] }] },
    evaluacion: {
      cortes: [
        { nombre: "C1", porcentaje: 100, actividades: [{ nombre: "Proyecto", instrumento: "Rúbrica" }] }
      ]
    }
  });
  const fusionado = mergeMicrocurriculo(conActividad, entrante);
  igual(fusionado.contenido.unidades[0].resultadosAprendizaje[0].id, idRa, "preserva el id del RA");
  const act = fusionado.evaluacion.cortes[0].actividades[0];
  igual(act.id, "act_vieja", "preserva el id de la actividad por nombre");
  igual(act.mideIds, [idRa], "preserva los vínculos cuando el entrante no trae");
});

/* ---------------- validación y recorrido ---------------- */

caso("validar avisa actividades sin vínculo y RA sin medir", () => {
  const micro = crearMicroBase({
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: ["Diseña A", "Diseña B"], temas: [] }] },
    evaluacion: {
      cortes: [
        { nombre: "C1", porcentaje: 100, actividades: [{ nombre: "Parcial", instrumento: "Rúbrica" }] }
      ]
    }
  });
  assert(actividadesSinVinculo(micro) === 1, "una actividad sin vínculo");
  assert(rasSinMedir(micro) === 2, "dos RA sin medir");
  assert(rasDelMicro(micro).length === 2, "recorre los RA");
  assert(textoRa(micro, rasDelMicro(micro)[0].id) === "Diseña A", "resuelve texto por id");
  const problemas = validarMicrocurriculo(micro);
  assert(problemas.some((p) => p.includes("sin RA vinculado")), "avisa la actividad sin vínculo");
});

/* ---------------- bordes del agregado ---------------- */

caso("los bordes nuevos son válidos y los inválidos se rechazan", () => {
  const estado = crearProyectoTrazable();
  const asigId = microId(estado);
  const raId = estado.proyecto.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje[0].id;
  const actId = estado.proyecto.asignaturas[0].microcurriculo.evaluacion.cortes[0].actividades[0].id;
  const progId = estado.proyecto.programas[0].id;

  const r1 = definirAlineacion(
    estado,
    { tipo: "resultado_programa", id: "res-1", contextoId: progId },
    { tipo: "ra_micro", id: raId, contextoId: asigId }
  );
  assert(r1 !== null && esEstadoGuardadoV3(r1), "resultado → RA válido");

  const r2 = definirAlineacion(
    r1,
    { tipo: "ra_micro", id: raId, contextoId: asigId },
    { tipo: "actividad_evaluacion", id: actId, contextoId: asigId }
  );
  assert(r2 !== null && esEstadoGuardadoV3(r2), "RA → actividad válido");
  assert(r2.proyecto.alineaciones.length === 2, "dos alineaciones");

  const mala = definirAlineacion(
    estado,
    { tipo: "principio_marco", id: "prin-1" },
    { tipo: "ra_micro", id: raId, contextoId: asigId }
  );
  assert(mala === null, "principio → RA no es un borde permitido");

  const snapshot = JSON.stringify(estado);
  const huerfana = definirAlineacion(
    estado,
    { tipo: "resultado_programa", id: "res-1", contextoId: progId },
    { tipo: "ra_micro", id: "ra_que_no_existe", contextoId: asigId }
  );
  assert(huerfana === null, "un extremo inexistente se rechaza");
  assert(JSON.stringify(estado) === snapshot, "la base no se muta");
});

caso("definir es idempotente y quitar respeta el contexto", () => {
  const estado = crearProyectoTrazable();
  const asigId = microId(estado);
  const progId = estado.proyecto.programas[0].id;
  const origen: NodoCurricular = { tipo: "principio_marco", id: "prin-1" };
  const destino: NodoCurricular = { tipo: "resultado_programa", id: "res-1", contextoId: progId };
  const una = definirAlineacion(estado, origen, destino);
  assert(una !== null, "se crea");
  const dos = definirAlineacion(una, origen, destino);
  assert(dos !== null && dos.proyecto.alineaciones.length === 1, "redefinir no duplica");
  igual(dos.proyecto.alineaciones[0].id, idAlineacionPara(origen, destino), "id determinista");
  assert(existeAlineacion(dos.proyecto, origen, destino), "existe");

  const otra = quitarAlineacion(dos, origen, { tipo: "resultado_programa", id: "res-2", contextoId: progId });
  assert(otra !== null && otra.proyecto.alineaciones.length === 1, "quitar otro borde no toca");
  const quitada = quitarAlineacion(otra as EstadoGuardadoV3, origen, destino);
  assert(quitada !== null && quitada.proyecto.alineaciones.length === 0, "se elimina");

  // El contexto desambigua: quitar con otro contexto no toca la existente.
  const conOtroContexto = quitarAlineacion(dos, { ...origen }, { ...destino, contextoId: "prog-otro" });
  assert(conOtroContexto !== null && conOtroContexto.proyecto.alineaciones.length === 1, "otro contexto no elimina");
});

caso("podar elimina huérfanas y conserva sanas", () => {
  const estado = crearProyectoTrazable();
  const asigId = microId(estado);
  const progId = estado.proyecto.programas[0].id;
  const raId = estado.proyecto.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje[0].id;
  const conAlineacion = definirAlineacion(
    estado,
    { tipo: "resultado_programa", id: "res-1", contextoId: progId },
    { tipo: "ra_micro", id: raId, contextoId: asigId }
  );
  assert(conAlineacion !== null, "base alineada");
  const rota = clonar(conAlineacion as EstadoGuardadoV3);
  // Se borra el RA destino a mano: la alineación queda huérfana.
  rota.proyecto.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje = [];
  rota.proyecto.asignaturas[0].microcurriculo.evaluacion.cortes[0].actividades[0].mideIds = [];
  const podadas = podarAlineacionesHuerfanas(rota.proyecto);
  igual(podadas.length, 0, "la huérfana se poda");
  assert(esEstadoGuardadoV3({ ...rota, proyecto: { ...rota.proyecto, alineaciones: podadas } }), "podar repara el agregado");
});

caso("editar el programa poda la alineación del resultado borrado", () => {
  const estado = crearProyectoTrazable();
  const progId = estado.proyecto.programas[0].id;
  const programa = estado.proyecto.programas[0];
  const conAlineacion = definirAlineacion(
    estado,
    { tipo: "principio_marco", id: "prin-1" },
    { tipo: "resultado_programa", id: "res-1", contextoId: progId }
  );
  assert(conAlineacion !== null, "base alineada");
  // La edición debe partir de la selección Meso, como hace la página al editar.
  conAlineacion.seleccion = { modulo: "meso", documentoId: progId };
  const editado = aplicarVistaMesoV3(
    conAlineacion,
    {
      programa: { ...clonar(programa), resultadosPrograma: programa.resultadosPrograma.filter((r) => r.id !== "res-1") },
      vinculoMarcoId: "marco-1",
      mensajes: [],
      sugerencias: [],
      intencion: "editar",
      seccionActiva: null,
      crudo: ""
    },
    "proyecto-trazable"
  );
  assert(esEstadoGuardadoV3(editado), "sigue válido tras borrar el resultado");
  igual(editado.proyecto.alineaciones.length, 0, "la alineación huérfana se podó al editar");
});

caso("el guard rechaza mideIds huérfanos y RA duplicados", () => {
  const estado = crearProyectoTrazable();
  const rota = clonar(estado);
  rota.proyecto.asignaturas[0].microcurriculo.evaluacion.cortes[0].actividades[0].mideIds = ["ra_fantasma"];
  assert(!esEstadoGuardadoV3(rota), "mideIds huérfanos invalidan");
  const duplicada = clonar(estado);
  const ras = duplicada.proyecto.asignaturas[0].microcurriculo.contenido.unidades[0].resultadosAprendizaje;
  ras.push(clonar(ras[0]));
  assert(!esEstadoGuardadoV3(duplicada), "RA duplicados invalidan");
});

caso("leer migra un micro heredado sin romper el guard", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-legado");
  const legado = {
    folio: "DCN-LEGADO",
    ident: {
      asignatura: "Legada",
      codigo: "L-1",
      programa: "Prog",
      creditos: 2,
      horas: { teoricas: 10, practicas: 0, independientes: 10 },
      prerrequisitos: [],
      semestre: "Primero"
    },
    justificacion: "Justificación suficientemente larga para el mínimo exigido.",
    objetivos: { generales: ["G"], especificas: ["E"] },
    contenido: { unidades: [{ numero: 1, titulo: "U1", resultadosAprendizaje: ["Diseña cosas"], temas: [] }] },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: {
      cortes: [
        {
          nombre: "C1",
          porcentaje: 100,
          actividades: [{ nombre: "Parcial", descripcion: "", instrumento: "Rúbrica", herramientas: [], mide: "Diseña cosas" }]
        }
      ]
    },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  };
  estado.proyecto.asignaturas.push({ id: "asig-legada", programaId: null, microcurriculo: legado as never });
  estado.seleccion = { modulo: "micro", documentoId: "asig-legada" };
  assert(esEstadoGuardadoV3(estado), "el legado pasa el guard tolerante");
  const lectura = leerVistaMicroV3(estado);
  assert(lectura.ok, "la vista del legado se lee");
  const ra = lectura.vista.microcurriculo?.contenido.unidades[0].resultadosAprendizaje[0];
  assert(ra !== undefined && typeof ra !== "string" && ra.id.startsWith("ra_"), "el RA se migra con id");
  const act = lectura.vista.microcurriculo?.evaluacion.cortes[0].actividades[0];
  igual(act?.mideIds, [ra.id], "el mide heredado se vincula al leer");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
