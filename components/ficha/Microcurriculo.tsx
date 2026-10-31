"use client";

import { Icono } from "@/components/Icono";
import { Seccion } from "@/components/ficha/Seccion";
import {
  BibliografiaSeccion,
  ContenidoSeccion,
  EvaluacionSeccion,
  IdentificacionSeccion,
  JustificacionSeccion,
  MetodologiaSeccion,
  ObjetivosSeccion,
  SecuenciaSeccion
} from "@/components/ficha/Secciones";
import {
  POR_DEFINIR,
  SECCIONES,
  actividadesSinInstrumento,
  ajustarCortesA100,
  primeraIncompleta,
  referenciasSinConfirmar,
  resumenSeccion,
  seccionCompleta,
  seccionesCompletas,
  totalPorcentaje,
  unidadesConSesiones,
  unidadesSinResultados,
  unidadesSinSesiones,
  type Microcurriculo,
  type SeccionId
} from "@/lib/schema";

/** Orden del documento oficial, que no es el orden de la conversación. */
const ORDEN_DOCUMENTO: SeccionId[] = [
  "ident",
  "justificacion",
  "objetivos",
  "contenido",
  "secuencia",
  "metodologia",
  "evaluacion",
  "bibliografia"
];

export function MicrocurriculoFicha({
  micro,
  activa,
  onChange
}: {
  micro: Microcurriculo;
  /** Sección que el asistente está trabajando; si es null, la primera pendiente. */
  activa: SeccionId | null;
  onChange: (next: Microcurriculo) => void;
}) {
  const completas = seccionesCompletas(micro);
  const enFoco = activa ?? primeraIncompleta(micro);
  const total = totalPorcentaje(micro.evaluacion.cortes);
  const sinConfirmar = referenciasSinConfirmar(micro);
  const sinRa = unidadesSinResultados(micro);
  const sinSesiones = unidadesSinSesiones(micro);
  const sinInstrumento = actividadesSinInstrumento(micro);
  const horas =
    micro.ident.horas.teoricas + micro.ident.horas.practicas + micro.ident.horas.independientes;

  const conEstado = (id: SeccionId) => ({
    id,
    completa: seccionCompleta(micro, id),
    activa: enFoco === id,
    resumen: resumenSeccion(micro, id)
  });

  return (
    <div className="space-y-3">
      {/* Franja de identificación + progreso */}
      <header className="rounded-[18px] border border-white/60 bg-crema shadow-tarjeta">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3">
          <h1 className="min-w-0 flex-1 font-display text-[16px] font-semibold tracking-tight">
            {micro.ident.asignatura === POR_DEFINIR ? "Microcurrículo sin asignatura" : micro.ident.asignatura}
          </h1>
          <span className="font-mono text-[11px] text-black/40">{micro.folio}</span>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 px-4 pt-1.5 text-[11.5px] text-black/55">
          <div className="flex gap-1">
            <dt className="text-black/40">Programa:</dt>
            <dd className="truncate">{micro.ident.programa}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-black/40">Semestre:</dt>
            <dd>{micro.ident.semestre}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-black/40">Créditos:</dt>
            <dd className="font-mono tabular-nums">{micro.ident.creditos}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-black/40">Horas:</dt>
            <dd className="font-mono tabular-nums">{horas}</dd>
          </div>
        </dl>

        {/* Progreso: siete marcas, una por sección. Se lee como el documento,
            no como una barra genérica. */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex flex-1 gap-1" role="img" aria-label={`${completas} de 7 secciones completas`}>
            {SECCIONES.map((s) => {
              const ok = seccionCompleta(micro, s);
              return (
                <span
                  key={s}
                  title={s}
                  className={`h-1.5 flex-1 rounded-full ${ok ? "bg-rainfall" : "bg-black/10"}`}
                />
              );
            })}
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-black/50">
            {completas}/{SECCIONES.length}
          </span>
        </div>
      </header>

      {/* Avisos globales: solo los que el docente necesita ver sin abrir nada */}
      {(micro.evaluacion.cortes.length > 0 && total !== 100) ||
      sinConfirmar > 0 ||
      sinRa > 0 ||
      sinSesiones > 0 ||
      sinInstrumento > 0 ? (
        <div className="flex flex-wrap gap-2">
          {micro.evaluacion.cortes.length > 0 && total !== 100 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1.5 text-[11.5px] text-black/75">
              <Icono nombre="alerta" className="h-3.5 w-3.5 text-terracotta" />
              Evaluación suma <strong className="font-semibold tabular-nums">{total}%</strong>
            </span>
          )}
          {sinRa > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1.5 text-[11.5px] text-black/75">
              <Icono nombre="alerta" className="h-3.5 w-3.5 text-terracotta" />
              {sinRa} unidad{sinRa === 1 ? "" : "es"} sin resultados de aprendizaje
            </span>
          )}
          {sinSesiones > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1.5 text-[11.5px] text-black/75">
              <Icono nombre="alerta" className="h-3.5 w-3.5 text-terracotta" />
              {sinSesiones} unidad{sinSesiones === 1 ? "" : "es"} sin sesiones
            </span>
          )}
          {sinInstrumento > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1.5 text-[11.5px] text-black/75">
              <Icono nombre="alerta" className="h-3.5 w-3.5 text-terracotta" />
              {sinInstrumento} actividad{sinInstrumento === 1 ? "" : "es"} sin instrumento
            </span>
          )}
          {sinConfirmar > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mora/10 px-3 py-1.5 text-[11.5px] text-black/75">
              <Icono nombre="alerta" className="h-3.5 w-3.5 text-mora" />
              {sinConfirmar} referencia{sinConfirmar === 1 ? "" : "s"} por confirmar
            </span>
          )}
        </div>
      ) : null}

      {ORDEN_DOCUMENTO.map((id) => {
        const estado = conEstado(id);
        switch (id) {
          case "ident":
            return (
              <Seccion key={id} {...estado}>
                <IdentificacionSeccion
                  ident={micro.ident}
                  onChange={(ident) => onChange({ ...micro, ident })}
                />
              </Seccion>
            );
          case "justificacion":
            return (
              <Seccion key={id} {...estado}>
                <JustificacionSeccion
                  valor={micro.justificacion}
                  onChange={(justificacion) => onChange({ ...micro, justificacion })}
                />
              </Seccion>
            );
          case "objetivos":
            return (
              <Seccion key={id} {...estado}>
                <ObjetivosSeccion
                  objetivos={micro.objetivos}
                  onChange={(objetivos) => onChange({ ...micro, objetivos })}
                />
              </Seccion>
            );
          case "contenido":
            return (
              <Seccion key={id} {...estado}>
                <ContenidoSeccion
                  contenido={micro.contenido}
                  onChange={(contenido) => onChange({ ...micro, contenido })}
                />
              </Seccion>
            );
          case "secuencia":
            return (
              <Seccion
                key={id}
                {...estado}
                extra={
                  micro.contenido.unidades.length > 0 ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                        unidadesConSesiones(micro) === micro.contenido.unidades.length
                          ? "bg-rainfall/10 text-rainfall"
                          : "bg-terracotta/10 text-terracotta"
                      }`}
                      title="Unidades con al menos una sesión"
                    >
                      {unidadesConSesiones(micro)}/{micro.contenido.unidades.length}
                    </span>
                  ) : null
                }
              >
                <SecuenciaSeccion
                  micro={micro}
                  onChange={(secuencia) => onChange({ ...micro, secuencia })}
                />
              </Seccion>
            );
          case "metodologia":
            return (
              <Seccion key={id} {...estado}>
                <MetodologiaSeccion
                  metodologia={micro.metodologia}
                  onChange={(metodologia) => onChange({ ...micro, metodologia })}
                />
              </Seccion>
            );
          case "evaluacion":
            return (
              <Seccion
                key={id}
                {...estado}
                extra={
                  micro.evaluacion.cortes.length > 0 ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                        total === 100 ? "bg-rainfall/10 text-rainfall" : "bg-terracotta/10 text-terracotta"
                      }`}
                    >
                      {total}%
                    </span>
                  ) : null
                }
              >
                <EvaluacionSeccion
                  evaluacion={micro.evaluacion}
                  onChange={(evaluacion) => onChange({ ...micro, evaluacion })}
                  onAjustar={() =>
                    onChange({
                      ...micro,
                      evaluacion: { cortes: ajustarCortesA100(micro.evaluacion.cortes) }
                    })
                  }
                />
              </Seccion>
            );
          case "bibliografia":
            return (
              <Seccion key={id} {...estado}>
                <BibliografiaSeccion
                  micro={micro}
                  onChange={(bibliografia) => onChange({ ...micro, bibliografia })}
                />
              </Seccion>
            );
        }
      })}
    </div>
  );
}
