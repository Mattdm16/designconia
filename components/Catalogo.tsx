"use client";

import { useState } from "react";

import { Icono } from "@/components/Icono";
import {
  buscarCatalogo,
  catalogar,
  type ItemCatalogo,
  type NivelCatalogo
} from "@/lib/catalogo";
import type { ProyectoCurricular } from "@/lib/proyecto";

const ETIQUETA_NIVEL: Record<NivelCatalogo, string> = {
  macro: "Marco",
  meso: "Programa",
  micro: "Asignatura"
};

function FilaDocumento({
  item,
  onAbrir,
  onDuplicar,
  onFinalizar
}: {
  item: ItemCatalogo;
  onAbrir: () => void;
  onDuplicar: () => void;
  onFinalizar: (valor: boolean) => void;
}) {
  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/50">
          {ETIQUETA_NIVEL[item.nivel]}
        </span>
        {item.finalizado && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rainfall/15 px-2 py-0.5 text-[10px] font-semibold text-rainfall">
            <Icono nombre="check" className="h-3 w-3" /> Finalizado
          </span>
        )}
        <button
          type="button"
          onClick={() => onFinalizar(!item.finalizado)}
          title={item.finalizado ? "Quitar la marca de finalizado" : "Marcar como terminado y listo para reutilizar"}
          aria-label={`${item.finalizado ? "Quitar finalizado a" : "Marcar como finalizado"} ${item.nombre || "documento"}`}
          aria-pressed={item.finalizado}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
            item.finalizado
              ? "border-rainfall/40 text-rainfall hover:border-rainfall"
              : "border-black/10 text-black/55 hover:border-black/25 hover:text-black"
          }`}
        >
          <Icono nombre="check" className="h-3 w-3" />
          {item.finalizado ? "Finalizado" : "Marcar finalizado"}
        </button>
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={onAbrir}
          title="Abrir este documento"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/70 hover:border-black/25 hover:text-black"
        >
          Abrir
        </button>
        <button
          type="button"
          onClick={onDuplicar}
          title="Crear una copia como base de otro documento"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/70 hover:border-black/25 hover:text-black"
        >
          <Icono nombre="copiar" className="h-3 w-3" /> Duplicar
        </button>
      </div>
      <p className="mt-1 truncate text-[13px] font-medium">
        {item.nombre || "Documento sin nombre"}
        {item.codigo ? <span className="ml-1.5 font-mono text-[11px] text-black/45">{item.codigo}</span> : null}
      </p>
      {item.origenCopia && (
        <p className="mt-0.5 truncate text-[11px] text-black/45">
          Copia de “{item.origenCopia.nombre}”
        </p>
      )}
    </li>
  );
}

/**
 * Catálogo personal: buscar por código o nombre, abrir, duplicar como base
 * y marcar terminados. Sin tercer riel: es una lista plegable del encabezado.
 */
export function Catalogo({
  proyecto,
  onAbrir,
  onDuplicar,
  onFinalizar
}: {
  proyecto: ProyectoCurricular | null;
  onAbrir: (nivel: NivelCatalogo, id: string) => void;
  onDuplicar: (nivel: NivelCatalogo, id: string) => void;
  onFinalizar: (nivel: NivelCatalogo, id: string, valor: boolean) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [soloFinalizados, setSoloFinalizados] = useState(false);

  if (!proyecto) return null;
  const todos = catalogar(proyecto);
  const visibles = buscarCatalogo(todos, consulta).filter((i) => !soloFinalizados || i.finalizado);
  const nFinalizados = todos.filter((i) => i.finalizado).length;

  return (
    <section
      aria-label="Catálogo de documentos curriculares"
      className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icono nombre="carpeta" className="h-4 w-4 shrink-0 text-black/50" />
        <h2 className="font-display text-[13px] font-semibold tracking-tight">Catálogo</h2>
        <span className="font-mono text-[11px] tabular-nums text-black/50">
          {visibles.length}/{todos.length} · {nFinalizados} finalizado{nFinalizados === 1 ? "" : "s"}
        </span>
        <span className="min-w-0 flex-1" />
        <label className="flex min-w-0 flex-1 basis-48 items-center gap-1.5 sm:max-w-64 sm:flex-none">
          <span className="sr-only">Buscar por código o nombre</span>
          <Icono nombre="buscar" className="h-3.5 w-3.5 shrink-0 text-black/40" />
          <input
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[12px] focus:border-black/25 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setSoloFinalizados((v) => !v)}
          aria-pressed={soloFinalizados}
          title="Mostrar solo los marcados como finalizados"
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-medium ${
            soloFinalizados
              ? "border-rainfall/50 bg-rainfall/10 text-rainfall"
              : "border-black/10 bg-white text-black/60 hover:border-black/25"
          }`}
        >
          <Icono nombre="check" className="h-3 w-3" /> Finalizados
        </button>
      </div>
      {todos.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
          Todavía no hay documentos. Conversá con el asistente para crear el primero; aparecerá aquí para
          reutilizarlo.
        </p>
      ) : visibles.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
          Sin coincidencias para “{consulta}”.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {visibles.map((item) => (
            <FilaDocumento
              key={`${item.nivel}:${item.id}`}
              item={item}
              onAbrir={() => onAbrir(item.nivel, item.id)}
              onDuplicar={() => onDuplicar(item.nivel, item.id)}
              onFinalizar={(valor) => onFinalizar(item.nivel, item.id, valor)}
            />
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-black/40">
        Abrir cambia de documento sin borrar nada. Duplicar crea una copia como base: el original queda intacto.
      </p>
    </section>
  );
}
