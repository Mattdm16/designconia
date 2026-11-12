"use client";

import { useState } from "react";

import { Icono } from "@/components/Icono";

/**
 * Sincronización opcional con Supabase. Sin configuración no se muestra nada:
 * la app sigue funcionando 100% en local. Con configuración, el docente entra
 * con un enlace mágico y puede subir o bajar su proyecto.
 */
export function NubePanel({
  sesionEmail,
  ocupado,
  mensaje,
  onEntrar,
  onSalir,
  onSubir,
  onBajar
}: {
  sesionEmail: string | null;
  ocupado: boolean;
  mensaje: string | null;
  onEntrar: (email: string) => void;
  onSalir: () => void;
  onSubir: () => void;
  onBajar: () => void;
}) {
  const [email, setEmail] = useState("");

  return (
    <section
      aria-label="Sincronización en la nube"
      className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icono nombre="nube" className="h-4 w-4 shrink-0 text-black/50" />
        <h2 className="font-display text-[13px] font-semibold tracking-tight">Nube</h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            sesionEmail ? "bg-rainfall/15 text-rainfall" : "bg-black/[0.04] text-black/55"
          }`}
        >
          {sesionEmail ? sesionEmail : "sin sesión"}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-black/60">
        Guarda tu proyecto en tu cuenta para abrirlo desde otro navegador. Una cuenta, un proyecto:
        nadie más ve tus documentos.
      </p>
      {!sesionEmail ? (
        <form
          className="mt-2 flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            onEntrar(email);
          }}
        >
          <label className="min-w-0 flex-1 basis-48">
            <span className="sr-only">Correo para entrar</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.edu"
              autoComplete="email"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] focus:border-black/25 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood disabled:opacity-40"
          >
            {ocupado ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onSubir}
            disabled={ocupado}
            title="Guardar el proyecto actual en tu cuenta"
            className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood disabled:opacity-40"
          >
            <Icono nombre="descargar" className="h-3.5 w-3.5 rotate-180" /> Subir proyecto
          </button>
          <button
            type="button"
            onClick={onBajar}
            disabled={ocupado}
            title="Traer la copia guardada en tu cuenta (reemplaza lo actual)"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25 disabled:opacity-40"
          >
            <Icono nombre="descargar" className="h-3.5 w-3.5" /> Bajar proyecto
          </button>
          <button
            type="button"
            onClick={onSalir}
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-terracotta hover:border-terracotta/40 disabled:opacity-40"
          >
            Salir
          </button>
        </div>
      )}
      {mensaje && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-black/70" role="status">
          {mensaje}
        </p>
      )}
    </section>
  );
}
