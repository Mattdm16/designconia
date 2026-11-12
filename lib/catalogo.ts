/**
 * DesignConia — catálogo personal de documentos curriculares.
 *
 * Un solo docente guarda currículos terminados y los reutiliza: los busca
 * por código o nombre, los abre, los marca como finalizados, los duplica
 * como base de otro nuevo o los enlaza con otros documentos del proyecto.
 *
 * Este módulo es puro: no toca localStorage, red ni React. Opera sobre el
 * agregado V3 y devuelve copias nuevas sin mutar la base. La UI decide cómo
 * mostrar, abrir y persistir.
 */

import { folioNuevo } from "./schema.ts";
import type {
  AfirmacionCurricular,
  Asignatura,
  MarcoEducativoInstitucional,
  OrigenCopiaDocumento,
  ProgramaAcademico,
  ProyectoCurricular
} from "./proyecto.ts";

export type NivelCatalogo = "macro" | "meso" | "micro";

export type ItemCatalogo = {
  nivel: NivelCatalogo;
  id: string;
  nombre: string;
  codigo: string;
  finalizado: boolean;
  origenCopia: OrigenCopiaDocumento | null;
};

/** Entrada del catálogo para un documento concreto. */
export function catalogar(proyecto: ProyectoCurricular): ItemCatalogo[] {
  const salida: ItemCatalogo[] = [];
  for (const m of proyecto.marcos) {
    salida.push({
      nivel: "macro",
      id: m.id,
      nombre: m.nombre,
      codigo: "",
      finalizado: m.finalizado === true,
      origenCopia: m.origenCopia ?? null
    });
  }
  for (const p of proyecto.programas) {
    salida.push({
      nivel: "meso",
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo ?? "",
      finalizado: p.finalizado === true,
      origenCopia: p.origenCopia ?? null
    });
  }
  for (const a of proyecto.asignaturas) {
    salida.push({
      nivel: "micro",
      id: a.id,
      nombre: a.microcurriculo.ident.asignatura,
      codigo: a.microcurriculo.ident.codigo,
      finalizado: a.finalizado === true,
      origenCopia: a.origenCopia ?? null
    });
  }
  return salida;
}

/** Normaliza para buscar sin importar tildes, mayúsculas ni espacios. */
export function normalizarBusqueda(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filtra el catálogo por código o nombre. Vacío = todo. La búsqueda ignora
 * tildes y mayúsculas para que "MAT-101" y "matemáticas" aparezcan igual.
 */
export function buscarCatalogo(items: ItemCatalogo[], consulta: string): ItemCatalogo[] {
  const q = normalizarBusqueda(consulta);
  if (!q) return [...items];
  return items.filter(
    (item) =>
      normalizarBusqueda(item.nombre).includes(q) || normalizarBusqueda(item.codigo).includes(q)
  );
}

/** Hash FNV-1a corto, como en el resto de módulos puros del proyecto. */
function hashCorto(semilla: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i++) hash = Math.imul(hash ^ semilla.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function idNuevo(prefijo: string): string {
  return `${prefijo}_${hashCorto(`${Date.now()}:${Math.random()}:${prefijo}`)}`;
}

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function idLibre(ocupados: Set<string>, base: string): string {
  let id = base;
  let n = 2;
  while (ocupados.has(id)) {
    id = `${base}_${n}`;
    n++;
  }
  ocupados.add(id);
  return id;
}

/** Todos los ids del proyecto, para no colisionar al duplicar. */
function idsOcupados(proyecto: ProyectoCurricular): Set<string> {
  const ids = new Set<string>([proyecto.id]);
  for (const m of proyecto.marcos) {
    ids.add(m.id);
    for (const a of [...m.principios, ...m.afirmaciones]) ids.add(a.id);
  }
  for (const p of proyecto.programas) {
    ids.add(p.id);
    for (const a of [...p.perfilIngreso, ...p.perfilEgreso, ...p.resultadosPrograma]) ids.add(a.id);
  }
  for (const a of proyecto.asignaturas) {
    ids.add(a.id);
    for (const u of a.microcurriculo.contenido.unidades) {
      for (const ra of u.resultadosAprendizaje) ids.add(ra.id);
    }
    for (const c of a.microcurriculo.evaluacion.cortes) {
      for (const act of c.actividades) ids.add(act.id);
    }
  }
  for (const f of proyecto.fuentesCurriculares) ids.add(f.id);
  for (const v of proyecto.vinculosProgramaMarco) ids.add(v.id);
  for (const a of proyecto.alineaciones) ids.add(a.id);
  return ids;
}

/** Remapea ids de afirmaciones para que la copia no colisione con el original. */
function clonarAfirmaciones(
  items: AfirmacionCurricular[],
  ocupados: Set<string>
): AfirmacionCurricular[] {
  return clonar(items).map((a) => ({ ...a, id: idLibre(ocupados, `${a.id}_copia`) }));
}

export type ResultadoDuplicado =
  | { ok: true; proyecto: ProyectoCurricular; nuevoId: string }
  | { ok: false; motivo: string };

/**
 * Duplica un documento como base de otro nuevo. El original queda intacto;
 * la copia nace sin finalizar, sin vínculos ni alineaciones, con ids propios
 * y con `origenCopia` apuntando a su fuente. Los códigos se limpian para que
 * el docente defina la identidad del nuevo documento.
 */
export function duplicarDocumento(
  base: ProyectoCurricular,
  nivel: NivelCatalogo,
  id: string
): ResultadoDuplicado {
  const proyecto = clonar(base);
  const ocupados = idsOcupados(proyecto);

  if (nivel === "macro") {
    const original = proyecto.marcos.find((m) => m.id === id);
    if (!original) return { ok: false, motivo: "El marco ya no existe." };
    const nuevoId = idLibre(ocupados, idNuevo("marco"));
    proyecto.marcos.push({
      ...clonar(original),
      id: nuevoId,
      nombre: original.nombre ? `${original.nombre} (copia)` : "Marco (copia)",
      principios: clonarAfirmaciones(original.principios, ocupados),
      afirmaciones: clonarAfirmaciones(original.afirmaciones, ocupados),
      finalizado: false,
      origenCopia: { nivel, id: original.id, nombre: original.nombre || "Marco sin nombre" }
    });
    return { ok: true, proyecto, nuevoId };
  }

  if (nivel === "meso") {
    const original = proyecto.programas.find((p) => p.id === id);
    if (!original) return { ok: false, motivo: "El programa ya no existe." };
    const nuevoId = idLibre(ocupados, idNuevo("programa"));
    proyecto.programas.push({
      ...clonar(original),
      id: nuevoId,
      nombre: original.nombre ? `${original.nombre} (copia)` : "Programa (copia)",
      codigo: undefined,
      perfilIngreso: clonarAfirmaciones(original.perfilIngreso, ocupados),
      perfilEgreso: clonarAfirmaciones(original.perfilEgreso, ocupados),
      resultadosPrograma: clonarAfirmaciones(original.resultadosPrograma, ocupados),
      finalizado: false,
      origenCopia: { nivel, id: original.id, nombre: original.nombre || "Programa sin nombre" }
    });
    return { ok: true, proyecto, nuevoId };
  }

  const original = proyecto.asignaturas.find((a) => a.id === id);
  if (!original) return { ok: false, motivo: "La asignatura ya no existe." };
  const micro = clonar(original.microcurriculo);
  // Remapea RA y actividades para que la trazabilidad de la copia sea suya.
  const mapaRa = new Map<string, string>();
  for (const u of micro.contenido.unidades) {
    for (const ra of u.resultadosAprendizaje) {
      const nuevo = idLibre(ocupados, `${ra.id}_copia`);
      mapaRa.set(ra.id, nuevo);
      ra.id = nuevo;
    }
  }
  for (const c of micro.evaluacion.cortes) {
    for (const a of c.actividades) {
      a.id = idLibre(ocupados, `${a.id}_copia`);
      a.mideIds = a.mideIds.filter((v) => mapaRa.has(v)).map((v) => mapaRa.get(v) as string);
    }
  }
  const nombreBase =
    micro.ident.asignatura && micro.ident.asignatura !== "[por definir]"
      ? micro.ident.asignatura
      : "Asignatura";
  micro.ident.asignatura = `${nombreBase} (copia)`;
  micro.ident.codigo = "";
  micro.folio = folioNuevo();
  const asignatura: Asignatura = {
    id: idLibre(ocupados, idNuevo("asignatura")),
    programaId: original.programaId,
    microcurriculo: micro,
    finalizado: false,
    origenCopia: { nivel, id: original.id, nombre: nombreBase }
  };
  proyecto.asignaturas.push(asignatura);
  return { ok: true, proyecto, nuevoId: asignatura.id };
}

export type ResultadoFinalizado =
  | { ok: true; proyecto: ProyectoCurricular }
  | { ok: false; motivo: string };

/**
 * Marca o desmarca un documento como finalizado. Es una marca del docente
 * para reutilizarlo, no una aprobación oficial: no cambia estados ni citas.
 */
export function marcarFinalizado(
  base: ProyectoCurricular,
  nivel: NivelCatalogo,
  id: string,
  valor: boolean
): ResultadoFinalizado {
  const proyecto = clonar(base);
  if (nivel === "macro") {
    const doc = proyecto.marcos.find((m) => m.id === id);
    if (!doc) return { ok: false, motivo: "El marco ya no existe." };
    doc.finalizado = valor;
    return { ok: true, proyecto };
  }
  if (nivel === "meso") {
    const doc = proyecto.programas.find((p) => p.id === id);
    if (!doc) return { ok: false, motivo: "El programa ya no existe." };
    doc.finalizado = valor;
    return { ok: true, proyecto };
  }
  const doc = proyecto.asignaturas.find((a) => a.id === id);
  if (!doc) return { ok: false, motivo: "La asignatura ya no existe." };
  doc.finalizado = valor;
  return { ok: true, proyecto };
}
