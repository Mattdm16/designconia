/**
 * Exportación del marco institucional a TEXTO PLANO.
 *
 * Sin sintaxis de Markdown: cada cosa con su nombre y su contenido, para
 * pegar en un correo, en un documento institucional o para imprimir.
 * El generador de PDF consume exactamente este texto.
 */

import { POR_DEFINIR } from "./schema.ts";
import type { FuenteCurricular, MarcoEducativoInstitucional } from "./proyecto.ts";

function linea(etiqueta: string, valor: string): string {
  return `${etiqueta}: ${valor || POR_DEFINIR}`;
}

function tituloFuente(fuentes: FuenteCurricular[], fuenteId: string): string {
  return fuentes.find((f) => f.id === fuenteId)?.titulo?.trim() || fuenteId;
}

function detalleCita(
  cita: { fuenteId: string; localizador?: string; pagina?: number | string; seccion?: string },
  fuentes: FuenteCurricular[]
): string {
  const partes = [tituloFuente(fuentes, cita.fuenteId)];
  if (cita.localizador?.trim()) partes.push(cita.localizador.trim());
  if (cita.seccion?.trim()) partes.push(`secc. ${cita.seccion.trim()}`);
  if (cita.pagina !== undefined && String(cita.pagina).trim()) partes.push(`p. ${String(cita.pagina).trim()}`);
  return partes.join(" · ");
}

function etiquetaAfirmacion(a: { origen: string; estado: string }): string {
  if (a.origen === "sugerencia_IA" && a.estado === "sin_confirmar") return "Sugerencia de IA (sin confirmar)";
  if (a.estado === "contrastado_con_fuente") return "Contrastada con fuente";
  if (a.origen === "documento") return "Documento";
  if (a.estado === "confirmado_por_docente") return "Confirmada por el docente";
  return "Sin confirmar";
}

/** Marco institucional completo en texto plano. */
export function marcoATexto(m: MarcoEducativoInstitucional, fuentes: FuenteCurricular[]): string {
  const l: string[] = [];
  l.push(`MARCO EDUCATIVO INSTITUCIONAL — ${m.nombre.trim() || POR_DEFINIR}`);
  l.push("");

  l.push("1. IDENTIFICACIÓN");
  l.push(linea("Nombre", m.nombre.trim()));
  l.push(linea("Emite", (m.emisor ?? "").trim()));
  l.push(linea("Versión", m.version.trim()));
  const vigencia =
    m.vigencia && (m.vigencia.desde || m.vigencia.hasta)
      ? `${m.vigencia.desde ?? "—"} a ${m.vigencia.hasta ?? "—"}`
      : "";
  l.push(linea("Vigencia", vigencia));
  l.push(linea("Estado", m.estado === "borrador" ? "Borrador" : m.estado === "vigente" ? "Vigente" : "Archivado"));
  l.push("");

  const seccionAfirmaciones = (titulo: string, items: MarcoEducativoInstitucional["principios"]) => {
    l.push(titulo);
    if (items.length === 0) {
      l.push(POR_DEFINIR);
    } else {
      for (const a of items) {
        l.push(`- ${a.texto.trim() || POR_DEFINIR} [${etiquetaAfirmacion(a)}]`);
        for (const c of a.citas) l.push(`    Respaldo: ${detalleCita(c, fuentes)}`);
      }
    }
    l.push("");
  };

  seccionAfirmaciones("2. PRINCIPIOS", m.principios);
  seccionAfirmaciones("3. ORIENTACIONES", m.afirmaciones);

  l.push("4. FUENTES CURRICULARES");
  if (fuentes.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    for (const f of fuentes) {
      const extra = [f.tipo, f.emisor?.trim(), f.identificador?.trim(), f.url?.trim()].filter(Boolean);
      l.push(`- ${f.titulo.trim() || POR_DEFINIR}${extra.length ? ` (${extra.join(" · ")})` : ""}`);
    }
  }
  l.push("");

  return l.join("\n");
}
