"use client";

import { useState } from "react";

import { Icono } from "@/components/Icono";
import { Area, BotonMini, Campo, Rotulo } from "@/components/ficha/Campos";
import type {
  AfirmacionCurricular,
  CitaFuenteCurricular,
  EstadoAfirmacion,
  FuenteCurricular,
  OrigenAfirmacion
} from "@/lib/proyecto";

/* ------------------------------------------------------------------ */
/* Citas a fuentes curriculares                                         */
/* ------------------------------------------------------------------ */

/** Una cita solo respalda si apunta a una fuente y a un lugar del documento. */
function esCitaValida(cita: CitaFuenteCurricular): boolean {
  if (!cita.fuenteId.trim()) return false;
  if (cita.localizador?.trim()) return true;
  if (cita.seccion?.trim()) return true;
  if (typeof cita.pagina === "number" && Number.isFinite(cita.pagina)) return true;
  if (typeof cita.pagina === "string" && cita.pagina.trim()) return true;
  return false;
}

function textoCita(cita: CitaFuenteCurricular, tituloFuente: (id: string) => string): string {
  const partes = [tituloFuente(cita.fuenteId)];
  if (cita.localizador?.trim()) partes.push(cita.localizador.trim());
  if (cita.seccion?.trim()) partes.push(`secc. ${cita.seccion.trim()}`);
  if (cita.pagina !== undefined && cita.pagina !== null && String(cita.pagina).trim())
    partes.push(`p. ${String(cita.pagina).trim()}`);
  return partes.join(" · ");
}

type BorradorCita = {
  fuenteId: string;
  localizador: string;
  pagina: string;
  seccion: string;
};

function CitaFila({
  cita,
  fuentes,
  indice,
  bloqueoQuitar,
  onChange,
  onQuitar
}: {
  cita: CitaFuenteCurricular;
  fuentes: FuenteCurricular[];
  indice: number;
  bloqueoQuitar: string | null;
  onChange: (c: CitaFuenteCurricular) => void;
  onQuitar: () => void;
}) {
  return (
    <li className="rounded-lg border border-black/[0.06] p-2">
      <div className="flex items-center gap-1">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Fuente de la cita {indice + 1}</span>
          <select
            value={cita.fuenteId}
            onChange={(e) => onChange({ ...cita, fuenteId: e.target.value })}
            aria-label={`Fuente de la cita ${indice + 1}`}
            className="w-full rounded-lg bg-black/[0.04] px-2 py-1 text-[12px] focus:outline-none"
          >
            {fuentes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.titulo || "Fuente sin título"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onQuitar}
          disabled={bloqueoQuitar !== null}
          title={bloqueoQuitar ?? `Quitar cita ${indice + 1}`}
          aria-label={`Quitar cita ${indice + 1}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta disabled:opacity-40 disabled:hover:text-black/25"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        <Campo
          valor={cita.localizador ?? ""}
          onChange={(localizador) => onChange({ ...cita, localizador: localizador || undefined })}
          label={`Localizador de la cita ${indice + 1}`}
          placeholder="Cap. 3, art. 12…"
          className="text-[11.5px]"
        />
        <Campo
          valor={cita.seccion ?? ""}
          onChange={(seccion) => onChange({ ...cita, seccion: seccion || undefined })}
          label={`Sección de la cita ${indice + 1}`}
          placeholder="Sección (opcional)"
          className="text-[11.5px]"
        />
        <Campo
          valor={cita.pagina === undefined ? "" : String(cita.pagina)}
          onChange={(pagina) => onChange({ ...cita, pagina: pagina || undefined })}
          label={`Página de la cita ${indice + 1}`}
          placeholder="Página (opcional)"
          className="font-mono text-[11.5px]"
        />
      </div>
    </li>
  );
}

/**
 * Editor de citas de una afirmación. Solo guarda citas válidas (fuente +
 * algún localizador): el borrador vive en estado local hasta que apunta a un
 * lugar del documento. Quitar la última cita de una afirmación respaldada se
 * bloquea hasta cambiar su origen o estado.
 */
export function CitaEditor({
  fuentes,
  citas,
  exigeRespaldo,
  onChange
}: {
  fuentes: FuenteCurricular[];
  citas: CitaFuenteCurricular[];
  exigeRespaldo: boolean;
  onChange: (c: CitaFuenteCurricular[]) => void;
}) {
  const [borrador, setBorrador] = useState<BorradorCita | null>(null);
  const tituloFuente = (id: string) => fuentes.find((f) => f.id === id)?.titulo?.trim() || "Fuente sin título";

  const guardarBorrador = () => {
    if (!borrador) return;
    const cita: CitaFuenteCurricular = { fuenteId: borrador.fuenteId };
    if (borrador.localizador.trim()) cita.localizador = borrador.localizador.trim();
    if (borrador.seccion.trim()) cita.seccion = borrador.seccion.trim();
    if (borrador.pagina.trim()) cita.pagina = borrador.pagina.trim();
    if (!esCitaValida(cita)) return;
    onChange([...citas, cita]);
    setBorrador(null);
  };

  return (
    <div className="mt-1.5">
      <Rotulo>Respaldo en fuentes</Rotulo>
      {citas.length === 0 && !borrador && (
        <p className="mt-1 text-[11.5px] text-black/45">
          {exigeRespaldo
            ? "Esta afirmación exige respaldo: agregá una cita que apunte a un lugar del documento."
            : "Sin citas. Si la marcás como documento o contrastada, vas a necesitar una."}
        </p>
      )}
      {citas.length > 0 && (
        <ul className="mt-1 space-y-1">
          {citas.map((c, i) => (
            <CitaFila
              key={`${c.fuenteId}-${i}`}
              cita={c}
              fuentes={fuentes}
              indice={i}
              bloqueoQuitar={
                exigeRespaldo && citas.length === 1
                  ? "Es la única cita que respalda esta afirmación: cambiá su origen o estado antes de quitarla"
                  : null
              }
              onChange={(nueva) => {
                // La fila siempre conserva una cita válida: si el cambio la
                // invalida, se ignora en vez de romper el guardado.
                if (!esCitaValida(nueva)) return;
                onChange(citas.map((x, j) => (j === i ? nueva : x)));
              }}
              onQuitar={() => onChange(citas.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}
      {borrador ? (
        <div className="mt-1 rounded-lg border border-dashed border-black/20 p-2">
          <label className="block">
            <span className="sr-only">Fuente de la cita nueva</span>
            <select
              value={borrador.fuenteId}
              onChange={(e) => setBorrador({ ...borrador, fuenteId: e.target.value })}
              aria-label="Fuente de la cita nueva"
              className="w-full rounded-lg bg-black/[0.04] px-2 py-1 text-[12px] focus:outline-none"
            >
              {fuentes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titulo || "Fuente sin título"}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-1 grid gap-1 sm:grid-cols-3">
            <Campo
              valor={borrador.localizador}
              onChange={(localizador) => setBorrador({ ...borrador, localizador })}
              label="Localizador de la cita nueva"
              placeholder="Cap. 3, art. 12…"
              className="text-[11.5px]"
            />
            <Campo
              valor={borrador.seccion}
              onChange={(seccion) => setBorrador({ ...borrador, seccion })}
              label="Sección de la cita nueva"
              placeholder="Sección (opcional)"
              className="text-[11.5px]"
            />
            <Campo
              valor={borrador.pagina}
              onChange={(pagina) => setBorrador({ ...borrador, pagina })}
              label="Página de la cita nueva"
              placeholder="Página (opcional)"
              className="font-mono text-[11.5px]"
            />
          </div>
          <div className="mt-1.5 flex gap-1">
            <BotonMini
              icono="check"
              onClick={guardarBorrador}
              disabled={
                !borrador.fuenteId ||
                (!borrador.localizador.trim() && !borrador.seccion.trim() && !borrador.pagina.trim())
              }
            >
              Guardar cita
            </BotonMini>
            <BotonMini icono="deshacer" onClick={() => setBorrador(null)}>
              Descartar
            </BotonMini>
          </div>
        </div>
      ) : fuentes.length === 0 ? (
        <p className="mt-1 text-[11.5px] text-black/45">
          No hay fuentes registradas. Registrá el documento en la sección de fuentes para poder citarlo.
        </p>
      ) : (
        <div className="mt-1">
          <BotonMini
            onClick={() => setBorrador({ fuenteId: fuentes[0].id, localizador: "", pagina: "", seccion: "" })}
          >
            Añadir cita
          </BotonMini>
        </div>
      )}
      {citas.length > 0 && (
        <p className="mt-1 px-1 font-mono text-[10.5px] text-black/45">
          {citas.map((c) => textoCita(c, tituloFuente)).join(" · ")}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Afirmación con origen, estado y citas                                */
/* ------------------------------------------------------------------ */

const ORIGENES: { valor: OrigenAfirmacion; etiqueta: string }[] = [
  { valor: "sugerencia_IA", etiqueta: "Sugerencia de IA" },
  { valor: "docente", etiqueta: "Docente" },
  { valor: "documento", etiqueta: "Documento" },
  { valor: "derivado", etiqueta: "Derivado" }
];

const ESTADOS: { valor: EstadoAfirmacion; etiqueta: string }[] = [
  { valor: "sin_confirmar", etiqueta: "Sin confirmar" },
  { valor: "confirmado_por_docente", etiqueta: "Confirmada" },
  { valor: "contrastado_con_fuente", etiqueta: "Contrastada" }
];

/**
 * Editor compartido de afirmaciones Macro/Meso: texto, origen, estado y citas.
 * Cambiar a "Documento" o "Contrastada" exige una cita válida; sin respaldo
 * el cambio se bloquea con un aviso en vez de dejar el proyecto inválido.
 */
export function AfirmacionEditor({
  afirmacion,
  indice,
  fuentes,
  onChange,
  onQuitar
}: {
  afirmacion: AfirmacionCurricular;
  indice: number;
  fuentes: FuenteCurricular[];
  onChange: (a: AfirmacionCurricular) => void;
  onQuitar: () => void;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const confirmada = afirmacion.estado !== "sin_confirmar";
  const exigeRespaldo = afirmacion.origen === "documento" || afirmacion.estado === "contrastado_con_fuente";
  const insignia =
    afirmacion.origen === "sugerencia_IA" && afirmacion.estado === "sin_confirmar" ? (
      <span className="shrink-0 rounded-full bg-mora px-2 py-0.5 text-[10px] font-semibold text-white">
        Sugerencia de IA
      </span>
    ) : afirmacion.origen === "documento" ? (
      <span className="shrink-0 rounded-full bg-sow px-2 py-0.5 text-[10px] font-semibold text-papel">
        Documento
      </span>
    ) : (
      <span className="shrink-0 rounded-full bg-rainfall px-2 py-0.5 text-[10px] font-semibold text-white">
        {afirmacion.estado === "contrastado_con_fuente" ? "Contrastada" : "Confirmada"}
      </span>
    );

  const cambiarOrigen = (origen: OrigenAfirmacion) => {
    setAviso(null);
    if (origen === "documento" && afirmacion.citas.length === 0) {
      setAviso("Para marcarla como documento agregá primero una cita que la respalde.");
      return;
    }
    onChange({ ...afirmacion, origen });
  };

  const cambiarEstado = (estado: EstadoAfirmacion) => {
    setAviso(null);
    if (estado === "contrastado_con_fuente" && afirmacion.citas.length === 0) {
      setAviso("Para marcarla como contrastada agregá primero una cita que la respalde.");
      return;
    }
    onChange({ ...afirmacion, estado });
  };

  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-black/35">{String(indice + 1).padStart(2, "0")}</span>
        {insignia}
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
          // Editarla la vuelve palabras del docente: hay que confirmarla de nuevo.
          onChange({ ...afirmacion, texto, origen: "docente", estado: "sin_confirmar", citas: [] })
        }
        label={`Afirmación ${indice + 1}`}
        placeholder="Redactala como declaración, no como tema"
        rows={2}
        className="mt-1 text-[13px] leading-relaxed"
      />
      <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
        <label className="flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">
            Origen
          </span>
          <select
            value={afirmacion.origen}
            onChange={(e) => cambiarOrigen(e.target.value as OrigenAfirmacion)}
            aria-label={`Origen de la afirmación ${indice + 1}`}
            className="min-w-0 flex-1 rounded-lg bg-black/[0.04] px-2 py-1 text-[12px] focus:outline-none"
          >
            {ORIGENES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">
            Estado
          </span>
          <select
            value={afirmacion.estado}
            onChange={(e) => cambiarEstado(e.target.value as EstadoAfirmacion)}
            aria-label={`Estado de la afirmación ${indice + 1}`}
            className="min-w-0 flex-1 rounded-lg bg-black/[0.04] px-2 py-1 text-[12px] focus:outline-none"
          >
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>
      {aviso && <p className="mt-1 text-[11.5px] text-terracotta">{aviso}</p>}
      <CitaEditor
        fuentes={fuentes}
        citas={afirmacion.citas}
        exigeRespaldo={exigeRespaldo}
        onChange={(citas) => onChange({ ...afirmacion, citas })}
      />
      {!confirmada && (
        <div className="mt-1.5">
          <BotonMini
            icono="check"
            onClick={() => onChange({ ...afirmacion, estado: "confirmado_por_docente" })}
          >
            Confirmar
          </BotonMini>
        </div>
      )}
    </li>
  );
}
