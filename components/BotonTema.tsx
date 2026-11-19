"use client";

import { Icono } from "@/components/Icono";

export function BotonTema({ oscuro, onCambiar }: { oscuro: boolean; onCambiar: () => void }) {
  return (
    <button
      type="button"
      onClick={onCambiar}
      title={oscuro ? "Cambiar al modo claro" : "Cambiar al modo oscuro"}
      aria-label={oscuro ? "Cambiar al modo claro" : "Cambiar al modo oscuro"}
      aria-pressed={oscuro}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-crema/95 px-3 py-1.5 text-xs font-medium text-black/70 hover:border-black/25 hover:text-black"
    >
      <Icono nombre={oscuro ? "sol" : "luna"} className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{oscuro ? "Claro" : "Oscuro"}</span>
    </button>
  );
}
