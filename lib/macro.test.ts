/**
 * Suite autónoma para el Macrocurrículo: marco educativo institucional.
 * Uso: node lib/macro.test.ts
 */

import {
  afirmacionesSinConfirmar,
  crearMarcoVacio,
  fusionarMarco,
  idAfirmacion,
  marcoVacio,
  normalizarFuentes,
  normalizarMarco,
  parsearRespuestaMacro,
  resumenSeccionMacro,
  seccionMacroCompleta,
  validarMarco,
  type ResultadoParseoMacro
} from "./macro.ts";
import type { MarcoEducativoInstitucional } from "./proyecto.ts";

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

/* ---------------------------------------------------------------- */
/* Fixtures                                                          */
/* ---------------------------------------------------------------- */

function borradorCompleto() {
  return {
    nombre: "Modelo educativo institucional",
    emisor: "Universidad de prueba",
    version: "2026",
    vigencia: { desde: "2026-01-01", hasta: null },
    estado: "vigente",
    principios: [
      { texto: "El aprendizaje es un proceso activo y situado.", origen: "docente" },
      { texto: "La docencia se ejerce con responsabilidad.", origen: "docente" }
    ],
    orientaciones: [{ texto: "Cada programa declara su perfil de egreso.", origen: "docente" }],
    fuentes: [
      { titulo: "Modelo educativo 2026", tipo: "modelo_educativo", emisor: "Universidad de prueba" }
    ]
  };
}

function respuestaCompleta(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    mensaje: "Te dejé el marco con lo que me contaste.",
    sugerencias: ["Seguir con principios", "Revisar orientaciones"],
    intencion: "crear",
    seccionActiva: "principios",
    generar: true,
    borrador: { ...borradorCompleto(), ...extra }
  });
}

/* ---------------------------------------------------------------- */
/* Marco vacío y normalización                                       */
/* ---------------------------------------------------------------- */

prueba("crea un marco vacío sin datos inventados", () => {
  const m = crearMarcoVacio("marco-1");
  assert(marcoVacio(m), "un marco recién creado está vacío");
  assert(m.estado === "borrador", "nace como borrador");
  assert(m.principios.length === 0 && m.afirmaciones.length === 0, "sin afirmaciones");
  assert(!("emisor" in m), "sin emisor inventado");
});

prueba("normaliza un borrador completo", () => {
  const m = normalizarMarco(borradorCompleto());
  assert(!marcoVacio(m), "ya tiene contenido");
  assert(m.nombre === "Modelo educativo institucional", "conserva el nombre");
  assert(m.emisor === "Universidad de prueba", "conserva el emisor");
  assert(m.version === "2026", "conserva la versión");
  assert(m.estado === "vigente", "conserva el estado");
  assert(m.principios.length === 2, "dos principios");
  assert(m.afirmaciones.length === 1, "una orientación");
  assert(m.principios.every((a) => a.origen === "docente"), "origen docente conservado");
  assert(m.principios.every((a) => a.estado === "sin_confirmar"), "nace sin confirmar");
  assert(m.principios.every((a) => a.id && a.citas.length === 0), "id generado y sin citas");
  assert(m.principios[0].id !== m.principios[1].id, "ids distintos por texto");
  assert(!("fuentes" in m), "las fuentes no viven dentro del marco");
});

prueba("las fuentes se normalizan por separado para el proyecto", () => {
  const m = normalizarMarco({ nombre: "Marco", principios: [{ texto: "Aprender es activo." }] });
  assert(m.principios.length === 1, "el principio sí se conserva");
  const sinFuentes = normalizarFuentes(undefined);
  assert(sinFuentes.length === 0, "sin fuentes no se inventa ninguna");
  const conFuentes = normalizarFuentes(borradorCompleto().fuentes);
  assert(conFuentes.length === 1, "la fuente aportada se conserva");
  assert(conFuentes[0].titulo === "Modelo educativo 2026", "título intacto");
  assert(conFuentes[0].tipo === "modelo_educativo", "tipo válido intacto");
  const duplicadas = normalizarFuentes([borradorCompleto().fuentes[0], borradorCompleto().fuentes[0]]);
  assert(duplicadas.length === 1, "las fuentes duplicadas colapsan");
  const sinTitulo = normalizarFuentes([{ tipo: "lineamiento" }]);
  assert(sinTitulo.length === 0, "una fuente sin título se descarta");
});

prueba("una afirmación documentada sin cita se degrada a sugerencia", () => {
  const m = normalizarMarco({
    nombre: "Marco",
    principios: [{ texto: "Aprender es activo.", origen: "documento" }]
  });
  assert(m.principios.length === 1, "se conserva el texto");
  assert(m.principios[0].origen === "sugerencia_IA", "origen degradado a sugerencia");
  assert(m.principios[0].estado === "sin_confirmar", "estado degradado a sin confirmar");
});

prueba("una afirmación contrastada sin cita también se degrada", () => {
  const m = normalizarMarco({
    nombre: "Marco",
    orientaciones: [{ texto: "Declarar el perfil.", estado: "contrastado_con_fuente" }]
  });
  assert(m.afirmaciones.length === 1, "se conserva el texto");
  assert(m.afirmaciones[0].estado === "sin_confirmar", "no puede parecer contrastada sin respaldo");
});

prueba("una afirmación documentada con cita conserva su origen", () => {
  const m = normalizarMarco({
    nombre: "Marco",
    principios: [
      {
        texto: "Aprender es activo.",
        origen: "documento",
        citas: [{ fuenteId: "f1", seccion: "Principios" }]
      }
    ]
  });
  assert(m.principios[0].origen === "documento", "origen conservado con respaldo");
  assert(m.principios[0].citas.length === 1, "cita conservada");
});

prueba("una cita sin localizador se descarta y degrada la afirmación", () => {
  const m = normalizarMarco({
    nombre: "Marco",
    principios: [{ texto: "Aprender es activo.", origen: "documento", citas: [{ fuenteId: "f1" }] }]
  });
  assert(m.principios[0].citas.length === 0, "cita sin localizador descartada");
  assert(m.principios[0].origen === "sugerencia_IA", "origen degradado sin respaldo válido");
});

prueba("deduplica afirmaciones por texto normalizado", () => {
  const m = normalizarMarco({
    nombre: "Marco",
    principios: [
      "Aprender  es   activo.",
      { texto: "APRENDER es activo.", origen: "docente" },
      { texto: "Otra cosa.", origen: "docente" }
    ]
  });
  assert(m.principios.length === 2, "los duplicados colapsan en uno");
});

prueba("una confirmación del docente sobrevive a una nueva propuesta", () => {
  const previo = normalizarMarco({
    nombre: "Marco",
    principios: [{ texto: "Aprender es activo.", origen: "docente" }]
  });
  previo.principios[0].estado = "confirmado_por_docente";
  const nuevo = normalizarMarco(
    {
      nombre: "Marco",
      principios: [{ texto: "Aprender es activo.", origen: "sugerencia_IA" }]
    },
    previo
  );
  assert(nuevo.principios[0].estado === "confirmado_por_docente", "la confirmación se restaura");
  assert(nuevo.principios[0].id === previo.principios[0].id, "el id estable se conserva");
});

prueba("los ids derivan del texto y no del orden", () => {
  assert(idAfirmacion("principio", "Aprender es activo") === idAfirmacion("principio", "aprender  ES activo"), "mismo texto, mismo id");
  assert(idAfirmacion("principio", "Uno") !== idAfirmacion("principio", "Dos"), "textos distintos, ids distintos");
  assert(idAfirmacion("principio", "X") !== idAfirmacion("orientacion", "X"), "el prefijo distingue el rol");
});

prueba("respeta los topes sin reventar", () => {
  const muchos = Array.from({ length: 20 }, (_, i) => `Principio número ${i + 1}.`);
  const m = normalizarMarco({ nombre: "Marco", principios: muchos });
  assert(m.principios.length === 12, "máximo 12 principios");
});

/* ---------------------------------------------------------------- */
/* Estado por sección y validación                                   */
/* ---------------------------------------------------------------- */

prueba("la identidad exige nombre, versión y emisor", () => {
  const m = normalizarMarco(borradorCompleto());
  assert(seccionMacroCompleta(m, "identidad"), "identidad completa");
  assert(seccionMacroCompleta(m, "principios"), "hay principios");
  assert(seccionMacroCompleta(m, "orientaciones"), "hay orientaciones");
  assert(!seccionMacroCompleta(m, "fuentes"), "las fuentes nunca cierran el documento");
  const sinVersion = normalizarMarco({ ...borradorCompleto(), version: "" });
  assert(!seccionMacroCompleta(sinVersion, "identidad"), "sin versión no cierra");
});

prueba("validar avisa de sugerencias sin confirmar", () => {
  const m = normalizarMarco(borradorCompleto());
  assert(afirmacionesSinConfirmar(m) === 3, "tres afirmaciones pendientes");
  const problemas = validarMarco(m);
  assert(problemas.length > 0, "avisa cuando hay sugerencias sin confirmar");
  assert(problemas.some((p) => /sugerencia/.test(p)), "el aviso habla de sugerencias");
});

prueba("un marco vacío se reporta como tal", () => {
  const m = crearMarcoVacio("m");
  assert(validarMarco(m).some((p) => /vacío|contenido/.test(p)), "avisa que no hay contenido");
});

prueba("el resumen de sección nunca devuelve vacío", () => {
  const m = normalizarMarco(borradorCompleto());
  for (const s of ["identidad", "principios", "orientaciones", "fuentes"] as const) {
    const r = resumenSeccionMacro(m, s);
    assert(typeof r === "string" && r.length > 0, `resumen no vacío para ${s}`);
  }
  const vacio = resumenSeccionMacro(crearMarcoVacio("m"), "principios");
  assert(vacio === "Sin principios", "estado vacío legible");
});

/* ---------------------------------------------------------------- */
/* Parseo de la respuesta                                            */
/* ---------------------------------------------------------------- */

prueba("un turno conversacional no toca el documento", () => {
  const r = parsearRespuestaMacro(
    JSON.stringify({
      mensaje: "¿Qué marco querés trabajar?",
      sugerencias: ["El modelo educativo"],
      intencion: "entender",
      seccionActiva: "identidad",
      generar: false,
      borrador: null
    })
  ) as ResultadoParseoMacro;
  assert(r.ok && !r.borrador, "no hay borrador");
  if (r.ok && !r.borrador) {
    assert(r.seccionActiva === "identidad", "sección válida");
  }
});

prueba("generar:true con borrador devuelve el marco", () => {
  const r = parsearRespuestaMacro(respuestaCompleta());
  assert(r.ok && r.borrador, "hay borrador");
  if (r.ok && r.borrador) {
    assert(r.marco.nombre === "Modelo educativo institucional", "nombre normalizado");
    assert(r.marco.principios.length === 2, "principios normalizados");
    assert(r.fuentes.length === 1, "la fuente aportada viaja separada del marco");
    assert(r.seccionActiva === "principios", "sección activa válida");
  }
});

prueba("generar:true con borrador vacío se descarta en vez de borrar", () => {
  const r = parsearRespuestaMacro(
    JSON.stringify({
      mensaje: "Listo.",
      sugerencias: [],
      intencion: "entender",
      seccionActiva: "principios",
      generar: true,
      borrador: { nombre: "", principios: [], orientaciones: [] }
    })
  );
  assert(r.ok && !r.borrador, "un borrador vacío no produce documento");
});

prueba("seccionActiva inválida se descarta sin romper", () => {
  const r = parsearRespuestaMacro(respuestaCompleta({})) as ResultadoParseoMacro;
  assert(r.ok, "la respuesta sigue siendo válida");
});

prueba("un JSON cortado al final se repara en vez de fallar", () => {
  const completo = respuestaCompleta();
  const cortado = completo.slice(0, completo.indexOf('"Modelo educativo') + '"Modelo'.length);
  const r = parsearRespuestaMacro(cortado);
  assert(r.ok && r.borrador, "el corte al final se repara");
  if (r.ok && r.borrador) {
    assert(r.marco.nombre.startsWith("Modelo"), "el nombre parcial se conserva");
  }
});

prueba("un JSON dañado por dentro da un motivo legible", () => {
  const r = parsearRespuestaMacro("{no es json válido}");
  assert(!r.ok, "falla con motivo");
  if (!r.ok) {
    assert(typeof r.motivo === "string" && r.motivo.length > 10, "motivo legible");
  }
});

prueba("una respuesta vacía se distingue", () => {
  const r = parsearRespuestaMacro("   ");
  assert(!r.ok && /vacía/.test((r as { motivo: string }).motivo), "avisa de respuesta vacía");
});

prueba("acepta vallas de código alrededor del JSON", () => {
  const r = parsearRespuestaMacro("```json\n" + respuestaCompleta() + "\n```");
  assert(r.ok && r.borrador, "las vallas no rompen el parseo");
});

/* ---------------------------------------------------------------- */
/* Fusión                                                            */
/* ---------------------------------------------------------------- */

prueba("fusionar no borra valores previos con campos vacíos", () => {
  const base = normalizarMarco(borradorCompleto());
  const entrante = normalizarMarco({ nombre: "", principios: [], orientaciones: [] });
  const f = fusionarMarco(base, entrante);
  assert(f.id === base.id, "el id se conserva");
  assert(f.nombre === base.nombre, "el nombre previo sobrevive");
  assert(f.principios.length === 2, "los principios previos sobreviven");
});

prueba("fusionar reemplaza cuando el entrante trae contenido", () => {
  const base = normalizarMarco(borradorCompleto());
  const entrante = normalizarMarco({
    nombre: "Nuevo nombre del marco",
    principios: [{ texto: "Principio nuevo.", origen: "docente" }]
  });
  const f = fusionarMarco(base, entrante);
  assert(f.nombre === "Nuevo nombre del marco", "el nombre nuevo gana");
  assert(f.principios.length === 1 && f.principios[0].texto === "Principio nuevo.", "la lista nueva gana");
  assert(f.afirmaciones.length === 1, "lo que el entrante no tocó se conserva");
});

prueba("sin anterior, fusionar devuelve el entrante", () => {
  const entrante = normalizarMarco(borradorCompleto());
  const f = fusionarMarco(null, entrante);
  igual(f, entrante, "idéntico al entrante");
});

prueba("las listas vacías del docente no se confunden con ausencia", () => {
  const base: MarcoEducativoInstitucional = {
    ...normalizarMarco(borradorCompleto()),
    afirmaciones: []
  };
  const entrante = normalizarMarco({ nombre: "Marco", orientaciones: [{ texto: "Nueva.", origen: "docente" }] });
  const f = fusionarMarco(base, entrante);
  assert(f.afirmaciones.length === 1, "la orientación nueva entra");
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
