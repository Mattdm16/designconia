/**
 * Suite autónoma para el documento final de primera entrega.
 * Uso: node lib/documentoFinal.test.ts
 */

import {
  aplicarMarcasFijas,
  construirDisenoFijo,
  descriptoresFijos,
  plantillaFijaPara,
  PLANTILLA_FIJA_POR_NIVEL
} from "./documentoFinal.ts";
import { brandKitPorDefecto, resolverContenido } from "./diseno.ts";
import { normalizarMicrocurriculo } from "./schema.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): void {
  if (!condicion) throw new Error(mensaje);
}

prueba("plantilla fija: carta vertical con numeración por nivel", () => {
  for (const nivel of ["macro", "meso", "micro"] as const) {
    const p = plantillaFijaPara(nivel);
    assert(p.id === `fija-${nivel}`, `${nivel} usa su plantilla fija`);
    assert(p.pagina.tamano === "carta", `${nivel} es carta`);
    assert(p.pagina.orientacion === "vertical", `${nivel} es vertical`);
    assert(p.pagina.mostrarNumeroPagina, `${nivel} numera páginas`);
    assert(
      PLANTILLA_FIJA_POR_NIVEL[nivel] !== undefined,
      `${nivel} tiene base declarada`
    );
  }
});

prueba("micro incluye la secuencia didáctica en su estructura fija", () => {
  const refs = descriptoresFijos("micro").map((d) => d.refContenido ?? d.texto);
  assert(refs.includes("micro.secuencia"), "la secuencia va en el documento final");
  assert(refs.includes("micro.unidades"), "el contenido se conserva");
  assert(refs.includes("micro.evaluacion"), "la evaluación se conserva");
});

prueba("macro y meso tienen su estructura fija propia", () => {
  const macro = descriptoresFijos("macro").map((d) => d.refContenido ?? "");
  assert(macro.includes("marco.principios"), "principios en macro");
  const meso = descriptoresFijos("meso").map((d) => d.refContenido ?? "");
  assert(meso.includes("meso.resultados"), "resultados en meso");
});

prueba("el diseño fijo usa ids estables y plantilla fija", () => {
  const a = construirDisenoFijo("micro", "doc-1", "Álgebra");
  const b = construirDisenoFijo("micro", "doc-1", "Álgebra");
  assert(a.id === b.id, "mismo documento, mismo id");
  assert(
    a.bloques.map((x) => x.id).join(",") === b.bloques.map((x) => x.id).join(","),
    "bloques estables entre aperturas"
  );
  assert(a.plantillaId === "fija-micro", "apunta a la plantilla fija");
});

prueba("micro.secuencia resuelve sesiones y trabajo independiente", () => {
  const micro = normalizarMicrocurriculo({
    folio: "MC-1",
    ident: { asignatura: "Álgebra" },
    secuencia: {
      sesiones: [
        {
          numero: 1,
          unidad: 1,
          tema: "Introducción",
          duracionMin: 90,
          tipo: "teorica",
          inicio: [{ docente: "Saluda", estudiante: "Responde", recursos: ["Pizarrón"] }],
          desarrollo: [],
          cierre: []
        }
      ],
      trabajosIndependientes: [
        {
          id: "ti_1",
          unidad: 1,
          titulo: "Ensayo",
          esfuerzoMin: 120,
          descripcion: "Entrega escrita"
        }
      ]
    }
  });
  const lineas = resolverContenido("micro.secuencia", { micro });
  assert(lineas.some((l) => l.includes("Sesión 1")), "la sesión aparece");
  assert(lineas.some((l) => l.includes("Trabajo independiente")), "el TI aparece");
});

prueba("sin marca no se inyecta ninguna imagen; con marca van a su lugar", () => {
  const base = construirDisenoFijo("micro", "doc-1", "Álgebra").bloques;
  const vacio = aplicarMarcasFijas(base, brandKitPorDefecto());
  assert(vacio.length === base.length, "sin activos no cambia nada");
  const kit = brandKitPorDefecto();
  const conMarca = aplicarMarcasFijas(base, {
    ...kit,
    activos: [
      {
        id: "logo-1",
        nombre: "logo.png",
        tipo: "logo",
        mime: "image/png",
        dataUrl: "data:image/png;base64,AAA",
        tamanoBytes: 10
      },
      {
        id: "mem-1",
        nombre: "membrete.png",
        tipo: "membrete",
        mime: "image/png",
        dataUrl: "data:image/png;base64,AAA",
        tamanoBytes: 10
      }
    ]
  });
  assert(conMarca.length === base.length + 2, "logo + membrete agregan dos bloques");
  assert(conMarca[0].id === "fijo_membrete" && conMarca[0].zona === "portada", "el membrete abre la portada");
  const logo = conMarca.find((b) => b.id === "fijo_logo");
  assert(logo?.zona === "encabezado", "el logo vive en el encabezado");
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
