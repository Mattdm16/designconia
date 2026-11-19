"use client";

import { Icono } from "@/components/Icono";
import { DESCRIPCION_SECCION, ETIQUETA_SECCION, type SeccionId } from "@/lib/schema";

/**
 * Contenedor de una sección del microcurrículo. Es controlado: la ficha
 * decide qué sección está abierta (acordeón exclusivo) y la abre sola cuando
 * el asistente la está trabajando.
 *
 * El estado de la sección es visible sin abrirla: un check cuando está
 * cerrada y un punto cuando falta algo. La sección que el asistente está
 * trabajando lleva el trazo Pebble, que es la señal de «esto es lo que está
 * cambiando ahora».
 */
export function Seccion({
  id,
  completa,
  activa,
  resumen,
  extra,
  abierta,
  onAlternar,
  children
}: {
  id: SeccionId;
  completa: boolean;
  activa: boolean;
  resumen: string;
  /** Contenido a la derecha de la cabecera (p. ej. la suma de porcentajes). */
  extra?: React.ReactNode;
  /** true si esta sección es la abierta del acordeón. */
  abierta: boolean;
  /** Abre esta sección (o la cierra si ya era la abierta). */
  onAlternar: () => void;
  children: React.ReactNode;
}) {

  return (
    <section
      id={`seccion-${id}`}
      aria-label={ETIQUETA_SECCION[id]}
      className={`scroll-mt-4 overflow-hidden rounded-[18px] border bg-crema shadow-lienzo transition-colors ${
        activa ? "border-pebble/50 ring-1 ring-pebble/30" : "border-white/60"
      }`}
    >
      <h2>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierta}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        >
          <Icono
            nombre="chevron"
            className={`h-4 w-4 shrink-0 text-black/40 transition-transform ${abierta ? "rotate-90" : ""}`}
          />
          {/* Estado: check si está cerrada, punto si falta algo */}
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
              completa ? "border-rainfall bg-rainfall text-white" : "border-black/20 text-transparent"
            }`}
            aria-hidden="true"
          >
            <Icono nombre="check" className="h-2.5 w-2.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-sm font-semibold tracking-tight">{ETIQUETA_SECCION[id]}</span>
              <span className="truncate text-[11px] text-black/45">{resumen}</span>
            </span>
            {!abierta && !completa && (
              <span className="mt-0.5 block truncate text-[11px] text-black/35">{DESCRIPCION_SECCION[id]}</span>
            )}
          </span>
          {extra}
          <span className="sr-only">{completa ? "Sección completa" : "Sección pendiente"}</span>
        </button>
      </h2>

      {abierta && <div className="space-y-3 border-t border-black/[0.07] p-4">{children}</div>}
    </section>
  );
}
