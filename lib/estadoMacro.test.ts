/**
 * Suite autónoma para el puente entre la vista Macro y el estado V3.
 * Uso: node lib/estadoMacro.test.ts
 */

import {
  aplicarVistaMacroV3,
  leerVistaMacroV3,
  vistaMacroVacia,
  type VistaMacroPersistible
} from "./estadoMacro.ts";
import { aplicarVistaMicroV3, crearEstadoGuardadoV3Vacio } from "./estadoMicro.ts";
import { normalizarMarco } from "./macro.ts";
import { esEstadoGuardadoV3, type EstadoGuardadoV3, type MarcoEducativoInstitucional } from "./proyecto.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

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

function crearMarco(nombre = "Modelo educativo institucional"): MarcoEducativoInstitucional {
  return {
    ...normalizarMarco({
      nombre,
      emisor: "Universidad de prueba",
      version: "2026",
      estado: "vigente",
      principios: [{ texto: "El aprendizaje es activo.", origen: "docente" }],
      orientaciones: [{ texto: "Declarar el perfil de egreso.", origen: "docente" }]
    }),
    id: `marco-fijo-${nombre.length}`
  };
}

function crearVista(
  marco: MarcoEducativoInstitucional | null,
  cambios: Partial<Omit<VistaMacroPersistible, "marco">> = {}
): VistaMacroPersistible {
  return { ...vistaMacroVacia(), marco, ...cambios };
}

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function crearMicroValido() {
  return normalizarMicrocurriculo({
    folio: "DCN-MACRO-01",
    ident: {
      asignatura: "Fundamentos",
      codigo: "ISW-101",
      programa: "Ingeniería",
      creditos: 4,
      horas: { teoricas: 32, practicas: 0, independientes: 32 },
      prerrequisitos: [],
      semestre: "Primero"
    },
    justificacion: "Justificación suficientemente larga para el mínimo exigido.",
    objetivos: { generales: ["Diseñar"], especificas: ["Modelar"] },
    contenido: { unidades: [] },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  });
}

caso("crea una vista vacía con defaults seguros", () => {
  const vista = vistaMacroVacia();
  assert(vista.marco === null, "sin marco");
  assert(vista.fuentes.length === 0, "sin fuentes");
  assert(vista.mensajes.length === 0, "sin mensajes");
  assert(vista.intencion === "entender", "intención inicial");
  assert(vista.seccionActiva === null, "sin sección");
  assert(vista.crudo === "", "sin crudo activo");
});

caso("lee el marco seleccionado y su conversación por scope", () => {
  const marco = crearMarco();
  let estado = crearEstadoGuardadoV3Vacio("proyecto-marco");
  estado = aplicarVistaMacroV3(
    estado,
    crearVista(marco, {
      mensajes: [{ id: "u1", role: "usuario", texto: "Armemos el marco." }],
      sugerencias: ["Seguir con principios"],
      intencion: "crear",
      seccionActiva: "principios",
      crudo: "respuesta-marco"
    }),
    "proyecto-marco"
  );
  const idMarco = estado.seleccion.documentoId;
  assert(idMarco !== null, "la creación selecciona el marco nuevo");
  assert(estado.seleccion.modulo === "macro", "la selección apunta a Macro");

  const resultado = leerVistaMacroV3(estado);
  assert(resultado.ok, "la vista Macro debe poder leerse");
  const vista = resultado.ok ? resultado.vista : null;
  assert(vista && vista.marco?.nombre === marco.nombre, "recupera el marco seleccionado");
  assert(vista?.mensajes[0].texto === "Armemos el marco.", "recupera el scope Macro");
  assert(vista?.seccionActiva === "principios", "recupera la sección activa");
  assert(vista?.crudo === "respuesta-marco", "recupera el crudo activo");

  if (vista) vista.mensajes[0].texto = "Cambio en vista";
  assert(
    estado.conversaciones[`macro:${idMarco}`].mensajes[0].texto === "Armemos el marco.",
    "la lectura entrega copias y no muta el estado"
  );
});

caso("lee el lienzo macro sin documento con defaults", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-lienzo");
  estado.seleccion = { modulo: "macro", documentoId: null };
  assert(esEstadoGuardadoV3(estado), "la selección Macro sin documento es válida");
  const resultado = leerVistaMacroV3(estado);
  assert(resultado.ok, "el lienzo debe poder leerse");
  const vista = resultado.ok ? resultado.vista : null;
  assert(vista?.marco === null, "sin marco todavía");
  assert(vista?.mensajes.length === 0, "hilo vacío por defecto");
});

caso("devuelve no soportado para inicio, micro y meso sin alterar nada", () => {
  const base = crearEstadoGuardadoV3Vacio("proyecto-otros");
  for (const modulo of ["inicio", "micro", "meso"] as const) {
    const estado = clonar(base);
    if (modulo === "micro") {
      const conMicro = aplicarVistaMicroV3(
        estado,
        {
          microcurriculo: crearMicroValido(),
          mensajes: [],
          sugerencias: [],
          intencion: "entender",
          seccionActiva: null,
          crudo: ""
        },
        "proyecto-otros"
      );
      const snapshot = JSON.stringify(conMicro);
      assert(!leerVistaMacroV3(conMicro).ok, "micro no se lee como macro");
      assert(JSON.stringify(conMicro) === snapshot, "leer no muta");
    } else {
      estado.seleccion = { modulo, documentoId: null };
      const snapshot = JSON.stringify(estado);
      const r = leerVistaMacroV3(estado);
      assert(!r.ok, `${modulo} no se lee como macro`);
      assert(JSON.stringify(estado) === snapshot, "leer no muta");
    }
  }
});

caso("una selección macro sin marco existente no se inventa", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-huerfano");
  estado.seleccion = { modulo: "macro", documentoId: "marco-que-no-existe" };
  const r = leerVistaMacroV3(estado);
  assert(!r.ok, "no se fabrica un marco para una selección huérfana");
});

caso("aplicar crea el marco con id determinista y su scope", () => {
  const marco = crearMarco("Modelo 2026");
  const estado = aplicarVistaMacroV3(
    crearEstadoGuardadoV3Vacio("proyecto-crear"),
    crearVista(marco, { mensajes: [{ id: "u", role: "usuario", texto: "Hola." }] }),
    "proyecto-crear"
  );
  assert(esEstadoGuardadoV3(estado), "el resultado debe ser V3 válido");
  assert(estado.proyecto.marcos.length === 1, "crea un solo marco");
  const creado = estado.proyecto.marcos[0];
  assert(creado.id.startsWith("marco_modelo_2026_"), "id legible derivado del nombre");
  assert(estado.seleccion.modulo === "macro" && estado.seleccion.documentoId === creado.id, "selecciona el marco");
  const scope = estado.conversaciones[`macro:${creado.id}`];
  assert(scope !== undefined && scope.mensajes.length === 1, "guarda la conversación en su scope");
  const otra = aplicarVistaMacroV3(crearEstadoGuardadoV3Vacio("proyecto-crear"), crearVista(crearMarco("Modelo 2026")), "proyecto-crear");
  assert(otra.proyecto.marcos[0].id === creado.id, "mismo nombre produce el mismo id");
});

caso("aplicar edita el marco y preserva micros y conversaciones hermanas", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-edicion");
  estado = aplicarVistaMicroV3(
    estado,
    {
      microcurriculo: crearMicroValido(),
      mensajes: [{ id: "um", role: "usuario", texto: "Hilo micro." }],
      sugerencias: [],
      intencion: "entender",
      seccionActiva: null,
      crudo: "raw-micro"
    },
    "proyecto-edicion"
  );
  const microId = estado.seleccion.documentoId;
  estado = aplicarVistaMacroV3(estado, crearVista(crearMarco()), "proyecto-edicion");
  const marcoId = estado.seleccion.documentoId;
  assert(marcoId !== null, "marco seleccionado");
  estado.conversaciones[`macro:${marcoId}`].crudoLegado = "json-legado";
  const snapshot = JSON.stringify(estado);

  const editado = clonar(estado.proyecto.marcos[0]);
  editado.nombre = "Modelo actualizado";
  const actualizado = aplicarVistaMacroV3(
    estado,
    crearVista(editado, { mensajes: [{ id: "e", role: "usuario", texto: "Actualiza." }], crudo: "raw-nuevo" }),
    "no-usar"
  );

  assert(JSON.stringify(estado) === snapshot, "no muta la base");
  assert(esEstadoGuardadoV3(actualizado), "sigue siendo V3 válido");
  assert(actualizado.proyecto.marcos[0].nombre === "Modelo actualizado", "actualiza el marco");
  assert(actualizado.proyecto.asignaturas.length === 1, "conserva la asignatura hermana");
  igual(
    actualizado.conversaciones[`micro:${microId}`],
    estado.conversaciones[`micro:${microId}`],
    "conserva la conversación micro"
  );
  const conv = actualizado.conversaciones[`macro:${marcoId}`];
  assert(conv.crudo === "raw-nuevo", "actualiza el crudo activo");
  assert(conv.crudoLegado === "json-legado", "preserva el crudo legado");
});

caso("la vista nula guarda conversación y fuentes sin crear marco", () => {
  const estado = aplicarVistaMacroV3(
    crearEstadoGuardadoV3Vacio("proyecto-lienzo-guardar"),
    crearVista(null, {
      mensajes: [{ id: "u", role: "usuario", texto: "Quiero el marco." }],
      fuentes: [{ id: "f1", titulo: "Modelo 2026", tipo: "modelo_educativo" }]
    }),
    "proyecto-lienzo-guardar"
  );
  assert(esEstadoGuardadoV3(estado), "V3 válido");
  assert(estado.proyecto.marcos.length === 0, "no crea marco");
  assert(estado.proyecto.fuentesCurriculares.length === 1, "las fuentes sí se guardan");
  assert(estado.seleccion.modulo === "macro" && estado.seleccion.documentoId === null, "queda en el lienzo macro");
  assert(estado.conversaciones["macro:sin-documento"].mensajes.length === 1, "hilo del lienzo");
});

caso("aplicar rechaza base meso sin mutar", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-meso");
  estado.proyecto.programas.push({
    id: "prog-1",
    nombre: "Programa",
    estado: "borrador",
    perfilIngreso: [],
    perfilEgreso: [],
    resultadosPrograma: []
  });
  estado.seleccion = { modulo: "meso", documentoId: "prog-1" };
  assert(esEstadoGuardadoV3(estado), "base meso válida");
  const snapshot = JSON.stringify(estado);
  let lanzo = false;
  try {
    aplicarVistaMacroV3(estado, crearVista(crearMarco()), "x");
  } catch {
    lanzo = true;
  }
  assert(lanzo, "rechaza el scope meso");
  assert(JSON.stringify(estado) === snapshot, "no muta al rechazar");
});

caso("las fuentes de la vista reemplazan la lista del proyecto", () => {
  let estado = aplicarVistaMacroV3(
    crearEstadoGuardadoV3Vacio("proyecto-fuentes"),
    crearVista(crearMarco(), {
      fuentes: [
        { id: "f1", titulo: "Uno", tipo: "lineamiento" },
        { id: "f2", titulo: "Dos", tipo: "otro" }
      ]
    }),
    "proyecto-fuentes"
  );
  assert(estado.proyecto.fuentesCurriculares.length === 2, "dos fuentes");
  const marcoId = estado.seleccion.documentoId;
  assert(marcoId !== null, "marco seleccionado");
  const marco = estado.proyecto.marcos[0];
  estado = aplicarVistaMacroV3(
    estado,
    crearVista(marco, { fuentes: [{ id: "f1", titulo: "Uno", tipo: "lineamiento" }] }),
    "proyecto-fuentes"
  );
  igual(
    estado.proyecto.fuentesCurriculares.map((f) => f.id),
    ["f1"],
    "la baja de una fuente se refleja"
  );
});

caso("dos marcos con el mismo nombre no colisionan", () => {
  const primero = aplicarVistaMacroV3(
    crearEstadoGuardadoV3Vacio("proyecto-doble"),
    crearVista(crearMarco("Mismo nombre")),
    "proyecto-doble"
  );
  const idPrimero = primero.seleccion.documentoId;
  // Vuelve al lienzo e inicia otro marco con el mismo nombre.
  const lienzo = clonar(primero);
  lienzo.seleccion = { modulo: "macro", documentoId: null };
  const segundo = aplicarVistaMacroV3(lienzo, crearVista(crearMarco("Mismo nombre")), "proyecto-doble");
  assert(segundo.proyecto.marcos.length === 2, "crea un segundo documento");
  assert(segundo.seleccion.documentoId !== idPrimero, "con id propio");
  const ids = segundo.proyecto.marcos.map((m) => m.id);
  assert(new Set(ids).size === 2, "ids únicos");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} prueba(s) pasaron.`);
}
