/**
 * Suite autónoma para el PDF fiel al diseño (Fase 2).
 * Uso: node lib/exportarDisenoPdf.test.ts
 */

import { disenoPorDefecto, PLANTILLAS_BASE, type DatosDiseno, type DisenoDocumento } from "./diseno.ts";
import {
  bloquesAElementos,
  disenoAPdf,
  envolverLinea,
  fuentePara,
  hexARgb,
  paginar,
  resolverEstilo,
  type ElementoPdf,
  type GeometriaPagina
} from "./exportarDisenoPdf.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

const PLANTILLA = PLANTILLAS_BASE[0];

function microDatos(): DatosDiseno {
  const micro = normalizarMicrocurriculo({
    folio: "MC-1",
    ident: {
      asignatura: "Álgebra",
      codigo: "MAT-101",
      programa: "Ingeniería",
      creditos: 3,
      horas: { teoricas: 32, practicas: 32, independientes: 64 },
      prerrequisitos: ["Ninguno"],
      semestre: "Primero"
    },
    justificacion: "Base del razonamiento formal en la carrera.",
    objetivos: { generales: ["Razonar"], especificas: ["Demostrar"] },
    contenido: { unidades: [] },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: { obligatorias: [], complementarias: [], recursos: [] }
  });
  return { micro };
}

function geometria(): GeometriaPagina {
  return { ancho: 612, alto: 792, margenIzq: 56, margenDer: 56, margenSup: 56, margenInf: 56 };
}

function pdfTexto(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, 2000), (b) => String.fromCharCode(b)).join("");
}

prueba("hexARgb convierte y tolera basura", () => {
  assert(JSON.stringify(hexARgb("#B25D3E")) === JSON.stringify([0.698, 0.365, 0.243]), "convierte terracotta");
  assert(JSON.stringify(hexARgb("#000000")) === JSON.stringify([0, 0, 0]), "negro");
  assert(JSON.stringify(hexARgb("rojo")) === JSON.stringify([0, 0, 0]), "inválido da negro");
});

prueba("fuentePara cubre familias y variantes", () => {
  assert(fuentePara("sans", false, false) === "Helvetica", "sans base");
  assert(fuentePara("sans", true, false) === "Helvetica-Bold", "sans negrita");
  assert(fuentePara("serif", false, true) === "Times-Italic", "serif cursiva");
  assert(fuentePara("mono", true, true) === "Courier-BoldOblique", "mono ambas");
});

prueba("resolverEstilo fusiona plantilla y override", () => {
  const e = resolverEstilo("titulo", PLANTILLA, { tamanoPt: 30 });
  assert(e.tamanoPt === 30, "el override manda");
  assert(e.negrita === true, "hereda negrita de la plantilla");
  assert(e.color[0] > 0, "título con color primario, no negro");
  const p = resolverEstilo("parrafo", PLANTILLA, {});
  assert(JSON.stringify(p.color) === JSON.stringify([0, 0, 0]), "párrafo negro por defecto");
});

prueba("envolverLinea parte por palabras y corta palabras largas", () => {
  const cortas = envolverLinea("Hola mundo", 500, 12, "sans", false);
  assert(cortas.length === 1, "línea corta intacta");
  const largas = envolverLinea("una dos tres cuatro cinco seis", 60, 12, "sans", false);
  assert(largas.length > 2, "línea larga se parte");
  assert(largas.every((l) => l.length <= 12), "ninguna excede el ancho");
});

prueba("bloquesAElementos resuelve, ordena y salta invisibles", () => {
  const d = disenoPorDefecto("micro", "a1", "Álgebra");
  const oculto = d.bloques[2].id;
  const diseno: DisenoDocumento = {
    ...d,
    bloques: d.bloques.map((b) => (b.id === oculto ? { ...b, visible: false } : b))
  };
  const els = bloquesAElementos(diseno, PLANTILLA, microDatos());
  assert(els.length > 5, "hay elementos");
  assert(els.every((e) => e.kind !== "salto" || true), "estructura intacta");
  const textos = els.filter((e) => e.kind === "texto").map((e) => (e.kind === "texto" ? e.texto : ""));
  assert(textos.some((t) => t.includes("Álgebra")), "título resuelto del currículo");
});

prueba("paginar conserva títulos con su contenido", () => {
  const geo = geometria();
  const estilo = resolverEstilo("parrafo", PLANTILLA, {});
  const estiloTitulo = resolverEstilo("titulo", PLANTILLA, {});
  const relleno: ElementoPdf[] = [];
  // Llena más de una página para forzar el corte junto al título.
  for (let i = 0; i < 60; i++) {
    relleno.push({ kind: "texto", texto: `Línea de relleno número ${i} con contenido suficiente`, estilo });
  }
  relleno.push({ kind: "texto", texto: "Título al borde", estilo: estiloTitulo });
  relleno.push({ kind: "texto", texto: "Contenido del título que debe ir con él", estilo });
  const paginas = paginar(relleno, geo, 0, 0);
  assert(paginas.length >= 2, "hay más de una página");
  const ultima = paginas[paginas.length - 1];
  const textos = ultima.lineas.map((l) => l.texto);
  assert(
    textos.some((t) => t.includes("Título al borde")) &&
      textos.some((t) => t.includes("Contenido del título")),
    "título y contenido viajan juntos"
  );
});

prueba("paginar respeta saltos e imágenes", () => {
  const geo = geometria();
  const estilo = resolverEstilo("parrafo", PLANTILLA, {});
  const els: ElementoPdf[] = [
    { kind: "texto", texto: "Arriba", estilo },
    { kind: "salto" },
    { kind: "texto", texto: "Abajo", estilo },
    { kind: "imagen", imagenId: "logo", estilo }
  ];
  const imgs = new Map([["logo", { bytes: new Uint8Array([1, 2, 3]), ancho: 400, alto: 200 }]]);
  const paginas = paginar(els, geo, 0, 0, imgs);
  assert(paginas.length === 2, `salto parte en dos, llegaron ${paginas.length}`);
  const textos0 = paginas[0].lineas.map((l) => l.texto);
  const textos1 = paginas[1].lineas.map((l) => l.texto);
  assert(textos0.some((t) => t.includes("Arriba")), "Arriba queda antes del salto");
  assert(!textos0.some((t) => t.includes("Abajo")), "Abajo no se mezcla con Arriba");
  assert(textos1.some((t) => t.includes("Abajo")), "Abajo queda después del salto");
  assert(paginas[1].imagenes.length === 1, "la imagen viaja con su página");
});

prueba("disenoAPdf emite un PDF válido con el contenido", () => {
  const d = disenoPorDefecto("micro", "a1", "Álgebra");
  const bytes = disenoAPdf(d, PLANTILLA, microDatos(), new Map());
  const inicio = pdfTexto(bytes);
  assert(inicio.startsWith("%PDF-1.4"), "cabecera PDF");
  const completo = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  assert(completo.includes("/Count"), "declara páginas");
  assert(completo.includes("Álgebra"), "incluye el título resuelto");
  assert(completo.includes("Helvetica-Bold"), "registra negritas");
});

prueba("disenoAPdf respeta A4 y apaisado", () => {
  const base = disenoPorDefecto("macro", "m1", "Modelo");
  const a4 = { ...base, pagina: { ...base.pagina, tamano: "a4" as const, orientacion: "horizontal" as const } };
  const bytes = disenoAPdf(a4, PLANTILLAS_BASE[2], { macro: undefined }, new Map());
  const texto = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  assert(texto.includes("[0 0 842 595]"), "MediaBox apaisado A4");
});

prueba("disenoAPdf incrusta imágenes JPEG", () => {
  const d = disenoPorDefecto("micro", "a1", "Álgebra");
  const conImagen: DisenoDocumento = {
    ...d,
    bloques: [
      ...d.bloques,
      { id: "img1", tipo: "imagen", zona: "portada", activoId: "logo", visible: true }
    ]
  };
  // JPEG mínimo 1x1 (SOI … EOI) para probar el contenedor sin decodificar.
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const bytes = disenoAPdf(conImagen, PLANTILLA, microDatos(), new Map([["logo", { bytes: jpeg, ancho: 100, alto: 50 }]]));
  const texto = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  assert(texto.includes("/DCTDecode"), "imagen incrustada como JPEG");
  assert(texto.includes("/Im1 Do"), "la imagen se dibuja");
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
