/**
 * Exportación del microcurrículo a TEXTO PLANO.
 *
 * Sin sintaxis de Markdown: cada cosa con su nombre y su contenido, para
 * pegar en un correo, en un formulario institucional o para imprimir.
 * El generador de PDF consume exactamente este texto, así que lo que ves
 * aquí es lo que sale en el documento.
 */

import {
  ETIQUETA_TIPO_SESION,
  POR_DEFINIR,
  textoRa,
  totalPorcentaje,
  usosDeRecurso,
  horasPorTipo,
  type Microcurriculo,
  type Referencia,
  type Sesion
} from "./schema.ts";

function linea(etiqueta: string, valor: string): string {
  return `${etiqueta}: ${valor || POR_DEFINIR}`;
}

function listaPlana(items: string[], sangria = ""): string[] {
  if (items.length === 0) return [`${sangria}${POR_DEFINIR}`];
  return items.map((i) => `${sangria}- ${i}`);
}

function referenciaTexto(r: Referencia): string {
  // Editorial, año y edición van juntos: "Editorial, 2021, 9.ª ed.".
  // Se quita el punto final de cada parte para no encadenar "S.." al unir.
  const limpio = (v: string) => (v || "").trim().replace(/\.+$/, "");
  const edCrudo = limpio(r.edicion);
  // El modelo a veces manda "10.ª edición": no hay que añadirle otro "ed.".
  const edicion = edCrudo
    ? /ed(\.|ici[oó]n)?$/i.test(edCrudo)
      ? edCrudo
      : `${edCrudo} ed.`
    : "";
  const publicacion = [limpio(r.dato), limpio(r.anio), edicion].filter(Boolean).join(", ");

  const partes = [limpio(r.autor), limpio(r.titulo), publicacion].filter(Boolean);
  if (r.isbn.trim()) partes.push(`ISBN ${r.isbn.trim()}`);
  const estado = r.confirmada ? "" : " [SIN CONFIRMAR]";
  return `- ${partes.join(". ") || POR_DEFINIR}${estado}`;
}

function fase(sesion: Sesion, nombre: "inicio" | "desarrollo" | "cierre"): string[] {
  const filas = sesion[nombre];
  const salida = [`  ${nombre.toUpperCase()}`];
  if (filas.length === 0) {
    salida.push(`    ${POR_DEFINIR}`);
    return salida;
  }
  for (const f of filas) {
    salida.push(`    Docente:     ${f.docente || POR_DEFINIR}`);
    salida.push(`    Estudiante:  ${f.estudiante || POR_DEFINIR}`);
    if (f.recursos.length) salida.push(`    Recursos:    ${f.recursos.join(", ")}`);
  }
  return salida;
}

export function microcurriculoATexto(m: Microcurriculo): string {
  const l: string[] = [];
  const totalHoras = m.ident.horas.teoricas + m.ident.horas.practicas + m.ident.horas.independientes;
  const titulo = m.ident.asignatura === POR_DEFINIR ? "MICROCURRÍCULO" : `MICROCURRÍCULO: ${m.ident.asignatura}`;

  l.push(titulo.toUpperCase());
  if (m.folio.trim()) l.push(`Folio: ${m.folio}`);
  l.push("");

  /* 1. Identificación */
  l.push("1. DATOS DE IDENTIFICACIÓN");
  l.push(linea("Asignatura", m.ident.asignatura));
  l.push(linea("Código", m.ident.codigo));
  l.push(linea("Programa académico", m.ident.programa));
  l.push(linea("Semestre / nivel", m.ident.semestre));
  l.push(linea("Créditos", String(m.ident.creditos)));
  l.push(
    `Horas: ${m.ident.horas.teoricas} teóricas, ${m.ident.horas.practicas} prácticas, ` +
      `${m.ident.horas.independientes} de trabajo independiente (${totalHoras} en total)`
  );
  l.push(
    m.ident.prerrequisitos.length
      ? `Prerrequisitos: ${m.ident.prerrequisitos.join("; ")}`
      : "Prerrequisitos: Sin prerrequisitos"
  );
  l.push("");

  /* 2. Justificación */
  l.push("2. JUSTIFICACIÓN");
  l.push(m.justificacion.trim() || POR_DEFINIR);
  l.push("");

  /* 3. Objetivos */
  l.push("3. OBJETIVOS O COMPETENCIAS");
  l.push("Generales:");
  l.push(...listaPlana(m.objetivos.generales, "  "));
  l.push("Específicas:");
  l.push(...listaPlana(m.objetivos.especificas, "  "));
  l.push("");

  /* 4. Contenido temático */
  l.push("4. CONTENIDO TEMÁTICO");
  if (m.contenido.unidades.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    for (const u of m.contenido.unidades) {
      l.push(`Unidad ${u.numero}. ${u.titulo || POR_DEFINIR}`);
      if (u.resultadosAprendizaje.length) {
        l.push("  Resultados de aprendizaje:");
        l.push(...listaPlana(u.resultadosAprendizaje.map((r) => r.texto), "    "));
      } else {
        l.push(`  Resultados de aprendizaje: ${POR_DEFINIR}`);
      }
      if (u.temas.length) {
        l.push("  Temas:");
        for (const t of u.temas) {
          l.push(`    - ${t.nombre || POR_DEFINIR}`);
          for (const sub of t.subtemas) l.push(`        · ${sub}`);
        }
      }
      l.push("");
    }
  }

  /* 5. Secuencia didáctica */
  l.push("5. SECUENCIA DIDÁCTICA");
  if (m.secuencia.sesiones.length === 0 && m.secuencia.trabajosIndependientes.length === 0) {
    l.push(POR_DEFINIR);
    l.push("");
  } else {
    const mapeadas = horasPorTipo(m.secuencia.sesiones, m.secuencia.trabajosIndependientes);
    l.push(
      `Horas planificadas: ${mapeadas.teoricas} teóricas, ${mapeadas.practicas} prácticas, ` +
        `${mapeadas.independientes} de trabajo independiente`
    );
    l.push("");
    for (const s of m.secuencia.sesiones) {
      l.push(
        `Sesión ${s.numero} — ${s.tema || POR_DEFINIR} ` +
          `(${s.duracionMin} min, ${ETIQUETA_TIPO_SESION[s.tipo]}, Unidad ${s.unidad})`
      );
      l.push(...fase(s, "inicio"));
      l.push(...fase(s, "desarrollo"));
      l.push(...fase(s, "cierre"));
      l.push("");
    }
    if (m.secuencia.trabajosIndependientes.length > 0) {
      l.push("Trabajo independiente (esfuerzo estimado, fuera de las sesiones de clase):");
      for (const t of m.secuencia.trabajosIndependientes) {
        l.push(
          `- ${t.titulo || POR_DEFINIR} (${t.esfuerzoMin} min, Unidad ${t.unidad})` +
            (t.descripcion ? `: ${t.descripcion}` : "")
        );
      }
      l.push("");
    }
  }

  /* 6. Metodología */
  l.push("6. METODOLOGÍA");
  if (m.metodologia.estrategias.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    for (const e of m.metodologia.estrategias) {
      l.push(`- ${e.nombre}${e.descripcion ? `: ${e.descripcion}` : ""}`);
    }
  }
  l.push("");

  /* 7. Evaluación */
  l.push("7. SISTEMA DE EVALUACIÓN");
  if (m.evaluacion.cortes.length === 0) {
    l.push(POR_DEFINIR);
  } else {
    for (const c of m.evaluacion.cortes) {
      l.push(`${c.nombre || POR_DEFINIR} — ${c.porcentaje}%`);
      if (c.actividades.length === 0) l.push(`  ${POR_DEFINIR}`);
      for (const a of c.actividades) {
        l.push(`  - ${a.nombre || POR_DEFINIR}${a.descripcion ? `: ${a.descripcion}` : ""}`);
        l.push(`      Instrumento: ${a.instrumento || POR_DEFINIR}`);
        if (a.herramientas.length) l.push(`      Herramientas: ${a.herramientas.join(", ")}`);
        if (a.mideIds.length) {
          const vinculados = a.mideIds
            .map((id) => textoRa(m, id))
            .filter((t): t is string => t !== null);
          if (vinculados.length) l.push(`      Mide: ${vinculados.join("; ")}`);
        } else if (a.mide) l.push(`      Mide: ${a.mide}`);
      }
    }
    l.push(`Total: ${totalPorcentaje(m.evaluacion.cortes)}%`);
  }
  l.push("");

  /* 8. Bibliografía */
  l.push("8. BIBLIOGRAFÍA Y RECURSOS");
  l.push("Obligatorias:");
  l.push(
    ...(m.bibliografia.obligatorias.length
      ? m.bibliografia.obligatorias.map(referenciaTexto)
      : [`- ${POR_DEFINIR}`])
  );
  l.push("Complementarias:");
  l.push(
    ...(m.bibliografia.complementarias.length
      ? m.bibliografia.complementarias.map(referenciaTexto)
      : [`- ${POR_DEFINIR}`])
  );
  l.push("Recursos y herramientas:");
  l.push(
    ...(m.bibliografia.recursos.length
      ? m.bibliografia.recursos.map((r) => {
          const usos = usosDeRecurso(m, r);
          return `- ${r}${usos > 0 ? ` (usada en ${usos})` : " (sin uso declarado)"}`;
        })
      : [`- ${POR_DEFINIR}`])
  );

  const sinConfirmar = [...m.bibliografia.obligatorias, ...m.bibliografia.complementarias].filter(
    (r) => !r.confirmada
  );
  if (sinConfirmar.length) {
    l.push("");
    l.push(
      `NOTA: ${sinConfirmar.length} referencia(s) marcadas [SIN CONFIRMAR]. ` +
        "Verificar año, edición e ISBN antes de presentar el documento."
    );
  }

  return l.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
