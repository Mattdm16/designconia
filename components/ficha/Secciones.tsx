"use client";

import { useState } from "react";

import { Icono } from "@/components/Icono";
import { Area, BotonMini, Campo, ListaTextos, Numero, Rotulo } from "@/components/ficha/Campos";
import {
  ETIQUETA_TIPO_SESION,
  GRUPO_SIN_UNIDAD,
  LIMITES,
  SIN_PRERREQUISITOS,
  TIPOS_SESION,
  crearResultado,
  horasPorTipo,
  nuevaActividadEvaluacion,
  rasDelMicro,
  recursosSinUso,
  sesionesDeUnidad,
  totalPorcentaje,
  unidadesDeSecuencia,
  usosDeRecurso,
  type Corte,
  type FilaSesion,
  type Horas,
  type Identificacion,
  type Microcurriculo,
  type RaTrazable,
  type Referencia,
  type Sesion,
  type TipoSesion,
  type Unidad
} from "@/lib/schema";

/* ------------------------------------------------------------------ */
/* 1. Justificación                                                    */
/* ------------------------------------------------------------------ */

export function JustificacionSeccion({
  valor,
  onChange
}: {
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Area
        valor={valor}
        onChange={onChange}
        label="Justificación de la asignatura"
        placeholder="El propósito de la asignatura y por qué importa para el perfil de egreso."
        rows={4}
        className="text-[13px] leading-relaxed"
      />
      <p className="mt-1 px-2 text-[11px] text-black/40">
        El asistente la redacta a partir de lo que le cuentes; puedes sobrescribirla aquí.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Objetivos                                                        */
/* ------------------------------------------------------------------ */

export function ObjetivosSeccion({
  objetivos,
  onChange
}: {
  objetivos: Microcurriculo["objetivos"];
  onChange: (v: Microcurriculo["objetivos"]) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ListaTextos
        etiqueta="Generales"
        items={objetivos.generales}
        onChange={(generales) => onChange({ ...objetivos, generales })}
        max={LIMITES.objetivos}
        placeholder="La meta o aprendizaje principal del curso"
      />
      <ListaTextos
        etiqueta="Específicas"
        items={objetivos.especificas}
        onChange={(especificas) => onChange({ ...objetivos, especificas })}
        max={LIMITES.objetivos}
        placeholder="Destreza, actitud o conocimiento puntual"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Contenido temático                                               */
/* ------------------------------------------------------------------ */

function TemaEditor({
  tema,
  indice,
  onChange,
  onQuitar
}: {
  tema: Microcurriculo["contenido"]["unidades"][number]["temas"][number];
  indice: number;
  onChange: (t: Microcurriculo["contenido"]["unidades"][number]["temas"][number]) => void;
  onQuitar: () => void;
}) {
  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-black/35">T{String(indice + 1).padStart(2, "0")}</span>
        <Campo
          valor={tema.nombre}
          onChange={(nombre) => onChange({ ...tema, nombre })}
          label={`Tema ${indice + 1}`}
          placeholder="Nombre del tema"
          className="text-[13px] font-medium"
        />
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar tema ${indice + 1}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-1.5 pl-2">
        <ListaTextos
          etiqueta="Subtemas"
          items={tema.subtemas}
          onChange={(subtemas) => onChange({ ...tema, subtemas })}
          max={LIMITES.subtemasPorTema}
          placeholder="Subtema"
        />
      </div>
    </li>
  );
}

function UnidadEditor({
  unidad,
  onChange,
  onQuitar,
  vinculosRa
}: {
  unidad: Unidad;
  onChange: (u: Unidad) => void;
  onQuitar: () => void;
  /** Resultado(s) del programa que responde cada RA (por id de RA). */
  vinculosRa?: Record<string, string[]>;
}) {
  return (
    <li className="rounded-xl border border-black/[0.07] bg-arena/40 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sow font-mono text-[10px] font-semibold text-seedling">
          {unidad.numero}
        </span>
        <Campo
          valor={unidad.titulo}
          onChange={(titulo) => onChange({ ...unidad, titulo })}
          label={`Título de la unidad ${unidad.numero}`}
          placeholder="Título de la unidad"
          className="font-display text-[13px] font-semibold"
        />
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar unidad ${unidad.numero}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2">
        <Rotulo>Resultados de aprendizaje</Rotulo>
        <ul className="mt-1 space-y-1">
          {unidad.resultadosAprendizaje.map((ra, i) => (
            <li key={ra.id || i}>
              <div className="flex items-start gap-1">
                <input
                  value={ra.texto}
                  onChange={(e) =>
                    onChange({
                      ...unidad,
                      resultadosAprendizaje: unidad.resultadosAprendizaje.map((x, j) =>
                        j === i ? { ...x, texto: e.target.value } : x
                      )
                    })
                  }
                  aria-label={`Resultado de aprendizaje ${i + 1} de la unidad ${unidad.numero}`}
                  placeholder="Qué podrá hacer el estudiante (diseña, evalúa, distingue…)"
                  title={ra.id ? `id: ${ra.id}` : undefined}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-white px-2 py-1 text-[13px] hover:border-black/10 focus:border-black/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...unidad,
                      resultadosAprendizaje: unidad.resultadosAprendizaje.filter((_, j) => j !== i)
                    })
                  }
                  aria-label={`Quitar resultado de aprendizaje ${i + 1} de la unidad ${unidad.numero}`}
                  className="mt-1 shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
                >
                  <Icono nombre="papelera" className="h-3 w-3" />
                </button>
              </div>
              {vinculosRa?.[ra.id]?.length ? (
                <p className="truncate pl-1 text-[10.5px] text-rainfall" title={vinculosRa[ra.id].join(" · ")}>
                  ↳ Responde a: {vinculosRa[ra.id].join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            onChange({ ...unidad, resultadosAprendizaje: [...unidad.resultadosAprendizaje, crearResultado("")] })
          }
          disabled={unidad.resultadosAprendizaje.length >= LIMITES.resultadosPorUnidad}
          className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-black/45 hover:text-black disabled:opacity-35"
        >
          <Icono nombre="mas" className="h-3 w-3" /> Añadir
        </button>
      </div>

      <ul className="mt-2 space-y-1.5">
        {unidad.temas.map((t, i) => (
          <TemaEditor
            key={i}
            tema={t}
            indice={i}
            onChange={(nuevo) => onChange({ ...unidad, temas: unidad.temas.map((x, j) => (j === i ? nuevo : x)) })}
            onQuitar={() => onChange({ ...unidad, temas: unidad.temas.filter((_, j) => j !== i) })}
          />
        ))}
      </ul>

      <BotonMini
        onClick={() => onChange({ ...unidad, temas: [...unidad.temas, { nombre: "", subtemas: [] }] })}
        disabled={unidad.temas.length >= LIMITES.temasPorUnidad}
      >
        Añadir tema
      </BotonMini>
    </li>
  );
}

export function ContenidoSeccion({
  contenido,
  onChange,
  vinculosRa
}: {
  contenido: Microcurriculo["contenido"];
  onChange: (v: Microcurriculo["contenido"]) => void;
  /** Resultado(s) del programa que responde cada RA (por id de RA). */
  vinculosRa?: Record<string, string[]>;
}) {
  const vacia = (numero: number): Unidad => ({
    numero,
    titulo: "",
    resultadosAprendizaje: [],
    temas: []
  });

  return (
    <div>
      {contenido.unidades.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
          Sin unidades todavía. Pídelas al asistente o crea la primera.
        </p>
      )}

      <ul className="space-y-2">
        {contenido.unidades.map((u, i) => (
          <UnidadEditor
            key={i}
            unidad={u}
            vinculosRa={vinculosRa}
            onChange={(nueva) => onChange({ unidades: contenido.unidades.map((x, j) => (j === i ? nueva : x)) })}
            onQuitar={() =>
              onChange({
                // Se renumeran para que el documento no quede con huecos.
                unidades: contenido.unidades
                  .filter((_, j) => j !== i)
                  .map((x, k) => ({ ...x, numero: k + 1 }))
              })
            }
          />
        ))}
      </ul>

      <div className="mt-2">
        <BotonMini
          onClick={() => onChange({ unidades: [...contenido.unidades, vacia(contenido.unidades.length + 1)] })}
          disabled={contenido.unidades.length >= LIMITES.unidades}
        >
          Añadir unidad
        </BotonMini>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Secuencia didáctica                                              */
/* ------------------------------------------------------------------ */

/** Una fila de una fase: qué hace el docente, qué hace el estudiante, con qué. */
function FilaEditor({
  fila,
  indice,
  fase,
  sesion,
  onChange,
  onQuitar
}: {
  fila: FilaSesion;
  indice: number;
  fase: "inicio" | "desarrollo" | "cierre";
  sesion: number;
  onChange: (f: FilaSesion) => void;
  onQuitar: () => void;
}) {
  return (
    <li className="rounded-lg border border-black/[0.06] bg-white p-1.5">
      <div className="flex items-start gap-1">
        <span className="mt-1 shrink-0 font-mono text-[10px] text-black/30">
          {String(indice + 1).padStart(2, "0")}
        </span>
        <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
          <input
            value={fila.docente}
            onChange={(e) => onChange({ ...fila, docente: e.target.value })}
            aria-label={`Docente, sesión ${sesion}, ${fase}, fila ${indice + 1}`}
            placeholder="Qué hace el docente"
            className="min-w-0 rounded-lg border border-transparent px-2 py-1 text-[12px] leading-snug hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none"
          />
          <input
            value={fila.estudiante}
            onChange={(e) => onChange({ ...fila, estudiante: e.target.value })}
            aria-label={`Estudiante, sesión ${sesion}, ${fase}, fila ${indice + 1}`}
            placeholder="Qué hace el estudiante"
            className="min-w-0 rounded-lg border border-transparent px-2 py-1 text-[12px] leading-snug hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar fila ${indice + 1} de ${fase} de la sesión ${sesion}`}
          className="mt-0.5 shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-5">
        {fila.recursos.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange({ ...fila, recursos: fila.recursos.filter((x) => x !== r) })}
            title="Quitar recurso"
            className="inline-flex items-center gap-1 rounded-full bg-mora/10 px-2 py-0.5 text-[10.5px] text-mora hover:bg-mora/20"
          >
            {r}
            <span aria-hidden="true">×</span>
            <span className="sr-only">Quitar {r}</span>
          </button>
        ))}
        <RecursoNuevo onAgregar={(r) => onChange({ ...fila, recursos: [...fila.recursos, r] })} />
      </div>
    </li>
  );
}

/** Entrada libre de recurso para una fila de la sesión. */
function RecursoNuevo({ onAgregar }: { onAgregar: (r: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        const v = String(datos.get("recurso") ?? "").trim();
        if (v) onAgregar(v);
        e.currentTarget.reset();
      }}
    >
      <label className="sr-only">Añadir un recurso a esta fila</label>
      <input
        name="recurso"
        placeholder="+ recurso"
        className="w-20 rounded-full border border-dashed border-black/20 bg-transparent px-2 py-0.5 text-[10.5px] placeholder:text-black/35 focus:w-32 focus:border-black/30 focus:outline-none"
      />
    </form>
  );
}

const FASES: ("inicio" | "desarrollo" | "cierre")[] = ["inicio", "desarrollo", "cierre"];
const ETIQUETA_FASE = { inicio: "Inicio", desarrollo: "Desarrollo", cierre: "Cierre" } as const;

function SesionEditor({
  sesion,
  unidades,
  onChange,
  onQuitar
}: {
  sesion: Sesion;
  unidades: Unidad[];
  onChange: (s: Sesion) => void;
  onQuitar: () => void;
}) {
  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sow px-1.5 font-mono text-[10px] font-semibold text-seedling">
          S{sesion.numero}
        </span>
        <Campo
          valor={sesion.tema}
          onChange={(tema) => onChange({ ...sesion, tema })}
          label={`Tema de la sesión ${sesion.numero}`}
          placeholder="Tema de la sesión"
          className="min-w-[8rem] flex-1 text-[12.5px] font-medium"
        />
        <label className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5">
          <span className="sr-only">Unidad de la sesión {sesion.numero}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40">U</span>
          <select
            value={sesion.unidad}
            onChange={(e) => onChange({ ...sesion, unidad: Number(e.target.value) })}
            aria-label={`Unidad de la sesión ${sesion.numero}`}
            className="bg-transparent font-mono text-[11px] focus:outline-none"
          >
            {(unidades.length ? unidades : [{ numero: 1, titulo: "", resultadosAprendizaje: [], temas: [] }]).map((u) => (
              <option key={u.numero} value={u.numero}>
                {u.numero}
              </option>
            ))}
          </select>
        </label>
        <select
          value={sesion.tipo}
          onChange={(e) => onChange({ ...sesion, tipo: e.target.value as TipoSesion })}
          aria-label={`Tipo de la sesión ${sesion.numero}`}
          className="rounded-full bg-black/[0.04] px-2 py-1 text-[11px] focus:outline-none"
        >
          {TIPOS_SESION.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO_SESION[t]}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5">
          <Numero
            valor={sesion.duracionMin}
            onChange={(duracionMin) => onChange({ ...sesion, duracionMin })}
            label={`Duración de la sesión ${sesion.numero} en minutos`}
            min={1}
            max={600}
            className="w-10"
          />
          <span className="text-[10px] text-black/45">min</span>
        </label>
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar la sesión ${sesion.numero}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-1.5 grid gap-1.5 lg:grid-cols-3">
        {FASES.map((fase) => (
          <div key={fase} className="rounded-lg bg-arena/40 p-1.5">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-black/45">
              {ETIQUETA_FASE[fase]}
            </p>
            <ul className="space-y-1">
              {sesion[fase].map((f, i) => (
                <FilaEditor
                  key={i}
                  fila={f}
                  indice={i}
                  fase={fase}
                  sesion={sesion.numero}
                  onChange={(nuevaFila) =>
                    onChange({ ...sesion, [fase]: sesion[fase].map((x, j) => (j === i ? nuevaFila : x)) })
                  }
                  onQuitar={() => onChange({ ...sesion, [fase]: sesion[fase].filter((_, j) => j !== i) })}
                />
              ))}
            </ul>
            <BotonMini
              onClick={() =>
                onChange({
                  ...sesion,
                  [fase]: [...sesion[fase], { docente: "", estudiante: "", recursos: [] }]
                })
              }
              disabled={sesion[fase].length >= LIMITES.filasPorFase}
            >
              Añadir
            </BotonMini>
          </div>
        ))}
      </div>
    </li>
  );
}

export function SecuenciaSeccion({
  micro,
  onChange
}: {
  micro: Microcurriculo;
  onChange: (v: Microcurriculo["secuencia"]) => void;
}) {
  const { sesiones } = micro.secuencia;
  /**
   * Navegación de dos niveles: `null` = lista de unidades; un número = las
   * sesiones de esa unidad. El estado es local y muere al cerrar el acordeón,
   * así que al reabrir la sección siempre se vuelve a la lista de unidades.
   */
  const [unidadAbierta, setUnidadAbierta] = useState<number | null>(null);

  const grupos = unidadesDeSecuencia(micro);
  const grupoActual = unidadAbierta === null ? null : (grupos.find((g) => g.numero === unidadAbierta) ?? null);

  const mapeadas = horasPorTipo(sesiones);
  const declaradas = micro.ident.horas;
  const difiere =
    sesiones.length > 0 &&
    (mapeadas.teoricas !== declaradas.teoricas ||
      mapeadas.practicas !== declaradas.practicas ||
      mapeadas.independientes !== declaradas.independientes);

  /**
   * Renumera SIEMPRE sobre el conjunto completo, ordenando por unidad: con
   * vistas filtradas, numerar por posición del array rompería el orden del
   * documento.
   */
  const numerar = (lista: Sesion[]): Sesion[] =>
    [...lista].sort((a, b) => a.unidad - b.unidad).map((s, i) => ({ ...s, numero: i + 1 }));

  const nueva = (unidad: number): Sesion => ({
    numero: sesiones.length + 1,
    unidad,
    tema: "",
    duracionMin: 90,
    tipo: "teorica",
    inicio: [{ docente: "", estudiante: "", recursos: [] }],
    desarrollo: [{ docente: "", estudiante: "", recursos: [] }],
    cierre: [{ docente: "", estudiante: "", recursos: [] }]
  });

  /** Inserta la sesión después de la última de su unidad y renumera todo. */
  function agregarAUnidad(unidad: number) {
    const lista = [...sesiones];
    const ultima = lista.map((s) => s.unidad).lastIndexOf(unidad);
    lista.splice(ultima === -1 ? lista.length : ultima + 1, 0, nueva(unidad));
    onChange({ sesiones: numerar(lista) });
  }

  function editarSesion(numero: number, cambiada: Sesion) {
    onChange({ sesiones: numerar(sesiones.map((s) => (s.numero === numero ? cambiada : s))) });
  }

  function quitarSesion(numero: number) {
    onChange({ sesiones: numerar(sesiones.filter((s) => s.numero !== numero)) });
  }

  /* ---------------- Vista A: lista de unidades ---------------- */

  if (!grupoActual) {
    return (
      <div>
        {sesiones.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-black/[0.03] px-3 py-1.5 text-[11px] text-black/60">
            <span>
              Mapeadas: <strong className="font-mono tabular-nums">{mapeadas.teoricas}</strong> T ·{" "}
              <strong className="font-mono tabular-nums">{mapeadas.practicas}</strong> P ·{" "}
              <strong className="font-mono tabular-nums">{mapeadas.independientes}</strong> I
            </span>
            <span>
              Declaradas: <strong className="font-mono tabular-nums">{declaradas.teoricas}</strong> ·{" "}
              <strong className="font-mono tabular-nums">{declaradas.practicas}</strong> ·{" "}
              <strong className="font-mono tabular-nums">{declaradas.independientes}</strong>
            </span>
            {difiere && (
              <span className="inline-flex items-center gap-1 text-terracotta">
                <Icono nombre="alerta" className="h-3 w-3" /> no cuadra con la carga horaria
              </span>
            )}
          </div>
        )}

        {grupos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] leading-relaxed text-black/45">
            Todavía no hay unidades en el contenido temático. Créalas allí y aquí podrás planificar las sesiones de
            cada una.
          </p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {grupos.map((g) => (
              <li key={g.numero}>
                <button
                  type="button"
                  onClick={() => setUnidadAbierta(g.numero)}
                  aria-label={`Abrir ${g.titulo || `la unidad ${g.numero}`}: ${g.sesiones} ${
                    g.sesiones === 1 ? "sesión" : "sesiones"
                  }`}
                  className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                    g.sesiones > 0
                      ? "border-black/[0.07] bg-white hover:border-black/20"
                      : "border-dashed border-black/15 bg-white/60 hover:border-black/25"
                  }`}
                >
                  <span
                    className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold ${
                      g.existe ? "bg-sow text-seedling" : "bg-mora/15 text-mora"
                    }`}
                  >
                    {g.numero === GRUPO_SIN_UNIDAD ? "—" : g.numero}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">
                      {g.titulo || `Unidad ${g.numero}`}
                    </span>
                    <span className="block truncate text-[10.5px] text-black/45">
                      {g.temas > 0 ? `${g.temas} tema${g.temas === 1 ? "" : "s"} · ` : ""}
                      {g.sesiones > 0
                        ? `${g.sesiones} sesión${g.sesiones === 1 ? "" : "es"} · ${g.horas} h`
                        : "sin sesiones"}
                    </span>
                  </span>
                  <Icono nombre="chevron" className="h-3.5 w-3.5 shrink-0 text-black/30" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ---------------- Vista B: sesiones de una unidad ---------------- */

  const sesionesUnidad = sesionesDeUnidad(micro, grupoActual.numero);
  const puedeAgregar =
    sesiones.length < LIMITES.sesiones && grupoActual.numero !== GRUPO_SIN_UNIDAD;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={() => setUnidadAbierta(null)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/70 hover:border-black/25 hover:text-black"
        >
          <Icono nombre="chevron" className="h-3 w-3 rotate-180" /> Volver a unidades
        </button>
        <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold tracking-tight">
          {grupoActual.numero === GRUPO_SIN_UNIDAD ? grupoActual.titulo : `Unidad ${grupoActual.numero} — ${grupoActual.titulo || "sin título"}`}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-black/50">
          {grupoActual.sesiones} {grupoActual.sesiones === 1 ? "sesión" : "sesiones"} · {grupoActual.horas} h
        </span>
      </div>

      {sesionesUnidad.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] leading-relaxed text-black/45">
          Esta unidad todavía no tiene sesiones. Añade la primera y quedará ligada a la unidad{" "}
          {grupoActual.numero}.
        </p>
      ) : (
        <ul className="space-y-2">
          {sesionesUnidad.map((s) => (
            <SesionEditor
              key={s.numero}
              sesion={s}
              unidades={micro.contenido.unidades}
              onChange={(cambiada) => editarSesion(s.numero, cambiada)}
              onQuitar={() => quitarSesion(s.numero)}
            />
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {puedeAgregar && (
          <BotonMini onClick={() => agregarAUnidad(grupoActual.numero)} disabled={!puedeAgregar}>
            Añadir sesión
          </BotonMini>
        )}
        <span className="text-[10.5px] text-black/40">
          {grupoActual.numero === GRUPO_SIN_UNIDAD
            ? "Estas sesiones apuntan a una unidad que ya no existe: asígnales una unidad para recuperarlas."
            : "Cambiar la unidad de una sesión la mueve a la lista de esa unidad."}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Metodología                                                      */
/* ------------------------------------------------------------------ */

export function MetodologiaSeccion({
  metodologia,
  onChange
}: {
  metodologia: Microcurriculo["metodologia"];
  onChange: (v: Microcurriculo["metodologia"]) => void;
}) {
  return (
    <div>
      <ul className="space-y-2">
        {metodologia.estrategias.map((e, i) => (
          <li key={i} className="rounded-xl border border-black/[0.07] bg-white p-2.5">
            <div className="flex items-center gap-1.5">
              <Campo
                valor={e.nombre}
                onChange={(nombre) =>
                  onChange({
                    estrategias: metodologia.estrategias.map((x, j) => (j === i ? { ...x, nombre } : x))
                  })
                }
                label={`Estrategia ${i + 1}`}
                placeholder="Aprendizaje basado en proyectos, estudio de caso…"
                className="text-[13px] font-medium"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({ estrategias: metodologia.estrategias.filter((_, j) => j !== i) })
                }
                aria-label={`Quitar estrategia ${i + 1}`}
                className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
              >
                <Icono nombre="papelera" className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-1">
              <Area
                valor={e.descripcion}
                onChange={(descripcion) =>
                  onChange({
                    estrategias: metodologia.estrategias.map((x, j) => (j === i ? { ...x, descripcion } : x))
                  })
                }
                label={`Cómo se aplica la estrategia ${i + 1}`}
                placeholder="Cómo se aplica en esta asignatura"
                rows={2}
                className="text-[12.5px]"
              />
            </div>
          </li>
        ))}
      </ul>

      {metodologia.estrategias.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
          Sin estrategias todavía.
        </p>
      )}

      <div className="mt-2">
        <BotonMini
          onClick={() =>
            onChange({ estrategias: [...metodologia.estrategias, { nombre: "", descripcion: "" }] })
          }
          disabled={metodologia.estrategias.length >= LIMITES.estrategias}
        >
          Añadir estrategia
        </BotonMini>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Evaluación                                                       */
/* ------------------------------------------------------------------ */

/** Entrada libre para una herramienta que el entregable exige (GitHub, Jira…). */
function HerramientaNueva({ onAgregar }: { onAgregar: (h: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        const v = String(datos.get("herramienta") ?? "").trim();
        if (v) onAgregar(v);
        e.currentTarget.reset();
      }}
    >
      <label className="sr-only">Añadir una herramienta que exige el entregable</label>
      <input
        name="herramienta"
        placeholder="+ herramienta"
        className="w-24 rounded-full border border-dashed border-black/20 bg-transparent px-2 py-0.5 text-[10.5px] placeholder:text-black/35 focus:w-36 focus:border-black/30 focus:outline-none"
      />
    </form>
  );
}

function CorteEditor({
  corte,
  indice,
  ras,
  onChange,
  onQuitar
}: {
  corte: Corte;
  indice: number;
  /** RA del micro para vincular cada actividad con lo que mide. */
  ras: RaTrazable[];
  onChange: (c: Corte) => void;
  onQuitar: () => void;
}) {
  return (
    <li className="rounded-xl border border-black/[0.07] bg-white p-2.5">
      <div className="flex items-center gap-1.5">
        <Campo
          valor={corte.nombre}
          onChange={(nombre) => onChange({ ...corte, nombre })}
          label={`Nombre del corte ${indice + 1}`}
          placeholder="Primer corte, Examen final…"
          className="text-[13px] font-medium"
        />
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1">
          <Numero
            valor={corte.porcentaje}
            onChange={(porcentaje) => onChange({ ...corte, porcentaje })}
            label={`Porcentaje del corte ${indice + 1}`}
            min={0}
            max={100}
            className="w-10"
          />
          <span className="text-[11px] text-black/45">%</span>
        </div>
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar corte ${indice + 1}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>

      <ul className="mt-1.5 space-y-2 pl-2">
        {corte.actividades.map((a, i) => {
          const sinInstrumento = Boolean(a.nombre.trim()) && !a.instrumento.trim();
          const cambiar = (parche: Partial<typeof a>) =>
            onChange({
              ...corte,
              actividades: corte.actividades.map((x, j) => (j === i ? { ...x, ...parche } : x))
            });
          return (
            <li key={i} className="rounded-lg border border-black/[0.06] p-2">
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <Campo
                    valor={a.nombre}
                    onChange={(nombre) => cambiar({ nombre })}
                    label={`Actividad ${i + 1} del corte ${indice + 1}`}
                    placeholder="Examen escrito, ensayo, exposición…"
                    className="text-[12.5px] font-medium"
                  />
                  <Campo
                    valor={a.descripcion}
                    onChange={(descripcion) => cambiar({ descripcion })}
                    label={`Detalle de la actividad ${i + 1} del corte ${indice + 1}`}
                    placeholder="Qué se evalúa o cómo"
                    className="text-[11.5px] text-black/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...corte, actividades: corte.actividades.filter((_, j) => j !== i) })
                  }
                  aria-label={`Quitar actividad ${i + 1} del corte ${indice + 1}`}
                  className="mt-1 shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
                >
                  <Icono nombre="papelera" className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                {/* Instrumento: sin él el entregable no es calificable */}
                <label className="flex items-center gap-1">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">
                    Instrumento
                  </span>
                  <input
                    value={a.instrumento}
                    onChange={(e) => cambiar({ instrumento: e.target.value })}
                    list="instrumentos-sugeridos"
                    aria-label={`Instrumento de la actividad ${i + 1} del corte ${indice + 1}`}
                    placeholder="Rúbrica analítica"
                    className={`min-w-0 flex-1 rounded-lg border bg-transparent px-2 py-0.5 text-[11.5px] focus:bg-white focus:outline-none ${
                      sinInstrumento ? "border-terracotta/50 text-black" : "border-transparent hover:border-black/10 focus:border-black/20"
                    }`}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">
                    Nota
                  </span>
                  <input
                    value={a.mide}
                    onChange={(e) => cambiar({ mide: e.target.value })}
                    aria-label={`Nota libre sobre qué mide la actividad ${i + 1} del corte ${indice + 1}`}
                    placeholder="Aclaración opcional"
                    className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-0.5 text-[11.5px] hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none"
                  />
                </label>
              </div>

              {/* Vínculo trazable: qué RA mide esta actividad. */}
              <div className="mt-1 pl-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-black/40">
                  Mide los RA
                </p>
                {ras.length === 0 ? (
                  <p className="mt-0.5 text-[11px] text-black/45">
                    Todavía no hay resultados de aprendizaje. Redáctalos en el contenido y vuelve aquí a vincularlos.
                  </p>
                ) : (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {ras.map((r) => {
                      const activo = a.mideIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() =>
                            cambiar({
                              mideIds: activo
                                ? a.mideIds.filter((x) => x !== r.id)
                                : [...a.mideIds, r.id]
                            })
                          }
                          aria-pressed={activo}
                          title={r.texto}
                          className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${
                            activo
                              ? "bg-rainfall/15 text-rainfall"
                              : "bg-black/[0.04] text-black/55 hover:bg-black/[0.08] hover:text-black"
                          }`}
                        >
                          <span className="shrink-0 font-mono">U{r.unidad}</span>
                          <span className="truncate">{r.texto}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {Boolean(a.nombre.trim()) && a.mideIds.length === 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[10.5px] text-terracotta">
                    <Icono nombre="alerta" className="h-3 w-3" /> Sin RA vinculado: no se sabe qué resultado mide
                  </p>
                )}
              </div>

              {sinInstrumento && (
                <p className="mt-1 flex items-center gap-1 pl-1 text-[10.5px] text-terracotta">
                  <Icono nombre="alerta" className="h-3 w-3" /> Falta el instrumento con que se califica
                </p>
              )}

              {/* Herramientas que el entregable exige usar */}
              <div className="mt-1 flex flex-wrap items-center gap-1 pl-1">
                {a.herramientas.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => cambiar({ herramientas: a.herramientas.filter((x) => x !== h) })}
                    title="Quitar herramienta"
                    className="inline-flex items-center gap-1 rounded-full bg-mora/10 px-2 py-0.5 text-[10.5px] text-mora hover:bg-mora/20"
                  >
                    {h}
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">Quitar {h}</span>
                  </button>
                ))}
                <HerramientaNueva onAgregar={(h) => cambiar({ herramientas: [...a.herramientas, h] })} />
              </div>
            </li>
          );
        })}
      </ul>

      <datalist id="instrumentos-sugeridos">
        <option value="Rúbrica analítica" />
        <option value="Rúbrica holística" />
        <option value="Lista de cotejo" />
        <option value="Guía de observación" />
        <option value="Escala de valoración" />
        <option value="Portafolio" />
      </datalist>

      <BotonMini
        onClick={() => onChange({ ...corte, actividades: [...corte.actividades, nuevaActividadEvaluacion()] })}
        disabled={corte.actividades.length >= LIMITES.actividadesPorCorte}
      >
        Añadir actividad
      </BotonMini>
    </li>
  );
}

export function EvaluacionSeccion({
  micro,
  onChange,
  onAjustar
}: {
  micro: Microcurriculo;
  onChange: (v: Microcurriculo["evaluacion"]) => void;
  onAjustar: () => void;
}) {
  const evaluacion = micro.evaluacion;
  const total = totalPorcentaje(evaluacion.cortes);
  const descuadra = evaluacion.cortes.length > 0 && total !== 100;
  const ras = rasDelMicro(micro);

  return (
    <div>
      {descuadra && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-terracotta/10 px-3 py-2">
          <Icono nombre="alerta" className="h-3.5 w-3.5 shrink-0 text-terracotta" />
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-black/75">
            Los porcentajes suman <strong className="font-semibold tabular-nums">{total}%</strong> y deben sumar
            100%.
          </p>
          <BotonMini onClick={onAjustar} tono="acento" icono="ajustar">
            Ajustar a 100
          </BotonMini>
        </div>
      )}

      <ul className="space-y-2">
        {evaluacion.cortes.map((c, i) => (
          <CorteEditor
            key={i}
            corte={c}
            indice={i}
            ras={ras}
            onChange={(nuevo) =>
              onChange({ cortes: evaluacion.cortes.map((x, j) => (j === i ? nuevo : x)) })
            }
            onQuitar={() => onChange({ cortes: evaluacion.cortes.filter((_, j) => j !== i) })}
          />
        ))}
      </ul>

      {evaluacion.cortes.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
          Sin cortes de evaluación todavía.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <BotonMini
          onClick={() =>
            onChange({ cortes: [...evaluacion.cortes, { nombre: "", porcentaje: 0, actividades: [] }] })
          }
          disabled={evaluacion.cortes.length >= LIMITES.cortes}
        >
          Añadir corte
        </BotonMini>
        {!descuadra && evaluacion.cortes.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-rainfall">
            <Icono nombre="check" className="h-3 w-3" /> Suma 100%
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Datos de identificación                                          */
/* ------------------------------------------------------------------ */

function HorasEditor({
  horas,
  onChange
}: {
  horas: Horas;
  onChange: (h: Horas) => void;
}) {
  const campos: { clave: keyof Horas; etiqueta: string; titulo: string }[] = [
    { clave: "teoricas", etiqueta: "HT", titulo: "Horas teóricas" },
    { clave: "practicas", etiqueta: "HP", titulo: "Horas prácticas" },
    { clave: "independientes", etiqueta: "HTI", titulo: "Horas de trabajo independiente" }
  ];
  return (
    <div>
      <Rotulo>Carga horaria</Rotulo>
      <div className="mt-1 flex flex-wrap gap-2">
        {campos.map(({ clave, etiqueta, titulo }) => (
          <label
            key={clave}
            title={titulo}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5"
          >
            <span className="font-mono text-[11px] font-semibold text-black/50">{etiqueta}</span>
            <span className="sr-only">{titulo}</span>
            <Numero
              valor={horas[clave]}
              onChange={(v) => onChange({ ...horas, [clave]: v })}
              label={titulo}
              max={LIMITES.horas}
              className="w-11 bg-transparent"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function IdentificacionSeccion({
  ident,
  onChange
}: {
  ident: Identificacion;
  onChange: (v: Identificacion) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <Rotulo>Asignatura</Rotulo>
          <Campo
            valor={ident.asignatura}
            onChange={(asignatura) => onChange({ ...ident, asignatura })}
            label="Nombre de la asignatura"
            className="text-[13px]"
          />
        </label>
        <label className="block min-w-0">
          <Rotulo>Código</Rotulo>
          <Campo
            valor={ident.codigo}
            onChange={(codigo) => onChange({ ...ident, codigo })}
            label="Código de la asignatura"
            className="font-mono text-[13px]"
          />
        </label>
        <label className="block min-w-0">
          <Rotulo>Programa académico</Rotulo>
          <Campo
            valor={ident.programa}
            onChange={(programa) => onChange({ ...ident, programa })}
            label="Programa académico"
            className="text-[13px]"
          />
        </label>
        <label className="block min-w-0">
          <Rotulo>Semestre / nivel</Rotulo>
          <Campo
            valor={ident.semestre}
            onChange={(semestre) => onChange({ ...ident, semestre })}
            label="Semestre o nivel"
            className="text-[13px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5">
          <span className="font-mono text-[11px] font-semibold text-black/50">Créd.</span>
          <span className="sr-only">Créditos</span>
          <Numero
            valor={ident.creditos}
            onChange={(creditos) => onChange({ ...ident, creditos })}
            label="Créditos"
            max={60}
            className="w-10 bg-transparent"
          />
        </label>
        <div className="min-w-0 flex-1">
          <HorasEditor horas={ident.horas} onChange={(horas) => onChange({ ...ident, horas })} />
        </div>
      </div>

      <div>
        <ListaTextos
          etiqueta="Prerrequisitos"
          items={ident.prerrequisitos}
          onChange={(prerrequisitos) => onChange({ ...ident, prerrequisitos })}
          max={LIMITES.prerrequisitos}
          placeholder="Asignatura que debe aprobarse antes"
        />
        {ident.prerrequisitos.length === 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...ident, prerrequisitos: [SIN_PRERREQUISITOS] })}
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-black/45 hover:text-black"
          >
            <Icono nombre="check" className="h-3 w-3" /> Marcar «{SIN_PRERREQUISITOS}»
          </button>
        ) : (
          ident.prerrequisitos.length === 1 &&
          ident.prerrequisitos[0] === SIN_PRERREQUISITOS && (
            <p className="mt-1 px-2 text-[11px] text-rainfall">Declarado explícitamente: no tiene prerrequisitos.</p>
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Bibliografía                                                     */
/* ------------------------------------------------------------------ */

/**
 * Nota: la prop NO se llama `ref`. React reserva ese nombre —lo intercepta
 * antes de llegar al componente— y el parámetro llegaría undefined. De ahí el
 * TypeError leyendo `confirmada`.
 */
function ReferenciaEditor({
  referencia: r,
  indice,
  etiqueta,
  onChange,
  onQuitar
}: {
  referencia: Referencia;
  indice: number;
  etiqueta: string;
  onChange: (r: Referencia) => void;
  onQuitar: () => void;
}) {
  return (
    <li
      className={`rounded-xl border p-2.5 ${
        r.confirmada ? "border-black/[0.07] bg-white" : "border-mora/25 bg-mora/[0.04]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Campo
          valor={r.titulo}
          onChange={(titulo) => onChange({ ...r, titulo })}
          label={`Título de la referencia ${indice + 1} (${etiqueta})`}
          placeholder="Título del texto"
          className="text-[13px] font-medium"
        />
        <button
          type="button"
          aria-pressed={r.confirmada}
          onClick={() => onChange({ ...r, confirmada: !r.confirmada })}
          title={r.confirmada ? "Confirmada: se cuenta como obligatoria" : "Sugerencia: verifícala antes de usarla"}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            r.confirmada
              ? "bg-rainfall text-white hover:bg-rainfall/90"
              : "bg-mora text-white hover:bg-mora/90"
          }`}
        >
          <Icono nombre={r.confirmada ? "check" : "alerta"} className="h-3 w-3" />
          {r.confirmada ? "Confirmada" : "Sugerencia"}
        </button>
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar referencia ${indice + 1} de ${etiqueta}`}
          className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        <Campo
          valor={r.autor}
          onChange={(autor) => onChange({ ...r, autor })}
          label={`Autor de la referencia ${indice + 1} (${etiqueta})`}
          placeholder="Autor"
          className="text-[12px] text-black/70"
        />
        <Campo
          valor={r.dato}
          onChange={(dato) => onChange({ ...r, dato })}
          label={`Datos de la referencia ${indice + 1} (${etiqueta})`}
          placeholder="Editorial"
          className="text-[12px] text-black/70"
        />
      </div>

      {/* Edición exacta: «edición reciente» no sirve en un documento oficial */}
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        <label className="flex items-center gap-1">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">Año</span>
          <Campo
            valor={r.anio}
            onChange={(anio) => onChange({ ...r, anio })}
            label={`Año de la referencia ${indice + 1} (${etiqueta})`}
            placeholder="2019"
            className="font-mono text-[12px]"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">Ed.</span>
          <Campo
            valor={r.edicion}
            onChange={(edicion) => onChange({ ...r, edicion })}
            label={`Edición de la referencia ${indice + 1} (${etiqueta})`}
            placeholder="9.ª"
            className="text-[12px]"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/40">ISBN</span>
          <Campo
            valor={r.isbn}
            onChange={(isbn) => onChange({ ...r, isbn })}
            label={`ISBN de la referencia ${indice + 1} (${etiqueta})`}
            placeholder={r.confirmada ? "978-…" : "pídelo al asistente"}
            className="font-mono text-[11.5px]"
          />
        </label>
      </div>

      {!r.isbn.trim() && (
        <p className="mt-1 pl-1 text-[10.5px] leading-relaxed text-black/45">
          El asistente <strong className="font-medium text-black/60">no inventa ISBN</strong>: un número falso parece
          oficial. Pídelo o escríbelo tú.
        </p>
      )}
    </li>
  );
}

export function BibliografiaSeccion({
  micro,
  onChange
}: {
  micro: Microcurriculo;
  onChange: (v: Microcurriculo["bibliografia"]) => void;
}) {
  const bibliografia = micro.bibliografia;
  const nueva = (): Referencia => ({
    autor: "",
    titulo: "",
    dato: "",
    anio: "",
    edicion: "",
    isbn: "",
    confirmada: false
  });

  const bloque = (
    clave: "obligatorias" | "complementarias",
    etiqueta: string
  ) => (
    <div>
      <Rotulo>{etiqueta}</Rotulo>
      <ul className="mt-1 space-y-1.5">
        {bibliografia[clave].map((r, i) => (
          <ReferenciaEditor
            key={i}
            referencia={r}
            indice={i}
            etiqueta={etiqueta}
            onChange={(nuevaRef) =>
              onChange({
                ...bibliografia,
                [clave]: bibliografia[clave].map((x, j) => (j === i ? nuevaRef : x))
              })
            }
            onQuitar={() =>
              onChange({ ...bibliografia, [clave]: bibliografia[clave].filter((_, j) => j !== i) })
            }
          />
        ))}
      </ul>
      {bibliografia[clave].length === 0 && (
        <p className="mt-1 rounded-xl border border-dashed border-black/15 px-3 py-2 text-center text-[11.5px] text-black/45">
          Sin referencias.
        </p>
      )}
      <div className="mt-1">
        <BotonMini
          onClick={() => onChange({ ...bibliografia, [clave]: [...bibliografia[clave], nueva()] })}
          disabled={bibliografia[clave].length >= LIMITES.referencias}
        >
          Añadir
        </BotonMini>
      </div>
    </div>
  );

  const pendientes = [...bibliografia.obligatorias, ...bibliografia.complementarias].filter(
    (r) => !r.confirmada
  ).length;

  return (
    <div className="space-y-3">
      {pendientes > 0 && (
        <p className="rounded-xl bg-mora/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-black/70">
          <strong className="font-semibold">{pendientes}</strong> referencia
          {pendientes === 1 ? "" : "s"} marcada{pendientes === 1 ? "" : "s"} como{" "}
          <span className="font-medium text-mora">sugerencia</span>. Verifícalas y confírmalas antes de
          presentar el microcurrículo.
        </p>
      )}
      {bloque("obligatorias", "Obligatorias")}
      {bloque("complementarias", "Complementarias")}

      {/* Recursos con su alineación visible: usada en N actividades, o sin uso */}
      <div>
        <Rotulo>Recursos y herramientas</Rotulo>
        <ul className="mt-1 space-y-1">
          {bibliografia.recursos.map((r, i) => {
            const usos = usosDeRecurso(micro, r);
            return (
              <li key={i} className="flex items-center gap-1">
                <input
                  value={r}
                  onChange={(e) =>
                    onChange({
                      ...bibliografia,
                      recursos: bibliografia.recursos.map((x, j) => (j === i ? e.target.value : x))
                    })
                  }
                  aria-label={`Recurso ${i + 1}`}
                  placeholder="Base de datos, software, repositorio"
                  className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-[12.5px] hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none"
                />
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    usos > 0 ? "bg-rainfall/10 text-rainfall" : "bg-black/[0.04] text-black/40"
                  }`}
                  title={usos > 0 ? "Aparece en actividades o sesiones" : "Declarada pero sin usar"}
                >
                  {usos > 0 ? `usada en ${usos}` : "sin uso"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...bibliografia, recursos: bibliografia.recursos.filter((_, j) => j !== i) })
                  }
                  aria-label={`Quitar recurso ${i + 1}`}
                  className="shrink-0 rounded-full p-1 text-black/25 hover:text-terracotta"
                >
                  <Icono nombre="papelera" className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-1">
          <BotonMini
            onClick={() => onChange({ ...bibliografia, recursos: [...bibliografia.recursos, ""] })}
            disabled={bibliografia.recursos.length >= LIMITES.recursos}
          >
            Añadir recurso
          </BotonMini>
        </div>
        {recursosSinUso(micro).length > 0 && (
          <p className="mt-1 rounded-xl bg-terracotta/[0.07] px-3 py-2 text-[11px] leading-relaxed text-black/70">
            {recursosSinUso(micro).join(", ")}{" "}
            {recursosSinUso(micro).length === 1 ? "está declarado" : "están declarados"} pero no aparece
            {recursosSinUso(micro).length === 1 ? "" : "n"} en ninguna actividad ni sesión. Una herramienta que no se
            usa no alinea nada.
          </p>
        )}
      </div>
    </div>
  );
}
