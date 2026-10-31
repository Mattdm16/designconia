/**
 * Suite autónoma para el agregado curricular y su migración V2 → V3.
 * Uso: node lib/proyecto.test.ts
 */

import {
  migrarEstadoV2,
  esEstadoGuardadoV3,
  type AfirmacionCurricular,
  type EstadoGuardadoV2,
  type ProyectoCurricular
} from "./proyecto.ts";
import { esEstadoGuardado, normalizarMicrocurriculo, POR_DEFINIR, type Microcurriculo } from "./schema.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function igual(actual: unknown, esperado: unknown, mensaje: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  assert(a === e, `${mensaje}\nEsperado: ${e}\nRecibido: ${a}`);
}

function crearMicro(programa = "Ingeniería de Software"): Microcurriculo {
  const micro = normalizarMicrocurriculo({
    folio: "DCN-LEGADO-17",
    ident: {
      asignatura: "Fundamentos de Software",
      codigo: "ISW-101",
      programa,
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
          numero: 9,
          titulo: "Fundamentos",
          resultadosAprendizaje: ["Explica conceptos fundamentales"],
          temas: [{ nombre: "Conceptos", subtemas: ["Abstracción"] }]
        }
      ]
    },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: {
      obligatorias: [
        {
          autor: "Autora Ejemplo",
          titulo: "Diseño de software",
          dato: "Editorial de prueba",
          anio: "2024",
          edicion: "1.ª",
          isbn: "",
          confirmada: false
        }
      ],
      complementarias: [],
      recursos: []
    }
  });
  micro.ident.programa = programa;
  micro.bibliografia.obligatorias[0].confirmada = true;
  return micro;
}

function crearV2(micro: Microcurriculo | null): EstadoGuardadoV2 {
  return {
    version: 2,
    microcurriculo: micro,
    mensajes: [
      { id: "u-1", role: "usuario", texto: "Quiero continuar el diseño.", incompleto: false },
      { id: "a-1", role: "asistente", texto: "Cuéntame sobre el programa." }
    ],
    sugerencias: ["Seguir con objetivos", "Revisar la ficha"],
    intencion: "crear",
    seccionActiva: "justificacion",
    crudo: '{"mensaje":"respuesta del contrato V2","borrador":{}}'
  };
}

function solo<T>(lista: T[], mensaje: string): T {
  assert(lista.length === 1, `${mensaje}: se esperaba 1 elemento y llegaron ${lista.length}`);
  return lista[0];
}

prueba("migración con micro preserva exactamente la ficha y confirmaciones", () => {
  const micro = crearMicro();
  const v2 = crearV2(micro);
  const copiaAntes = JSON.stringify(v2);
  const migrado = migrarEstadoV2(v2);
  assert(migrado !== null, "la migración con micro debe producir V3");
  const asignatura = solo(migrado.proyecto.asignaturas, "asignaturas migradas");
  igual(asignatura.microcurriculo, micro, "la ficha se conserva sin normalizar ni perder campos");
  assert(asignatura.microcurriculo.bibliografia.obligatorias[0].confirmada, "la confirmación bibliográfica se conserva");
  igual(v2.microcurriculo, micro, "la entrada original no se modifica");
  assert(JSON.stringify(v2) === copiaAntes, "el objeto V2 no debe mutar durante la migración");
  assert(migrado.proyecto.marcos.length === 0, "no se debe inventar un marco institucional");
  assert(migrado.proyecto.fuentesCurriculares.length === 0, "no se deben inventar fuentes curriculares");
});

prueba("programa legado solo usa el texto del campo programa y queda pendiente", () => {
  const micro = crearMicro("  Ingeniería de Software  ");
  const migrado = migrarEstadoV2(crearV2(micro));
  assert(migrado !== null, "la migración debe ser válida");
  const programa = solo(migrado.proyecto.programas, "programas legados");
  const asignatura = solo(migrado.proyecto.asignaturas, "asignaturas legadas");
  assert(programa.nombre === "Ingeniería de Software", "el nombre legado debe recortarse para el stub");
  assert(programa.estado === "pendiente_legado", "el programa inferido debe marcarse pendiente de revisión");
  assert(!("codigo" in programa), "no se debe inventar un código de programa");
  assert(programa.perfilIngreso.length === 0, "no se debe inferir el perfil de ingreso");
  assert(programa.perfilEgreso.length === 0, "no se debe inferir el perfil de egreso");
  assert(programa.resultadosPrograma.length === 0, "no se deben inventar resultados del programa");
  assert(asignatura.programaId === programa.id, "la asignatura debe vincularse al stub legado");
  assert(asignatura.microcurriculo.ident.programa === "  Ingeniería de Software  ", "el texto original de Micro no se altera");
  assert(migrado.seleccion.modulo === "micro" && migrado.seleccion.documentoId === asignatura.id, "se selecciona el Micro migrado");
});

prueba("programa vacío o por definir no genera un stub", () => {
  for (const programa of ["", "   ", POR_DEFINIR]) {
    const micro = crearMicro(programa);
    const migrado = migrarEstadoV2(crearV2(micro));
    assert(migrado !== null, `la migración debe aceptar programa ${JSON.stringify(programa)}`);
    assert(migrado.proyecto.programas.length === 0, "no se debe crear un programa sin nombre real");
    assert(migrado.proyecto.asignaturas[0].programaId === null, "la asignatura queda independiente");
    assert(migrado.proyecto.asignaturas[0].microcurriculo.ident.programa === programa, "se preserva el valor original");
  }
});

prueba("sin micro conserva la conversación y no fabrica asignatura", () => {
  const v2 = crearV2(null);
  const migrado = migrarEstadoV2(v2);
  assert(migrado !== null, "la conversación sin ficha también migra");
  assert(migrado.proyecto.asignaturas.length === 0, "no se crea una asignatura ficticia");
  assert(migrado.proyecto.programas.length === 0, "no se crea un programa ficticio");
  assert(migrado.proyecto.marcos.length === 0, "no se crea un marco ficticio");
  assert(migrado.seleccion.modulo === "inicio" && migrado.seleccion.documentoId === null, "se mantiene en inicio");
  const conversacion = migrado.conversaciones.inicio;
  assert(conversacion !== undefined, "se conserva el scope de inicio");
  igual(conversacion.mensajes, v2.mensajes, "se conservan todos los mensajes");
  igual(conversacion.sugerencias, v2.sugerencias, "se conservan las sugerencias");
  assert(conversacion.intencion === v2.intencion, "se conserva la intención");
  assert(conversacion.seccionActiva === null, "el scope inicio no debe conservar foco de sección de un módulo");
  assert(conversacion.crudoLegado === v2.crudo, "se conserva la respuesta cruda V2");
  assert(conversacion.crudo === "", "el contexto activo V3 inicia vacío");
});

prueba("la conversación migrada conserva campos y separa el crudo legado del activo", () => {
  const v2 = crearV2(crearMicro());
  const migrado = migrarEstadoV2(v2);
  assert(migrado !== null, "la migración debe producir V3");
  const asignatura = solo(migrado.proyecto.asignaturas, "asignaturas");
  const scope = `micro:${asignatura.id}`;
  const conversacion = migrado.conversaciones[scope];
  assert(conversacion !== undefined, "la conversación se ubica en el scope de la asignatura");
  igual(conversacion.mensajes, v2.mensajes, "se preservan los mensajes completos");
  igual(conversacion.sugerencias, v2.sugerencias, "se preservan las sugerencias originales");
  assert(conversacion.intencion === v2.intencion, "se preserva la intención");
  assert(conversacion.seccionActiva === v2.seccionActiva, "se preserva la sección activa");
  assert(conversacion.crudoLegado === v2.crudo, "el JSON V2 queda solo como crudo legado");
  assert(conversacion.crudo === "", "el asistente V3 no recibe el JSON antiguo");
});

prueba("normaliza mensajes permisivos de V2 y filtra sugerencias inválidas", () => {
  const v2 = crearV2(crearMicro()) as unknown as Record<string, unknown>;
  v2.mensajes = [
    { role: "usuario", texto: "Sin id" },
    { id: "asistente-2", role: "asistente", texto: "Incompleto inválido", incompleto: "sí" },
    { id: "asistente-3", role: "asistente", texto: "Incompleto válido", incompleto: true }
  ];
  v2.sugerencias = ["Conservar", 42, null, "También conservar"];
  assert(esEstadoGuardado(v2), "el fixture debe ser aceptado por la guarda V2 actual");

  const migrado = migrarEstadoV2(v2);
  assert(migrado !== null, "el V2 permisivo debe migrar en vez de descartarse");
  const asignatura = solo(migrado.proyecto.asignaturas, "asignatura");
  const conversacion = migrado.conversaciones[`micro:${asignatura.id}`];
  assert(conversacion !== undefined, "scope Micro debe conservar la conversación");
  assert(conversacion.mensajes.length === 3, "se deben preservar mensajes con texto y rol válidos");
  assert(Boolean(conversacion.mensajes[0].id), "un mensaje sin id recibe id determinista");
  const repetido = migrarEstadoV2(v2);
  assert(
    repetido?.conversaciones[`micro:${asignatura.id}`].mensajes[0].id === conversacion.mensajes[0].id,
    "el id generado debe repetirse para la misma entrada V2"
  );
  assert(conversacion.mensajes[0].texto === "Sin id" && conversacion.mensajes[0].role === "usuario", "texto y rol se preservan");
  assert(!("incompleto" in conversacion.mensajes[1]), "incompleto inválido se descarta");
  assert(conversacion.mensajes[2].incompleto === true, "incompleto booleano se preserva");
  igual(conversacion.sugerencias, ["Conservar", "También conservar"], "solo quedan sugerencias de texto");
});

prueba("V3 permite conversaciones independientes por scope", () => {
  const migrated = migrarEstadoV2(crearV2(crearMicro()));
  assert(migrated !== null, "la base V3 debe estar disponible");
  const asignatura = solo(migrated.proyecto.asignaturas, "asignatura");
  const scopeMicro = `micro:${asignatura.id}`;
  const conversacionMicro = migrated.conversaciones[scopeMicro];
  assert(conversacionMicro !== undefined, "la conversación Micro debe existir");

  migrated.conversaciones["macro:sin-documento"] = {
    scopeId: "macro:sin-documento",
    modulo: "macro",
    documentoId: null,
    mensajes: [{ id: "macro-u1", role: "usuario", texto: "Revisemos el marco." }],
    sugerencias: [],
    intencion: "entender",
    seccionActiva: null,
    crudo: ""
  };
  assert(esEstadoGuardadoV3(migrated), "dos conversaciones de módulos distintos deben ser válidas");
  assert(
    migrated.conversaciones[scopeMicro].mensajes.length === 2,
    "la conversación Macro no debe sobrescribir los mensajes de Micro"
  );
  assert(migrated.conversaciones["macro:sin-documento"].mensajes.length === 1, "el scope Macro conserva su propio hilo");
});

prueba("rechaza scopes cuyo módulo, clave o documento no coinciden", () => {
  const crearValido = () => migrarEstadoV2(crearV2(crearMicro()));

  const claveCruzada = crearValido();
  assert(claveCruzada !== null, "estado base válido");
  const idAsignatura = claveCruzada.proyecto.asignaturas[0].id;
  const claveMicro = `micro:${idAsignatura}`;
  claveCruzada.conversaciones[claveMicro].scopeId = `meso:${idAsignatura}`;
  assert(!esEstadoGuardadoV3(claveCruzada), "scopeId debe corresponder a la clave del registro");

  const moduloCruzado = crearValido();
  assert(moduloCruzado !== null, "estado base válido");
  const asignaturaId = moduloCruzado.proyecto.asignaturas[0].id;
  const claveMeso = `meso:${asignaturaId}`;
  const conversacion = moduloCruzado.conversaciones[`micro:${asignaturaId}`];
  delete moduloCruzado.conversaciones[`micro:${asignaturaId}`];
  conversacion.scopeId = claveMeso;
  conversacion.modulo = "meso";
  conversacion.documentoId = asignaturaId;
  moduloCruzado.conversaciones[claveMeso] = conversacion;
  assert(!esEstadoGuardadoV3(moduloCruzado), "un documento Micro no puede usarse como documento Meso");

  const documentoCruzado = crearValido();
  assert(documentoCruzado !== null, "estado base válido");
  const original = `micro:${documentoCruzado.proyecto.asignaturas[0].id}`;
  const otroId = "micro:no-existe";
  const conversacionMicro = documentoCruzado.conversaciones[original];
  delete documentoCruzado.conversaciones[original];
  conversacionMicro.scopeId = otroId;
  conversacionMicro.documentoId = "no-existe";
  documentoCruzado.conversaciones[otroId] = conversacionMicro;
  assert(!esEstadoGuardadoV3(documentoCruzado), "scope con ID de documento inexistente se rechaza");
});

prueba("IDs por folio son estables ante cambios de chat, contenido y orden JSON", () => {
  const v2 = crearV2(crearMicro());
  const primera = migrarEstadoV2(v2);
  assert(primera !== null, "la migración debe producir V3");
  const idProyecto = primera.proyecto.id;
  const idAsignatura = primera.proyecto.asignaturas[0].id;

  const editado = JSON.parse(JSON.stringify(v2)) as EstadoGuardadoV2;
  editado.mensajes[0].texto = "Otra conversación";
  editado.sugerencias = ["Cambió el chat"];
  editado.crudo = "otra respuesta antigua";
  if (editado.microcurriculo) editado.microcurriculo.justificacion = "Justificación actualizada.";
  const migradoEditado = migrarEstadoV2(editado);
  assert(migradoEditado !== null, "el V2 editado debe migrar");
  assert(migradoEditado.proyecto.id === idProyecto, "el id del proyecto depende del folio, no del chat o contenido");
  assert(migradoEditado.proyecto.asignaturas[0].id === idAsignatura, "el id de asignatura depende del slot legado/folio");

  const reordenado = JSON.parse(JSON.stringify(v2)) as EstadoGuardadoV2;
  const micro = reordenado.microcurriculo as unknown as Record<string, unknown>;
  const ident = micro.ident as Record<string, unknown>;
  micro.ident = Object.fromEntries(Object.entries(ident).reverse());
  const microRevertido = Object.fromEntries(Object.entries(micro).reverse());
  reordenado.microcurriculo = microRevertido as unknown as Microcurriculo;
  const migradoReordenado = migrarEstadoV2(reordenado);
  assert(migradoReordenado !== null, "el objeto con sus propiedades reordenadas debe migrar");
  assert(migradoReordenado.proyecto.id === idProyecto, "el orden JSON no debe alterar el id de proyecto");
  assert(migradoReordenado.proyecto.asignaturas[0].id === idAsignatura, "el orden JSON no debe alterar el id de asignatura");

  const folioVacioA = crearV2(crearMicro());
  const folioVacioB = crearV2(crearMicro());
  folioVacioA.microcurriculo!.folio = "";
  folioVacioB.microcurriculo!.folio = "";
  folioVacioB.mensajes[0].texto = "Diferente conversación";
  folioVacioB.microcurriculo!.justificacion = "Contenido diferente.";
  const migradoSinFolioA = migrarEstadoV2(folioVacioA);
  const migradoSinFolioB = migrarEstadoV2(folioVacioB);
  assert(migradoSinFolioA !== null && migradoSinFolioB !== null, "ambos singleton legados deben migrar");
  assert(migradoSinFolioA.proyecto.id === migradoSinFolioB.proyecto.id, "folio vacío usa el id singleton legado fijo");
  assert(
    migradoSinFolioA.proyecto.asignaturas[0].id === migradoSinFolioB.proyecto.asignaturas[0].id,
    "asignatura sin folio usa el slot singleton fijo"
  );
});

prueba("la migración V2→V3 es idempotente", () => {
  const v2 = crearV2(crearMicro());
  const primera = migrarEstadoV2(v2);
  const segunda = migrarEstadoV2(v2);
  assert(primera !== null && segunda !== null, "ambas llamadas deben migrar");
  igual(segunda, primera, "la misma entrada debe producir exactamente el mismo estado");
  const reentrada = migrarEstadoV2(primera);
  assert(reentrada !== null, "una segunda pasada sobre V3 válido debe aceptarse");
  igual(reentrada, primera, "migrar V3 de nuevo no duplica documentos ni conversaciones");
});

prueba("valida fuentes, citas, vínculos y alineación Macro → resultado Meso", () => {
  const migrated = migrarEstadoV2(crearV2(crearMicro()));
  assert(migrated !== null, "la base V3 debe estar disponible");
  const proyecto: ProyectoCurricular = migrated.proyecto;
  const programa = solo(proyecto.programas, "stub de programa");
  const asignatura = solo(proyecto.asignaturas, "asignatura");
  const fuenteId = "fuente-institucional-1";
  const marcoId = "marco-institucional-1";
  const principioId = "principio-marco-1";
  const resultadoId = "resultado-programa-1";

  proyecto.fuentesCurriculares.push({ id: fuenteId, titulo: "Modelo educativo", tipo: "modelo_educativo" });
  programa.resultadosPrograma.push({
    id: resultadoId,
    texto: "Analiza problemas de software.",
    origen: "docente",
    estado: "confirmado_por_docente",
    citas: []
  });
  proyecto.marcos.push({
    id: marcoId,
    nombre: "Marco institucional de prueba",
    version: "2026",
    vigencia: { desde: "2026-01-01", hasta: null },
    estado: "vigente",
    principios: [
      {
        id: principioId,
        texto: "Promover aprendizaje situado.",
        origen: "documento",
        estado: "contrastado_con_fuente",
        citas: [{ fuenteId, pagina: 12, seccion: "Principios pedagógicos" }]
      }
    ],
    afirmaciones: []
  });
  proyecto.vinculosProgramaMarco.push({
    id: "vinculo-programa-marco-1",
    programaId: programa.id,
    marcoId,
    vigencia: null,
    estado: "activo",
    principal: true
  });
  proyecto.alineaciones.push({
    id: "alineacion-principio-resultado-1",
    origen: { tipo: "principio_marco", id: principioId },
    destino: { tipo: "resultado_programa", id: resultadoId },
    estado: "propuesto",
    justificacion: "Revisar su aplicación en el programa."
  });
  assert(asignatura.programaId === programa.id, "la asignatura tiene relación válida al programa");
  assert(esEstadoGuardadoV3(migrated), "el estado curricular consistente debe ser válido");

  const alineacion = proyecto.alineaciones[0];
  alineacion.destino = { tipo: "resultado_programa", id: "no-existe" };
  assert(!esEstadoGuardadoV3(migrated), "un resultado destino inexistente debe rechazarse");

  alineacion.destino = { tipo: "principio_marco", id: principioId };
  alineacion.origen = { tipo: "resultado_programa", id: resultadoId };
  assert(!esEstadoGuardadoV3(migrated), "la dirección inversa Meso→Macro no se admite");

  (alineacion as unknown as { origen: unknown }).origen = { tipo: "asignatura", id: asignatura.id };
  alineacion.destino = { tipo: "resultado_programa", id: resultadoId };
  assert(!esEstadoGuardadoV3(migrated), "un nodo de asignatura no es un extremo de alineación en esta fase");
});

prueba("origen documento y estado contrastado requieren cita curricular", () => {
  const migrated = migrarEstadoV2(crearV2(crearMicro()));
  assert(migrated !== null, "la base V3 debe estar disponible");
  const proyecto: ProyectoCurricular = migrated.proyecto;
  const fuenteId = "fuente-citable";
  proyecto.fuentesCurriculares.push({ id: fuenteId, titulo: "Modelo educativo", tipo: "modelo_educativo" });
  const principio: AfirmacionCurricular = {
    id: "principio-citable",
    texto: "Promover aprendizaje situado.",
    origen: "documento",
    estado: "confirmado_por_docente",
    citas: []
  };
  proyecto.marcos.push({
    id: "marco-citable",
    nombre: "Marco con afirmación documentada",
    version: "1",
    vigencia: null,
    estado: "borrador",
    principios: [principio],
    afirmaciones: []
  });
  assert(!esEstadoGuardadoV3(migrated), "origen=documento no puede carecer de cita");

  principio.citas = [{ fuenteId, localizador: "apartado 3.2" }];
  assert(esEstadoGuardadoV3(migrated), "una cita a fuente curricular con localizador hace válida la afirmación");

  principio.origen = "docente";
  principio.estado = "contrastado_con_fuente";
  principio.citas = [];
  assert(!esEstadoGuardadoV3(migrated), "estado contrastado_con_fuente también exige cita");
});

prueba("rechaza dos marcos principales activos para el mismo programa", () => {
  const migrated = migrarEstadoV2(crearV2(crearMicro()));
  assert(migrated !== null, "la base V3 debe estar disponible");
  const programa = solo(migrated.proyecto.programas, "programa");
  migrated.proyecto.marcos.push(
    {
      id: "marco-a",
      nombre: "Marco A",
      version: "1",
      vigencia: null,
      estado: "vigente",
      principios: [],
      afirmaciones: []
    },
    {
      id: "marco-b",
      nombre: "Marco B",
      version: "2",
      vigencia: null,
      estado: "vigente",
      principios: [],
      afirmaciones: []
    }
  );
  migrated.proyecto.vinculosProgramaMarco.push(
    {
      id: "vinculo-a",
      programaId: programa.id,
      marcoId: "marco-a",
      vigencia: null,
      estado: "activo",
      principal: true
    },
    {
      id: "vinculo-b",
      programaId: programa.id,
      marcoId: "marco-b",
      vigencia: null,
      estado: "activo",
      principal: true
    }
  );
  assert(!esEstadoGuardadoV3(migrated), "un programa no puede tener dos marcos principales activos");
});

prueba("rechaza datos corruptos y versiones desconocidas sin mutar la entrada", () => {
  const desconocido = { version: 99, proyecto: {} };
  assert(migrarEstadoV2(desconocido) === null, "una versión desconocida da null");

  const corrupto = crearV2(null) as unknown as Record<string, unknown>;
  delete corrupto.sugerencias;
  const copia = JSON.stringify(corrupto);
  assert(migrarEstadoV2(corrupto) === null, "un V2 incompleto da null");
  assert(JSON.stringify(corrupto) === copia, "validar datos corruptos no muta la entrada");

  const microCorrupto = crearV2(crearMicro()) as unknown as Record<string, unknown>;
  microCorrupto.microcurriculo = { folio: "sin-estructura" };
  assert(migrarEstadoV2(microCorrupto) === null, "un Micro corrupto debe rechazarse");

  const corruptoV3 = {
    version: 3,
    proyecto: { id: "p", nombre: "P", marcos: [], programas: [], asignaturas: [], fuentesCurriculares: [], vinculosProgramaMarco: [], alineaciones: [] },
    seleccion: { modulo: "inicio", documentoId: null },
    conversaciones: { inicio: { scopeId: "otro", modulo: "inicio", documentoId: null } }
  };
  assert(migrarEstadoV2(corruptoV3) === null, "un estado V3 corrupto da null");
});

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