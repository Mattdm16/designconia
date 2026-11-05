"use client";

import { useEffect, useState } from "react";

import { Icono } from "@/components/Icono";
import { BotonMini, Campo, Rotulo } from "@/components/ficha/Campos";
import { AfirmacionEditor } from "@/components/ficha/Citas";
import {
  ETIQUETA_ESTADO_MARCO,
  LIMITES_MACRO,
  afirmacionesSinConfirmar,
  resumenSeccionMacro,
  seccionMacroCompleta,
  type SeccionMacro
} from "@/lib/macro";
import { ETIQUETA_SECCION_MACRO, SECCIONES_MACRO } from "@/lib/promptMacro";
import type {
  AfirmacionCurricular,
  EstadoMarco,
  FuenteCurricular,
  MarcoEducativoInstitucional,
  TipoFuenteCurricular
} from "@/lib/proyecto";

const DESCRIPCION_SECCION_MACRO: Record<SeccionMacro, string> = {
  identidad: "Nombre, emisor, versión y vigencia del documento",
  principios: "Qué declara la institución sobre el aprendizaje y la docencia",
  orientaciones: "Lo que los programas deben cumplir al diseñarse",
  fuentes: "Solo documentos que el docente aportó, nunca inventados"
};

/** Orden del documento, que no es el orden de la conversación. */
const ORDEN_DOCUMENTO: SeccionMacro[] = ["identidad", "principios", "orientaciones", "fuentes"];

/** Las tres partes que cierran el documento; las fuentes siempre son opcionales. */
const SECCIONES_PROGRESO: SeccionMacro[] = ["identidad", "principios", "orientaciones"];

/* ------------------------------------------------------------------ */
/* Acordeón propio del marco                                           */
/* ------------------------------------------------------------------ */

function SeccionMarco({
  id,
  completa,
  activa,
  resumen,
  children
}: {
  id: SeccionMacro;
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
      id={`seccion-marco-${id}`}
      aria-label={ETIQUETA_SECCION_MACRO[id]}
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
              <span className="font-display text-sm font-semibold tracking-tight">{ETIQUETA_SECCION_MACRO[id]}</span>
              <span className="truncate text-[11px] text-black/45">{resumen}</span>
            </span>
            {!abierta && !completa && (
              <span className="mt-0.5 block truncate text-[11px] text-black/35">{DESCRIPCION_SECCION_MACRO[id]}</span>
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
/* Afirmaciones con confirmación del docente y citas a fuentes         */
/* ------------------------------------------------------------------ */

function ListaAfirmaciones({
  etiqueta,
  items,
  fuentes,
  onChange,
  max,
  placeholder
}: {
  etiqueta: string;
  items: AfirmacionCurricular[];
  fuentes: FuenteCurricular[];
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
            fuentes={fuentes}
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
/* Fuentes curriculares                                                */
/* ------------------------------------------------------------------ */

const TIPOS_FUENTE: { valor: TipoFuenteCurricular; etiqueta: string }[] = [
  { valor: "modelo_educativo", etiqueta: "Modelo educativo" },
  { valor: "lineamiento", etiqueta: "Lineamiento" },
  { valor: "plan_institucional", etiqueta: "Plan institucional" },
  { valor: "otro", etiqueta: "Otro" }
];

function FuenteEditor({
  fuente,
  indice,
  onChange,
  onQuitar
}: {
  fuente: FuenteCurricular;
  indice: number;
  onChange: (f: FuenteCurricular) => void;
  onQuitar: () => void;
}) {
  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-black/35">{String(indice + 1).padStart(2, "0")}</span>
        <Campo
          valor={fuente.titulo}
          onChange={(titulo) => onChange({ ...fuente, titulo })}
          label={`Título de la fuente ${indice + 1}`}
          placeholder="Título del documento institucional"
          className="text-[13px] font-medium"
        />
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar fuente ${indice + 1}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Tipo de la fuente {indice + 1}</span>
          <select
            value={fuente.tipo}
            onChange={(e) => onChange({ ...fuente, tipo: e.target.value as TipoFuenteCurricular })}
            aria-label={`Tipo de la fuente ${indice + 1}`}
            className="rounded-full bg-black/[0.04] px-2 py-1 text-[11px] focus:outline-none"
          >
            {TIPOS_FUENTE.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <Campo
          valor={fuente.emisor ?? ""}
          onChange={(emisor) => onChange({ ...fuente, emisor: emisor || undefined })}
          label={`Emisor de la fuente ${indice + 1}`}
          placeholder="Quién la emite (opcional)"
          className="text-[12px]"
        />
      </div>
      <div className="mt-1">
        <Campo
          valor={fuente.url ?? ""}
          onChange={(url) => onChange({ ...fuente, url: url || undefined })}
          label={`Ubicación de la fuente ${indice + 1}`}
          placeholder="Ubicación o referencia (opcional)"
          className="font-mono text-[12px]"
        />
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Ficha del marco                                                     */
/* ------------------------------------------------------------------ */

export function MarcoFicha({
  marco,
  fuentes,
  activa,
  onChange
}: {
  marco: MarcoEducativoInstitucional;
  fuentes: FuenteCurricular[];
  /** Sección que el asistente está trabajando; si es null, la primera pendiente. */
  activa: SeccionMacro | null;
  onChange: (next: { marco: MarcoEducativoInstitucional; fuentes: FuenteCurricular[] }) => void;
}) {
  const completas = SECCIONES_PROGRESO.filter((s) => seccionMacroCompleta(marco, s)).length;
  const enFoco =
    activa ?? (SECCIONES_PROGRESO.find((s) => !seccionMacroCompleta(marco, s)) as SeccionMacro | undefined) ?? null;
  const sinConfirmar = afirmacionesSinConfirmar(marco);

  const conEstado = (id: SeccionMacro) => ({
    id,
    completa: seccionMacroCompleta(marco, id, fuentes.length),
    activa: enFoco === id,
    resumen: resumenSeccionMacro(marco, id, fuentes.length)
  });

  const cambiarMarco = (parche: Partial<MarcoEducativoInstitucional>) =>
    onChange({ marco: { ...marco, ...parche }, fuentes });

  return (
    <div className="space-y-3">
      {/* Franja de identificación + progreso */}
      <header className="rounded-[18px] border border-white/60 bg-crema shadow-tarjeta">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3">
          <h1 className="min-w-0 flex-1 font-display text-[16px] font-semibold tracking-tight">
            {marco.nombre.trim() ? marco.nombre : "Marco sin nombre"}
          </h1>
          <span className="font-mono text-[11px] text-black/40">{marco.version.trim() || "sin versión"}</span>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 px-4 pt-1.5 text-[11.5px] text-black/55">
          <div className="flex gap-1">
            <dt className="text-black/40">Emite:</dt>
            <dd className="truncate">{marco.emisor?.trim() || "—"}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-black/40">Estado:</dt>
            <dd>{marco.estado === "borrador" ? "Borrador" : marco.estado === "vigente" ? "Vigente" : "Archivado"}</dd>
          </div>
        </dl>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex flex-1 gap-1" role="img" aria-label={`${completas} de 3 partes completas`}>
            {SECCIONES_MACRO.filter((s) => s !== "fuentes").map((s) => {
              const ok = seccionMacroCompleta(marco, s);
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

      <SeccionMarco {...conEstado("identidad")}>
        <div className="grid gap-2">
          <div>
            <Rotulo>Nombre del marco</Rotulo>
            <Campo
              valor={marco.nombre}
              onChange={(nombre) => cambiarMarco({ nombre })}
              label="Nombre del marco institucional"
              placeholder="Modelo educativo institucional"
              className="font-display text-[14px] font-semibold"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Rotulo>Quién lo emite</Rotulo>
              <Campo
                valor={marco.emisor ?? ""}
                onChange={(emisor) => cambiarMarco({ emisor: emisor || undefined })}
                label="Emisor del marco"
                placeholder="Universidad, vicerrectoría…"
              />
            </div>
            <div>
              <Rotulo>Versión o año</Rotulo>
              <Campo
                valor={marco.version}
                onChange={(version) => cambiarMarco({ version })}
                label="Versión del marco"
                placeholder="2026"
                className="font-mono tabular-nums"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Rotulo>Vigencia desde</Rotulo>
              <Campo
                valor={marco.vigencia?.desde ?? ""}
                onChange={(desde) =>
                  cambiarMarco({
                    vigencia: desde.trim() || marco.vigencia?.hasta ? { desde: desde.trim() || null, hasta: marco.vigencia?.hasta ?? null } : null
                  })
                }
                label="Vigencia desde"
                placeholder="2026"
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <Rotulo>Vigencia hasta</Rotulo>
              <Campo
                valor={marco.vigencia?.hasta ?? ""}
                onChange={(hasta) =>
                  cambiarMarco({
                    vigencia: marco.vigencia?.desde || hasta.trim() ? { desde: marco.vigencia?.desde ?? null, hasta: hasta.trim() || null } : null
                  })
                }
                label="Vigencia hasta"
                placeholder="—"
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <Rotulo>Estado</Rotulo>
              <select
                value={marco.estado}
                onChange={(e) => cambiarMarco({ estado: e.target.value as EstadoMarco })}
                aria-label="Estado del marco"
                className="w-full rounded-lg bg-black/[0.04] px-2 py-1.5 text-[13px] focus:outline-none"
              >
                {(["borrador", "vigente", "archivado"] as EstadoMarco[]).map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO_MARCO[e]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </SeccionMarco>

      <SeccionMarco {...conEstado("principios")}>
        <ListaAfirmaciones
          etiqueta="Principios"
          items={marco.principios}
          fuentes={fuentes}
          onChange={(principios) => cambiarMarco({ principios })}
          max={LIMITES_MACRO.principios}
          placeholder="Los principios propuestos por la IA nacen como sugerencia: confirmalos uno por uno."
        />
      </SeccionMarco>

      <SeccionMarco {...conEstado("orientaciones")}>
        <ListaAfirmaciones
          etiqueta="Orientaciones"
          items={marco.afirmaciones}
          fuentes={fuentes}
          onChange={(afirmaciones) => cambiarMarco({ afirmaciones })}
          max={LIMITES_MACRO.orientaciones}
          placeholder="Indicaciones concretas que los programas deben cumplir."
        />
      </SeccionMarco>

      <SeccionMarco {...conEstado("fuentes")}>
        {fuentes.length === 0 && (
          <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
            Sin fuentes registradas. Solo sumá documentos que aportaste o que puedas verificar.
          </p>
        )}
        <ul className="space-y-2">
          {fuentes.map((f, i) => (
            <FuenteEditor
              key={f.id}
              fuente={f}
              indice={i}
              onChange={(nueva) => onChange({ marco, fuentes: fuentes.map((x, j) => (j === i ? nueva : x)) })}
              onQuitar={() => onChange({ marco, fuentes: fuentes.filter((_, j) => j !== i) })}
            />
          ))}
        </ul>
        <div className="mt-2">
          <BotonMini
            onClick={() =>
              onChange({
                marco,
                fuentes: [
                  ...fuentes,
                  { id: `fuente-nueva-${Date.now()}`, titulo: "", tipo: "otro" as TipoFuenteCurricular }
                ]
              })
            }
            disabled={fuentes.length >= LIMITES_MACRO.fuentes}
          >
            Añadir fuente
          </BotonMini>
        </div>
      </SeccionMarco>
    </div>
  );
}
