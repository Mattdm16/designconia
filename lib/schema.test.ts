/**
 * Runner de pruebas sin dependencias ni subprocesos.
 *
 * ¿Por qué no `node --test`? El runner de Node lanza cada archivo en un
 * subproceso con stdio por tubería, y en este entorno ese patrón está
 * bloqueado (EPERM). Un runner en proceso propio evita el problema y no
 * añade ninguna dependencia.
 *
 * Uso:  npm test
 */

import assert from "node:assert/strict";

import { textoLegible, normalizarClave } from "./errores.ts";
import { microcurriculoATexto } from "./exportarTexto.ts";
import { aWinAnsi, envolver, textoAPdf } from "./exportarPdf.ts";
import {
  extraerMensajeParcial,
  parsearRespuesta,
  normalizarMicrocurriculo,
  validarMicrocurriculo,
  mergeMicrocurriculo,
  ajustarCortesA100,
  totalPorcentaje,
  seccionCompleta,
  seccionesCompletas,
  primeraIncompleta,
  resumenSeccion,
  referenciasSinConfirmar,
  esEstadoGuardado,
  migrarEstadoV1,
  horasPorTipo,
  horasTotales,
  sesionesDeUnidad,
  unidadesDeSecuencia,
  unidadesConSesiones,
  GRUPO_SIN_UNIDAD,
  recursosSinUso,
  usosDeRecurso,
  mismaHerramienta,
  herramientasNoDeclaradas,
  cargaHorariaCuadra,
  unidadesSinResultados,
  unidadesSinSesiones,
  actividadesSinInstrumento,
  repararJSON,
  microcurriculoVacio,
  microcurriculoVacioEstructura,
  lista,
  numero,
  booleano,
  POR_DEFINIR,
  SIN_PRERREQUISITOS,
  SALUDO_APERTURA,
  SUGERENCIAS_APERTURA
} from "./schema.ts";

/* ---------------------------------------------------------------- */
/* Mini framework                                                    */
/* ---------------------------------------------------------------- */

type Caso = { nombre: string; fn: () => void };

const grupos: { titulo: string; casos: Caso[] }[] = [];
let grupoActual: { titulo: string; casos: Caso[] } | null = null;

function grupo(titulo: string) {
  grupoActual = { titulo, casos: [] };
  grupos.push(grupoActual);
}

function prueba(nombre: string, fn: () => void) {
  if (!grupoActual) {
    grupoActual = { titulo: "general", casos: [] };
    grupos.push(grupoActual);
  }
  grupoActual.casos.push({ nombre, fn });
}

/* ---------------------------------------------------------------- */
/* extraerMensajeParcial — el texto del chat mientras llega el JSON  */
/* ---------------------------------------------------------------- */

grupo("extraerMensajeParcial");

prueba("extrae el mensaje completo", () => {
  assert.equal(
    extraerMensajeParcial('{"mensaje":"Listo, armé la justificación.","generar":false}'),
    "Listo, armé la justificación."
  );
});

prueba("devuelve vacío mientras la clave todavía no aparece", () => {
  for (const pista of ["", '{"fich', '{"mensaje"', '{"mensaje":', "{}"]) {
    assert.equal(extraerMensajeParcial(pista), "", `falló con ${JSON.stringify(pista)}`);
  }
});

prueba("el mismo prefijo crece de forma monótona (simula chunks)", () => {
  const completo = '{"mensaje":"Agregué la unidad 3 con sus temas y resultados.","borrador":{}}';
  let anterior = "";
  for (let i = 1; i <= completo.length; i++) {
    const parcial = extraerMensajeParcial(completo.slice(0, i));
    assert.ok(
      parcial.startsWith(anterior),
      `retrocedió en el carácter ${i}: ${JSON.stringify(anterior)} -> ${JSON.stringify(parcial)}`
    );
    anterior = parcial;
  }
  assert.equal(anterior, "Agregué la unidad 3 con sus temas y resultados.");
});

prueba("no se rompe si el chunk corta una secuencia de escape", () => {
  const completo = '{"mensaje":"Línea 1\\nLínea 2 con \\"comillas\\"","borrador":{}}';
  for (let i = 1; i <= completo.length; i++) {
    const parcial = extraerMensajeParcial(completo.slice(0, i));
    assert.ok(!parcial.includes("\\"), `escape crudo en el carácter ${i}: ${JSON.stringify(parcial)}`);
    assert.ok(!parcial.includes("\uFFFD"), `carácter de reemplazo en el carácter ${i}`);
  }
  assert.equal(extraerMensajeParcial(completo), 'Línea 1\nLínea 2 con "comillas"');
});

prueba("decodifica secuencias unicode", () => {
  assert.equal(extraerMensajeParcial('{"mensaje":"Caf\\u00e9 listo"'), "Café listo");
});

/* ---------------------------------------------------------------- */
/* Respuestas                                                       */
/* ---------------------------------------------------------------- */

const MICRO_COMPLETO = {
  mensaje: "Listo, ya tengo la justificación y los objetivos.",
  sugerencias: ["Ahora los contenidos", "Prefiero empezar por la metodología"],
  intencion: "crear",
  seccionActiva: "contenido",
  generar: true,
  borrador: {
    ident: {
      asignatura: "Fundamentos de Software",
      codigo: "ISW-201",
      programa: "Ingeniería de Software",
      creditos: 4,
      horas: { teoricas: 32, practicas: 32, independientes: 64 },
      prerrequisitos: ["Introducción a la Programación"],
      semestre: "Tercer semestre"
    },
    justificacion:
      "La asignatura introduce los procesos del ciclo de vida del software y su impacto en la calidad del producto final.",
    objetivos: {
      generales: ["Diseñar soluciones de software aplicando modelos de proceso"],
      especificas: [
        "Distinguir los modelos de ciclo de vida",
        "Seleccionar el modelo adecuado al problema"
      ]
    },
    contenido: {
      unidades: [
        {
          numero: 1,
          titulo: "Ciclo de vida del software",
          resultadosAprendizaje: ["Distingue modelos de ciclo de vida"],
          temas: [{ nombre: "Modelos tradicionales", subtemas: ["Cascada", "Espiral"] }]
        }
      ]
    },
    secuencia: {
      sesiones: [
        {
          numero: 1,
          unidad: 1,
          tema: "Modelos de ciclo de vida",
          duracionMin: 90,
          tipo: "teorica",
          inicio: [{ docente: "Presenta el caso", estudiante: "Plantea hipótesis", recursos: ["Pizarra"] }],
          desarrollo: [
            { docente: "Guía la comparación", estudiante: "Compara modelos", recursos: ["Estudio de caso"] }
          ],
          cierre: [{ docente: "Sintetiza", estudiante: "Ticket de salida", recursos: ["GitHub"] }]
        }
      ]
    },
    metodologia: {
      estrategias: [{ nombre: "Estudio de caso", descripcion: "Análisis de un proyecto real" }]
    },
    evaluacion: {
      cortes: [
        {
          nombre: "Primer corte",
          porcentaje: 30,
          actividades: [
            {
              nombre: "Parcial",
              descripcion: "Escrito",
              instrumento: "Rúbrica analítica",
              herramientas: ["GitHub"],
              mide: "Distingue modelos de ciclo de vida"
            }
          ]
        },
        { nombre: "Segundo corte", porcentaje: 30, actividades: [] },
        { nombre: "Examen final", porcentaje: 40, actividades: [] }
      ]
    },
    bibliografia: {
      obligatorias: [{ autor: "Sommerville", titulo: "Ingeniería del software", dato: "Pearson" }],
      complementarias: [],
      recursos: ["GitHub"]
    }
  }
};

const RESPUESTA_CONVERSACION = {
  mensaje: "¿Qué asignatura es y para qué la querés?",
  sugerencias: ["Fundamentos de Software, tercer semestre"],
  intencion: "entender",
  seccionActiva: "justificacion",
  generar: false,
  borrador: null
};

grupo("parsearRespuesta");

prueba("con borrador: normaliza y devuelve la ficha", () => {
  const r = parsearRespuesta(JSON.stringify(MICRO_COMPLETO));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.borrador, true);
  if (!r.borrador) return;
  assert.equal(r.mensaje, "Listo, ya tengo la justificación y los objetivos.");
  assert.equal(r.microcurriculo.ident.asignatura, "Fundamentos de Software");
  assert.equal(r.microcurriculo.ident.horas.teoricas, 32);
  assert.equal(r.microcurriculo.contenido.unidades.length, 1);
  assert.equal(r.microcurriculo.evaluacion.cortes.length, 3);
  assert.equal(r.seccionActiva, "contenido");
  assert.equal(r.intencion, "crear");
  assert.deepEqual(r.sugerencias, ["Ahora los contenidos", "Prefiero empezar por la metodología"]);
});

prueba("con borrador nulo NO produce ficha", () => {
  const r = parsearRespuesta(JSON.stringify(RESPUESTA_CONVERSACION));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.borrador, false);
  assert.equal("microcurriculo" in r, false, "no debe existir un microcurrículo vacío que borre el anterior");
  assert.equal(r.seccionActiva, "justificacion");
});

prueba("generar:false gana aunque venga un borrador completo", () => {
  const r = parsearRespuesta(JSON.stringify({ ...MICRO_COMPLETO, generar: false }));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.borrador, false);
});

prueba("generar:true con borrador VACÍO se descarta en vez de borrar", () => {
  const vacio = parsearRespuesta(JSON.stringify({ mensaje: "Acá está.", generar: true, borrador: {} }));
  assert.equal(vacio.ok, true);
  if (!vacio.ok) return;
  assert.equal(vacio.borrador, false, "un borrador sin contenido no puede reemplazar la ficha");
});

prueba("seccionActiva inválida se descarta", () => {
  const r = parsearRespuesta(JSON.stringify({ mensaje: "x", seccionActiva: "inventada" }));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.seccionActiva, null);
});

prueba("acepta vallas de código y preámbulo", () => {
  assert.equal(parsearRespuesta("```json\n" + JSON.stringify(MICRO_COMPLETO) + "\n```").ok, true);
  assert.equal(parsearRespuesta("Aquí va:\n\n" + JSON.stringify(MICRO_COMPLETO)).ok, true);
});

prueba("un JSON cortado al final se repara en vez de fallar", () => {
  const completo = JSON.stringify(MICRO_COMPLETO);
  // Corte determinista justo antes de "objetivos": queda una cadena abierta,
  // una coma colgante y llaves sin cerrar. Cortar a la mitad es frágil porque
  // cualquier cambio de longitud mueve el punto de corte.
  const corte = completo.indexOf('"objetivos"');
  assert.ok(corte > 0, "el punto de corte existe en la fixture");
  const r = parsearRespuesta(completo.slice(0, corte));
  assert.equal(r.ok, true, "el reparador debe cerrar lo que quedó abierto");
});

prueba("tolera basura DESPUÉS del objeto", () => {
  // aislarObjeto se queda con el primer objeto balanceado, así que un cierre
  // de más al final no es daño interno.
  const r = parsearRespuesta('{"mensaje":"a"}}');
  assert.equal(r.ok, true);
});

prueba("un JSON dañado por dentro NO se repara", () => {
  // Corchete mal cerrado: la estructura está rota, no solo incompleta.
  const r = parsearRespuesta('{"mensaje":"a","b":]');
  assert.equal(r.ok, false);
});

grupo("repararJSON");

prueba("cierra llaves y corchetes que faltan", () => {
  const roto = '{"a":1,"b":[1,2';
  const r = repararJSON(roto);
  assert.ok(r);
  assert.deepEqual(JSON.parse(r), { a: 1, b: [1, 2] });
});

prueba("cierra una cadena abierta", () => {
  const roto = '{"mensaje":"hola mundo';
  const r = repararJSON(roto);
  assert.ok(r);
  assert.equal(JSON.parse(r).mensaje, "hola mundo");
});

prueba("quita la coma colgante antes de cerrar", () => {
  const roto = '{"a":1,"b":2,';
  const r = repararJSON(roto);
  assert.ok(r);
  assert.deepEqual(JSON.parse(r), { a: 1, b: 2 });
});

prueba("no toca un JSON válido", () => {
  const bueno = '{"a":1}';
  assert.equal(repararJSON(bueno), bueno);
});

prueba("devuelve null si el daño es interno", () => {
  assert.equal(repararJSON('{"a":1}}'), null);
  assert.equal(repararJSON("]}"), null);
  assert.equal(repararJSON(""), null);
  assert.equal(repararJSON("no soy json"), null);
});

prueba("no se confunde con llaves dentro de cadenas", () => {
  const roto = '{"mensaje":"un { y un ] sueltos","b":[1';
  const r = repararJSON(roto);
  assert.ok(r);
  const j = JSON.parse(r);
  assert.equal(j.mensaje, "un { y un ] sueltos");
  assert.deepEqual(j.b, [1]);
});

prueba("finish_reason length nombra la causa real", () => {
  const r = parsearRespuesta('{"mensaje":"Voy","generar":true,"borrador":{"ident"', { fin: "length" });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.motivo, /presupuesto de tokens/);
  assert.match(r.motivo, /length/);
});

prueba("una respuesta vacía no revienta y distingue el caso", () => {
  assert.equal(parsearRespuesta("").ok, false);
  const conError = parsearRespuesta("", { error: "Authentication Fails" });
  assert.equal(conError.ok, false);
  if (conError.ok) return;
  assert.match(conError.motivo, /Authentication Fails/);
});

/* ---------------------------------------------------------------- */
/* Normalización                                                     */
/* ---------------------------------------------------------------- */

grupo("normalizarMicrocurriculo");

prueba("los campos ausentes no quedan undefined", () => {
  const m = normalizarMicrocurriculo({});
  assert.equal(m.ident.asignatura, POR_DEFINIR);
  assert.equal(m.ident.codigo, POR_DEFINIR);
  assert.equal(m.ident.creditos, 0);
  assert.deepEqual(m.ident.prerrequisitos, []);
  assert.deepEqual(m.contenido.unidades, []);
  assert.deepEqual(m.evaluacion.cortes, []);
  assert.equal(m.bibliografia.obligatorias.length, 0);
});

prueba("las unidades se renumeran siempre", () => {
  const m = normalizarMicrocurriculo({
    contenido: {
      unidades: [
        { numero: 7, titulo: "Primera", temas: [{ nombre: "T1" }] },
        { numero: 3, titulo: "Segunda", temas: [{ nombre: "T2" }] }
      ]
    }
  });
  assert.equal(m.contenido.unidades[0].numero, 1);
  assert.equal(m.contenido.unidades[1].numero, 2);
});

prueba("se descartan unidades sin título, temas ni resultados", () => {
  const m = normalizarMicrocurriculo({
    contenido: { unidades: [{}, { titulo: "Válida", temas: [] }, null] }
  });
  assert.equal(m.contenido.unidades.length, 1);
  assert.equal(m.contenido.unidades[0].titulo, "Válida");
});

prueba("respeta los topes declarados", () => {
  const m = normalizarMicrocurriculo({
    contenido: {
      unidades: Array.from({ length: 40 }, (_, i) => ({ titulo: `U${i}`, temas: [{ nombre: "t" }] }))
    },
    evaluacion: { cortes: Array.from({ length: 20 }, (_, i) => ({ nombre: `C${i}`, porcentaje: 5 })) },
    objetivos: { generales: Array.from({ length: 50 }, (_, i) => `o${i}`) }
  });
  assert.equal(m.contenido.unidades.length, 8);
  assert.equal(m.evaluacion.cortes.length, 5);
  assert.equal(m.objetivos.generales.length, 12);
});

prueba("la basura de tipos no contamina el microcurrículo", () => {
  const m = normalizarMicrocurriculo({
    ident: { creditos: "4 créditos", horas: { teoricas: "treinta", practicas: 16 }, semestre: 3 },
    objetivos: { generales: "un objetivo suelto" },
    evaluacion: { cortes: [{ nombre: "Parcial", porcentaje: "40%" }] }
  });
  assert.equal(m.ident.creditos, 4);
  assert.equal(m.ident.horas.teoricas, 0);
  assert.equal(m.ident.horas.practicas, 16);
  assert.equal(m.ident.semestre, "3");
  assert.deepEqual(m.objetivos.generales, ["un objetivo suelto"]);
  assert.equal(m.evaluacion.cortes[0].porcentaje, 40);
});

prueba("las referencias del modelo nacen como sugerencia", () => {
  const m = normalizarMicrocurriculo({
    bibliografia: {
      obligatorias: [{ autor: "Autor", titulo: "Libro", dato: "2020", confirmada: true }],
      complementarias: ["Artículo suelto"]
    }
  });
  assert.equal(m.bibliografia.obligatorias[0].confirmada, false, "el modelo no puede confirmar por el docente");
  assert.equal(m.bibliografia.complementarias[0].titulo, "Artículo suelto");
  assert.equal(m.bibliografia.complementarias[0].confirmada, false);
});

prueba("un microcurrículo vacío se reconoce", () => {
  assert.equal(microcurriculoVacio(normalizarMicrocurriculo({})), true);
  assert.equal(microcurriculoVacio(microcurriculoVacioEstructura()), true);
  assert.equal(microcurriculoVacio(normalizarMicrocurriculo({ ident: { asignatura: "Álgebra" } })), false);
});

/* ---------------------------------------------------------------- */
/* Porcentajes                                                       */
/* ---------------------------------------------------------------- */

grupo("porcentajes");

prueba("totalPorcentaje suma y tolera vacío", () => {
  assert.equal(
    totalPorcentaje([
      { nombre: "a", porcentaje: 30, actividades: [] },
      { nombre: "b", porcentaje: 40, actividades: [] }
    ]),
    70
  );
  assert.equal(totalPorcentaje([]), 0);
});

prueba("ajustarCortesA100 deja exactamente 100", () => {
  const cortes = [
    { nombre: "a", porcentaje: 30, actividades: [] },
    { nombre: "b", porcentaje: 30, actividades: [] },
    { nombre: "c", porcentaje: 40, actividades: [] }
  ];
  assert.equal(totalPorcentaje(ajustarCortesA100(cortes)), 100);
});

prueba("ajustarCortesA100 reparte proporcionalmente", () => {
  const cortes = [
    { nombre: "a", porcentaje: 1, actividades: [] },
    { nombre: "b", porcentaje: 2, actividades: [] }
  ];
  const r = ajustarCortesA100(cortes);
  assert.equal(totalPorcentaje(r), 100);
  assert.ok(Math.abs(r[0].porcentaje - 33) <= 1, `esperaba ~33, vino ${r[0].porcentaje}`);
  assert.ok(Math.abs(r[1].porcentaje - 67) <= 1, `esperaba ~67, vino ${r[1].porcentaje}`);
});

prueba("con todos en cero reparte parejo y cuadra", () => {
  const cortes = [
    { nombre: "a", porcentaje: 0, actividades: [] },
    { nombre: "b", porcentaje: 0, actividades: [] },
    { nombre: "c", porcentaje: 0, actividades: [] }
  ];
  assert.equal(totalPorcentaje(ajustarCortesA100(cortes)), 100);
});

prueba("nunca deja sumas de 99 o 101 con cortes raros", () => {
  for (const pesos of [
    [1, 1, 1],
    [7, 7, 7],
    [33, 33, 33],
    [0, 0, 1],
    [99, 1]
  ]) {
    const cortes = pesos.map((p, i) => ({ nombre: `c${i}`, porcentaje: p, actividades: [] }));
    assert.equal(totalPorcentaje(ajustarCortesA100(cortes)), 100, `falló con ${pesos.join(",")}`);
  }
});

prueba("sin cortes no inventa nada", () => {
  assert.deepEqual(ajustarCortesA100([]), []);
});

/* ---------------------------------------------------------------- */
/* Estado por sección                                                */
/* ---------------------------------------------------------------- */

grupo("secciones");

prueba("el microcurrículo completo reporta 8/8", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(seccionesCompletas(m), 8);
  assert.equal(primeraIncompleta(m), null);
});

prueba("un microcurrículo vacío reporta 0/8 y apunta a la justificación", () => {
  const m = normalizarMicrocurriculo({});
  assert.equal(seccionesCompletas(m), 0);
  assert.equal(primeraIncompleta(m), "justificacion");
});

prueba("la evaluación no está completa si no suma 100", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    evaluacion: { cortes: [{ nombre: "Único", porcentaje: 80, actividades: [] }] }
  });
  assert.equal(seccionCompleta(m, "evaluacion"), false);
  const ajustado = { ...m, evaluacion: { cortes: ajustarCortesA100(m.evaluacion.cortes) } };
  assert.equal(seccionCompleta(ajustado, "evaluacion"), true);
});

prueba("la identificación exige código, créditos, horas, semestre y prerrequisitos", () => {
  const base = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(seccionCompleta(base, "ident"), true);

  const sinCodigo = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    ident: { ...MICRO_COMPLETO.borrador.ident, codigo: POR_DEFINIR }
  });
  assert.equal(seccionCompleta(sinCodigo, "ident"), false);

  const sinCreditos = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    ident: { ...MICRO_COMPLETO.borrador.ident, creditos: 0 }
  });
  assert.equal(seccionCompleta(sinCreditos, "ident"), false);
});

prueba("«Sin prerrequisitos» cuenta como declarado", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    ident: { ...MICRO_COMPLETO.borrador.ident, prerrequisitos: [SIN_PRERREQUISITOS] }
  });
  assert.equal(seccionCompleta(m, "ident"), true);
});

prueba("referenciasSinConfirmar cuenta solo las sugerencias", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(referenciasSinConfirmar(m), 1);
  m.bibliografia.obligatorias[0].confirmada = true;
  assert.equal(referenciasSinConfirmar(m), 0);
});

prueba("resumenSeccion nunca devuelve undefined ni vacío", () => {
  const m = normalizarMicrocurriculo({
    evaluacion: { cortes: [{ nombre: "C1", porcentaje: 100 }] }
  });
  const ids = [
    "justificacion",
    "objetivos",
    "contenido",
    "metodologia",
    "evaluacion",
    "ident",
    "bibliografia"
  ] as const;
  for (const id of ids) {
    const r = resumenSeccion(m, id);
    assert.equal(typeof r, "string", `resumen de ${id}`);
    assert.ok(r.length > 0, `resumen vacío de ${id}`);
  }
});

/* ---------------------------------------------------------------- */
/* Fusión                                                            */
/* ---------------------------------------------------------------- */

grupo("mergeMicrocurriculo");

prueba("conserva folio y no borra secciones previas", () => {
  const anterior = normalizarMicrocurriculo({ ...MICRO_COMPLETO.borrador, folio: "MC-2026-1111" });
  const nueva = normalizarMicrocurriculo({ ident: { codigo: "ISW-999" } });
  const fusionado = mergeMicrocurriculo(anterior, nueva);

  assert.equal(fusionado.folio, "MC-2026-1111");
  assert.equal(fusionado.ident.codigo, "ISW-999", "lo nuevo sí entra");
  assert.equal(fusionado.ident.asignatura, "Fundamentos de Software", "lo previo no se pierde");
  assert.equal(fusionado.contenido.unidades.length, 1);
  assert.equal(fusionado.evaluacion.cortes.length, 3);
});

prueba("restaura las confirmaciones de bibliografía del docente", () => {
  const anterior = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  anterior.bibliografia.obligatorias[0].confirmada = true;

  const nueva = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(nueva.bibliografia.obligatorias[0].confirmada, false);

  const fusionado = mergeMicrocurriculo(anterior, nueva);
  assert.equal(fusionado.bibliografia.obligatorias[0].confirmada, true, "la confirmación debe sobrevivir");
});

prueba("sin microcurrículo anterior devuelve el nuevo", () => {
  const nueva = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(mergeMicrocurriculo(null, nueva).ident.asignatura, "Fundamentos de Software");
});

prueba("un [por definir] entrante no borra un valor real", () => {
  const anterior = normalizarMicrocurriculo({ ident: { asignatura: "Álgebra" } });
  const nueva = normalizarMicrocurriculo({ ident: { asignatura: POR_DEFINIR } });
  assert.equal(mergeMicrocurriculo(anterior, nueva).ident.asignatura, "Álgebra");
});

prueba("los porcentajes que trae el modelo se respetan aunque no sumen 100", () => {
  const anterior = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  const nueva = normalizarMicrocurriculo({ evaluacion: { cortes: [{ nombre: "Solo", porcentaje: 60 }] } });
  const fusionado = mergeMicrocurriculo(anterior, nueva);
  // El desbalance lo señala la ficha y lo corrige el docente, no el merge.
  assert.equal(totalPorcentaje(fusionado.evaluacion.cortes), 60);
});

/* ---------------------------------------------------------------- */
/* Validación                                                        */
/* ---------------------------------------------------------------- */

grupo("validarMicrocurriculo");

prueba("un microcurrículo completo no reporta problemas", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.deepEqual(validarMicrocurriculo(m), []);
});

prueba("avisa cuando los porcentajes no suman 100", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    evaluacion: { cortes: [{ nombre: "x", porcentaje: 70 }] }
  });
  const problemas = validarMicrocurriculo(m);
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /70%/);
});

prueba("avisa cuando la respuesta no trae nada", () => {
  assert.equal(validarMicrocurriculo(normalizarMicrocurriculo({})).length, 1);
});

/* ---------------------------------------------------------------- */
/* Persistencia                                                      */
/* ---------------------------------------------------------------- */

grupo("esEstadoGuardado");

const GUARDADO = {
  version: 2,
  microcurriculo: null,
  mensajes: [{ id: "u1", role: "usuario", texto: "hola" }],
  sugerencias: ["una"],
  intencion: "entender",
  seccionActiva: "justificacion",
  crudo: '{"mensaje":"hola"}'
};

prueba("acepta el estado conversacional sin microcurrículo", () => {
  assert.equal(esEstadoGuardado(GUARDADO), true);
});

prueba("acepta un estado con microcurrículo real", () => {
  assert.equal(
    esEstadoGuardado({ ...GUARDADO, microcurriculo: normalizarMicrocurriculo(MICRO_COMPLETO.borrador) }),
    true
  );
});

prueba("rechaza basura y campos ausentes", () => {
  assert.equal(esEstadoGuardado(null), false);
  assert.equal(esEstadoGuardado({}), false);
  assert.equal(esEstadoGuardado({ ...GUARDADO, mensajes: "no soy array" }), false);
  assert.equal(esEstadoGuardado({ ...GUARDADO, sugerencias: null }), false);
  assert.equal(esEstadoGuardado({ ...GUARDADO, intencion: "inventada" }), false);
  assert.equal(esEstadoGuardado({ ...GUARDADO, microcurriculo: { ident: {} } }), false);
  assert.equal(esEstadoGuardado({ ...GUARDADO, seccionActiva: "nada" }), false);
});

prueba("rechaza un estado con una referencia corrupta (crash de render)", () => {
  // Regresión: un elemento null en bibliografía hacía explotar la sección al
  // leer r.confirmada. El guardia debe descartar ese estado antes de pintarlo.
  const roto = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  (roto.bibliografia.obligatorias as unknown[])[0] = null;
  assert.equal(esEstadoGuardado({ ...GUARDADO, microcurriculo: roto }), false);
});

prueba("rechaza un estado con una unidad corrupta", () => {
  const roto = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  (roto.contenido.unidades as unknown[])[0] = { titulo: "sin temas" };
  assert.equal(esEstadoGuardado({ ...GUARDADO, microcurriculo: roto }), false);
});

prueba("rechaza una referencia sin el campo confirmada", () => {
  const roto = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  delete (roto.bibliografia.obligatorias[0] as Partial<typeof roto.bibliografia.obligatorias[number]>).confirmada;
  assert.equal(esEstadoGuardado({ ...GUARDADO, microcurriculo: roto }), false);
});

/* ---------------------------------------------------------------- */
/* Apertura del flujo                                                */
/* ---------------------------------------------------------------- */

grupo("apertura");

prueba("el saludo NO pide datos ni propone enfoques", () => {
  assert.match(SALUDO_APERTURA, /qué querés hacer hoy/i);
  for (const prohibido of ["asignatura", "tema", "créditos", "semestre", "unidad", "rúbrica"]) {
    assert.ok(!SALUDO_APERTURA.toLowerCase().includes(prohibido), `el saludo no debe pedir "${prohibido}"`);
  }
});

prueba("las sugerencias semilla hablan de microcurrículo y no prometen de más", () => {
  assert.ok(SUGERENCIAS_APERTURA.length >= 2 && SUGERENCIAS_APERTURA.length <= 4);
  for (const s of SUGERENCIAS_APERTURA) {
    assert.ok(s.length > 8, `sugerencia demasiado corta: ${s}`);
    for (const verbo of ["editar", "exportar", "importar"]) {
      assert.ok(!s.toLowerCase().includes(verbo), `"${s}" promete ${verbo}, que no es el foco`);
    }
  }
});

/* ---------------------------------------------------------------- */
/* Coerciones y errores                                              */
/* ---------------------------------------------------------------- */

grupo("coerciones");

prueba("lista: descarta vacíos, recorta y acepta un string suelto", () => {
  assert.deepEqual(lista([" a ", "", null, "b"], 10), ["a", "b"]);
  assert.deepEqual(lista("solo", 10), ["solo"]);
  assert.deepEqual(lista(["a", "b", "c"], 2), ["a", "b"]);
  assert.deepEqual(lista([{ nombre: "x" }, { texto: "y" }], 10), ["x", "y"]);
  assert.deepEqual(lista(undefined, 10), []);
});

prueba("numero: acota, tolera texto y descarta basura", () => {
  assert.equal(numero(5, 0, 0, 10), 5);
  assert.equal(numero("12 h", 0, 0, 100), 12);
  assert.equal(numero(200, 0, 0, 60), 60);
  assert.equal(numero("abc", 7, 0, 60), 7);
  // Regresión: limpiar "tres" deja "" y Number("") es 0, que es finito.
  assert.equal(numero("tres", 7, 0, 60), 7);
  assert.equal(numero(null, 7, 0, 60), 7);
});

prueba("booleano: tolera texto", () => {
  assert.equal(booleano("sí"), true);
  assert.equal(booleano("no"), false);
  assert.equal(booleano(undefined, true), true);
});

grupo("textoLegible / normalizarClave");

prueba("acepta las dos formas de error y nunca devuelve un objeto", () => {
  assert.equal(textoLegible({ error: { message: "Authentication Fails" } }), "Authentication Fails");
  assert.equal(textoLegible({ error: { mensaje: "Falta la clave." } }), "Falta la clave.");
  for (const entrada of [{}, { error: {} }, null, 7]) {
    assert.equal(typeof textoLegible(entrada), "string");
  }
});

prueba("normaliza la clave pegada a mano", () => {
  assert.equal(normalizarClave("  sk-abc123  "), "sk-abc123");
  assert.equal(normalizarClave('"sk-abc123"'), "sk-abc123");
  assert.equal(normalizarClave("Bearer sk-abc123"), "sk-abc123");
  assert.equal(normalizarClave("   "), "");
});

/* ---------------------------------------------------------------- */
/* Secuencia didáctica                                               */
/* ---------------------------------------------------------------- */

grupo("secuencia didáctica");

prueba("normaliza sesiones, renumera y ordena por unidad", () => {
  const m = normalizarMicrocurriculo({
    secuencia: {
      sesiones: [
        { numero: 9, unidad: 2, tema: "Segunda unidad", duracionMin: 90, inicio: [{ docente: "a" }] },
        { numero: 1, unidad: 1, tema: "Primera unidad", duracionMin: 60, inicio: [{ docente: "b" }] }
      ]
    }
  });
  assert.equal(m.secuencia.sesiones.length, 2);
  assert.equal(m.secuencia.sesiones[0].numero, 1);
  assert.equal(m.secuencia.sesiones[0].tema, "Primera unidad");
});

prueba("el tipo de sesión se normaliza y cae en teórica por defecto", () => {
  const m = normalizarMicrocurriculo({
    secuencia: {
      sesiones: [
        { tema: "a", tipo: "práctica" },
        { tema: "b", tipo: "trabajo independiente" },
        { tema: "c" },
        { tema: "d", tipo: "otra cosa" }
      ]
    }
  });
  assert.equal(m.secuencia.sesiones[0].tipo, "practica");
  assert.equal(m.secuencia.sesiones[1].tipo, "independiente");
  assert.equal(m.secuencia.sesiones[2].tipo, "teorica");
  assert.equal(m.secuencia.sesiones[3].tipo, "teorica");
});

prueba("se descartan sesiones vacías", () => {
  const m = normalizarMicrocurriculo({ secuencia: { sesiones: [{}, null, { tema: "válida" }] } });
  assert.equal(m.secuencia.sesiones.length, 1);
});

prueba("respeta el tope de sesiones", () => {
  const m = normalizarMicrocurriculo({
    secuencia: { sesiones: Array.from({ length: 60 }, (_, i) => ({ tema: `s${i}` })) }
  });
  assert.equal(m.secuencia.sesiones.length, 24);
});

prueba("la fusión acumula sesiones por unidad y no borra las otras", () => {
  const anterior = normalizarMicrocurriculo({
    contenido: {
      unidades: [
        { titulo: "U1", temas: [{ nombre: "t" }] },
        { titulo: "U2", temas: [{ nombre: "t" }] }
      ]
    },
    secuencia: { sesiones: [{ unidad: 1, tema: "Sesión de U1" }] }
  });
  const nueva = normalizarMicrocurriculo({
    secuencia: { sesiones: [{ unidad: 2, tema: "Sesión de U2" }] }
  });
  const fusionado = mergeMicrocurriculo(anterior, nueva);
  assert.equal(fusionado.secuencia.sesiones.length, 2, "la sesión de U1 debe sobrevivir");
  assert.equal(fusionado.secuencia.sesiones[0].tema, "Sesión de U1");
  assert.equal(fusionado.secuencia.sesiones[1].tema, "Sesión de U2");
  assert.deepEqual(
    fusionado.secuencia.sesiones.map((s) => s.numero),
    [1, 2],
    "y quedar renumeradas"
  );
});

prueba("horasPorTipo suma por tipo de sesión", () => {
  const sesiones = normalizarMicrocurriculo({
    secuencia: {
      sesiones: [
        { tema: "a", tipo: "teorica", duracionMin: 120 },
        { tema: "b", tipo: "practica", duracionMin: 90 },
        { tema: "c", tipo: "independiente", duracionMin: 60 }
      ]
    }
  }).secuencia.sesiones;
  const h = horasPorTipo(sesiones);
  assert.equal(h.teoricas, 2);
  assert.equal(h.practicas, 1.5);
  assert.equal(h.independientes, 1);
});

prueba("la secuencia no cierra si una unidad con temas no tiene sesiones", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(seccionCompleta(m, "secuencia"), true);
  const sinSesiones = { ...m, secuencia: { sesiones: [] } };
  assert.equal(seccionCompleta(sinSesiones, "secuencia"), false);
  assert.equal(unidadesSinSesiones(sinSesiones), 1);
});

/* ---------------------------------------------------------------- */
/* Secuencia agrupada por unidad (vista de dos niveles)              */
/* ---------------------------------------------------------------- */

grupo("secuencia por unidad");

const MICRO_TRES_UNIDADES = () =>
  normalizarMicrocurriculo({
    contenido: {
      unidades: [
        { titulo: "Ciclo de vida", temas: [{ nombre: "t1" }] },
        { titulo: "Metodologías ágiles", temas: [{ nombre: "t2" }, { nombre: "t3" }] },
        { titulo: "Pruebas", temas: [] }
      ]
    },
    secuencia: {
      sesiones: [
        { unidad: 1, tema: "Sesión A", duracionMin: 90 },
        { unidad: 1, tema: "Sesión B", duracionMin: 90 },
        { unidad: 2, tema: "Sesión C", duracionMin: 120 }
      ]
    }
  });

prueba("sesionesDeUnidad filtra y conserva el orden", () => {
  const m = MICRO_TRES_UNIDADES();
  assert.deepEqual(
    sesionesDeUnidad(m, 1).map((s) => s.tema),
    ["Sesión A", "Sesión B"]
  );
  assert.deepEqual(
    sesionesDeUnidad(m, 2).map((s) => s.tema),
    ["Sesión C"]
  );
  assert.deepEqual(sesionesDeUnidad(m, 3), []);
});

prueba("horasTotales suma y redondea a un decimal", () => {
  const m = MICRO_TRES_UNIDADES();
  assert.equal(horasTotales(sesionesDeUnidad(m, 1)), 3);
  assert.equal(horasTotales(sesionesDeUnidad(m, 2)), 2);
  assert.equal(horasTotales([]), 0);
  assert.equal(horasTotales([{ ...m.secuencia.sesiones[0], duracionMin: 45 }]), 0.8);
});

prueba("unidadesDeSecuencia devuelve una entrada por unidad, tenga sesiones o no", () => {
  const grupos = unidadesDeSecuencia(MICRO_TRES_UNIDADES());
  assert.equal(grupos.length, 3);
  assert.deepEqual(
    grupos.map((g) => [g.numero, g.sesiones]),
    [
      [1, 2],
      [2, 1],
      [3, 0]
    ]
  );
  assert.equal(grupos[0].titulo, "Ciclo de vida");
  assert.equal(grupos[0].horas, 3);
  assert.equal(grupos[1].temas, 2);
  assert.equal(grupos[2].horas, 0, "una unidad sin sesiones suma cero, no undefined");
  assert.ok(grupos.every((g) => g.existe));
});

prueba("unidadesDeSecuencia agrupa las sesiones huérfanas en un grupo residual", () => {
  const m = normalizarMicrocurriculo({
    contenido: { unidades: [{ titulo: "Solo una", temas: [{ nombre: "t" }] }] },
    secuencia: { sesiones: [{ unidad: 1, tema: "ok" }, { unidad: 7, tema: "huérfana" }] }
  });
  const grupos = unidadesDeSecuencia(m);
  assert.equal(grupos.length, 2);
  const residual = grupos[1];
  assert.equal(residual.numero, GRUPO_SIN_UNIDAD);
  assert.equal(residual.sesiones, 1);
  assert.equal(residual.existe, false);
  assert.equal(residual.titulo, "Sesiones sin unidad");
});

prueba("unidadesDeSecuencia no pierde sesiones si no hay unidades cargadas", () => {
  const m = normalizarMicrocurriculo({
    secuencia: {
      sesiones: [
        { unidad: 2, tema: "dos", duracionMin: 60 },
        { unidad: 1, tema: "uno", duracionMin: 60 },
        { unidad: 1, tema: "uno bis", duracionMin: 30 }
      ]
    }
  });
  const grupos = unidadesDeSecuencia(m);
  assert.equal(grupos.length, 2, "se agrupa por el número que traen las sesiones");
  assert.deepEqual(
    grupos.map((g) => [g.numero, g.sesiones, g.existe]),
    [
      [1, 2, false],
      [2, 1, false]
    ]
  );
});

prueba("unidadesDeSecuencia no rompe con un curso vacío", () => {
  assert.deepEqual(unidadesDeSecuencia(normalizarMicrocurriculo({})), []);
});

prueba("unidadesConSesiones cuenta solo las que tienen al menos una", () => {
  const m = MICRO_TRES_UNIDADES();
  assert.equal(unidadesConSesiones(m), 2);
  assert.equal(unidadesConSesiones(normalizarMicrocurriculo({})), 0);
});

prueba("mover una sesión a otra unidad la reordena y renumera el documento", () => {
  const m = MICRO_TRES_UNIDADES();
  const movida = m.secuencia.sesiones.map((s) =>
    s.tema === "Sesión C" ? { ...s, unidad: 1 } : s
  );
  const renormalizado = normalizarMicrocurriculo({ ...m, secuencia: { sesiones: movida } });
  assert.deepEqual(
    renormalizado.secuencia.sesiones.map((s) => [s.unidad, s.tema, s.numero]),
    [
      [1, "Sesión A", 1],
      [1, "Sesión B", 2],
      [1, "Sesión C", 3]
    ]
  );
});

/* ---------------------------------------------------------------- */
/* Exigencias nuevas: RAs, instrumentos y alineación de recursos     */
/* ---------------------------------------------------------------- */

grupo("exigencias de calidad");

prueba("una unidad sin resultados de aprendizaje no cierra el contenido", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(seccionCompleta(m, "contenido"), true);
  const sinRa = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    contenido: { unidades: [{ titulo: "U1", resultadosAprendizaje: [], temas: [{ nombre: "t" }] }] }
  });
  assert.equal(seccionCompleta(sinRa, "contenido"), false);
  assert.equal(unidadesSinResultados(sinRa), 1);
});

prueba("una actividad sin instrumento no cierra la evaluación", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.equal(seccionCompleta(m, "evaluacion"), true);
  const sinInstrumento = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    evaluacion: {
      cortes: [{ nombre: "Único", porcentaje: 100, actividades: [{ nombre: "Taller" }] }]
    }
  });
  assert.equal(seccionCompleta(sinInstrumento, "evaluacion"), false);
  assert.equal(actividadesSinInstrumento(sinInstrumento), 1);
});

prueba("usosDeRecurso cuenta actividades y sesiones", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  assert.ok(usosDeRecurso(m, "GitHub") >= 2, "GitHub está en la actividad y en una sesión");
  assert.equal(usosDeRecurso(m, "Jira"), 0);
});

prueba("recursosSinUso detecta la herramienta que solo está listada", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    bibliografia: { ...MICRO_COMPLETO.borrador.bibliografia, recursos: ["GitHub", "Trello"] }
  });
  assert.deepEqual(recursosSinUso(m), ["Trello"]);
});

prueba("la misma herramienta coincide aunque cambie la redacción", () => {
  assert.equal(mismaHerramienta("GeoGebra", "GeoGebra (software de geometría)"), true);
  assert.equal(mismaHerramienta("Aula virtual", "Aula virtual institucional"), true);
  assert.equal(mismaHerramienta("Zotero", "Gestor Zotero"), true);
  assert.equal(mismaHerramienta("GeoGebra", "GraphOnline"), false);
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    evaluacion: {
      cortes: [
        {
          nombre: "Segundo corte",
          porcentaje: 100,
          actividades: [
            {
              nombre: "Trabajo de modelado con relaciones",
              instrumento: "Rúbrica analítica",
              herramientas: ["GeoGebra"]
            }
          ]
        }
      ]
    },
    bibliografia: {
      ...MICRO_COMPLETO.borrador.bibliografia,
      recursos: ["GeoGebra (software de geometría)", "Biblioteca digital"]
    }
  });
  assert.deepEqual(recursosSinUso(m), ["Biblioteca digital"]);
  assert.deepEqual(herramientasNoDeclaradas(m), []);
});

prueba("herramientasNoDeclaradas detecta lo exigido pero no listado", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    evaluacion: {
      cortes: [
        {
          nombre: "Segundo corte",
          porcentaje: 100,
          actividades: [
            { nombre: "Modelado", instrumento: "Rúbrica analítica", herramientas: ["GraphOnline"] }
          ]
        }
      ]
    }
  });
  assert.deepEqual(herramientasNoDeclaradas(m), ["GraphOnline"]);
});

prueba("cargaHorariaCuadra tolera el redondeo de sesiones de 45 min", () => {
  const dosDe90 = [
    { numero: 1, unidad: 1, tema: "A", duracionMin: 90, tipo: "teorica" },
    { numero: 2, unidad: 1, tema: "B", duracionMin: 90, tipo: "teorica" }
  ];
  const exacta = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    ident: { ...MICRO_COMPLETO.borrador.ident, horas: { teoricas: 3, practicas: 0, independientes: 0 } },
    secuencia: { sesiones: dosDe90 }
  });
  assert.equal(cargaHorariaCuadra(exacta), true);
  // Dos bloques de 45 min (90 min) frente a 2 h declaradas: el resto de
  // medio bloque no es un error.
  const restoMenor = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    ident: { ...MICRO_COMPLETO.borrador.ident, horas: { teoricas: 2, practicas: 0, independientes: 0 } },
    secuencia: {
      sesiones: [
        { numero: 1, unidad: 1, tema: "A", duracionMin: 45, tipo: "teorica" },
        { numero: 2, unidad: 1, tema: "B", duracionMin: 45, tipo: "teorica" }
      ]
    }
  });
  assert.equal(cargaHorariaCuadra(restoMenor), true);
  const desbalance = normalizarMicrocurriculo({ ...MICRO_COMPLETO.borrador });
  assert.equal(cargaHorariaCuadra(desbalance), false);
});

prueba("la evaluación exige instrumento y RA vinculado; la bibliografía exige recursos usados", () => {
  const sinRa = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    evaluacion: {
      cortes: [
        {
          nombre: "C",
          porcentaje: 100,
          actividades: [{ nombre: "Parcial", instrumento: "Rúbrica analítica" }]
        }
      ]
    }
  });
  assert.equal(seccionCompleta(sinRa, "evaluacion"), false);
  const conRecursoSinUso = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    bibliografia: { ...MICRO_COMPLETO.borrador.bibliografia, recursos: ["GitHub", "Zotero"] }
  });
  assert.equal(seccionCompleta(conRecursoSinUso, "bibliografia"), false);
  assert.ok(validarMicrocurriculo(conRecursoSinUso).some((p) => /Zotero/.test(p)));
});

prueba("validar avisa de RAs, sesiones e instrumentos faltantes", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    contenido: { unidades: [{ titulo: "U1", temas: [{ nombre: "t" }] }] },
    secuencia: { sesiones: [] },
    evaluacion: { cortes: [{ nombre: "C", porcentaje: 100, actividades: [{ nombre: "A" }] }] }
  });
  const problemas = validarMicrocurriculo(m);
  assert.ok(problemas.length > 0);
  assert.ok(problemas.some((p) => /resultados de aprendizaje/.test(p)));
  assert.ok(problemas.some((p) => /sesiones/.test(p)));
});

/* ---------------------------------------------------------------- */
/* Migración de la versión anterior                                  */
/* ---------------------------------------------------------------- */

grupo("migración v1 → v2");

prueba("migra un estado sin secuencia ni instrumentos", () => {
  const v1 = {
    version: 1,
    microcurriculo: {
      folio: "MC-2026-0001",
      ident: {
        asignatura: "Álgebra",
        codigo: "MAT-101",
        programa: "Ingeniería",
        creditos: 3,
        horas: { teoricas: 32, practicas: 16, independientes: 32 },
        prerrequisitos: [],
        semestre: "Primero"
      },
      justificacion: "Una justificación suficientemente larga para pasar el mínimo exigido.",
      objetivos: { generales: ["General"], especificas: ["Específica"] },
      contenido: { unidades: [{ numero: 1, titulo: "U1", resultadosAprendizaje: ["distingue"], temas: [] }] },
      metodologia: { estrategias: [{ nombre: "Clase magistral", descripcion: "" }] },
      evaluacion: { cortes: [{ nombre: "Parcial", porcentaje: 100, actividades: [{ nombre: "Examen", descripcion: "" }] }] },
      bibliografia: { obligatorias: [{ autor: "A", titulo: "T", dato: "d", confirmada: true }], complementarias: [], recursos: [] }
    },
    mensajes: [{ id: "u1", role: "usuario", texto: "hola" }],
    sugerencias: ["sigue"],
    intencion: "crear",
    seccionActiva: "contenido",
    crudo: "{}"
  };

  const migrado = migrarEstadoV1(v1);
  assert.ok(migrado, "debe migrar");
  assert.equal(migrado.version, 2);
  assert.equal(migrado.microcurriculo?.ident.asignatura, "Álgebra");
  assert.deepEqual(migrado.microcurriculo?.secuencia.sesiones, [], "sin secuencia, vacía");
  assert.equal(migrado.microcurriculo?.evaluacion.cortes[0].actividades[0].instrumento, "", "instrumento vacío");
  assert.equal(migrado.microcurriculo?.bibliografia.obligatorias[0].confirmada, true, "conserva la confirmación");
  assert.equal(migrado.mensajes.length, 1);
});

prueba("no migra basura", () => {
  assert.equal(migrarEstadoV1(null), null);
  assert.equal(migrarEstadoV1({ mensajes: "no" }), null);
});

/* ---------------------------------------------------------------- */
/* Exportación: texto plano y PDF                                    */
/* ---------------------------------------------------------------- */

grupo("exportación");

prueba("el texto plano no usa sintaxis de Markdown", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  const t = microcurriculoATexto(m);
  assert.ok(!t.includes("##"), "sin encabezados markdown");
  assert.ok(!t.includes("**"), "sin negritas markdown");
  assert.ok(!/\|\s*---/.test(t), "sin tablas markdown");
  assert.match(t, /1\. DATOS DE IDENTIFICACIÓN/);
  assert.match(t, /5\. SECUENCIA DIDÁCTICA/);
  assert.match(t, /8\. BIBLIOGRAFÍA Y RECURSOS/);
});

prueba("el texto plano incluye secuencia, instrumentos y advertencia de bibliografía", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  const t = microcurriculoATexto(m);
  assert.match(t, /Sesión 1 — Modelos de ciclo de vida/);
  assert.match(t, /INICIO/);
  assert.match(t, /Instrumento: Rúbrica analítica/);
  assert.match(t, /SIN CONFIRMAR/);
});

prueba("la referencia no duplica «ed.» si ya viene «edición»", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    bibliografia: {
      obligatorias: [{ autor: "Sommerville", titulo: "Ingeniería de software", dato: "Pearson", anio: "2016", edicion: "10.ª edición" }],
      complementarias: [],
      recursos: []
    }
  });
  const t = microcurriculoATexto(m);
  assert.match(t, /Pearson, 2016, 10\.ª edición/);
  assert.ok(!t.includes("edición ed."), "no debe duplicar la abreviatura");
  assert.ok(!t.includes("ed. ed."), "no debe duplicar la abreviatura");
});

prueba("la referencia no encadena dos puntos seguidos", () => {
  const m = normalizarMicrocurriculo({
    ...MICRO_COMPLETO.borrador,
    bibliografia: {
      obligatorias: [
        { autor: "Pressman, Roger S.", titulo: "Ingeniería del software.", dato: "McGraw-Hill.", anio: "2021", edicion: "9.ª" }
      ],
      complementarias: [],
      recursos: []
    }
  });
  const t = microcurriculoATexto(m);
  assert.match(t, /Pressman, Roger S\. Ingeniería del software\. McGraw-Hill, 2021, 9\.ª ed\./);
  assert.ok(!t.includes("S.."), "no debe quedar doble punto");
});

prueba("aWinAnsi conserva acentos y sustituye lo que no existe", () => {
  assert.equal(aWinAnsi("programación, ñ, ¿qué?"), "programación, ñ, ¿qué?");
  assert.equal(aWinAnsi("uno • dos — tres"), "uno - dos - tres");
  assert.equal(aWinAnsi("emoji 😀"), "emoji ?");
});

prueba("envolver respeta el ancho y no pierde palabras", () => {
  const texto = "palabra ".repeat(40).trim();
  const lineas = envolver(texto, 30);
  assert.ok(lineas.every((l) => l.length <= 30), "ninguna línea excede el ancho");
  assert.equal(lineas.join(" ").replace(/\s+/g, " "), texto.replace(/\s+/g, " "));
});

prueba("envolver corta una palabra más larga que la línea", () => {
  const lineas = envolver("x".repeat(75), 30);
  assert.ok(lineas.every((l) => l.length <= 30));
  assert.equal(lineas.join("").length, 75);
});

prueba("el PDF tiene estructura válida", () => {
  const m = normalizarMicrocurriculo(MICRO_COMPLETO.borrador);
  const bytes = textoAPdf(microcurriculoATexto(m));
  const pdf = Buffer.from(bytes).toString("latin1");

  assert.ok(pdf.startsWith("%PDF-1.4"), "cabecera %PDF");
  assert.ok(pdf.trimEnd().endsWith("%%EOF"), "cierre %%EOF");
  assert.match(pdf, /\/Type \/Catalog/);
  assert.match(pdf, /\/Type \/Pages/);
  assert.match(pdf, /\/BaseFont \/Helvetica/);
  assert.match(pdf, /\/Encoding \/WinAnsiEncoding/);
  assert.match(pdf, /xref/);
  assert.match(pdf, /startxref/);

  // La tabla xref debe apuntar a offsets reales que empiecen con "N 0 obj".
  const cuerpo = pdf.slice(0, pdf.lastIndexOf("xref"));
  const coincidencias = Array.from(pdf.matchAll(/^(\d{10}) 00000 n $/gm));
  assert.ok(coincidencias.length >= 5, "hay al menos 5 entradas");
  for (const c of coincidencias.slice(0, 5)) {
    const offset = Number(c[1]);
    const ventana = cuerpo.slice(offset, offset + 12);
    assert.match(ventana, /^\d+ 0 obj/, `offset ${offset} no apunta a un objeto`);
  }
});

prueba("el PDF pagina cuando el texto es largo", () => {
  const largo = Array.from({ length: 400 }, (_, i) => `Línea ${i} del documento de prueba con acentos: ñ á é.`).join("\n");
  const pdf = Buffer.from(textoAPdf(largo)).toString("latin1");
  const paginas = pdf.match(/\/Type \/Page[^s]/g) ?? [];
  assert.ok(paginas.length > 1, `debería haber varias páginas, hubo ${paginas.length}`);
});

prueba("el PDF escapa paréntesis y barras invertidas", () => {
  const pdf = Buffer.from(textoAPdf("Texto con (paréntesis) y \\ barra")).toString("latin1");
  assert.match(pdf, /\\\(paréntesis\\\)/);
  assert.match(pdf, /\\\\ barra/);
});

/* ---------------------------------------------------------------- */
/* Ejecución                                                         */
/* ---------------------------------------------------------------- */

let pasaron = 0;
const fallos: string[] = [];

for (const g of grupos) {
  console.log(`\n  ${g.titulo}`);
  for (const c of g.casos) {
    try {
      c.fn();
      pasaron++;
      console.log(`    \u001b[32m✓\u001b[0m ${c.nombre}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      fallos.push(`${g.titulo} › ${c.nombre}\n      ${mensaje}`);
      console.log(`    \u001b[31m✗\u001b[0m ${c.nombre}`);
    }
  }
}

console.log("");
if (fallos.length) {
  console.log(`\u001b[31m${fallos.length} prueba(s) fallaron\u001b[0m de ${pasaron + fallos.length}:\n`);
  for (const f of fallos) console.log(`  • ${f}\n`);
  process.exitCode = 1;
} else {
  console.log(`\u001b[32m${pasaron} prueba(s) pasaron\u001b[0m`);
}
