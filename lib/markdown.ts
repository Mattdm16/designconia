/**
 * Exportación del microcurrículo a Markdown (para «Copiar» y pegar).
 *
 * El orden es el del documento oficial —identificación, justificación,
 * objetivos, contenido, secuencia, metodología, evaluación, bibliografía—,
 * no el orden en que se conversó.
 *
 * Nota: la ruta es relativa a propósito, igual que en schema.ts. El runner de
 * pruebas es un script Node pelado y no resuelve el alias "@/".
 */

import {
  ETIQUETA_TIPO_SESION,
  POR_DEFINIR,
  textoRa,
  totalPorcentaje,
  type Microcurriculo,
  type Referencia,
  type Sesion
} from "./schema.ts";
import type { FuenteCurricular, MarcoEducativoInstitucional, ProgramaAcademico } from "./proyecto.ts";
import type { ContextoProgramaTexto } from "./exportarMesoTexto.ts";

/** Escapa lo mínimo para que una celda de tabla no rompa el documento. */
function celda(v: string): string {
  return (v || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function lista(items: string[]): string {
  if (items.length === 0) return `- ${POR_DEFINIR}`;
  return items.map((x) => `- ${x}`).join("\n");
}

function referencia(r: Referencia): string {
  // Se quita el punto final de cada parte para no encadenar "I.." al unir.
  const partes = [r.autor, r.titulo, r.dato]
    .map((p) => (p || "").trim().replace(/\.+$/, ""))
    .filter(Boolean);
  const edicion = [r.anio.trim(), r.edicion.trim() ? `${r.edicion.trim()} ed.` : ""]
    .filter(Boolean)
    .join(", ");
  if (edicion) partes.push(edicion);
  if (r.isbn.trim()) partes.push(`ISBN ${r.isbn.trim()}`);
  const estado = r.confirmada ? "" : " _(sugerencia sin confirmar)_";
  return `- ${partes.join(". ") || POR_DEFINIR}${estado}`;
}

/** Una sesión con sus tres fases, en tabla para que se lea de un vistazo. */
function sesionMd(s: Sesion): string[] {
  const l: string[] = [];
  l.push(
    `### Sesión ${s.numero} — ${s.tema || POR_DEFINIR} (${s.duracionMin} min · ${ETIQUETA_TIPO_SESION[s.tipo]} · Unidad ${s.unidad})`
  );
  l.push("");
  for (const fase of ["inicio", "desarrollo", "cierre"] as const) {
    const filas = s[fase];
    const titulo = fase === "inicio" ? "Inicio" : fase === "desarrollo" ? "Desarrollo" : "Cierre";
    if (filas.length === 0) continue;
    l.push(`**${titulo}**`);
    l.push("");
    l.push("| Docente | Estudiante | Recursos |");
    l.push("| --- | --- | --- |");
    for (const f of filas) {
      l.push(`| ${celda(f.docente) || POR_DEFINIR} | ${celda(f.estudiante) || POR_DEFINIR} | ${celda(f.recursos.join(", ")) || "—"} |`);
    }
    l.push("");
  }
  return l;
}

export function microcurriculoAMarkdown(m: Microcurriculo): string {
  const l: string[] = [];
  const totalHoras = m.ident.horas.teoricas + m.ident.horas.practicas + m.ident.horas.independientes;

  l.push(`# ${m.ident.asignatura === POR_DEFINIR ? "Microcurrículo" : m.ident.asignatura}`);
  l.push("");
  if (m.folio && m.folio.trim()) {
    l.push(`**Folio:** ${m.folio}`);
    l.push("");
  }

  /* 1. Identificación */
  l.push("## 1. Datos de identificación");
  l.push("");
  l.push(`- **Asignatura:** ${m.ident.asignatura}`);
  l.push(`- **Código:** ${m.ident.codigo}`);
  l.push(`- **Programa académico:** ${m.ident.programa}`);
  l.push(`- **Semestre / nivel:** ${m.ident.semestre}`);
  l.push(`- **Créditos:** ${m.ident.creditos}`);
  l.push(
    `- **Horas:** ${totalHoras} en total — teóricas ${m.ident.horas.teoricas}, prácticas ${m.ident.horas.practicas}, trabajo independiente ${m.ident.horas.independientes}`
  );
  l.push(
    `- **Prerrequisitos:** ${m.ident.prerrequisitos.length ? m.ident.prerrequisitos.join("; ") : "Sin prerrequisitos"}`
  );
  l.push("");

  /* 2. Justificación */
  l.push("## 2. Justificación");
  l.push("");
  l.push(m.justificacion || POR_DEFINIR);
  l.push("");

  /* 3. Objetivos */
  l.push("## 3. Objetivos o competencias");
  l.push("");
  l.push("**Generales**");
  l.push("");
  l.push(lista(m.objetivos.generales));
  l.push("");
  l.push("**Específicas**");
  l.push("");
  l.push(lista(m.objetivos.especificas));
  l.push("");

  /* 4. Contenido temático */
  l.push("## 4. Contenido temático");
  l.push("");
  if (m.contenido.unidades.length === 0) {
    l.push(POR_DEFINIR);
    l.push("");
  } else {
    for (const u of m.contenido.unidades) {
      l.push(`### Unidad ${u.numero}. ${u.titulo || POR_DEFINIR}`);
      l.push("");
      if (u.resultadosAprendizaje.length) {
        l.push("**Resultados de aprendizaje**");
        l.push("");
        for (const r of u.resultadosAprendizaje) l.push(`- ${r.texto}`);
        l.push("");
      } else {
        l.push(`**Resultados de aprendizaje:** ${POR_DEFINIR}`);
        l.push("");
      }
      for (const t of u.temas) {
        l.push(`- **${t.nombre || POR_DEFINIR}**`);
        for (const s of t.subtemas) l.push(`  - ${s}`);
      }
      l.push("");
    }
  }

  /* 5. Secuencia didáctica */
  l.push("## 5. Secuencia didáctica");
  l.push("");
  if (m.secuencia.sesiones.length === 0 && m.secuencia.trabajosIndependientes.length === 0) {
    l.push(POR_DEFINIR);
    l.push("");
  } else {
    for (const s of m.secuencia.sesiones) {
      l.push(...sesionMd(s));
    }
    if (m.secuencia.trabajosIndependientes.length > 0) {
      l.push("### Trabajo independiente (esfuerzo estimado)");
      l.push("");
      for (const t of m.secuencia.trabajosIndependientes) {
        l.push(
          `- **${t.titulo || POR_DEFINIR}** — ${t.esfuerzoMin} min · Unidad ${t.unidad}` +
            (t.descripcion ? ` — ${t.descripcion}` : "")
        );
      }
      l.push("");
    }
  }

  /* 6. Metodología */
  l.push("## 6. Metodología");
  l.push("");
  if (m.metodologia.estrategias.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    for (const e of m.metodologia.estrategias) {
      l.push(`- **${e.nombre}**${e.descripcion ? ` — ${e.descripcion}` : ""}`);
    }
  }
  l.push("");

  /* 7. Evaluación */
  l.push("## 7. Sistema de evaluación");
  l.push("");
  if (m.evaluacion.cortes.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    const total = totalPorcentaje(m.evaluacion.cortes);
    if (total !== 100) {
      l.push(`> Los porcentajes suman ${total}% y no 100%. Revisar antes de publicar.`);
      l.push("");
    }
    l.push("| Corte | % | Actividad | Instrumento | Herramientas | Mide |");
    l.push("| --- | --- | --- | --- | --- | --- |");
    for (const c of m.evaluacion.cortes) {
      if (c.actividades.length === 0) {
        l.push(`| ${celda(c.nombre)} | ${c.porcentaje}% | ${POR_DEFINIR} | ${POR_DEFINIR} | — | — |`);
        continue;
      }
      for (const a of c.actividades) {
        const descripcion = a.descripcion ? `${a.nombre}: ${a.descripcion}` : a.nombre;
        const vinculados = a.mideIds
          .map((id) => textoRa(m, id))
          .filter((t): t is string => t !== null);
        const mide = vinculados.length ? vinculados.join("; ") : a.mide;
        l.push(
          `| ${celda(c.nombre)} | ${c.porcentaje}% | ${celda(descripcion)} | ${celda(a.instrumento) || POR_DEFINIR} | ${celda(a.herramientas.join(", ")) || "—"} | ${celda(mide) || "—"} |`
        );
      }
    }
    l.push("");
    l.push(`**Total:** ${total}%`);
  }
  l.push("");

  /* 8. Bibliografía */
  l.push("## 8. Bibliografía y recursos");
  l.push("");
  l.push("**Obligatorias**");
  l.push("");
  l.push(m.bibliografia.obligatorias.length ? m.bibliografia.obligatorias.map(referencia).join("\n") : `- ${POR_DEFINIR}`);
  l.push("");
  l.push("**Complementarias**");
  l.push("");
  l.push(
    m.bibliografia.complementarias.length
      ? m.bibliografia.complementarias.map(referencia).join("\n")
      : `- ${POR_DEFINIR}`
  );
  l.push("");
  l.push("**Recursos y herramientas**");
  l.push("");
  l.push(lista(m.bibliografia.recursos));
  l.push("");

  const sinConfirmar = [...m.bibliografia.obligatorias, ...m.bibliografia.complementarias].filter(
    (r) => !r.confirmada
  ).length;
  if (sinConfirmar > 0) {
    l.push(
      `> ${sinConfirmar} referencia(s) marcadas como sugerencia: verificar año, edición e ISBN antes de entregar.`
    );
    l.push("");
  }

  return l.join("\n");
}

/* ------------------------------------------------------------------ */
/* Marco y programa (para «Copiar» y pegar)                             */
/* ------------------------------------------------------------------ */

function respaldoMd(
  citas: { fuenteId: string; localizador?: string; pagina?: number | string; seccion?: string }[],
  fuentes: FuenteCurricular[]
): string {
  return citas
    .map((c) => {
      const titulo = fuentes.find((f) => f.id === c.fuenteId)?.titulo?.trim() || c.fuenteId;
      const partes = [titulo];
      if (c.localizador?.trim()) partes.push(c.localizador.trim());
      if (c.seccion?.trim()) partes.push(`secc. ${c.seccion.trim()}`);
      if (c.pagina !== undefined && String(c.pagina).trim()) partes.push(`p. ${String(c.pagina).trim()}`);
      return `_Respaldo: ${partes.join(" · ")}_`;
    })
    .join("\n");
}

function estadoAfirmacionMd(a: { origen: string; estado: string }): string {
  if (a.origen === "sugerencia_IA" && a.estado === "sin_confirmar") return "sugerencia de IA";
  if (a.estado === "contrastado_con_fuente") return "contrastada";
  if (a.origen === "documento") return "documento";
  if (a.estado === "confirmado_por_docente") return "confirmada";
  return "sin confirmar";
}

function afirmacionesMd(
  items: { id: string; texto: string; origen: string; estado: string; citas: Parameters<typeof respaldoMd>[0] }[],
  fuentes: FuenteCurricular[],
  extra?: (id: string) => string[]
): string[] {
  if (items.length === 0) return [`- ${POR_DEFINIR}`];
  const l: string[] = [];
  for (const a of items) {
    l.push(`- **${(a.texto || "").trim() || POR_DEFINIR}** (${estadoAfirmacionMd(a)})`);
    const respaldo = respaldoMd(a.citas as Parameters<typeof respaldoMd>[0], fuentes);
    if (respaldo) l.push(respaldo);
    for (const t of extra?.(a.id) ?? []) l.push(`  - ${t}`);
  }
  return l;
}

/** Marco institucional en Markdown. */
export function marcoAMarkdown(m: MarcoEducativoInstitucional, fuentes: FuenteCurricular[]): string {
  const l: string[] = [];
  l.push(`# ${m.nombre.trim() || POR_DEFINIR}`);
  l.push("");
  l.push(`**Emite:** ${m.emisor?.trim() || POR_DEFINIR} · **Versión:** ${m.version.trim() || POR_DEFINIR}`);
  l.push("");
  l.push("## Principios");
  l.push("");
  l.push(...afirmacionesMd(m.principios, fuentes));
  l.push("");
  l.push("## Orientaciones");
  l.push("");
  l.push(...afirmacionesMd(m.afirmaciones, fuentes));
  l.push("");
  l.push("## Fuentes");
  l.push("");
  l.push(
    fuentes.length
      ? fuentes.map((f) => `- **${f.titulo.trim() || POR_DEFINIR}** (${f.tipo})`).join("\n")
      : `- ${POR_DEFINIR}`
  );
  l.push("");
  return l.join("\n");
}

/** Programa académico en Markdown, con su trazabilidad resumida. */
export function programaAMarkdown(p: ProgramaAcademico, ctx: ContextoProgramaTexto): string {
  const l: string[] = [];
  l.push(`# ${p.nombre.trim() || POR_DEFINIR}`);
  l.push("");
  l.push(`**Código:** ${(p.codigo ?? "").trim() || POR_DEFINIR} · **Estado:** ${p.estado}`);
  l.push("");
  l.push(`**Marco que lo orienta:** ${(ctx.marcoNombre ?? "").trim() || POR_DEFINIR}`);
  l.push("");
  l.push("## Perfil de ingreso");
  l.push("");
  l.push(...afirmacionesMd(p.perfilIngreso, ctx.fuentes));
  l.push("");
  l.push("## Perfil de egreso");
  l.push("");
  l.push(...afirmacionesMd(p.perfilEgreso, ctx.fuentes));
  l.push("");
  l.push("## Resultados del programa");
  l.push("");
  if (p.resultadosPrograma.length === 0) {
    l.push(`- ${POR_DEFINIR}`);
  } else {
    for (const r of p.resultadosPrograma) {
      l.push(`- **${r.texto.trim() || POR_DEFINIR}** (${estadoAfirmacionMd(r)})`);
      const respaldo = respaldoMd(r.citas, ctx.fuentes);
      if (respaldo) l.push(respaldo);
      for (const s of ctx.principiosPorResultado[r.id] ?? []) l.push(`  - Sostenido por: ${s}`);
      for (const s of ctx.rasPorResultado[r.id] ?? []) l.push(`  - Se concreta en: ${s}`);
    }
  }
  l.push("");
  l.push("## Asignaturas vinculadas");
  l.push("");
  l.push(ctx.asignaturas.length ? ctx.asignaturas.map((n) => `- ${n.trim() || POR_DEFINIR}`).join("\n") : `- ${POR_DEFINIR}`);
  l.push("");
  return l.join("\n");
}
