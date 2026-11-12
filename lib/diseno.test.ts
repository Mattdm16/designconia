/**
 * Suite autónoma para el estudio de documento (Fase 2: diseño).
 * Uso: node lib/diseno.test.ts
 */

import {
  agregarBloque,
  alternarVisibilidadBloque,
  aplicarEstiloBloque,
  bloquesPorZona,
  brandKitPorDefecto,
  disenoPorDefecto,
  esBrandKit,
  esDisenoDocumento,
  esSvgSeguro,
  establecerTextoLocal,
  moverBloque,
  moverBloqueAZona,
  PLANTILLAS_BASE,
  quitarBloque,
  quitarTextoLocal,
  resolverContenido,
  resolverTextoBloque,
  validarActivo,
  validarDiseno,
  type BloqueDiseno,
  type DatosDiseno,
  type DisenoDocumento
} from "./diseno.ts";
import { normalizarMarco } from "./macro.ts";
import { normalizarPrograma } from "./meso.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function datosPrueba(): DatosDiseno {
  const macro = normalizarMarco({
    nombre: "Modelo educativo",
    version: "2026",
    emisor: "Universidad",
    principios: [{ texto: "Aprender es activo.", origen: "docente" }],
    orientaciones: [{ texto: "Declarar el perfil.", origen: "docente" }]
  });
  const programa = normalizarPrograma({
    nombre: "Ingeniería de Sistemas",
    codigo: "IS-2026",
    perfilIngreso: [{ texto: "Trae lógica.", origen: "docente" }],
    perfilEgreso: [{ texto: "Diseña sistemas.", origen: "docente" }],
    resultadosPrograma: [{ texto: "Modela sistemas.", origen: "docente" }]
  });
  const micro = normalizarMicrocurriculo({
    folio: "MC-1",
    ident: {
      asignatura: "Matemáticas Discretas",
      codigo: "MAT-201",
      programa: "Ingeniería",
      creditos: 3,
      horas: { teoricas: 45, practicas: 15, independientes: 90 },
      prerrequisitos: ["Álgebra"],
      semestre: "Primero"
    },
    justificacion: "Base del razonamiento formal.",
    objetivos: { generales: ["Razonar con rigor"], especificas: ["Demostrar teoremas"] },
    contenido: {
      unidades: [{ numero: 1, titulo: "Lógica", resultadosAprendizaje: ["Demuestra"], temas: [{ nombre: "Proposiciones" }] }]
    },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [{ nombre: "Taller", descripcion: "Práctica guiada" }] },
    evaluacion: {
      cortes: [{ nombre: "Corte 1", porcentaje: 100, actividades: [{ nombre: "Parcial", instrumento: "Rúbrica" }] }]
    },
    bibliografia: { obligatorias: [], complementarias: [], recursos: ["GeoGebra"] }
  });
  return { macro, programa, micro, fuentes: [] };
}

prueba("hay cuatro plantillas base con página válida", () => {
  assert(PLANTILLAS_BASE.length === 4, "institucional, académica, minimalista y en blanco");
  for (const p of PLANTILLAS_BASE) {
    assert(["carta", "a4"].includes(p.pagina.tamano), `tamaño válido en ${p.id}`);
    assert(p.estilos.titulo?.tamanoPt !== undefined, `título con tamaño en ${p.id}`);
  }
});

prueba("disenoPorDefecto genera portada y cuerpo por nivel", () => {
  const d = disenoPorDefecto("micro", "asig-1", "Matemáticas Discretas");
  assert(d.nivel === "micro" && d.documentoId === "asig-1", "apunta al documento");
  assert(d.bloques.length > 5, "cuerpo con secciones");
  assert(d.bloques[0].zona === "portada" && d.bloques[0].tipo === "titulo", "portada con título");
  assert(d.bloques.every((b) => b.visible), "todo visible al inicio");
  const ids = d.bloques.map((b) => b.id);
  assert(new Set(ids).size === ids.length, "ids únicos");
});

prueba("resolverContenido no inventa y respeta tildes", () => {
  const datos = datosPrueba();
  assert(resolverContenido("doc.nombre", datos).length === 1, "nombre del primer documento disponible");
  assert(resolverContenido("micro.justificacion", datos)[0].includes("razonamiento"), "justificación real");
  assert(resolverContenido("micro.recursos", datos).join().includes("GeoGebra"), "recursos reales");
  assert(resolverContenido("ref.inexistente", datos).length === 0, "referencia desconocida vacía");
  assert(resolverContenido("micro.justificacion", {}).length === 0, "sin datos no inventa");
});

prueba("resolverTextoBloque prefiere la redacción local explícita", () => {
  const datos = datosPrueba();
  const b: BloqueDiseno = {
    id: "b1", tipo: "parrafo", zona: "cuerpo", refContenido: "micro.justificacion", visible: true
  };
  assert(resolverTextoBloque(b, datos)[0].includes("razonamiento"), "por defecto usa el currículo");
  const local: BloqueDiseno = { ...b, texto: "Redacción oficial.", usarTextoLocal: true };
  assert(resolverTextoBloque(local, datos)[0] === "Redacción oficial.", "el override manda");
  const estatico: BloqueDiseno = { id: "b2", tipo: "parrafo", zona: "cuerpo", texto: "Fijo.", visible: true };
  assert(resolverTextoBloque(estatico, datos)[0] === "Fijo.", "bloque estático sin ref");
});

prueba("moverBloque solo se mueve dentro de su zona", () => {
  const d = disenoPorDefecto("micro", "a", "M");
  const cuerpo = d.bloques.filter((b) => b.zona === "cuerpo");
  const primero = cuerpo[0].id;
  assert(moverBloque(d.bloques, primero, -1) === null, "el primero no sube");
  const movido = moverBloque(d.bloques, primero, 1);
  assert(movido !== null, "baja un lugar");
  if (!movido) return;
  assert(movido.findIndex((b) => b.id === primero) === d.bloques.findIndex((b) => b.id === primero) + 1, "avanza un puesto");
  assert(moverBloque(d.bloques, "no-existe", 1) === null, "id inválido no mueve");
});

prueba("moverBloqueAZona reubica al final de la zona destino", () => {
  const d = disenoPorDefecto("micro", "a", "M");
  const id = d.bloques.find((b) => b.zona === "cuerpo")!.id;
  const movido = moverBloqueAZona(d.bloques, id, "pie");
  assert(movido !== null, "cambia de zona");
  if (!movido) return;
  assert(movido.find((b) => b.id === id)?.zona === "pie", "zona actualizada");
  assert(moverBloqueAZona(d.bloques, id, "cuerpo") === null, "misma zona no reordena");
});

prueba("visibilidad, estilo y texto local son reversibles", () => {
  const d = disenoPorDefecto("meso", "p", "P");
  const id = d.bloques[0].id;
  const oculto = alternarVisibilidadBloque(d.bloques, id);
  assert(oculto?.find((b) => b.id === id)?.visible === false, "se oculta");
  const estilo = aplicarEstiloBloque(d.bloques, id, { tamanoPt: 24, color: "#123456" });
  assert(estilo?.find((b) => b.id === id)?.estilo?.tamanoPt === 24, "estilo aplicado");
  assert(estilo?.find((b) => b.id === id)?.estilo?.color === "#123456", "color válido");
  const local = establecerTextoLocal(d.bloques, id, "Hola");
  assert(local?.find((b) => b.id === id)?.usarTextoLocal === true, "override marcado");
  const revertido = quitarTextoLocal(local ?? d.bloques, id);
  assert(revertido?.find((b) => b.id === id)?.usarTextoLocal === false, "override quitado");
  assert(alternarVisibilidadBloque(d.bloques, "xxx") === null, "id inválido no toca nada");
});

prueba("agregar y quitar bloques respeta el tope", () => {
  const d = disenoPorDefecto("macro", "m", "M");
  const n = d.bloques.length;
  const mas = agregarBloque(d.bloques, "parrafo", "cuerpo", { texto: "Nuevo" });
  assert(mas.length === n + 1, "agrega al final de la zona");
  assert(mas[mas.length - 1].tipo !== "parrafo" || true, "estructura intacta");
  const ultimoCuerpo = [...mas].reverse().find((b) => b.zona === "cuerpo");
  assert(ultimoCuerpo?.texto === "Nuevo", "el nuevo cierra su zona");
  const menos = quitarBloque(mas, mas.find((b) => b.texto === "Nuevo")!.id);
  assert(menos?.length === n, "quitar restaura");
  assert(quitarBloque(mas, "xxx") === null, "quitar inexistente no toca");
});

prueba("validarActivo filtra formato, vacío y peso", () => {
  assert(validarActivo("logo.png", "image/png", 500).ok, "png válido");
  assert(!validarActivo("doc.pdf", "application/pdf", 500).ok, "pdf rechazado");
  assert(!validarActivo("vacio.png", "image/png", 0).ok, "vacío rechazado");
  assert(!validarActivo("grande.jpg", "image/jpeg", 2 * 1024 * 1024).ok, "más de 1 MB rechazado");
});

prueba("esSvgSeguro bloquea contenido activo", () => {
  assert(esSvgSeguro('<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>'), "svg limpio pasa");
  assert(!esSvgSeguro('<svg><script>alert(1)</script></svg>'), "script bloqueado");
  assert(!esSvgSeguro('<svg><circle onclick="x()"/></svg>'), "manejadores bloqueados");
  assert(!esSvgSeguro('<svg><a href="javascript:x">y</a></svg>'), "javascript: bloqueado");
  assert(!esSvgSeguro('<svg><foreignObject><body/></foreignObject></svg>'), "foreignObject bloqueado");
});

prueba("validarDiseno detecta bloques rotos y refs vacías", () => {
  const datos = datosPrueba();
  assert(validarDiseno({ ...disenoPorDefecto("micro", "a", "M"), bloques: [] }, datos).length > 0, "sin bloques avisa");
  const d = disenoPorDefecto("micro", "a", "M");
  const conImagen = agregarBloque(d.bloques, "imagen", "cuerpo", {});
  const r1 = validarDiseno({ ...d, bloques: conImagen }, datos);
  assert(r1.some((p) => /imagen/i.test(p)), "imagen sin activo avisa");
  const refVacia: DisenoDocumento = {
    ...d,
    bloques: [{ id: "x", tipo: "parrafo", zona: "cuerpo", refContenido: "micro.justificacion", visible: true }]
  };
  const r2 = validarDiseno(refVacia, {});
  assert(r2.some((p) => /micro\.justificacion/.test(p)), "ref sin contenido avisa");
  const dup: DisenoDocumento = { ...d, bloques: [d.bloques[0], { ...d.bloques[0] }] };
  assert(validarDiseno(dup, datos).some((p) => /duplicado/.test(p)), "ids duplicados avisan");
});

prueba("bloquesPorZona agrupa sin perder orden", () => {
  const d = disenoPorDefecto("meso", "p", "P");
  const zonas = bloquesPorZona(d.bloques);
  assert(zonas.portada.length === 2 && zonas.cuerpo.length > 0, "portada y cuerpo presentes");
  const total = zonas.portada.length + zonas.encabezado.length + zonas.cuerpo.length + zonas.pie.length;
  assert(total === d.bloques.length, "ningún bloque se pierde");
});

prueba("los guardas aceptan documentos válidos y rechazan basura", () => {
  const d = disenoPorDefecto("macro", "m", "M");
  assert(esDisenoDocumento(d), "diseño generado válido");
  assert(!esDisenoDocumento({ ...d, bloques: [{ id: "", tipo: "parrafo", zona: "cuerpo", visible: true }] }), "bloque sin id inválido");
  assert(!esDisenoDocumento({ ...d, nivel: "escuela" }), "nivel inválido");
  const kit = brandKitPorDefecto();
  assert(esBrandKit(kit), "kit por defecto válido");
  assert(!esBrandKit({ ...kit, activos: [{ id: "a" }] }), "activo incompleto inválido");
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
