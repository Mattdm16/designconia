"use client";

import { useEffect, useRef, useState } from "react";

import { Icono } from "@/components/Icono";
import { extraerMensajeParcial, type ChatMensaje } from "@/lib/schema";

export type VarianteChat = "limpio" | "lateral";

/** Adjunto visible en el compositor antes de enviar. */
export type AdjuntoChip = {
  id: string;
  nombre: string;
  estado: "extrayendo" | "listo" | "error" | "anio";
  /** Texto secundario: páginas/año, motivo del error o aviso. */
  detalle?: string;
};

/** Documento del proyecto para el menú del botón «+». */
export type DocMenuItem = {
  id: string;
  nombre: string;
  nivel: "macro" | "meso" | "micro";
};

export type MenuCompositor = {
  documentos: DocMenuItem[];
  onNuevoDocumento: () => void;
  onAbrirDocumento: (nivel: DocMenuItem["nivel"], id: string) => void;
  onAdjuntar: (archivos: File[]) => void;
};

type Props = {
  mensajes: ChatMensaje[];
  enviando: boolean;
  error: string | null;
  onEnviar: (texto: string) => void;
  onDetener: () => void;
  onReintentar: () => void;
  /** Chips clicables: las del turno recién recibido. */
  sugerencias: string[];
  /** Saludo de apertura. Se muestra solo mientras no hay mensajes. */
  saludo: string;
  /** "limpio" ocupa la pantalla; "lateral" es el panel angosto junto al borrador. */
  variante?: VarianteChat;
  deshabilitado?: boolean;
  motivoDeshabilitado?: string;
  scrollRef: React.RefObject<HTMLDivElement>;
  /** Adjuntos pendientes de enviar (PDF ya validados o en proceso). */
  adjuntos?: AdjuntoChip[];
  onQuitarAdjunto?: (id: string) => void;
  /** Confirma el año declarado de un PDF sin fecha legible. */
  onConfirmarAnio?: (id: string, anio: number) => void;
  /** Menú del botón «+»: adjuntar PDF, nuevo documento y documentos del proyecto. */
  menu?: MenuCompositor | null;
};

/** Mensaje de la IA con el texto conversacional que va llegando en streaming. */
function BurbujaIA({ mensaje, enCurso }: { mensaje: ChatMensaje; enCurso: boolean }) {
  return (
    <div className="max-w-[95%]">
      <div className="rounded-2xl rounded-tl-sm bg-sow px-4 py-3 text-[13px] leading-relaxed text-papel shadow-burbuja">
        <p className="whitespace-pre-wrap">{mensaje.texto}</p>
        {enCurso && (
          <span
            className="mt-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-full bg-sprout/80"
            aria-hidden="true"
          />
        )}
      </div>
      {mensaje.incompleto && !enCurso && (
        <p className="mt-1 flex items-center gap-1.5 pl-1 text-[11px] text-black/45">
          <Icono nombre="alerta" className="h-3 w-3" />
          Respuesta interrumpida.
        </p>
      )}
    </div>
  );
}

export function Chat({
  mensajes,
  enviando,
  error,
  onEnviar,
  onDetener,
  onReintentar,
  sugerencias,
  saludo,
  variante = "limpio",
  deshabilitado = false,
  motivoDeshabilitado,
  scrollRef,
  adjuntos = [],
  onQuitarAdjunto,
  onConfirmarAnio,
  menu = null
}: Props) {
  const [texto, setTexto] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  // La última respuesta se está escribiendo.
  const ultimo = mensajes[mensajes.length - 1];
  const escribiendo = enviando && ultimo?.role === "asistente";
  const vacio = mensajes.length === 0;
  const ancho = variante === "limpio" ? "mx-auto w-full max-w-[640px]" : "";

  useEffect(() => {
    if (!enviando) areaRef.current?.focus();
  }, [enviando]);

  function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || enviando || deshabilitado) return;
    onEnviar(limpio);
    setTexto("");
  }

  const puedeTocar = !deshabilitado && !enviando;

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${variante === "limpio" ? "px-4 sm:px-6" : ""}`}>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        aria-live="polite"
        aria-busy={enviando}
      >
        <div className={`${ancho} space-y-3 py-4`}>
          {/* Apertura: el asistente saluda sin pedir datos todavía. */}
          {vacio && (
            <div className="space-y-3 pt-6 sm:pt-14">
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-sow px-4 py-3 text-[13px] leading-relaxed text-papel shadow-burbuja">
                {saludo}
              </div>
              <Sugerencias
                items={sugerencias}
                onElegir={enviar}
                habilitado={puedeTocar}
                etiqueta="Sugerencias para arrancar"
              />
            </div>
          )}

          {mensajes.map((m) =>
            m.role === "usuario" ? (
              <div key={m.id} className="flex items-start justify-end gap-2">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-white/60 bg-crema px-4 py-2.5 text-[13.5px] shadow-tarjeta">
                  {m.texto}
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-redwood text-[11px] font-semibold text-white">
                  D
                </span>
              </div>
            ) : (
              <BurbujaIA key={m.id} mensaje={m} enCurso={escribiendo && m.id === ultimo?.id} />
            )
          )}

          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-terracotta/30 bg-white px-4 py-3 shadow-tarjeta"
            >
              <Icono nombre="alerta" className="h-4 w-4 shrink-0 text-terracotta" />
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-black/75">{error}</p>
              <button
                type="button"
                onClick={onReintentar}
                disabled={enviando}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25 disabled:opacity-40"
              >
                <Icono nombre="deshacer" className="h-3.5 w-3.5" /> Reintentar
              </button>
            </div>
          )}

          {/* Sugerencias del turno: la IA propone, el docente decide. */}
          {!vacio && !escribiendo && sugerencias.length > 0 && (
            <Sugerencias items={sugerencias} onElegir={enviar} habilitado={puedeTocar} etiqueta="Respuestas sugeridas" />
          )}
        </div>
      </div>

      <div className={`${ancho} pb-3 pt-1`}>
        {deshabilitado && motivoDeshabilitado && (
          <p className="mb-2 flex items-start gap-2 rounded-xl bg-sprout/50 px-3 py-2 text-[12px] leading-relaxed text-black/70">
            <Icono nombre="alerta" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{motivoDeshabilitado}</span>
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="relative rounded-[18px] border border-white/60 bg-crema/95 p-2.5 shadow-tarjeta"
        >
          {adjuntos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5" aria-label="PDF adjuntos">
              {adjuntos.map((a) => (
                <AdjuntoChipView
                  key={a.id}
                  adjunto={a}
                  onQuitar={onQuitarAdjunto}
                  onConfirmarAnio={onConfirmarAnio}
                />
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {menu && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuAbierto((v) => !v)}
                  aria-label="Añadir: adjuntar PDF, nuevo documento o abrir documentos"
                  aria-expanded={menuAbierto}
                  title="Añadir"
                  disabled={deshabilitado}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 hover:border-black/25 hover:text-black disabled:opacity-40"
                >
                  <Icono nombre="mas" />
                </button>
                {menuAbierto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuAbierto(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="menu"
                      className="absolute bottom-11 left-0 z-50 w-64 rounded-2xl border border-black/10 bg-crema p-1.5 shadow-tarjeta"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuAbierto(false);
                          archivoRef.current?.click();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-black/[0.04]"
                      >
                        <Icono nombre="documento" className="h-4 w-4 shrink-0 text-black/50" />
                        <span>
                          Adjuntar PDF
                          <span className="block text-[11px] text-black/45">Solo PDF con texto, máx. 3 años</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuAbierto(false);
                          menu.onNuevoDocumento();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-black/[0.04]"
                      >
                        <Icono nombre="mas" className="h-4 w-4 shrink-0 text-black/50" />
                        <span>
                          Nuevo documento
                          <span className="block text-[11px] text-black/45">Lo describes conversando</span>
                        </span>
                      </button>
                      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-black/40">
                        Documentos del proyecto
                      </p>
                      {menu.documentos.length === 0 ? (
                        <p className="px-3 pb-2 text-[12px] text-black/45">Todavía no hay documentos.</p>
                      ) : (
                        <ul className="max-h-48 overflow-y-auto">
                          {menu.documentos.map((d) => (
                            <li key={`${d.nivel}:${d.id}`}>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuAbierto(false);
                                  menu.onAbrirDocumento(d.nivel, d.id);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[13px] hover:bg-black/[0.04]"
                              >
                                <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
                                <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] text-black/55">
                                  {d.nivel === "macro" ? "Marco" : d.nivel === "meso" ? "Programa" : "Asignatura"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
                <input
                  ref={archivoRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  aria-label="Adjuntar archivos PDF"
                  onChange={(e) => {
                    const archivos = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (archivos.length > 0) menu.onAdjuntar(archivos);
                  }}
                />
              </div>
            )}
            <label htmlFor="chat" className="sr-only">
              Escribe tu mensaje para el asistente
            </label>
            <textarea
              id="chat"
              ref={areaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              rows={1}
              placeholder={escribiendo ? "Escribiendo…" : "Escribe tu respuesta…"}
              disabled={enviando || deshabilitado}
              className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-black/35 focus:outline-none disabled:opacity-50"
            />
            {enviando ? (
              <button
                type="button"
                onClick={onDetener}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-sow px-3.5 text-xs font-medium text-papel hover:bg-black"
              >
                <Icono nombre="detener" className="h-3.5 w-3.5" /> Detener
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Enviar mensaje"
                disabled={!texto.trim() || deshabilitado}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-white hover:bg-redwood disabled:opacity-40"
              >
                <Icono nombre="enviar" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/** Chip de un PDF adjunto con sus estados: leyendo, listo, error o año pendiente. */
function AdjuntoChipView({
  adjunto,
  onQuitar,
  onConfirmarAnio
}: {
  adjunto: AdjuntoChip;
  onQuitar?: (id: string) => void;
  onConfirmarAnio?: (id: string, anio: number) => void;
}) {
  const [anioTexto, setAnioTexto] = useState("");
  const esError = adjunto.estado === "error";
  const pideAnio = adjunto.estado === "anio";
  const anioValido = /^\d{4}$/.test(anioTexto.trim());

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${
        esError ? "border-terracotta/40 bg-terracotta/10 text-black/75" : "border-black/10 bg-white text-black/70"
      }`}
    >
      <Icono nombre="documento" className="h-3.5 w-3.5 shrink-0 text-black/45" />
      <span className="min-w-0">
        <span className="block max-w-[12rem] truncate font-medium">{adjunto.nombre}</span>
        <span className="block text-[10.5px] text-black/50">
          {adjunto.estado === "extrayendo"
            ? "Leyendo PDF…"
            : (adjunto.detalle ?? "")}
        </span>
        {pideAnio && onConfirmarAnio && (
          <span className="mt-1 flex items-center gap-1">
            <label className="sr-only" htmlFor={`anio-${adjunto.id}`}>
              Año del documento {adjunto.nombre}
            </label>
            <input
              id={`anio-${adjunto.id}`}
              value={anioTexto}
              onChange={(e) => setAnioTexto(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="Año, p. ej. 2025"
              inputMode="numeric"
              className="w-28 rounded-lg border border-black/15 bg-transparent px-2 py-0.5 text-[11.5px] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => anioValido && onConfirmarAnio(adjunto.id, Number(anioTexto.trim()))}
              disabled={!anioValido}
              className="rounded-full bg-sow px-2 py-0.5 text-[11px] font-medium text-papel disabled:opacity-40"
            >
              Usar
            </button>
          </span>
        )}
      </span>
      {onQuitar && (
        <button
          type="button"
          onClick={() => onQuitar(adjunto.id)}
          aria-label={`Quitar ${adjunto.nombre}`}
          className="shrink-0 rounded-full p-0.5 text-black/40 hover:text-terracotta"
        >
          ×
        </button>
      )}
    </span>
  );
}

/** Fila de chips: la respuesta se envía solo si el docente la toca. */
function Sugerencias({
  items,
  onElegir,
  habilitado,
  etiqueta
}: {
  items: string[];
  onElegir: (t: string) => void;
  habilitado: boolean;
  etiqueta: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="sr-only">{etiqueta}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onElegir(s)}
            disabled={!habilitado}
            className="rounded-full border border-black/10 bg-crema/95 px-3 py-1.5 text-left text-xs leading-snug hover:border-black/25 disabled:opacity-45"
          >
            {s} ›
          </button>
        ))}
      </div>
    </div>
  );
}
