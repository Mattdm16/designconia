"use client";

import { useState } from "react";

import { Icono } from "@/components/Icono";

/**
 * Clave de IA aportada por el docente (BYOK). La clave vive solo en la
 * memoria de la pestaña y en sessionStorage: nunca se guarda en el proyecto,
 * copias, exportaciones ni registros. Cerrar la sesión la olvida.
 */
export function ClaveIAPanel({
  hayClave,
  onGuardar,
  onBorrar
}: {
  /** true si ya hay una clave guardada para esta sesión. */
  hayClave: boolean;
  onGuardar: (clave: string) => void;
  onBorrar: () => void;
}) {
  const [valor, setValor] = useState("");
  const [visible, setVisible] = useState(false);
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function probar() {
    const candidata = valor.trim();
    if (!candidata && !hayClave) {
      setResultado("Escribe tu clave para probarla.");
      return;
    }
    setProbando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/salud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidata ? { clave: candidata } : {})
      });
      const cuerpo = (await res.json()) as { conexion?: string; mensaje?: string };
      setResultado(
        cuerpo.conexion === "ok"
          ? "Clave válida. El asistente puede generar."
          : (cuerpo.mensaje ?? "No se pudo comprobar la clave.")
      );
    } catch {
      setResultado("No se pudo contactar al servidor para probar la clave.");
    } finally {
      setProbando(false);
    }
  }

  function guardar() {
    if (!valor.trim()) {
      setResultado("Escribe tu clave antes de guardarla.");
      return;
    }
    onGuardar(valor.trim());
    setValor("");
    setResultado("Clave guardada para esta sesión.");
  }

  function borrar() {
    onBorrar();
    setValor("");
    setResultado("Clave olvidada. El asistente usará la del servidor, si hay.");
  }

  return (
    <section
      aria-label="Clave de IA propia"
      className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icono nombre="llave" className="h-4 w-4 shrink-0 text-black/50" />
        <h2 className="font-display text-[13px] font-semibold tracking-tight">Clave IA propia</h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            hayClave ? "bg-rainfall/15 text-rainfall" : "bg-black/[0.04] text-black/55"
          }`}
        >
          {hayClave ? "guardada en esta sesión" : "sin clave propia"}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-black/60">
        Si el servidor no tiene clave, pega aquí tu clave de DeepSeek y el asistente la usará solo
        mientras esta pestaña siga abierta. No se guarda en el proyecto ni en sus copias.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <label className="min-w-0 flex-1 basis-48">
          <span className="sr-only">Tu clave de DeepSeek</span>
          <input
            type={visible ? "text" : "password"}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={hayClave ? "•••••••• (ya hay una guardada)" : "sk-…"}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 font-mono text-[12px] focus:border-black/25 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Ocultar la clave" : "Mostrar la clave"}
          aria-label={visible ? "Ocultar la clave" : "Mostrar la clave"}
          className="rounded-full border border-black/10 bg-white p-1.5 text-black/60 hover:border-black/25 hover:text-black"
        >
          <Icono nombre={visible ? "ojoCerrado" : "ojo"} className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={guardar}
          className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={probar}
          disabled={probando}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25 disabled:opacity-40"
        >
          {probando ? "Probando…" : "Probar"}
        </button>
        {hayClave && (
          <button
            type="button"
            onClick={borrar}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-terracotta hover:border-terracotta/40"
          >
            Olvidar
          </button>
        )}
      </div>
      {resultado && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-black/70" role="status">
          {resultado}
        </p>
      )}
    </section>
  );
}
