"use client";

import { useRef } from "react";

import { BotonTema } from "@/components/BotonTema";
import { Catalogo } from "@/components/Catalogo";
import { ClaveIAPanel } from "@/components/ClaveIA";
import { Icono } from "@/components/Icono";
import { NubePanel } from "@/components/Nube";
import type { NivelCatalogo } from "@/lib/catalogo";
import type { ProyectoCurricular } from "@/lib/proyecto";

/** Acciones de copiar + PDF sobre el documento que se está trabajando. */
export type AccionDocumento = {
  /** "microcurrículo" | "marco" | "programa". */
  etiqueta: string;
  onCopiar: () => void;
  onDescargarPdf: () => void;
};

/**
 * Espacio «Proyecto»: gestión del proyecto en una columna de lectura, sin
 * chat ni ficha. Reúne documentos, expediente, respaldo, nube, asistente,
 * apariencia y la zona de peligro. Volver al trabajo no pierde nada: el
 * borrador y la conversación siguen donde estaban.
 */
export function ProyectoHub({
  proyecto,
  accionDocumento,
  hayExpediente,
  onCopiarExpediente,
  onDescargarExpedientePdf,
  onAbrir,
  onDuplicar,
  onFinalizar,
  onDescargarRespaldo,
  onRestaurarRespaldo,
  nubeLista,
  nubeEmail,
  nubeOcupado,
  nubeMensaje,
  onEntrarNube,
  onSalirNube,
  onSubirNube,
  onBajarNube,
  estadoAsistente,
  asistenteFalla,
  hayClave,
  onGuardarClave,
  onBorrarClave,
  temaOscuro,
  onCambiarTema,
  hayAlgoQueBorrar,
  alcanceBloqueado,
  onEmpezarDeCero,
  onVolver
}: {
  proyecto: ProyectoCurricular | null;
  /** null cuando todavía no hay documento en trabajo (modo conversación). */
  accionDocumento: AccionDocumento | null;
  hayExpediente: boolean;
  onCopiarExpediente: () => void;
  onDescargarExpedientePdf: () => void;
  onAbrir: (nivel: NivelCatalogo, id: string) => void;
  onDuplicar: (nivel: NivelCatalogo, id: string) => void;
  onFinalizar: (nivel: NivelCatalogo, id: string, valor: boolean) => void;
  onDescargarRespaldo: () => void;
  onRestaurarRespaldo: (archivo: File) => void;
  /** false cuando Supabase no está configurado en este despliegue. */
  nubeLista: boolean;
  nubeEmail: string | null;
  nubeOcupado: boolean;
  nubeMensaje: string | null;
  onEntrarNube: (email: string) => void;
  onSalirNube: () => void;
  onSubirNube: () => void;
  onBajarNube: () => void;
  /** Texto del estado del asistente ("Asistente conectado · …"). */
  estadoAsistente: string;
  /** true si la clave falta o falla: invita a arreglarla aquí mismo. */
  asistenteFalla: boolean;
  hayClave: boolean;
  onGuardarClave: (clave: string) => void;
  onBorrarClave: () => void;
  temaOscuro: boolean;
  onCambiarTema: () => void;
  hayAlgoQueBorrar: boolean;
  /** true si el proyecto guardado usa un módulo que la página no abre. */
  alcanceBloqueado: boolean;
  onEmpezarDeCero: () => void;
  onVolver: () => void;
}) {
  const respaldoRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          title="Volver al chat y la ficha, sin perder nada"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-crema/95 px-3 py-1.5 text-xs font-medium text-black/70 hover:border-black/25 hover:text-black"
        >
          <Icono nombre="flecha" className="h-3.5 w-3.5 rotate-180" /> Volver al trabajo
        </button>
        <span className="min-w-0 flex-1" />
        <BotonTema oscuro={temaOscuro} onCambiar={onCambiarTema} />
      </div>

      <div>
        <h1 className="font-display text-[16px] font-semibold tracking-tight">Proyecto</h1>
        <p className="mt-0.5 text-[12px] leading-relaxed text-black/50">
          Documentos, copias, respaldo, nube y ajustes. Todo lo que no es conversar ni editar la ficha vive
          aquí; el trabajo sigue intacto al volver.
        </p>
      </div>

      {accionDocumento && (
        <section
          aria-label={`Documento en trabajo: ${accionDocumento.etiqueta}`}
          className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
        >
          <h2 className="font-display text-[13px] font-semibold tracking-tight">
            Documento en trabajo · {accionDocumento.etiqueta}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={accionDocumento.onCopiar}
              title="Copiar como Markdown para pegar"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              <Icono nombre="copiar" className="h-3.5 w-3.5" /> Copiar Markdown
            </button>
            <button
              type="button"
              onClick={accionDocumento.onDescargarPdf}
              title="Descargar como PDF de texto plano"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              <Icono nombre="descargar" className="h-3.5 w-3.5" /> Exportar PDF
            </button>
          </div>
        </section>
      )}

      {hayExpediente && (
        <section
          aria-label="Expediente curricular conjunto"
          className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
        >
          <h2 className="font-display text-[13px] font-semibold tracking-tight">Expediente</h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-black/55">
            Todo el proyecto en un solo documento: marcos, programas, asignaturas y trazabilidad.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onCopiarExpediente}
              title="Copiar expediente como Markdown para pegar"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              <Icono nombre="copiar" className="h-3.5 w-3.5" /> Copiar Markdown
            </button>
            <button
              type="button"
              onClick={onDescargarExpedientePdf}
              title="Descargar el expediente como PDF de texto plano"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              <Icono nombre="descargar" className="h-3.5 w-3.5" /> Descargar PDF
            </button>
          </div>
        </section>
      )}

      {proyecto && (
        <Catalogo proyecto={proyecto} onAbrir={onAbrir} onDuplicar={onDuplicar} onFinalizar={onFinalizar} />
      )}

      {proyecto && (
        <section
          aria-label="Copia de respaldo"
          className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
        >
          <h2 className="font-display text-[13px] font-semibold tracking-tight">Respaldo</h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-black/55">
            Descarga una copia JSON del proyecto y guárdala en un lugar seguro. Restaurarla reemplaza lo
            actual.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onDescargarRespaldo}
              title="Descargar una copia JSON del proyecto para respaldarlo"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              <Icono nombre="descargar" className="h-3.5 w-3.5" /> Descargar copia
            </button>
            <button
              type="button"
              onClick={() => respaldoRef.current?.click()}
              title="Restaurar una copia JSON descargada antes"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              <Icono nombre="documento" className="h-3.5 w-3.5" /> Restaurar copia
            </button>
            <input
              ref={respaldoRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (archivo) onRestaurarRespaldo(archivo);
              }}
            />
          </div>
        </section>
      )}

      {nubeLista ? (
        <NubePanel
          sesionEmail={nubeEmail}
          ocupado={nubeOcupado}
          mensaje={nubeMensaje}
          onEntrar={onEntrarNube}
          onSalir={onSalirNube}
          onSubir={onSubirNube}
          onBajar={onBajarNube}
        />
      ) : (
        <section
          aria-label="Sincronización en la nube"
          className="rounded-[18px] border border-white/60 bg-crema/95 px-4 py-3 shadow-tarjeta"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Icono nombre="nube" className="h-4 w-4 shrink-0 text-black/50" />
            <h2 className="font-display text-[13px] font-semibold tracking-tight">Nube</h2>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-black/60">
            La nube no está configurada en este despliegue. Para activarla, crea un proyecto gratuito en
            Supabase, ejecuta <span className="font-mono">supabase/migraciones/001_proyectos.sql</span> y
            define <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> y{" "}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>. Ver{" "}
            <span className="font-mono">docs/NUBE.md</span>.
          </p>
        </section>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span
            className={`h-2 w-2 rounded-full ${asistenteFalla ? "bg-terracotta" : "bg-rainfall"}`}
            aria-hidden="true"
          />
          <h2 className="font-display text-[13px] font-semibold tracking-tight">Asistente</h2>
          <span className="text-[11px] text-black/50">{estadoAsistente}</span>
        </div>
        <div className="mt-2">
          <ClaveIAPanel hayClave={hayClave} onGuardar={onGuardarClave} onBorrar={onBorrarClave} />
        </div>
      </div>

      <section
        aria-label="Empezar de cero"
        className="rounded-[18px] border border-terracotta/25 bg-crema/95 px-4 py-3 shadow-tarjeta"
      >
        <h2 className="font-display text-[13px] font-semibold tracking-tight text-terracotta">
          Empezar de cero
        </h2>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-black/55">
          Descarta conversaciones, documentos y respaldos de este navegador. No se puede deshacer; pide
          confirmación antes de borrar.
        </p>
        <div className="mt-2">
          <button
            type="button"
            onClick={onEmpezarDeCero}
            disabled={!hayAlgoQueBorrar || alcanceBloqueado}
            title={
              alcanceBloqueado
                ? "El proyecto contiene un módulo que esta página no puede descartar"
                : hayAlgoQueBorrar
                  ? "Descartar este proyecto y empezar de cero"
                  : "Todavía no hay nada que borrar"
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/40 bg-white px-3 py-1.5 text-xs font-medium text-terracotta hover:border-terracotta disabled:opacity-40"
          >
            <Icono nombre="deshacer" className="h-3.5 w-3.5" /> Empezar de cero
          </button>
        </div>
      </section>
    </div>
  );
}
