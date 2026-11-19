/**
 * Suite autónoma para las propuestas de diseño con IA.
 * Uso: node lib/propuestaDiseno.test.ts
 */

import {
  aplicarPropuesta,
  parsearPropuestaDiseno,
  type CambioDiseno
} from "./propuestaDiseno.ts";
import { brandKitPorDefecto, disenoPorDefecto, type DisenoDocumento } from "./diseno.ts";

type Caso = { nombre: string; fn: () => void };
const casos: Caso[] = [];

function prueba(nombre: string, fn: () => void) {
  casos.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function base(): { diseno: DisenoDocumento; kit: ReturnType<typeof brandKitPorDefecto> } {
  return { diseno: disenoPorDefecto("micro", "a1", "Asignatura"), kit: brandKitPorDefecto() };
}

prueba("parsea una propuesta válida con preámbulo y vallas", () => {
  const r = parsearPropuestaDiseno(
    'Claro, aquí va:\n```json\n{"mensaje": "Listo.", "cambios": [{"op": "pagina", "parche": {"tamano": "a4"}}]}\n```'
  );
  assert(r.ok, "propuesta válida");
  if (r.ok) assert(r.propuesta.cambios.length === 1, "un cambio");
});

prueba("rechaza respuesta vacía y basura sin objeto", () => {
  const v = parsearPropuestaDiseno("   ");
  assert(!v.ok, "vacía se rechaza");
  const b = parsearPropuestaDiseno("no hay json aquí");
  assert(!b.ok, "basura se rechaza");
});

prueba("rechaza cambios sin cambios o con operación desconocida", () => {
  const s = parsearPropuestaDiseno('{"mensaje": "Hola", "cambios": []}');
  assert(!s.ok, "sin cambios se rechaza");
  const o = parsearPropuestaDiseno('{"mensaje": "Hola", "cambios": [{"op": "borrarTodo"}]}');
  assert(!o.ok, "operación desconocida se rechaza");
});

prueba("rechaza valores fuera de rango o mal formados", () => {
  const color = parsearPropuestaDiseno(
    '{"mensaje": "M", "cambios": [{"op": "kit", "colores": {"primario": "verde"}}]}'
  );
  assert(!color.ok, "color no hex se rechaza");
  const tam = parsearPropuestaDiseno(
    '{"mensaje": "M", "cambios": [{"op": "estiloTipo", "tipo": "titulo", "estilo": {"tamanoPt": 200}}]}'
  );
  assert(!tam.ok, "tamaño fuera de rango se rechaza");
  const mar = parsearPropuestaDiseno(
    '{"mensaje": "M", "cambios": [{"op": "pagina", "parche": {"margenesMm": {"arriba": 200}}}]}'
  );
  assert(!mar.ok, "margen fuera de rango se rechaza");
});

prueba("rechaza demasiados cambios", () => {
  const muchos = Array.from({ length: 31 }, () => '{"op": "pagina", "parche": {}}').join(",");
  const r = parsearPropuestaDiseno(`{"mensaje": "M", "cambios": [${muchos}]}`);
  assert(!r.ok, "más de 30 cambios se rechaza");
});

prueba("aplica plantilla y página con resumen legible", () => {
  const { diseno, kit } = base();
  const r = aplicarPropuesta(diseno, kit, [
    { op: "plantilla", plantillaId: "academica-limpia" },
    { op: "pagina", parche: { orientacion: "horizontal", mostrarNumeroPagina: true } }
  ]);
  assert(r.diseno.plantillaId === "academica-limpia", "plantilla aplicada");
  assert(r.diseno.pagina.orientacion === "horizontal", "orientación aplicada");
  assert(r.rechazados.length === 0, "sin rechazos");
  assert(r.aplicados.some((a) => /Académica limpia/.test(a)), "resumen nombra la plantilla");
  assert(diseno.plantillaId !== "academica-limpia", "el original no se muta");
});

prueba("aplica estilos por tipo y por bloque", () => {
  const { diseno, kit } = base();
  const id = diseno.bloques[0].id;
  const r = aplicarPropuesta(diseno, kit, [
    { op: "estiloTipo", tipo: "titulo", estilo: { color: "#1F3A5F", tamanoPt: 24 } },
    { op: "estiloBloque", bloqueId: id, estilo: { alineacion: "derecha" } }
  ]);
  assert(
    r.diseno.bloques.filter((b) => b.tipo === "titulo").every((b) => b.estilo?.color === "#1F3A5F"),
    "color a todos los títulos"
  );
  assert(r.diseno.bloques[0].estilo?.alineacion === "derecha", "alineación al bloque");
  assert(r.aplicados.length === 2, "dos resúmenes");
});

prueba("reordena la zona solo si los ids coinciden exactos", () => {
  const { diseno, kit } = base();
  const cuerpo = diseno.bloques.filter((b) => b.zona === "cuerpo").map((b) => b.id);
  const invertidos = [...cuerpo].reverse();
  const r = aplicarPropuesta(diseno, kit, [{ op: "orden", zona: "cuerpo", ids: invertidos }]);
  const despues = r.diseno.bloques.filter((b) => b.zona === "cuerpo").map((b) => b.id);
  assert(JSON.stringify(despues) === JSON.stringify(invertidos), "orden invertido");
  const incompleto = aplicarPropuesta(diseno, kit, [{ op: "orden", zona: "cuerpo", ids: cuerpo.slice(1) }]);
  assert(incompleto.rechazados.length === 1, "orden incompleto se rechaza");
  assert(incompleto.diseno.bloques.length === diseno.bloques.length, "nada se pierde al rechazar");
});

prueba("mueve bloques de zona y alterna visibilidad", () => {
  const { diseno, kit } = base();
  const id = diseno.bloques.find((b) => b.zona === "cuerpo")!.id;
  const r = aplicarPropuesta(diseno, kit, [
    { op: "moverBloque", bloqueId: id, zona: "pie" },
    { op: "visibilidad", bloqueId: id, visible: false }
  ]);
  const movido = r.diseno.bloques.find((b) => b.id === id)!;
  assert(movido.zona === "pie" && movido.visible === false, "movido y oculto");
  const fantasma: CambioDiseno[] = [{ op: "visibilidad", bloqueId: "no-existe", visible: false }];
  const r2 = aplicarPropuesta(diseno, kit, fantasma);
  assert(r2.rechazados.length === 1 && r2.aplicados.length === 0, "id inexistente se rechaza");
});

prueba("actualiza colores y fuentes del kit", () => {
  const { diseno, kit } = base();
  const r = aplicarPropuesta(diseno, kit, [
    { op: "kit", colores: { primario: "#123456" }, fuenteTitulos: "sans" }
  ]);
  assert(r.kit.colores.primario === "#123456", "color aplicado");
  assert(r.kit.fuenteTitulos === "sans", "fuente aplicada");
  assert(r.kit.colores.secundario === kit.colores.secundario, "el resto intacto");
  assert(r.aplicados.some((a) => /#123456/.test(a)), "resumen con el color");
});

prueba("rechaza plantilla inexistente sin romper lo demás", () => {
  const { diseno, kit } = base();
  const r = aplicarPropuesta(diseno, kit, [
    { op: "plantilla", plantillaId: "no-existe" },
    { op: "pagina", parche: { tamano: "a4" } }
  ]);
  assert(r.rechazados.length === 1, "un rechazo");
  assert(r.diseno.pagina.tamano === "a4", "lo válido sí aplica");
  assert(r.diseno.plantillaId === diseno.plantillaId, "plantilla intacta");
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
