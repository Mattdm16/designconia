/**
 * Exportación del programa académico a TEXTO PLANO.
 *
 * Sin sintaxis de Markdown: cada cosa con su nombre y su contenido, para
 * pegar en un correo, en un documento institucional o para imprimir.
 * El generador de PDF consume exactamente este texto.
 */

import { POR_DEFINIR } from "./schema.ts";
import type { FuenteCurricular, ProgramaAcademico } from "./proyecto.ts";

export type ContextoProgramaTexto = {
  /** Nombre del marco institucional que orienta al programa. */
  marcoNombre: string | null;
  /** Principios que sostienen cada resultado (por id de resultado). */
  principiosPorResultado: Record<string, string[]>;
  /** RA que concretan cada resultado (por id de resultado). */
  rasPorResultado: Record<string, string[]>;
  /** Nombres de las asignaturas vinculadas. */
  asignaturas: string[];
  /** Fuentes del proyecto, para resolver los respaldos. */
  fuentes: FuenteCurricular[];
};

function linea(etiqueta: string, valor: string): string {
  return `${etiqueta}: ${valor || POR_DEFINIR}`;
}

function detalleCita(
  cita: { fuenteId: string; localizador?: string; pagina?: number | string; seccion?: string },
  fuentes: FuenteCurricular[]
): string {
  const titulo = fuentes.find((f) => f.id === cita.fuenteId)?.titulo?.trim() || cita.fuenteId;
  const partes = [titulo];
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

/** Programa académico completo en texto plano. */
export function programaATexto(p: ProgramaAcademico, ctx: ContextoProgramaTexto): string {
  const l: string[] = [];
  l.push(`PROGRAMA ACADÉMICO — ${p.nombre.trim() || POR_DEFINIR}`);
  l.push("");

  l.push("1. IDENTIFICACIÓN");
  l.push(linea("Nombre", p.nombre.trim()));
  l.push(linea("Código", (p.codigo ?? "").trim()));
  l.push(linea("Estado", p.estado === "pendiente_legado" ? "Pendiente (legado)" : p.estado));
  l.push(linea("Marco que lo orienta", (ctx.marcoNombre ?? "").trim()));
  l.push("");

  const seccionAfirmaciones = (
    titulo: string,
    items: ProgramaAcademico["resultadosPrograma"],
    vinculos?: (id: string) => [etiqueta: string, lista: string[]][]
  ) => {
    l.push(titulo);
    if (items.length === 0) {
      l.push(POR_DEFINIR);
    } else {
      for (const a of items) {
        l.push(`- ${a.texto.trim() || POR_DEFINIR} [${etiquetaAfirmacion(a)}]`);
        for (const c of a.citas) l.push(`    Respaldo: ${detalleCita(c, ctx.fuentes)}`);
        if (vinculos) {
          for (const [etiqueta, lista] of vinculos(a.id)) {
            if (lista.length) {
              l.push(`    ${etiqueta}:`);
              for (const t of lista) l.push(`      · ${t}`);
            }
          }
        }
      }
    }
    l.push("");
  };

  seccionAfirmaciones("2. PERFIL DE INGRESO", p.perfilIngreso);
  seccionAfirmaciones("3. PERFIL DE EGRESO", p.perfilEgreso);
  seccionAfirmaciones("4. RESULTADOS DEL PROGRAMA", p.resultadosPrograma, (id) => [
    ["Sostenido por", ctx.principiosPorResultado[id] ?? []],
    ["Se concreta en", ctx.rasPorResultado[id] ?? []]
  ]);

  l.push("5. ASIGNATURAS VINCULADAS");
  if (ctx.asignaturas.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    for (const nombre of ctx.asignaturas) l.push(`- ${nombre.trim() || POR_DEFINIR}`);
  }
  l.push("");

  return l.join("\n");
}
