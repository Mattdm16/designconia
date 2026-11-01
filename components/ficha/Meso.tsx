"use client";

import { useEffect, useState } from "react";

import { Icono } from "@/components/Icono";
import { Area, BotonMini, Campo, Rotulo } from "@/components/ficha/Campos";
import {
  ETIQUETA_ESTADO_PROGRAMA,
  LIMITES_MESO,
  afirmacionesSinConfirmarMeso,
  resumenSeccionMeso,
  seccionMesoCompleta,
  type SeccionMeso
} from "@/lib/meso";
import { ETIQUETA_SECCION_MESO, SECCIONES_MESO } from "@/lib/promptMeso";
import type {
  AfirmacionCurricular,
  EstadoPrograma,
  ProgramaAcademico
} from "@/lib/proyecto";

const DESCRIPCION_SECCION_MESO: Record<SeccionMeso, string> = {
  identidad: "Nombre, código y estado del programa",
  perfiles: "Quién ingresa y qué distingue a quien egresa",
  resultados: "Desempeños observables de la persona egresada",
  vinculo: "Qué marco institucional lo orienta"
};

/** Orden del documento, que no es el orden de la conversación. */
const ORDEN_DOCUMENTO: SeccionMeso[] = ["identidad", "perfiles", "resultados", "vinculo"];

/** Las tres partes que cierran el documento; el vínculo se revisa aparte. */
const SECCIONES_PROGRESO: SeccionMeso[] = ["identidad", "perfiles", "resultados"];

export type MarcoOpcion = { id: string; nombre: string; estado: string };
export type AsignaturaVinculada = { id: string; nombre: string };

/* ------------------------------------------------------------------ */
/* Acordeón propio del programa                                        */
/* ------------------------------------------------------------------ */

function SeccionMeso({
  id,
  completa,
  activa,
  resumen,
  children
}: {
  id: SeccionMeso;
  completa: boolean;
  activa: boolean;
  resumen: string;
  children: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(activa);

  useEffect(() => {
    if (activa) setAbierta(true);
  }, [activa]);

  return (
    <section
      id={`seccion-meso-${id}`}
      aria-label={ETIQUETA_SECCION_MESO[id]}
      className={`scroll-mt-4 overflow-hidden rounded-[18px] border bg-crema shadow-lienzo transition-colors ${
        activa ? "border-pebble/50 ring-1 ring-pebble/30" : "border-white/60"
      }`}
    >
      <h2>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        >
          <Icono
            nombre="chevron"
            className={`h-4 w-4 shrink-0 text-black/40 transition-transform ${abierta ? "rotate-90" : ""}`}
          />
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
              <span className="font-display text-sm font-semibold tracking-tight">{ETIQUETA_SECCION_MESO[id]}</span>
              <span className="truncate text-[11px] text-black/45">{resumen}</span>
            </span>
            {!abierta && !completa && (
              <span className="mt-0.5 block truncate text-[11px] text-black/35">{DESCRIPCION_SECCION_MESO[id]}</span>
            )}
          </span>
          <span className="sr-only">{completa ? "Sección completa" : "Sección pendiente"}</span>
        </button>
      </h2>

      {abierta && <div className="space-y-3 border-t border-black/[0.07] p-4">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Afirmaciones con confirmación del docente                           */
/* ------------------------------------------------------------------ */

function AfirmacionEditor({
  afirmacion,
  indice,
  onChange,
  onQuitar
}: {
  afirmacion: AfirmacionCurricular;
  indice: number;
  onChange: (a: AfirmacionCurricular) => void;
  onQuitar: () => void;
}) {
  const confirmada = afirmacion.estado !== "sin_confirmar";
  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-black/35">{String(indice + 1).padStart(2, "0")}</span>
        {afirmacion.origen === "sugerencia_IA" && afirmacion.estado === "sin_confirmar" ? (
          <span className="shrink-0 rounded-full bg-mora px-2 py-0.5 text-[10px] font-semibold text-white">
            Sugerencia de IA
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-rainfall px-2 py-0.5 text-[10px] font-semibold text-white">
            Confirmada
          </span>
        )}
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar afirmación ${indice + 1}`}
          className="ml-auto shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>
      <Area
        valor={afirmacion.texto}
        onChange={(texto) =>
          onChange({ ...afirmacion, texto, origen: "docente", estado: "sin_confirmar", citas: [] })
        }
        label={`Afirmación ${indice + 1}`}
        placeholder="Redactala como declaración, no como tema"
        rows={2}
        className="mt-1 text-[13px] leading-relaxed"
      />
      {!confirmada && (
        <BotonMini
          icono="check"
          onClick={() => onChange({ ...afirmacion, estado: "confirmado_por_docente" })}
        >
          Confirmar
        </BotonMini>
      )}
    </li>
  );
}

function ListaAfirmaciones({
  etiqueta,
  items,
  onChange,
  max,
  placeholder
}: {
  etiqueta: string;
  items: AfirmacionCurricular[];
  onChange: (v: AfirmacionCurricular[]) => void;
  max: number;
  placeholder: string;
}) {
  return (
    <div>
      <Rotulo>{etiqueta}</Rotulo>
      {items.length === 0 && (
        <p className="mt-1 rounded-xl border border-dashed border-black/15 px-3 py-3 text-center text-[12px] text-black/45">
          Sin {etiqueta.toLowerCase()} todavía. Pedilos al asistente o creá el primero.
        </p>
      )}
      <ul className="mt-1.5 space-y-1.5">
        {items.map((a, i) => (
          <AfirmacionEditor
            key={a.id}
            afirmacion={a}
            indice={i}
            onChange={(nueva) => onChange(items.map((x, j) => (j === i ? nueva : x)))}
            onQuitar={() => onChange(items.filter((_, j) => j !== i))}
          />
        ))}
      </ul>
      <div className="mt-2">
        <BotonMini
          onClick={() =>
            onChange([
              ...items,
              {
                id: `nueva-${Date.now()}-${items.length}`,
                texto: "",
                origen: "docente",
                estado: "sin_confirmar",
                citas: []
              }
            ])
          }
          disabled={items.length >= max}
        >
          Añadir
        </BotonMini>
      </div>
      <p className="mt-1 px-2 text-[11px] text-black/40">{placeholder}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ficha del programa                                                  */
/* ------------------------------------------------------------------ */

export function MesoFicha({
  programa,
  vinculoMarcoId,
  marcos,
  asignaturas,
  activa,
  onChange
}: {
  programa: ProgramaAcademico;
  /** Id del marco principal activo, o null si no hay vínculo. */
  vinculoMarcoId: string | null;
  marcos: MarcoOpcion[];
  asignaturas: AsignaturaVinculada[];
  /** Sección que el asistente está trabajando; si es null, la primera pendiente. */
  activa: SeccionMeso | null;
  onChange: (next: { programa: ProgramaAcademico; vinculoMarcoId: string | null }) => void;
}) {
  const completas = SECCIONES_PROGRESO.filter((s) => seccionMesoCompleta(programa, s)).length;
  const enFoco =
    activa ?? (SECCIONES_PROGRESO.find((s) => !seccionMesoCompleta(programa, s)) as SeccionMeso | undefined) ?? null;
  const sinConfirmar = afirmacionesSinConfirmarMeso(programa);

  const conEstado = (id: SeccionMeso) => ({
    id,
    completa: seccionMesoCompleta(programa, id),
    activa: enFoco === id,
    resumen: resumenSeccionMeso(programa, id)
  });

  const cambiarPrograma = (parche: Partial<ProgramaAcademico>) =>
    onChange({ programa: { ...programa, ...parche }, vinculoMarcoId });

  return (
    <div className="space-y-3">
      {/* Franja de identificación + progreso */}
      <header className="rounded-[18px] border border-white/60 bg-crema shadow-tarjeta">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3">
          <h1 className="min-w-0 flex-1 font-display text-[16px] font-semibold tracking-tight">
            {programa.nombre.trim() ? programa.nombre : "Programa sin nombre"}
          </h1>
          <span className="font-mono text-[11px] text-black/40">{programa.codigo?.trim() || "sin código"}</span>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 px-4 pt-1.5 text-[11.5px] text-black/55">
          <div className="flex gap-1">
            <dt className="text-black/40">Estado:</dt>
            <dd>{ETIQUETA_ESTADO_PROGRAMA[programa.estado]}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-black/40">Asignaturas:</dt>
            <dd className="font-mono tabular-nums">{asignaturas.length}</dd>
          </div>
        </dl>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex flex-1 gap-1" role="img" aria-label={`${completas} de 3 partes completas`}>
            {SECCIONES_MESO.filter((s) => s !== "vinculo").map((s) => {
              const ok = seccionMesoCompleta(programa, s);
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
            {completas}/{SECCIONES_PROGRESO.length}
          </span>
        </div>
      </header>

      {sinConfirmar > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mora/10 px-3 py-1.5 text-[11.5px] text-black/75">
            <Icono nombre="alerta" className="h-3.5 w-3.5 text-mora" />
            {sinConfirmar} afirmación{sinConfirmar === 1 ? "" : "es"} como sugerencia de IA
          </span>
        </div>
      )}

      <SeccionMeso {...conEstado("identidad")}>
        <div className="grid gap-2">
          <div>
            <Rotulo>Nombre del programa</Rotulo>
            <Campo
              valor={programa.nombre}
              onChange={(nombre) => cambiarPrograma({ nombre })}
              label="Nombre del programa académico"
              placeholder="Ingeniería de Software"
              className="font-display text-[14px] font-semibold"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Rotulo>Código</Rotulo>
              <Campo
                valor={programa.codigo ?? ""}
                onChange={(codigo) => cambiarPrograma({ codigo: codigo || undefined })}
                label="Código del programa"
                placeholder="ISW"
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <Rotulo>Estado</Rotulo>
              <select
                value={programa.estado}
                onChange={(e) => cambiarPrograma({ estado: e.target.value as EstadoPrograma })}
                aria-label="Estado del programa"
                className="w-full rounded-lg bg-black/[0.04] px-2 py-1.5 text-[13px] focus:outline-none"
              >
                {(["borrador", "vigente", "archivado"] as EstadoPrograma[]).map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO_PROGRAMA[e]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {programa.estado === "pendiente_legado" && (
            <p className="rounded-xl bg-terracotta/10 px-3 py-2 text-[12px] text-black/70">
              Este programa se creó a partir del nombre declarado en un microcurrículo anterior.
              Revisá sus datos y cambialo a borrador o vigente cuando corresponda.
            </p>
          )}
        </div>
      </SeccionMeso>

      <SeccionMeso {...conEstado("perfiles")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ListaAfirmaciones
            etiqueta="Perfil de ingreso"
            items={programa.perfilIngreso}
            onChange={(perfilIngreso) => cambiarPrograma({ perfilIngreso })}
            max={LIMITES_MESO.ingreso}
            placeholder="Qué trae quien ingresa al programa."
          />
          <ListaAfirmaciones
            etiqueta="Perfil de egreso"
            items={programa.perfilEgreso}
            onChange={(perfilEgreso) => cambiarPrograma({ perfilEgreso })}
            max={LIMITES_MESO.egreso}
            placeholder="Qué distingue a quien egresa."
          />
        </div>
      </SeccionMeso>

      <SeccionMeso {...conEstado("resultados")}>
        <ListaAfirmaciones
          etiqueta="Resultados del programa"
          items={programa.resultadosPrograma}
          onChange={(resultadosPrograma) => cambiarPrograma({ resultadosPrograma })}
          max={LIMITES_MESO.resultados}
          placeholder="Desempeños observables del egresado, con verbo medible."
        />
      </SeccionMeso>

      <SeccionMeso {...conEstado("vinculo")}>
        <div>
          <Rotulo>Marco institucional que lo orienta</Rotulo>
          {marcos.length === 0 ? (
            <p className="mt-1 rounded-xl border border-dashed border-black/15 px-3 py-3 text-center text-[12px] text-black/45">
              Todavía no hay marcos en el proyecto. Creá el marco institucional primero y volvé a vincularlo aquí.
            </p>
          ) : (
            <select
              value={vinculoMarcoId ?? ""}
              onChange={(e) => onChange({ programa, vinculoMarcoId: e.target.value || null })}
              aria-label="Marco institucional que orienta al programa"
              className="mt-1 w-full rounded-lg bg-black/[0.04] px-2 py-1.5 text-[13px] focus:outline-none"
            >
              <option value="">Sin vínculo</option>
              {marcos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre || "Marco sin nombre"} · {m.estado}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 px-2 text-[11px] text-black/40">
            Solo se puede vincular un marco ya registrado. El vínculo anterior se conserva como historial.
          </p>
        </div>
        <div className="mt-2">
          <Rotulo>Asignaturas de este programa</Rotulo>
          {asignaturas.length === 0 ? (
            <p className="mt-1 rounded-xl border border-dashed border-black/15 px-3 py-3 text-center text-[12px] text-black/45">
              Todavía no hay asignaturas vinculadas a este programa.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {asignaturas.map((a) => (
                <li
                  key={a.id}
                  className="truncate rounded-lg border border-black/[0.07] bg-white px-2.5 py-1.5 text-[13px]"
                >
                  {a.nombre}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SeccionMeso>
    </div>
  );
}
