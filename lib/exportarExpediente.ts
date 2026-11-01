/**
 * Expediente curricular conjunto: todo el proyecto en un solo documento.
 *
 * Reúne marcos, programas y asignaturas con su trazabilidad, reutilizando los
 * exportadores de cada nivel. Sirve para revisión institucional: lo que genera
 * es una propuesta de trabajo, no un documento aprobado.
 */

import { POR_DEFINIR } from "./schema.ts";
import { marcoAMarkdown, programaAMarkdown } from "./markdown.ts";
import { microcurriculoAMarkdown } from "./markdown.ts";
import { marcoATexto } from "./exportarMacroTexto.ts";
import { programaATexto, type ContextoProgramaTexto } from "./exportarMesoTexto.ts";
import { microcurriculoATexto } from "./exportarTexto.ts";
import type { ProyectoCurricular } from "./proyecto.ts";

function nombreAsignatura(p: ProyectoCurricular, asignaturaId: string): string {
  const a = p.asignaturas.find((x) => x.id === asignaturaId);
  return a?.microcurriculo.ident.asignatura.trim() || "Asignatura sin nombre";
}

function programaDeAsignatura(p: ProyectoCurricular, programaId: string | null): string {
  if (!programaId) return "Independiente (sin programa)";
  return p.programas.find((x) => x.id === programaId)?.nombre?.trim() || "Programa no encontrado";
}

/** Contexto de trazabilidad de un programa a partir del agregado. */
export function contextoProgramaExpediente(
  p: ProyectoCurricular,
  programaId: string
): ContextoProgramaTexto {
  const programa = p.programas.find((x) => x.id === programaId);
  const vinculo = p.vinculosProgramaMarco.find(
    (v) => v.programaId === programaId && v.principal && v.estado === "activo"
  );
  const marco = vinculo ? (p.marcos.find((m) => m.id === vinculo.marcoId) ?? null) : null;
  const principiosPorId = new Map((marco?.principios ?? []).map((a) => [a.id, a.texto] as const));
  const asignaturas = p.asignaturas.filter((a) => a.programaId === programaId);
  const rasPorId = new Map<string, string>();
  for (const a of asignaturas) {
    const nombre = a.microcurriculo.ident.asignatura.trim() || "Asignatura sin nombre";
    for (const u of a.microcurriculo.contenido.unidades) {
      for (const ra of u.resultadosAprendizaje) {
        if (!rasPorId.has(ra.id)) rasPorId.set(ra.id, `${ra.texto} (${nombre} · U${u.numero})`);
      }
    }
  }
  const principiosPorResultado: Record<string, string[]> = {};
  const rasPorResultado: Record<string, string[]> = {};
  for (const al of p.alineaciones) {
    if (
      al.origen.tipo === "principio_marco" &&
      al.destino.tipo === "resultado_programa" &&
      (al.destino.contextoId ?? programaId) === programaId
    ) {
      const t = principiosPorId.get(al.origen.id);
      if (t && programa?.resultadosPrograma.some((r) => r.id === al.destino.id)) {
        (principiosPorResultado[al.destino.id] ??= []).push(t);
      }
    }
    if (al.origen.tipo === "resultado_programa" && al.destino.tipo === "ra_micro") {
      const t = rasPorId.get(al.destino.id);
      if (t && programa?.resultadosPrograma.some((r) => r.id === al.origen.id)) {
        (rasPorResultado[al.origen.id] ??= []).push(t);
      }
    }
  }
  return {
    marcoNombre: marco?.nombre ?? null,
    principiosPorResultado,
    rasPorResultado,
    asignaturas: asignaturas.map((a) => a.microcurriculo.ident.asignatura.trim() || "Asignatura sin nombre"),
    fuentes: p.fuentesCurriculares
  };
}

function describirNodo(
  p: ProyectoCurricular,
  tipo: string,
  id: string,
  contextoId?: string
): string {
  if (tipo === "principio_marco") {
    for (const m of p.marcos) {
      const a = [...m.principios, ...m.afirmaciones].find((x) => x.id === id);
      if (a) return `Principio (${m.nombre.trim() || "marco"}): ${a.texto.trim()}`;
    }
    return `Principio no encontrado (${id})`;
  }
  if (tipo === "resultado_programa") {
    for (const prog of p.programas) {
      const r = prog.resultadosPrograma.find((x) => x.id === id);
      if (r) return `Resultado (${prog.nombre.trim() || "programa"}): ${r.texto.trim()}`;
    }
    return `Resultado no encontrado (${id})`;
  }
  if (tipo === "ra_micro") {
    const asignaturas = contextoId ? p.asignaturas.filter((a) => a.id === contextoId) : p.asignaturas;
    for (const a of asignaturas) {
      for (const u of a.microcurriculo.contenido.unidades) {
        const ra = u.resultadosAprendizaje.find((x) => x.id === id);
        if (ra) return `RA (${nombreAsignatura(p, a.id)} · U${u.numero}): ${ra.texto}`;
      }
    }
    return `RA no encontrado (${id})`;
  }
  const asignaturas = contextoId ? p.asignaturas.filter((a) => a.id === contextoId) : p.asignaturas;
  for (const a of asignaturas) {
    for (const c of a.microcurriculo.evaluacion.cortes) {
      const act = c.actividades.find((x) => x.id === id);
      if (act) return `Actividad (${nombreAsignatura(p, a.id)} · ${c.nombre.trim() || "corte"}): ${act.nombre.trim() || "sin nombre"}`;
    }
  }
  return `Actividad no encontrada (${id})`;
}

/** Expediente completo en texto plano. */
export function expedienteATexto(p: ProyectoCurricular): string {
  const l: string[] = [];
  l.push(`EXPEDIENTE CURRICULAR — ${(p.nombre ?? "").trim() || POR_DEFINIR}`);
  l.push(
    `Contenido: ${p.marcos.length} marco(s) · ${p.programas.length} programa(s) · ${p.asignaturas.length} asignatura(s) · ${p.alineaciones.length} alineación(es).`
  );
  l.push("Documento de trabajo: lo que genera el asistente es una propuesta, no un documento aprobado.");
  l.push("");

  l.push("########## MARCOS EDUCATIVOS INSTITUCIONALES ##########");
  l.push("");
  if (p.marcos.length === 0) l.push(POR_DEFINIR);
  for (const m of p.marcos) {
    l.push(marcoATexto(m, p.fuentesCurriculares));
  }

  l.push("########## PROGRAMAS ACADÉMICOS ##########");
  l.push("");
  if (p.programas.length === 0) l.push(POR_DEFINIR);
  for (const prog of p.programas) {
    l.push(programaATexto(prog, contextoProgramaExpediente(p, prog.id)));
  }

  l.push("########## ASIGNATURAS (MICROCURRÍCULOS) ##########");
  l.push("");
  if (p.asignaturas.length === 0) l.push(POR_DEFINIR);
  for (const a of p.asignaturas) {
    l.push(
      `Asignatura: ${a.microcurriculo.ident.asignatura.trim() || POR_DEFINIR} — Programa: ${programaDeAsignatura(p, a.programaId)}`
    );
    l.push("");
    l.push(microcurriculoATexto(a.microcurriculo));
  }

  l.push("########## ALINEACIONES ##########");
  l.push("");
  if (p.alineaciones.length === 0) {
    l.push("Sin alineaciones registradas.");
  } else {
    for (const al of p.alineaciones) {
      l.push(`- ${describirNodo(p, al.origen.tipo, al.origen.id, al.origen.contextoId)}`);
      l.push(`  → ${describirNodo(p, al.destino.tipo, al.destino.id, al.destino.contextoId)}${al.justificacion?.trim() ? ` (${al.justificacion.trim()})` : ""}`);
    }
  }
  l.push("");

  return l.join("\n");
}

/** Expediente completo en Markdown. */
export function expedienteAMarkdown(p: ProyectoCurricular): string {
  const l: string[] = [];
  l.push(`# Expediente curricular — ${(p.nombre ?? "").trim() || POR_DEFINIR}`);
  l.push("");
  l.push(`_${p.marcos.length} marco(s) · ${p.programas.length} programa(s) · ${p.asignaturas.length} asignatura(s) · ${p.alineaciones.length} alineación(es)._`);
  l.push("");
  l.push("> Documento de trabajo: lo que genera el asistente es una propuesta, no un documento aprobado.");
  l.push("");

  l.push("## Marcos educativos institucionales");
  l.push("");
  if (p.marcos.length === 0) l.push(`- ${POR_DEFINIR}`);
  for (const m of p.marcos) l.push(marcoAMarkdown(m, p.fuentesCurriculares));

  l.push("## Programas académicos");
  l.push("");
  if (p.programas.length === 0) l.push(`- ${POR_DEFINIR}`);
  for (const prog of p.programas) l.push(programaAMarkdown(prog, contextoProgramaExpediente(p, prog.id)));

  l.push("## Asignaturas");
  l.push("");
  if (p.asignaturas.length === 0) l.push(`- ${POR_DEFINIR}`);
  for (const a of p.asignaturas) {
    l.push(
      `### ${a.microcurriculo.ident.asignatura.trim() || POR_DEFINIR} — ${programaDeAsignatura(p, a.programaId)}`
    );
    l.push("");
    l.push(microcurriculoAMarkdown(a.microcurriculo));
  }

  l.push("## Alineaciones");
  l.push("");
  if (p.alineaciones.length === 0) {
    l.push("Sin alineaciones registradas.");
  } else {
    for (const al of p.alineaciones) {
      l.push(
        `- ${describirNodo(p, al.origen.tipo, al.origen.id, al.origen.contextoId)} → ${describirNodo(p, al.destino.tipo, al.destino.id, al.destino.contextoId)}`
      );
    }
  }
  l.push("");

  return l.join("\n");
}
