/**
 * Suite autónoma para el puente entre la vista Micro y el estado curricular V3.
 * Uso: node lib/estadoMicro.test.ts
 */

import {
  aplicarVistaMicroV3,
  crearEstadoGuardadoV3Vacio,
  leerVistaMicroV3,
  vistaMicroVacia,
  type VistaMicroPersistible
} from "./estadoMicro.ts";
import { esEstadoGuardadoV3, type EstadoGuardadoV3 } from "./proyecto.ts";
import { normalizarMicrocurriculo, type Microcurriculo } from "./schema.ts";

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

function debeLanzar(fn: () => unknown, mensaje: string) {
  let lanzo = false;
  try {
    fn();
  } catch {
    lanzo = true;
  }
  assert(lanzo, mensaje);
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

function crearMicro(folio = "DCN-2026-ABC/12", nombre = "Fundamentos de software"): Microcurriculo {
  return normalizarMicrocurriculo({
    folio,
    ident: {
      asignatura: nombre,
      codigo: "ISW-101",
      programa: "Ingeniería de Software",
      creditos: 4,
      horas: { teoricas: 32, practicas: 32, independientes: 64 },
      prerrequisitos: ["Pensamiento lógico"],
      semestre: "Primero"
    },
    justificacion: "La asignatura introduce fundamentos para construir soluciones de software.",
    objetivos: { generales: ["Diseñar soluciones"], especificas: ["Modelar problemas"] },
    contenido: {
      unidades: [
        {
          numero: 1,
          titulo: "Fundamentos",
          resultadosAprendizaje: ["Explica conceptos fundamentales"],
          temas: [{ nombre: "Conceptos", subtemas: ["Abstracción"] }]
        }
      ]
    },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  });
}

function crearVista(
  microcurriculo: Microcurriculo | null,
  cambios: Partial<Omit<VistaMicroPersistible, "microcurriculo">> = {}
): VistaMicroPersistible {
  return {
    ...vistaMicroVacia(),
    microcurriculo,
    ...cambios
  };
}

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function agregarMarcoYPrograma(estado: EstadoGuardadoV3): { marcoId: string; programaId: string } {
  const marcoId = "marco-institucional-1";
  const programaId = "programa-academico-1";
  estado.proyecto.marcos.push({
    id: marcoId,
    nombre: "Marco educativo institucional",
    emisor: "Universidad de prueba",
    version: "2026",
    vigencia: { desde: "2026-01-01", hasta: null },
    estado: "vigente",
    principios: [],
    afirmaciones: []
  });
  estado.proyecto.programas.push({
    id: programaId,
    nombre: "Ingeniería de Software",
    estado: "vigente",
    perfilIngreso: [],
    perfilEgreso: [],
    resultadosPrograma: []
  });
  estado.proyecto.vinculosProgramaMarco.push({
    id: "vinculo-programa-marco-1",
    programaId,
    marcoId,
    vigencia: null,
    estado: "activo",
    principal: true
  });
  return { marcoId, programaId };
}

caso("crea un V3 vacío válido con arrays y conversación de inicio vacíos", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-test-1");
  assert(esEstadoGuardadoV3(estado), "el nuevo agregado debe pasar su guarda V3");
  assert(estado.proyecto.id === "proyecto-test-1", "usa el id provisto");
  assert(estado.proyecto.nombre === "Proyecto curricular", "usa el nombre inicial definido");
  assert(estado.proyecto.marcos.length === 0, "no inventa marcos");
  assert(estado.proyecto.programas.length === 0, "no inventa programas");
  assert(estado.proyecto.asignaturas.length === 0, "no inventa asignaturas");
  assert(estado.seleccion.modulo === "inicio" && estado.seleccion.documentoId === null, "selecciona inicio");
  assert(estado.conversaciones.inicio !== undefined, "crea el scope de inicio");
  assert(estado.conversaciones.inicio.mensajes.length === 0, "no inventa mensajes");
  assert(estado.conversaciones.inicio.sugerencias.length === 0, "no inventa sugerencias de otro módulo");
});

caso("lee la conversación de inicio y defaults cuando no hay conversación", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-inicio");
  estado.conversaciones.inicio = {
    ...estado.conversaciones.inicio,
    mensajes: [{ id: "u1", role: "usuario", texto: "Quiero diseñar un programa." }],
    sugerencias: ["Revisar el propósito"],
    intencion: "entender",
    seccionActiva: null,
    crudo: "respuesta-inicio"
  };
  const resultado = leerVistaMicroV3(estado);
  assert(resultado.ok, "la vista de inicio debe poder leerse");
  assert(resultado.vista.microcurriculo === null, "inicio no fabrica una ficha");
  assert(resultado.vista.mensajes[0].texto === "Quiero diseñar un programa.", "recupera el hilo de inicio");
  assert(resultado.vista.sugerencias[0] === "Revisar el propósito", "recupera sugerencias");
  assert(resultado.vista.crudo === "respuesta-inicio", "recupera el crudo activo del scope");

  delete estado.conversaciones.inicio;
  const sinConversacion = leerVistaMicroV3(estado);
  assert(sinConversacion.ok, "una conversación faltante usa defaults");
  assert(sinConversacion.vista.microcurriculo === null, "sigue en inicio");
  assert(sinConversacion.vista.mensajes.length === 0, "mensajes por defecto vacíos");
  assert(sinConversacion.vista.intencion === "entender", "intención por defecto segura");
});

caso("lee el Micro seleccionado y su conversación por scope", () => {
  const micro = crearMicro();
  let estado = crearEstadoGuardadoV3Vacio("proyecto-micro");
  estado = aplicarVistaMicroV3(
    estado,
    crearVista(micro, {
      mensajes: [{ id: "u1", role: "usuario", texto: "Armemos esta asignatura." }],
      sugerencias: ["Pasar al contenido"],
      intencion: "crear",
      seccionActiva: "contenido",
      crudo: "respuesta-micro"
    }),
    "proyecto-micro"
  );
  const idAsignatura = estado.seleccion.documentoId;
  assert(idAsignatura !== null, "la creación selecciona la asignatura nueva");
  assert(estado.seleccion.modulo === "micro", "la selección debe apuntar al Micro");

  const resultado = leerVistaMicroV3(estado);
  assert(resultado.ok, "la vista Micro debe poder leerse");
  igual(resultado.vista.microcurriculo, micro, "recupera el microcurrículo seleccionado");
  assert(resultado.vista.mensajes[0].texto === "Armemos esta asignatura.", "recupera el scope Micro");
  assert(resultado.vista.intencion === "crear", "recupera la intención");
  assert(resultado.vista.seccionActiva === "contenido", "recupera la sección activa");
  assert(resultado.vista.crudo === "respuesta-micro", "recupera el crudo activo");

  // La lectura entrega copias para que un consumidor no pueda mutar el V3 accidentalmente.
  resultado.vista.mensajes[0].texto = "Cambio en vista";
  assert(estado.conversaciones[`micro:${idAsignatura}`].mensajes[0].texto === "Armemos esta asignatura.", "la lectura no muta el estado fuente");
});

caso("devuelve no soportado para Macro/Meso sin alterar el proyecto", () => {
  const estado = crearEstadoGuardadoV3Vacio("proyecto-otros-scopes");
  const { marcoId, programaId } = agregarMarcoYPrograma(estado);

  estado.seleccion = { modulo: "macro", documentoId: marcoId };
  assert(esEstadoGuardadoV3(estado), "la selección Macro de prueba es válida");
  const snapshotMacro = JSON.stringify(estado);
  const macro = leerVistaMicroV3(estado);
  assert(!macro.ok && macro.motivo === "scope_no_soportado", "Micro no debe reinterpretar Macro");
  assert(JSON.stringify(estado) === snapshotMacro, "la lectura Macro no debe borrar ni mutar datos");

  estado.seleccion = { modulo: "meso", documentoId: programaId };
  assert(esEstadoGuardadoV3(estado), "la selección Meso de prueba es válida");
  const snapshotMeso = JSON.stringify(estado);
  const meso = leerVistaMicroV3(estado);
  assert(!meso.ok && meso.motivo === "scope_no_soportado", "Micro no debe reinterpretar Meso");
  assert(JSON.stringify(estado) === snapshotMeso, "la lectura Meso no debe borrar ni mutar datos");

  const asignatura = crearMicro("DCN-LISTA-MICRO");
  const listaMicro = aplicarVistaMicroV3(
    crearEstadoGuardadoV3Vacio("proyecto-lista"),
    crearVista(asignatura),
    "proyecto-lista"
  );
  listaMicro.seleccion = { modulo: "micro", documentoId: null };
  assert(esEstadoGuardadoV3(listaMicro), "la lista Micro es un scope V3 permitido");
  const snapshotLista = JSON.stringify(listaMicro);
  const lista = leerVistaMicroV3(listaMicro);
  assert(!lista.ok && lista.motivo === "scope_no_soportado", "la lista Micro no es una ficha individual");
  assert(JSON.stringify(listaMicro) === snapshotLista, "leer lista Micro no debe mutar ni descartar asignaturas");
});

caso("aplicar rechaza Macro, Meso y lista Micro antes de mutar", () => {
  const vistaConMicro = crearVista(crearMicro("DCN-SCOPE-APLICAR"));
  const vistas: VistaMicroPersistible[] = [crearVista(null), vistaConMicro];

  const macroBase = crearEstadoGuardadoV3Vacio("proyecto-macro-rechazado");
  const { marcoId } = agregarMarcoYPrograma(macroBase);
  macroBase.seleccion = { modulo: "macro", documentoId: marcoId };
  assert(esEstadoGuardadoV3(macroBase), "base Macro válida");

  const mesoBase = crearEstadoGuardadoV3Vacio("proyecto-meso-rechazado");
  const { programaId } = agregarMarcoYPrograma(mesoBase);
  mesoBase.seleccion = { modulo: "meso", documentoId: programaId };
  assert(esEstadoGuardadoV3(mesoBase), "base Meso válida");

  const microCompletoBase = aplicarVistaMicroV3(
    crearEstadoGuardadoV3Vacio("proyecto-micro-lista-rechazado"),
    crearVista(crearMicro("DCN-BASE-LISTA")),
    "proyecto-micro-lista-rechazado"
  );
  microCompletoBase.seleccion = { modulo: "micro", documentoId: null };
  assert(esEstadoGuardadoV3(microCompletoBase), "base lista Micro válida");

  for (const [etiqueta, base] of [
    ["Macro", macroBase],
    ["Meso", mesoBase],
    ["lista Micro", microCompletoBase]
  ] as const) {
    for (const vista of vistas) {
      const snapshot = JSON.stringify(base);
      debeLanzar(() => aplicarVistaMicroV3(base, vista, "no-usar"), `${etiqueta} debe rechazarse`);
      assert(JSON.stringify(base) === snapshot, `${etiqueta} no debe mutar al rechazar`);
    }
  }

  const microSeleccionado = aplicarVistaMicroV3(
    crearEstadoGuardadoV3Vacio("proyecto-micro-nulo-rechazado"),
    crearVista(crearMicro("DCN-BASE-SELECCIONADA")),
    "proyecto-micro-nulo-rechazado"
  );
  const snapshotSeleccionado = JSON.stringify(microSeleccionado);
  debeLanzar(
    () => aplicarVistaMicroV3(microSeleccionado, crearVista(null), "no-usar"),
    "una ficha Micro concreta no puede reemplazarse por una vista nula"
  );
  assert(JSON.stringify(microSeleccionado) === snapshotSeleccionado, "la ficha Micro seleccionada permanece intacta");
});

caso("una selección Micro conserva la ficha aun si falta su conversación", () => {
  const micro = crearMicro();
  let estado = aplicarVistaMicroV3(
    crearEstadoGuardadoV3Vacio("proyecto-sin-chat"),
    crearVista(micro),
    "proyecto-sin-chat"
  );
  const id = estado.seleccion.documentoId;
  assert(id !== null, "debe existir una asignatura seleccionada");
  delete estado.conversaciones[`micro:${id}`];

  const resultado = leerVistaMicroV3(estado);
  assert(resultado.ok, "la falta del hilo usa defaults sin descartar la ficha");
  igual(resultado.vista.microcurriculo, micro, "la ficha seleccionada permanece");
  assert(resultado.vista.mensajes.length === 0, "el hilo usa defaults vacíos");
});

caso("la primera generación crea scope Micro determinista por folio y no pierde inicio", () => {
  const idProyecto = "proyecto-primera-generacion";
  const inicio = crearEstadoGuardadoV3Vacio(idProyecto);
  const hiloCompleto = [
    { id: "u1", role: "usuario" as const, texto: "Quiero diseñar una materia." },
    { id: "a1", role: "asistente" as const, texto: "¿Qué asignatura es?" },
    { id: "u2", role: "usuario" as const, texto: "Fundamentos de software." }
  ];
  inicio.conversaciones.inicio = {
    ...inicio.conversaciones.inicio,
    mensajes: hiloCompleto.slice(0, 2),
    crudoLegado: "raw-inicio-legacy"
  };
  const micro = crearMicro("2026 / ISW-101");
  const vista = crearVista(micro, { mensajes: hiloCompleto, intencion: "crear", crudo: "raw-micro" });
  const primera = aplicarVistaMicroV3(inicio, vista, idProyecto);
  const segunda = aplicarVistaMicroV3(crearEstadoGuardadoV3Vacio(idProyecto), vista, idProyecto);

  assert(esEstadoGuardadoV3(primera), "el resultado debe pasar la guarda");
  assert(primera.proyecto.asignaturas.length === 1, "crea una sola asignatura");
  assert(primera.seleccion.modulo === "micro", "selecciona Micro al generar la primera ficha");
  const asignatura = primera.proyecto.asignaturas[0];
  assert(asignatura.id.startsWith("asignatura_2026_isw-101_"), "usa un ID determinista legible del folio sanitizado");
  assert(asignatura.id === segunda.proyecto.asignaturas[0].id, "mismo folio produce el mismo ID en el mismo proyecto");
  assert(asignatura.programaId === null, "no infiere un vínculo Meso desde ident.programa");
  const scope = primera.conversaciones[`micro:${asignatura.id}`];
  assert(scope !== undefined, "guarda la conversación bajo el scope Micro correcto");
  igual(scope.mensajes, hiloCompleto, "el hilo completo se transfiere al scope Micro");
  assert(scope.crudo === "raw-micro", "el crudo activo procede de la vista");
  assert(inicio.conversaciones.inicio.mensajes.length === 2, "el hilo inicio original no se elimina al transferirlo");
  assert(inicio.conversaciones.inicio.crudoLegado === "raw-inicio-legacy", "el crudo legado de inicio no se pierde");
});

caso("desde Inicio no reutiliza una asignatura hermana con el mismo folio", () => {
  const idProyecto = "proyecto-folio-repetido";
  const microPrimero = crearMicro("DCN-FOLIO-REPETIDO", "Primera asignatura");
  const primero = aplicarVistaMicroV3(
    crearEstadoGuardadoV3Vacio(idProyecto),
    crearVista(microPrimero, { mensajes: [{ id: "first", role: "usuario", texto: "Primera." }] }),
    idProyecto
  );
  const idPrimera = primero.seleccion.documentoId;
  assert(idPrimera !== null, "la primera asignatura debe quedar seleccionada");
  const fichaPrimeraAntes = clonar(primero.proyecto.asignaturas[0]);

  // El usuario vuelve a Inicio para iniciar otra generación; ya no hay selección Micro concreta.
  primero.seleccion = { modulo: "inicio", documentoId: null };
  assert(esEstadoGuardadoV3(primero), "la selección Inicio conserva el agregado válido");
  const microSegundo = crearMicro("DCN-FOLIO-REPETIDO", "Segunda asignatura");
  const segundo = aplicarVistaMicroV3(
    primero,
    crearVista(microSegundo, { mensajes: [{ id: "second", role: "usuario", texto: "Segunda." }] }),
    idProyecto
  );

  assert(segundo.proyecto.asignaturas.length === 2, "la segunda generación crea un nuevo documento");
  assert(segundo.seleccion.modulo === "micro", "la nueva asignatura queda seleccionada");
  assert(segundo.seleccion.documentoId !== idPrimera, "la nueva asignatura tiene ID propio aun con folio repetido");
  igual(segundo.proyecto.asignaturas[0], fichaPrimeraAntes, "la primera asignatura no se sobrescribe");
  const nueva = segundo.proyecto.asignaturas.find((item) => item.id === segundo.seleccion.documentoId);
  assert(nueva?.microcurriculo.ident.asignatura === "Segunda asignatura", "el segundo documento conserva su contenido");
  assert(primero.proyecto.asignaturas.length === 1, "la entrada original no se muta");
});

caso("editar Micro conserva programaId, Macro/Meso, asignaturas y conversaciones hermanas", () => {
  const base = crearEstadoGuardadoV3Vacio("proyecto-edicion");
  const { marcoId, programaId } = agregarMarcoYPrograma(base);
  const microInicial = crearMicro("DCN-2026-EDICION", "Asignatura inicial");
  let estado = aplicarVistaMicroV3(base, crearVista(microInicial), "proyecto-edicion");
  const asignaturaId = estado.seleccion.documentoId;
  assert(asignaturaId !== null, "debe seleccionar la asignatura recién creada");
  const asignatura = estado.proyecto.asignaturas.find((item) => item.id === asignaturaId);
  assert(asignatura !== undefined, "la asignatura debe existir");
  asignatura.programaId = programaId;

  const otraMicro = crearMicro("DCN-OTRA-ASIGNATURA", "Otra asignatura");
  const otraAsignaturaId = "asignatura-hermana";
  estado.proyecto.asignaturas.push({ id: otraAsignaturaId, programaId: null, microcurriculo: otraMicro });
  estado.conversaciones[`micro:${otraAsignaturaId}`] = {
    scopeId: `micro:${otraAsignaturaId}`,
    modulo: "micro",
    documentoId: otraAsignaturaId,
    mensajes: [{ id: "otra-u", role: "usuario", texto: "Hilo de otra asignatura." }],
    sugerencias: [],
    intencion: "entender",
    seccionActiva: null,
    crudo: "raw-otra"
  };
  estado.conversaciones[`macro:${marcoId}`] = {
    scopeId: `macro:${marcoId}`,
    modulo: "macro",
    documentoId: marcoId,
    mensajes: [{ id: "macro-u", role: "usuario", texto: "Hilo Macro." }],
    sugerencias: [],
    intencion: "editar",
    seccionActiva: "principios",
    crudo: "raw-macro"
  };
  estado.conversaciones[`meso:${programaId}`] = {
    scopeId: `meso:${programaId}`,
    modulo: "meso",
    documentoId: programaId,
    mensajes: [{ id: "meso-u", role: "usuario", texto: "Hilo Meso." }],
    sugerencias: [],
    intencion: "consultar",
    seccionActiva: "perfilEgreso",
    crudo: "raw-meso"
  };

  const scopeMicro = `micro:${asignaturaId}`;
  estado.conversaciones[scopeMicro].crudoLegado = "json-legado-del-micro";
  assert(esEstadoGuardadoV3(estado), "fixture completo antes de editar es válido");
  const snapshot = JSON.stringify(estado);

  const microEditado = crearMicro("DCN-2026-EDICION", "Asignatura actualizada");
  microEditado.justificacion = "Texto actualizado por el docente.";
  const vistaEditada = crearVista(microEditado, {
    mensajes: [{ id: "edit-u", role: "usuario", texto: "Actualiza la justificación." }],
    sugerencias: ["Revisar metodología"],
    intencion: "editar",
    seccionActiva: "justificacion",
    crudo: "raw-micro-nuevo"
  });
  const actualizado = aplicarVistaMicroV3(estado, vistaEditada, "no-debe-reemplazar-id");

  assert(JSON.stringify(estado) === snapshot, "aplicarVista no muta el estado fuente");
  assert(esEstadoGuardadoV3(actualizado), "el estado actualizado debe seguir válido");
  assert(actualizado.proyecto.id === "proyecto-edicion", "conserva el id raíz existente");
  igual(actualizado.proyecto.marcos, estado.proyecto.marcos, "conserva Macro intacto");
  igual(actualizado.proyecto.programas, estado.proyecto.programas, "conserva Meso intacto");
  igual(actualizado.proyecto.fuentesCurriculares, estado.proyecto.fuentesCurriculares, "conserva fuentes hermanas");
  igual(actualizado.proyecto.vinculosProgramaMarco, estado.proyecto.vinculosProgramaMarco, "conserva vínculos");
  igual(actualizado.proyecto.alineaciones, estado.proyecto.alineaciones, "conserva alineaciones");
  assert(actualizado.proyecto.asignaturas.length === 2, "no borra asignaturas hermanas");
  const editada = actualizado.proyecto.asignaturas.find((item) => item.id === asignaturaId);
  assert(editada?.programaId === programaId, "preserva la relación Meso existente");
  assert(editada?.microcurriculo.ident.asignatura === "Asignatura actualizada", "actualiza solo la ficha seleccionada");
  const hermana = actualizado.proyecto.asignaturas.find((item) => item.id === otraAsignaturaId);
  igual(hermana, estado.proyecto.asignaturas.find((item) => item.id === otraAsignaturaId), "preserva otra asignatura completa");
  igual(actualizado.conversaciones[`micro:${otraAsignaturaId}`], estado.conversaciones[`micro:${otraAsignaturaId}`], "preserva conversación Micro hermana");
  igual(actualizado.conversaciones[`macro:${marcoId}`], estado.conversaciones[`macro:${marcoId}`], "preserva conversación Macro");
  igual(actualizado.conversaciones[`meso:${programaId}`], estado.conversaciones[`meso:${programaId}`], "preserva conversación Meso");
  const conversacionEditada = actualizado.conversaciones[scopeMicro];
  assert(conversacionEditada.crudo === "raw-micro-nuevo", "actualiza el crudo activo desde la vista");
  assert(conversacionEditada.crudoLegado === "json-legado-del-micro", "preserva crudoLegado al editar scope existente");
  assert(conversacionEditada.seccionActiva === "justificacion", "actualiza sección activa");
});

caso("vista Micro nula actualiza inicio y selección sin borrar asignaturas", () => {
  const micro = crearMicro("DCN-2026-CONSERVAR");
  const creado = aplicarVistaMicroV3(
    crearEstadoGuardadoV3Vacio("proyecto-conservar"),
    crearVista(micro, { mensajes: [{ id: "u-micro", role: "usuario", texto: "Hilo Micro." }] }),
    "proyecto-conservar"
  );
  // La página cambia explícitamente a Inicio antes de crear una conversación nueva.
  creado.seleccion = { modulo: "inicio", documentoId: null };
  const snapshotAsignaturas = clonar(creado.proyecto.asignaturas);
  const scopeMicro = `micro:${creado.proyecto.asignaturas[0].id}`;
  const snapshotMicro = clonar(creado.conversaciones[scopeMicro]);
  const sinMicro = crearVista(null, {
    mensajes: [{ id: "u-inicio", role: "usuario", texto: "Nueva conversación." }],
    sugerencias: ["Elegir nivel"],
    intencion: "entender",
    seccionActiva: null,
    crudo: "raw-inicio"
  });

  const actualizado = aplicarVistaMicroV3(creado, sinMicro, "otro-id");
  assert(actualizado.seleccion.modulo === "inicio", "selecciona inicio al no haber micro en la vista");
  assert(actualizado.seleccion.documentoId === null, "inicio no selecciona documento");
  igual(actualizado.proyecto.asignaturas, snapshotAsignaturas, "no elimina la ficha previa");
  igual(actualizado.conversaciones[scopeMicro], snapshotMicro, "no modifica la conversación Micro previa");
  assert(actualizado.conversaciones.inicio.mensajes[0].texto === "Nueva conversación.", "actualiza solo el hilo de inicio");
  assert(actualizado.conversaciones.inicio.crudo === "raw-inicio", "guarda el crudo de inicio");
});

caso("los IDs de asignatura son deterministas para folios equivalentes", () => {
  const micro = crearMicro("2026 / ISW-101 A");
  const vista = crearVista(micro);
  const primera = aplicarVistaMicroV3(crearEstadoGuardadoV3Vacio("proyecto-id"), vista, "proyecto-id");
  const segunda = aplicarVistaMicroV3(crearEstadoGuardadoV3Vacio("proyecto-id"), vista, "proyecto-id");
  const idPrimero = primera.proyecto.asignaturas[0].id;
  const idSegundo = segunda.proyecto.asignaturas[0].id;
  assert(idPrimero === idSegundo, "mismo folio crea el mismo id sin crypto/Node");
  assert(idPrimero.startsWith("asignatura_2026_isw-101_a_"), "el prefijo sanitiza el folio y conserva un hash");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} pruebas fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
