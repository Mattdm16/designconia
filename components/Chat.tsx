"use client";

import { useEffect, useRef, useState } from "react";

import { Icono } from "@/components/Icono";
import { extraerMensajeParcial, type ChatMensaje } from "@/lib/schema";

export type VarianteChat = "limpio" | "lateral";

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
};

/** Mensaje de la IA con el texto conversacional que va llegando en streaming. */
function BurbujaIA({ mensaje, enCurso }: { mensaje: ChatMensaje; enCurso: boolean }) {
  return (
    <div className="max-w-[95%]">
      <div className="rounded-2xl rounded-tl-sm bg-sow px-4 py-3 text-[13px] leading-relaxed text-seedling shadow-burbuja">
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
  scrollRef
}: Props) {
  const [texto, setTexto] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

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
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-sow px-4 py-3 text-[13px] leading-relaxed text-seedling shadow-burbuja">
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
          className="rounded-[18px] border border-white/60 bg-crema/95 p-2.5 shadow-tarjeta"
        >
          <div className="flex items-end gap-2">
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
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-sow px-3.5 text-xs font-medium text-seedling hover:bg-black"
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
