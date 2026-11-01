/**
 * Suite autónoma para el puente entre la vista Meso y el estado V3.
 * Uso: node lib/estadoMeso.test.ts
 */

import {
  aplicarVistaMesoV3,
  leerVistaMesoV3,
  vistaMesoVacia,
  type VistaMesoPersistible
} from "./estadoMeso.ts";
import { aplicarVistaMicroV3, crearEstadoGuardadoV3Vacio } from "./estadoMicro.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";
import { esEstadoGuardadoV3, type EstadoGuardadoV3, type ProgramaAcademico } from "./proyecto.ts";
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

function crearPrograma(nombre = "Ingeniería de Software"): ProgramaAcademico {
  return {
    ...normalizarPrograma({
      nombre,
      codigo: "ISW",
      estado: "vigente",
      perfilIngreso: [{ texto: "Interés por resolver problemas.", origen: "docente" }],
      perfilEgreso: [{ texto: "Diseña soluciones.", origen: "docente" }],
      resultadosPrograma: [{ texto: "Evalúa software.", origen: "docente" }]
    }),
    id: `prog-fijo-${nombre.length}`
  };
}

function crearVista(
  programa: ProgramaAcademico | null,
  cambios: Partial<Omit<VistaMesoPersistible, "programa">> = {}
): VistaMesoPersistible {
  return { ...vistaMesoVacia(), programa, ...cambios };
}

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function crearVacia() {
  return normalizarMicrocurriculo({
    folio: "DCN-MESO-01",
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
  const vista = vistaMesoVacia();
  assert(vista.programa === null, "sin programa");
  assert(vista.vinculoMarcoId === null, "sin vínculo");
  assert(vista.mensajes.length === 0, "sin mensajes");
  assert(vista.intencion === "entender", "intención inicial");
  assert(vista.seccionActiva === null, "sin sección");
  assert(vista.crudo === "", "sin crudo activo");
});

caso("lee el programa seleccionado y su conversación por scope", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-meso");
  estado = aplicarVistaMesoV3(
    estado,
    crearVista(crearPrograma(), {
      mensajes: [{ id: "u1", role: "usuario", texto: "Armemos el programa." }],
      sugerencias: ["Seguir con perfiles"],
      intencion: "crear",
      seccionActiva: "resultados",
      crudo: "respuesta-meso"
    }),
    "proyecto-meso"
  );
  const idPrograma = estado.seleccion.documentoId;
  assert(idPrograma !== null, "la creación selecciona el programa nuevo");
  assert(estado.seleccion.modulo === "meso", "la selección apunta a Meso");

  const resultado = leerVistaMesoV3(estado);
  assert(resultado.ok, "la vista Meso debe poder leerse");
  const vista = resultado.ok ? resultado.vista : null;
  assert(vista?.programa?.nombre === "Ingeniería de Software", "recupera el programa");
  assert(vista?.mensajes[0].texto === "Armemos el programa.", "recupera el scope Meso");
  assert(vista?.seccionActiva === "resultados", "recupera la sección activa");
  assert(vista?.crudo === "respuesta-meso", "recupera el crudo activo");

  if (vista) vista.mensajes[0].texto = "Cambio en vista";
  assert(
    estado.conversaciones[`meso:${idPrograma}`].mensajes[0].texto === "Armemos el programa.",
    "la lectura entrega copias y no muta el estado"
  );
});

caso("lee el lienzo meso sin documento con defaults", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-lienzo");
  estado.seleccion = { modulo: "meso", documentoId: null };
  assert(esEstadoGuardadoV3(estado), "la selección Meso sin documento es válida");
  const resultado = leerVistaMesoV3(estado);
  assert(resultado.ok, "el lienzo debe poder leerse");
  assert(resultado.ok && resultado.vista.programa === null, "sin programa todavía");
});

caso("devuelve no soportado para inicio, micro y macro sin alterar nada", () => {
  const base = crearEstadoGuardadoV3Vacio("proyecto-otros");
  for (const modulo of ["inicio", "micro", "macro"] as const) {
    const estado = clonar(base);
    if (modulo === "micro") {
      const conMicro = aplicarVistaMicroV3(
        estado,
        { microcurriculo: crearVacia(), mensajes: [], sugerencias: [], intencion: "entender", seccionActiva: null, crudo: "" },
        "proyecto-otros"
      );
      const snapshot = JSON.stringify(conMicro);
      assert(!leerVistaMesoV3(conMicro).ok, "micro no se lee como meso");
      assert(JSON.stringify(conMicro) === snapshot, "leer no muta");
    } else {
      estado.seleccion = { modulo, documentoId: null };
      const snapshot = JSON.stringify(estado);
      assert(!leerVistaMesoV3(estado).ok, `${modulo} no se lee como meso`);
      assert(JSON.stringify(estado) === snapshot, "leer no muta");
    }
  }
});

caso("una selección meso sin programa existente no se inventa", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-huerfano");
  estado.seleccion = { modulo: "meso", documentoId: "prog-que-no-existe" };
  assert(!leerVistaMesoV3(estado).ok, "no se fabrica un programa para una selección huérfana");
});

caso("aplicar crea el programa con id determinista y su scope", () => {
  const estado = aplicarVistaMesoV3(
    crearEstadoGuardadoV3Vacio("proyecto-crear"),
    crearVista(crearPrograma("Diseño Industrial"), { mensajes: [{ id: "u", role: "usuario", texto: "Hola." }] }),
    "proyecto-crear"
  );
  assert(esEstadoGuardadoV3(estado), "el resultado debe ser V3 válido");
  assert(estado.proyecto.programas.length === 1, "crea un solo programa");
  const creado = estado.proyecto.programas[0];
  assert(creado.id.startsWith("programa_diseno_industrial_"), "id legible derivado del nombre");
  assert(estado.seleccion.modulo === "meso" && estado.seleccion.documentoId === creado.id, "selecciona el programa");
  assert(estado.conversaciones[`meso:${creado.id}`].mensajes.length === 1, "guarda la conversación en su scope");
  const otra = aplicarVistaMesoV3(crearEstadoGuardadoV3Vacio("proyecto-crear"), crearVista(crearPrograma("Diseño Industrial")), "proyecto-crear");
  assert(otra.proyecto.programas[0].id === creado.id, "mismo nombre produce el mismo id");
});

caso("aplicar edita el programa y preserva hermanas y conversaciones", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-edicion");
  estado = aplicarVistaMicroV3(
    estado,
    { microcurriculo: crearVacia(), mensajes: [{ id: "um", role: "usuario", texto: "Hilo micro." }], sugerencias: [], intencion: "entender", seccionActiva: null, crudo: "raw-micro" },
    "proyecto-edicion"
  );
  const microId = estado.seleccion.documentoId;
  estado.proyecto.marcos.push({ ...normalizarMarco({ nombre: "Marco", version: "2026" }), id: "marco-1" });
  estado = aplicarVistaMesoV3(estado, crearVista(crearPrograma()), "proyecto-edicion");
  const progId = estado.seleccion.documentoId;
  assert(progId !== null, "programa seleccionado");
  estado.conversaciones[`meso:${progId}`].crudoLegado = "json-legado";
  const snapshot = JSON.stringify(estado);

  const editado = clonar(estado.proyecto.programas[0]);
  editado.nombre = "Programa actualizado";
  const actualizado = aplicarVistaMesoV3(
    estado,
    crearVista(editado, { mensajes: [{ id: "e", role: "usuario", texto: "Actualiza." }], crudo: "raw-nuevo" }),
    "no-usar"
  );

  assert(JSON.stringify(estado) === snapshot, "no muta la base");
  assert(esEstadoGuardadoV3(actualizado), "sigue siendo V3 válido");
  assert(actualizado.proyecto.programas[0].nombre === "Programa actualizado", "actualiza el programa");
  assert(actualizado.proyecto.asignaturas.length === 1, "conserva la asignatura hermana");
  assert(actualizado.proyecto.marcos.length === 1, "conserva el marco hermano");
  igual(actualizado.conversaciones[`micro:${microId}`], estado.conversaciones[`micro:${microId}`], "conserva la conversación micro");
  const conv = actualizado.conversaciones[`meso:${progId}`];
  assert(conv.crudo === "raw-nuevo", "actualiza el crudo activo");
  assert(conv.crudoLegado === "json-legado", "preserva el crudo legado");
});

caso("la vista nula guarda conversación sin crear programa", () => {
  const estado = aplicarVistaMesoV3(
    crearEstadoGuardadoV3Vacio("proyecto-lienzo-guardar"),
    crearVista(null, { mensajes: [{ id: "u", role: "usuario", texto: "Quiero el programa." }] }),
    "proyecto-lienzo-guardar"
  );
  assert(esEstadoGuardadoV3(estado), "V3 válido");
  assert(estado.proyecto.programas.length === 0, "no crea programa");
  assert(estado.seleccion.modulo === "meso" && estado.seleccion.documentoId === null, "queda en el lienzo meso");
  assert(estado.conversaciones["meso:sin-documento"].mensajes.length === 1, "hilo del lienzo");
});

caso("establece el vínculo principal con un marco existente", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-vinculo");
  estado.proyecto.marcos.push({ ...normalizarMarco({ nombre: "Marco", version: "2026" }), id: "marco-1" });
  estado = aplicarVistaMesoV3(estado, crearVista(crearPrograma(), { vinculoMarcoId: "marco-1" }), "proyecto-vinculo");
  const progId = estado.seleccion.documentoId;
  assert(progId !== null, "programa seleccionado");
  const vinculos = estado.proyecto.vinculosProgramaMarco.filter((v) => v.programaId === progId);
  assert(vinculos.length === 1, "un solo vínculo");
  assert(vinculos[0].marcoId === "marco-1" && vinculos[0].principal && vinculos[0].estado === "activo", "principal activo");
  const lectura = leerVistaMesoV3(estado);
  assert(lectura.ok && lectura.vista.vinculoMarcoId === "marco-1", "la lectura devuelve el vínculo");
});

caso("cambiar de marco conserva el historial del vínculo anterior", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-cambio");
  estado.proyecto.marcos.push(
    { ...normalizarMarco({ nombre: "Marco A", version: "1" }), id: "marco-a" },
    { ...normalizarMarco({ nombre: "Marco B", version: "2" }), id: "marco-b" }
  );
  estado = aplicarVistaMesoV3(estado, crearVista(crearPrograma(), { vinculoMarcoId: "marco-a" }), "proyecto-cambio");
  const progId = estado.seleccion.documentoId as string;
  const programa = estado.proyecto.programas[0];
  estado = aplicarVistaMesoV3(estado, crearVista(programa, { vinculoMarcoId: "marco-b" }), "proyecto-cambio");
  const vinculos = estado.proyecto.vinculosProgramaMarco.filter((v) => v.programaId === progId);
  assert(vinculos.length === 2, "el anterior se conserva");
  const viejo = vinculos.find((v) => v.marcoId === "marco-a");
  const nuevo = vinculos.find((v) => v.marcoId === "marco-b");
  assert(viejo?.estado === "inactivo" && viejo?.principal === false, "el anterior queda inactivo sin principal");
  assert(nuevo?.estado === "activo" && nuevo?.principal === true, "el nuevo es principal activo");
  assert(esEstadoGuardadoV3(estado), "sigue siendo V3 válido");
});

caso("quitar el vínculo lo desactiva sin borrarlo", () => {
  let estado = crearEstadoGuardadoV3Vacio("proyecto-quitar");
  estado.proyecto.marcos.push({ ...normalizarMarco({ nombre: "Marco", version: "2026" }), id: "marco-1" });
  estado = aplicarVistaMesoV3(estado, crearVista(crearPrograma(), { vinculoMarcoId: "marco-1" }), "proyecto-quitar");
  const programa = estado.proyecto.programas[0];
  estado = aplicarVistaMesoV3(estado, crearVista(programa, { vinculoMarcoId: null }), "proyecto-quitar");
  assert(estado.proyecto.vinculosProgramaMarco.length === 1, "no se borra");
  assert(estado.proyecto.vinculosProgramaMarco[0].estado === "inactivo", "queda inactivo");
  const lectura = leerVistaMesoV3(estado);
  assert(lectura.ok && lectura.vista.vinculoMarcoId === null, "la lectura ya no reporta vínculo");
});

caso("un vínculo a un marco inexistente no se crea", () => {
  const estado = aplicarVistaMesoV3(
    crearEstadoGuardadoV3Vacio("proyecto-sin-marco"),
    crearVista(crearPrograma(), { vinculoMarcoId: "marco-fantasma" }),
    "proyecto-sin-marco"
  );
  assert(estado.proyecto.vinculosProgramaMarco.length === 0, "no se inventa el vínculo");
  assert(esEstadoGuardadoV3(estado), "V3 válido");
});

caso("dos programas con el mismo nombre no colisionan", () => {
  const primero = aplicarVistaMesoV3(
    crearEstadoGuardadoV3Vacio("proyecto-doble"),
    crearVista(crearPrograma("Mismo nombre")),
    "proyecto-doble"
  );
  const idPrimero = primero.seleccion.documentoId;
  const lienzo = clonar(primero);
  lienzo.seleccion = { modulo: "meso", documentoId: null };
  const segundo = aplicarVistaMesoV3(lienzo, crearVista(crearPrograma("Mismo nombre")), "proyecto-doble");
  assert(segundo.proyecto.programas.length === 2, "crea un segundo documento");
  assert(segundo.seleccion.documentoId !== idPrimero, "con id propio");
  assert(new Set(segundo.proyecto.programas.map((p) => p.id)).size === 2, "ids únicos");
});

caso("una vista nula no reemplaza un programa seleccionado", () => {
  const creado = aplicarVistaMesoV3(
    crearEstadoGuardadoV3Vacio("proyecto-nulo"),
    crearVista(crearPrograma()),
    "proyecto-nulo"
  );
  const snapshot = JSON.stringify(creado);
  let lanzo = false;
  try {
    aplicarVistaMesoV3(creado, crearVista(null), "x");
  } catch {
    lanzo = true;
  }
  assert(lanzo, "rechaza la vista nula sobre un programa concreto");
  assert(JSON.stringify(creado) === snapshot, "no muta al rechazar");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
