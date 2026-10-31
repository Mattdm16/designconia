"use client";

import { Icono } from "@/components/Icono";

/**
 * Campos editables de la ficha. Todos comparten la misma piel: sin bordes
 * hasta el foco, fondo blanco al escribir, y el texto que escribe la IA se
 * puede sobrescribir en el mismo sitio.
 */

const BASE =
  "w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 leading-snug transition-colors hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none";

export function Campo({
  valor,
  onChange,
  label,
  placeholder,
  className = ""
}: {
  valor: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      className={`${BASE} ${className}`}
    />
  );
}

export function Area({
  valor,
  onChange,
  label,
  placeholder,
  rows = 3,
  className = ""
}: {
  valor: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      rows={rows}
      className={`${BASE} resize-y ${className}`}
    />
  );
}

export function Numero({
  valor,
  onChange,
  label,
  min = 0,
  max = 200,
  className = ""
}: {
  valor: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={Number.isFinite(valor) ? valor : 0}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      aria-label={label}
      className={`${BASE} text-right font-mono text-[13px] tabular-nums ${className}`}
    />
  );
}

/** Etiqueta pequeña en mayúsculas, para no repetir el estilo en cada sección. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-black/40">{children}</p>;
}

/**
 * Lista de textos editables con alta y baja. Se usa en objetivos, resultados
 * de aprendizaje, prerrequisitos y recursos.
 */
export function ListaTextos({
  etiqueta,
  items,
  onChange,
  max,
  placeholder = "Escribe una línea",
  ancho = false
}: {
  etiqueta: string;
  items: string[];
  onChange: (v: string[]) => void;
  max: number;
  placeholder?: string;
  /** true = los campos ocupan todo el ancho; false = fila compacta */
  ancho?: boolean;
}) {
  return (
    <div className={ancho ? "" : "min-w-0"}>
      <Rotulo>{etiqueta}</Rotulo>
      <ul className="mt-1 space-y-1">
        {items.map((v, i) => (
          <li key={i} className="flex items-start gap-1">
            <input
              value={v}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`${etiqueta} ${i + 1}`}
              placeholder={placeholder}
              className={`${BASE} text-[13px]`}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Quitar ${etiqueta} ${i + 1}`}
              className="mt-0.5 shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
            >
              <Icono nombre="papelera" className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        disabled={items.length >= max}
        className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-black/45 hover:text-black disabled:opacity-35"
      >
        <Icono nombre="mas" className="h-3 w-3" /> Añadir
      </button>
    </div>
  );
}

/** Botón pill pequeño, para acciones dentro de una sección. */
export function BotonMini({
  onClick,
  children,
  icono = "mas",
  tono = "fantasma",
  disabled
}: {
  onClick: () => void;
  children: React.ReactNode;
  icono?: "mas" | "papelera" | "check" | "ajustar" | "deshacer";
  tono?: "fantasma" | "acento" | "sow";
  disabled?: boolean;
}) {
  const piel =
    tono === "acento"
      ? "bg-terracotta text-white hover:bg-redwood"
      : tono === "sow"
        ? "bg-sow text-seedling hover:bg-black"
        : "border border-black/10 bg-white text-black/70 hover:border-black/25 hover:text-black";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-40 ${piel}`}
    >
      <Icono nombre={icono} className="h-3 w-3" />
      {children}
    </button>
  );
}
