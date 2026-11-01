/**
 * Suite para la ingesta local de PDFs (validación, fechas y antigüedad).
 * Uso: node lib/pdf.test.ts
 */

import {
  anioDeFechaPdf,
  anioVigente,
  ANTIGUEDAD_MAX_ANIOS,
  construirFuentePdf,
  extractosRelevantes,
  idAdjunto,
  mensajeRechazoPdf,
  parecePdf,
  recortarPagina,
  recortarTextoPorPagina,
  tieneFirmaPdfprimeros,
  tieneTextoAprovechable,
  MAX_CHARS_POR_PAGINA,
  MAX_CHARS_TEXTO_PDF
} from "./pdf.ts";

let total = 0;
let fallos = 0;

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
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

caso("parecePdf acepta extensión o MIME y la firma verifica bytes", () => {
  assert(parecePdf("modelo.pdf", ""), "extensión basta");
  assert(parecePdf("MODELO.PDF", "text/plain"), "mayúsculas valen");
  assert(parecePdf("doc", "application/pdf"), "MIME basta");
  assert(!parecePdf("doc.docx", "application/vnd.openxmlformats"), "word no pasa");
  const firma = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  assert(tieneFirmaPdfprimeros(firma), "firma %PDF válida");
  assert(!tieneFirmaPdfprimeros(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), "zip no pasa");
  assert(!tieneFirmaPdfprimeros(new Uint8Array([0x25, 0x50])), "truncado no pasa");
});

caso("anioDeFechaPdf entiende fechas PDF, ISO, años y timestamps", () => {
  assert(anioDeFechaPdf("D:20231105120000Z") === 2023, "formato D:");
  assert(anioDeFechaPdf("D:2024") === 2024, "D: corto");
  assert(anioDeFechaPdf("2022-05-01") === 2022, "ISO");
  assert(anioDeFechaPdf("2021") === 2021, "año suelto");
  assert(anioDeFechaPdf(new Date("2020-01-01T00:00:00Z").getTime()) === 2020, "timestamp");
  assert(anioDeFechaPdf("sin fecha") === null, "basura da null");
  assert(anioDeFechaPdf(null) === null, "null da null");
});

caso("anioVigente aplica el tope de 3 años y acepta futuro", () => {
  const ahora = new Date("2026-11-01T00:00:00Z");
  assert(anioVigente(2026, ahora), "año actual");
  assert(anioVigente(2023, ahora), "límite exacto (3 años)");
  assert(!anioVigente(2022, ahora), "4 años se rechaza");
  assert(anioVigente(2027, ahora), "futuro cuenta como válido");
  assert(!anioVigente(null, ahora), "sin año no se puede decidir");
  assert(ANTIGUEDAD_MAX_ANIOS === 3, "tope documentado");
});

caso("recortes protegen el contexto del modelo", () => {
  const larga = "x".repeat(MAX_CHARS_POR_PAGINA + 100);
  assert(recortarPagina(larga).length === MAX_CHARS_POR_PAGINA, "tope por página");
  assert(recortarPagina("a  \n\n\n\nb") === "a\n\nb", "normaliza espacios");
  const muchas = ["y".repeat(10), "z".repeat(MAX_CHARS_TEXTO_PDF)];
  const rec = recortarTextoPorPagina(muchas);
  assert(rec.join("").length === MAX_CHARS_TEXTO_PDF + 10 - 10, "tope total");
});

caso("tieneTextoAprovechable distingue escaneados", () => {
  assert(tieneTextoAprovechable(["Hola mundo, este es un texto con más de cincuenta letras seguidas."]), "texto real");
  assert(!tieneTextoAprovechable(["   123  ,,,   "]), "basura no aprovecha");
  assert(!tieneTextoAprovechable([]), "vacío no aprovecha");
});

caso("idAdjunto es determinista y mensajeRechazoPdf cubre motivos", () => {
  assert(idAdjunto("A.pdf", 10) === idAdjunto("a.PDF", 10), "insensible a mayúsculas");
  assert(idAdjunto("A.pdf", 10) !== idAdjunto("A.pdf", 11), "sensible a tamaño");
  for (const m of ["no_pdf", "demasiado_grande", "demasiadas_paginas", "sin_texto", "antiguo", "ilegible"] as const) {
    assert(mensajeRechazoPdf(m, "f.pdf").includes("f.pdf"), `mensaje para ${m}`);
  }
  assert(mensajeRechazoPdf("antiguo", "f.pdf").includes("3 años"), "menciona la restricción");
});

caso("construirFuentePdf exige antigüedad y recorta texto", () => {
  const ahora = new Date("2026-11-01T00:00:00Z");
  const base = { nombre: "modelo.pdf", paginas: 10, textoPorPagina: ["contenido"], anio: 2024 };
  const ok = construirFuentePdf(base, ahora);
  assert(ok.ok, "2024 integra");
  if (!ok.ok) return;
  assert(ok.fuente.anio === 2024, "año guardado");
  assert(ok.fuente.nombreArchivo === "modelo.pdf", "nombre guardado");
  assert(ok.fuente.titulo === "modelo", "título sin extensión");
  const vieja = construirFuentePdf({ ...base, anio: 2020 }, ahora);
  assert(!vieja.ok && vieja.motivo === "antiguo", "2020 se rechaza");
});

caso("extractosRelevantes prioriza páginas con solape", () => {
  const paginas = ["modelos educativos y pedagogía", "receta de cocina", "evaluación de modelos educativos"];
  const ext = extractosRelevantes(paginas, "modelos educativos en la institución");
  assert(ext.length === 2, "dos páginas con solape");
  assert(ext[0].startsWith("(p. 1)"), "orden por página");
  assert(ext[1].startsWith("(p. 3)"), "tercera página incluida");
  const sinSolape = extractosRelevantes(paginas, "xyz qwerty");
  assert(sinSolape.length === 1 && sinSolape[0].startsWith("(p. 1)"), "sin solape: primera página");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
