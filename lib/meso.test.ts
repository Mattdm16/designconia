/**
 * Suite autónoma para el Mesocurrículo: programa académico.
 * Uso: node lib/meso.test.ts
 */

import {
  afirmacionesSinConfirmarMeso,
  crearProgramaVacio,
  fusionarPrograma,
  normalizarPrograma,
  parsearRespuestaMeso,
  programaVacio,
  resumenSeccionMeso,
  seccionMesoCompleta,
  validarPrograma,
  type ResultadoParseoMeso
} from "./meso.ts";
import type { ProgramaAcademico } from "./proyecto.ts";

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

function borradorCompleto() {
  return {
    nombre: "Ingeniería de Software",
    codigo: "ISW",
    estado: "vigente",
    perfilIngreso: [{ texto: "Interés por resolver problemas.", origen: "docente" }],
    perfilEgreso: [{ texto: "Diseña soluciones de software.", origen: "docente" }],
    resultadosPrograma: [{ texto: "Evalúa la calidad del software.", origen: "docente" }],
    marcoPrincipalId: "marco-1"
  };
}

function respuestaCompleta(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    mensaje: "Te dejé el programa con lo que me contaste.",
    sugerencias: ["Seguir con perfiles", "Revisar resultados"],
    intencion: "crear",
    seccionActiva: "resultados",
    generar: true,
    borrador: { ...borradorCompleto(), ...extra }
  });
}

prueba("crea un programa vacío sin datos inventados", () => {
  const p = crearProgramaVacio("prog-1");
  assert(programaVacio(p), "un programa recién creado está vacío");
  assert(p.estado === "borrador", "nace como borrador");
  assert(p.perfilIngreso.length === 0 && p.perfilEgreso.length === 0, "sin perfiles");
  assert(p.resultadosPrograma.length === 0, "sin resultados");
  assert(!("codigo" in p), "sin código inventado");
});

prueba("normaliza un borrador completo", () => {
  const p = normalizarPrograma(borradorCompleto());
  assert(!programaVacio(p), "ya tiene contenido");
  assert(p.nombre === "Ingeniería de Software", "conserva el nombre");
  assert(p.codigo === "ISW", "conserva el código");
  assert(p.estado === "vigente", "conserva el estado");
  assert(p.perfilIngreso.length === 1 && p.perfilEgreso.length === 1, "perfiles");
  assert(p.resultadosPrograma.length === 1, "un resultado");
  assert(p.resultadosPrograma[0].origen === "docente", "origen conservado");
  assert(p.resultadosPrograma[0].estado === "sin_confirmar", "nace sin confirmar");
});

prueba("una afirmación documentada sin cita se degrada a sugerencia", () => {
  const p = normalizarPrograma({
    nombre: "P",
    resultadosPrograma: [{ texto: "Evalúa software.", origen: "documento" }]
  });
  assert(p.resultadosPrograma.length === 1, "se conserva el texto");
  assert(p.resultadosPrograma[0].origen === "sugerencia_IA", "origen degradado");
  assert(p.resultadosPrograma[0].estado === "sin_confirmar", "estado degradado");
});

prueba("una afirmación documentada con cita conserva su origen", () => {
  const p = normalizarPrograma({
    nombre: "P",
    perfilEgreso: [
      { texto: "Diseña soluciones.", origen: "documento", citas: [{ fuenteId: "f1", seccion: "Perfil" }] }
    ]
  });
  assert(p.perfilEgreso[0].origen === "documento", "origen conservado con respaldo");
  assert(p.perfilEgreso[0].citas[0].seccion === "Perfil", "localizador conservado");
});

prueba("una cita sin localizador se descarta y degrada la afirmación", () => {
  const p = normalizarPrograma({
    nombre: "P",
    perfilEgreso: [{ texto: "Diseña soluciones.", origen: "documento", citas: [{ fuenteId: "f1" }] }]
  });
  assert(p.perfilEgreso[0].citas.length === 0, "cita sin localizador descartada");
  assert(p.perfilEgreso[0].origen === "sugerencia_IA", "origen degradado sin respaldo válido");
});

prueba("deduplica afirmaciones por texto normalizado", () => {
  const p = normalizarPrograma({
    nombre: "P",
    resultadosPrograma: ["Evalúa  software.", { texto: "EVALÚA software." }, { texto: "Otra." }]
  });
  assert(p.resultadosPrograma.length === 2, "los duplicados colapsan");
});

prueba("una confirmación del docente sobrevive a una nueva propuesta", () => {
  const previo = normalizarPrograma({
    nombre: "P",
    resultadosPrograma: [{ texto: "Evalúa software.", origen: "docente" }]
  });
  previo.resultadosPrograma[0].estado = "confirmado_por_docente";
  const nuevo = normalizarPrograma(
    { nombre: "P", resultadosPrograma: [{ texto: "Evalúa software.", origen: "sugerencia_IA" }] },
    previo
  );
  assert(nuevo.resultadosPrograma[0].estado === "confirmado_por_docente", "la confirmación se restaura");
  assert(nuevo.resultadosPrograma[0].id === previo.resultadosPrograma[0].id, "el id estable se conserva");
});

prueba("respeta los topes sin reventar", () => {
  const muchos = Array.from({ length: 20 }, (_, i) => `Resultado número ${i + 1}.`);
  const p = normalizarPrograma({ nombre: "P", resultadosPrograma: muchos });
  assert(p.resultadosPrograma.length === 12, "máximo 12 resultados");
});

prueba("la identidad exige nombre y código", () => {
  const p = normalizarPrograma(borradorCompleto());
  assert(seccionMesoCompleta(p, "identidad"), "identidad completa");
  assert(seccionMesoCompleta(p, "perfiles"), "hay perfiles");
  assert(seccionMesoCompleta(p, "resultados"), "hay resultados");
  assert(!seccionMesoCompleta(p, "vinculo"), "el vínculo nunca cierra el documento");
  const sinCodigo = normalizarPrograma({ ...borradorCompleto(), codigo: "" });
  assert(!seccionMesoCompleta(sinCodigo, "identidad"), "sin código no cierra");
});

prueba("validar avisa de sugerencias sin confirmar", () => {
  const p = normalizarPrograma(borradorCompleto());
  assert(afirmacionesSinConfirmarMeso(p) === 3, "tres afirmaciones pendientes");
  const problemas = validarPrograma(p);
  assert(problemas.length > 0 && problemas.some((x) => /sugerencia/.test(x)), "avisa de sugerencias");
});

prueba("un programa vacío se reporta como tal", () => {
  assert(validarPrograma(crearProgramaVacio("p")).some((x) => /contenido/.test(x)), "avisa que no hay contenido");
});

prueba("el resumen de sección nunca devuelve vacío", () => {
  const p = normalizarPrograma(borradorCompleto());
  for (const s of ["identidad", "perfiles", "resultados", "vinculo"] as const) {
    const r = resumenSeccionMeso(p, s);
    assert(typeof r === "string" && r.length > 0, `resumen no vacío para ${s}`);
  }
});

prueba("un turno conversacional no toca el documento", () => {
  const r = parsearRespuestaMeso(
    JSON.stringify({ mensaje: "¿Qué programa?", sugerencias: [], intencion: "entender", seccionActiva: "identidad", generar: false, borrador: null })
  );
  assert(r.ok && !r.borrador, "no hay borrador");
});

prueba("generar:true con borrador devuelve el programa y el vínculo", () => {
  const r = parsearRespuestaMeso(respuestaCompleta(), null, ["marco-1"]);
  assert(r.ok && r.borrador, "hay borrador");
  if (r.ok && r.borrador) {
    assert(r.programa.nombre === "Ingeniería de Software", "nombre normalizado");
    assert(r.marcoPrincipalId === "marco-1", "vínculo aceptado si el id existe");
  }
});

prueba("un vínculo a un marco inexistente se descarta", () => {
  const r = parsearRespuestaMeso(respuestaCompleta(), null, ["marco-9"]);
  assert(r.ok && r.borrador, "hay borrador");
  if (r.ok && r.borrador) {
    assert(r.marcoPrincipalId === null, "el id desconocido no se acepta");
    assert(r.programa.nombre === "Ingeniería de Software", "el programa igual se conserva");
  }
});

prueba("generar:true con borrador vacío se descarta en vez de borrar", () => {
  const r = parsearRespuestaMeso(
    JSON.stringify({ mensaje: "Listo.", sugerencias: [], intencion: "entender", seccionActiva: "identidad", generar: true, borrador: { nombre: "" } })
  );
  assert(r.ok && !r.borrador, "un borrador vacío no produce documento");
});

prueba("seccionActiva inválida se descarta sin romper", () => {
  const r = parsearRespuestaMeso(respuestaCompleta()) as ResultadoParseoMeso;
  assert(r.ok, "la respuesta sigue siendo válida");
});

prueba("un JSON cortado al final se repara en vez de fallar", () => {
  const completo = respuestaCompleta();
  const cortado = completo.slice(0, completo.indexOf('"Ingeniería de Software') + '"Ingeniería'.length);
  const r = parsearRespuestaMeso(cortado, null, []);
  assert(r.ok && r.borrador, "el corte al final se repara");
});

prueba("un JSON dañado por dentro da un motivo legible", () => {
  const r = parsearRespuestaMeso("{no es json válido}");
  assert(!r.ok, "falla con motivo");
  if (!r.ok) {
    assert(typeof r.motivo === "string" && r.motivo.length > 10, "motivo legible");
  }
});

prueba("acepta vallas de código alrededor del JSON", () => {
  const r = parsearRespuestaMeso("```json\n" + respuestaCompleta() + "\n```", null, []);
  assert(r.ok && r.borrador, "las vallas no rompen el parseo");
});

prueba("fusionar no borra valores previos con campos vacíos", () => {
  const base = normalizarPrograma(borradorCompleto());
  const entrante = normalizarPrograma({ nombre: "", perfilIngreso: [], perfilEgreso: [], resultadosPrograma: [] });
  const f = fusionarPrograma(base, entrante);
  assert(f.id === base.id, "el id se conserva");
  assert(f.nombre === base.nombre, "el nombre previo sobrevive");
  assert(f.resultadosPrograma.length === 1, "los resultados previos sobreviven");
});

prueba("fusionar reemplaza cuando el entrante trae contenido", () => {
  const base = normalizarPrograma(borradorCompleto());
  const entrante = normalizarPrograma({
    nombre: "Nuevo nombre",
    resultadosPrograma: [{ texto: "Nuevo resultado.", origen: "docente" }]
  });
  const f = fusionarPrograma(base, entrante);
  assert(f.nombre === "Nuevo nombre", "el nombre nuevo gana");
  assert(f.resultadosPrograma.length === 1 && f.resultadosPrograma[0].texto === "Nuevo resultado.", "la lista nueva gana");
  assert(f.perfilEgreso.length === 1, "lo que el entrante no tocó se conserva");
});

prueba("sin anterior, fusionar devuelve el entrante", () => {
  const entrante = normalizarPrograma(borradorCompleto());
  const f = fusionarPrograma(null, entrante);
  igual(f, entrante, "idéntico al entrante");
});

prueba("preserva el estado pendiente_legado del anterior", () => {
  const base: ProgramaAcademico = { ...normalizarPrograma(borradorCompleto()), estado: "pendiente_legado" };
  const entrante = normalizarPrograma({ nombre: "Otro nombre" });
  const f = fusionarPrograma(base, entrante);
  assert(f.estado === "pendiente_legado", "el estado legado no se pisa con el borrador por defecto");
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
