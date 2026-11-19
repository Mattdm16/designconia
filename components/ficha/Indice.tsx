"use client";

import { Icono } from "@/components/Icono";

export type EntradaIndice<T extends string> = {
  id: T;
  etiqueta: string;
  completa: boolean;
  enFoco: boolean;
};

/**
 * Índice de secciones: fila de chips con el estado de cada parte del
 * documento. Un toque abre esa sección y la lleva a la vista; la que el
 * asistente está trabajando lleva el anillo Pebble.
 */
export function IndiceSecciones<T extends string>({
  titulo,
  entradas,
  onElegir
}: {
  titulo: string;
  entradas: EntradaIndice<T>[];
  onElegir: (id: T) => void;
}) {
  return (
    <nav aria-label={titulo} className="flex flex-wrap gap-1.5">
      {entradas.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onElegir(e.id)}
          aria-current={e.enFoco ? "true" : undefined}
          title={e.completa ? `${e.etiqueta} (completa)` : e.etiqueta}
          className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
            e.enFoco
              ? "border-pebble/60 bg-white text-black ring-1 ring-pebble/30"
              : "border-black/10 bg-crema/80 text-black/60 hover:border-black/25 hover:text-black"
          }`}
        >
          <span
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
              e.completa ? "border-rainfall bg-rainfall text-white" : "border-black/20 text-transparent"
            }`}
            aria-hidden="true"
          >
            <Icono nombre="check" className="h-2 w-2" />
          </span>
          <span className="truncate">{e.etiqueta}</span>
        </button>
      ))}
    </nav>
  );
}
