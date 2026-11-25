"use client";

import { useMemo, useRef, useState } from "react";

import { BotonMini } from "@/components/ficha/Campos";
import { Icono } from "@/components/Icono";
import {
  aplicarMarcasFijas,
  construirDisenoFijo,
  plantillaFijaPara
} from "@/lib/documentoFinal";
import {
  brandKitPorDefecto,
  esSvgSeguro,
  TOPE_KIT_BYTES,
  validarActivo,
  validarDiseno,
  type BrandKit,
  type DatosDiseno,
  type NivelDiseno
} from "@/lib/diseno";
import {
  bloquesAElementos,
  disenoAPdf,
  geometriaPagina,
  paginar,
  rasterizarImagen,
  type GeometriaPagina,
  type PaginaPaginada
} from "@/lib/exportarDisenoPdf";
import type { ProyectoCurricular } from "@/lib/proyecto";

/* ------------------------------------------------------------------ */
/* Ayudas                                                              */
/* ------------------------------------------------------------------ */

function datosParaVista(
  proyecto: ProyectoCurricular,
  nivel: NivelDiseno,
  documentoId: string
): DatosDiseno {
  if (nivel === "macro") {
    return {
      macro: proyecto.marcos.find((m) => m.id === documentoId) ?? null,
      fuentes: proyecto.fuentesCurriculares
    };
  }
  if (nivel === "meso") {
    return {
      programa: proyecto.programas.find((p) => p.id === documentoId) ?? null,
      fuentes: proyecto.fuentesCurriculares
    };
  }
  const asignatura = proyecto.asignaturas.find((a) => a.id === documentoId);
  return { micro: asignatura?.microcurriculo ?? null, fuentes: proyecto.fuentesCurriculares };
}

function nombreDocumento(
  proyecto: ProyectoCurricular,
  nivel: NivelDiseno,
  documentoId: string
): string {
  if (nivel === "macro") return proyecto.marcos.find((m) => m.id === documentoId)?.nombre ?? "Marco";
  if (nivel === "meso")
    return proyecto.programas.find((p) => p.id === documentoId)?.nombre ?? "Programa";
  return (
    proyecto.asignaturas.find((a) => a.id === documentoId)?.microcurriculo.ident.asignatura ??
    "Asignatura"
  );
}

function leerArchivoComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result ?? ""));
    lector.onerror = () => rechazar(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

function decodificarSvg(dataUrl: string): string | null {
  try {
    const coma = dataUrl.indexOf(",");
    if (coma === -1) return null;
    const cabecera = dataUrl.slice(0, coma);
    const payload = dataUrl.slice(coma + 1);
    if (cabecera.includes(";base64")) {
      if (typeof Buffer !== "undefined") return Buffer.from(payload, "base64").toString("utf-8");
      return atob(payload);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Documento final (primera entrega)                                   */
/* ------------------------------------------------------------------ */

/**
 * Vista del documento final: plantilla institucional fija por nivel, sin
 * edición. El docente solo puede poner el logo y el membrete en sus
 * lugares predeterminados y descargar el PDF tal como se ve.
 */
export function DocumentoFinal({
  proyecto,
  nivel,
  documentoId,
  onVolver,
  onGuardarMarca
}: {
  proyecto: ProyectoCurricular;
  nivel: NivelDiseno;
  documentoId: string;
  onVolver: () => void;
  /** Persiste el kit de marca (logo/membrete) en el proyecto. */
  onGuardarMarca: (kit: BrandKit) => void;
}) {
  const nombreDoc = nombreDocumento(proyecto, nivel, documentoId);
  const [kit, setKit] = useState<BrandKit>(() => proyecto.brandKits?.[0] ?? brandKitPorDefecto());
  const [kitId] = useState(() => kit.id);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const membreteInputRef = useRef<HTMLInputElement | null>(null);

  const datos = useMemo(
    () => datosParaVista(proyecto, nivel, documentoId),
    [proyecto, nivel, documentoId]
  );
  const plantilla = useMemo(() => plantillaFijaPara(nivel), [nivel]);
  const diseno = useMemo(() => {
    const base = construirDisenoFijo(nivel, documentoId, nombreDoc);
    return { ...base, bloques: aplicarMarcasFijas(base.bloques, kit) };
  }, [nivel, documentoId, nombreDoc, kit]);
  const problemas = useMemo(() => validarDiseno(diseno, datos), [diseno, datos]);

  // Vista previa con el mismo motor de orden y paginación que el PDF.
  const vistaPrevia = useMemo(() => {
    const elementos = bloquesAElementos(diseno, plantilla, datos);
    const geo = geometriaPagina(diseno);
    return { paginas: paginar(elementos, geo, 0, 26), geo };
  }, [diseno, plantilla, datos]);

  const logo = kit.activos.find((a) => a.tipo === "logo") ?? null;
  const membrete = kit.activos.find((a) => a.tipo === "membrete") ?? null;

  async function subirMarca(archivo: File, tipo: "logo" | "membrete") {
    const chequeo = validarActivo(archivo.name, archivo.type, archivo.size);
    if (!chequeo.ok) {
      setAviso(chequeo.motivo);
      return;
    }
    const sinEseTipo = kit.activos.filter((a) => a.tipo !== tipo);
    const tamanoSinEse = sinEseTipo.reduce(
      (n, a) => n + (Number.isFinite(a.tamanoBytes) ? a.tamanoBytes : 0),
      0
    );
    if (tamanoSinEse + archivo.size > TOPE_KIT_BYTES) {
      setAviso("El kit supera los 3 MB. Quita una imagen antes de agregar otra.");
      return;
    }
    try {
      const dataUrl = await leerArchivoComoDataUrl(archivo);
      if (archivo.type === "image/svg+xml") {
        const texto = decodificarSvg(dataUrl);
        if (!texto || !esSvgSeguro(texto)) {
          setAviso("Ese SVG contiene contenido activo y no se puede aceptar.");
          return;
        }
      }
      const id = `marca_${tipo}_${Date.now().toString(36)}`;
      setKit((k) => ({
        ...k,
        activos: [
          ...k.activos.filter((a) => a.tipo !== tipo),
          {
            id,
            nombre: archivo.name,
            tipo,
            mime: archivo.type,
            dataUrl,
            tamanoBytes: archivo.size
          }
        ]
      }));
      setAviso(null);
    } catch {
      setAviso("No se pudo leer el archivo.");
    }
  }

  function quitarMarca(tipo: "logo" | "membrete") {
    setKit((k) => ({ ...k, activos: k.activos.filter((a) => a.tipo !== tipo) }));
  }

  async function exportarPdf() {
    setExportando(true);
    setAviso(null);
    try {
      // Rasteriza los activos usados a JPEG para incrustarlos.
      const mapa = new Map<string, { bytes: Uint8Array; ancho: number; alto: number }>();
      const usados = diseno.bloques
        .filter((b) => b.tipo === "imagen" && b.activoId)
        .map((b) => b.activoId as string)
        .filter((id, i, arr) => arr.indexOf(id) === i);
      for (const id of usados) {
        const activo = kit.activos.find((a) => a.id === id);
        if (!activo) continue;
        const raster = await rasterizarImagen(activo.dataUrl, activo.mime);
        if (raster) mapa.set(id, raster);
      }
      const bytes = disenoAPdf(diseno, plantilla, datos, mapa);
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = (nombreDoc || "documento").replace(/[^\wáéíóúñü-]+/gi, "-").slice(0, 40) || "documento";
      a.href = url;
      a.download = `documento-final-${nivel}-${base}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso("No se pudo generar el PDF. Vuelve a la ficha y revisa los datos.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Barra del documento */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 rounded-[18px] border border-white/60 bg-crema/95 px-3 py-2 shadow-tarjeta">
        <button
          type="button"
          onClick={onVolver}
          title="Volver a la ficha"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
        >
          <Icono nombre="flecha" className="h-3.5 w-3.5 rotate-180" /> Ficha
        </button>
        <span className="min-w-0 flex-1 truncate font-display text-[14px] font-semibold tracking-tight">
          Documento final — {nombreDoc}
        </span>
        <span className="hidden rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] text-black/55 sm:inline">
          {plantilla.nombre} · Carta vertical
        </span>
        <button
          type="button"
          onClick={() => onGuardarMarca({ ...kit, id: kitId })}
          title="Guardar el logo y el membrete en el proyecto"
          className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood"
        >
          <Icono nombre="check" className="h-3.5 w-3.5" /> Guardar marca
        </button>
        <button
          type="button"
          onClick={exportarPdf}
          disabled={exportando}
          title="Descargar el PDF tal como se ve en la vista previa"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25 disabled:opacity-40"
        >
          <Icono nombre="descargar" className="h-3.5 w-3.5" /> {exportando ? "Generando…" : "Exportar PDF"}
        </button>
      </header>

      {aviso && (
        <p className="shrink-0 rounded-xl bg-terracotta/10 px-3 py-2 text-[12px] text-black/75" role="status">
          {aviso}
        </p>
      )}
      {problemas.length > 0 && (
        <p className="shrink-0 rounded-xl bg-mora/10 px-3 py-2 text-[12px] text-black/75" role="status">
          Te faltan datos por completar en la ficha: {problemas.join(" ")} Puedes exportar igual,
          pero esas partes saldrán vacías.
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[300px_1fr]">
        {/* Marca: solo logo y membrete, en lugares fijos */}
        <section
          aria-label="Marca institucional"
          className="h-fit rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta lg:sticky lg:top-0"
        >
          <h2 className="font-display text-[13px] font-semibold tracking-tight">Marca institucional</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-black/50">
            La plantilla es fija y no se puede editar. Solo puedes poner el logo y el membrete,
            cada uno en su lugar.
          </p>

          <div className="mt-2 space-y-2">
            <div className="rounded-xl border border-black/10 bg-white px-2.5 py-2">
              <h3 className="text-[11px] font-semibold">Logo · encabezado</h3>
              <p className="text-[10.5px] text-black/45">Arriba de cada página, junto al encabezado.</p>
              {logo ? (
                <div className="mt-1.5 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.dataUrl} alt="" className="h-9 w-9 shrink-0 rounded bg-black/[0.03] object-contain" />
                  <span className="min-w-0 flex-1 truncate text-[11px]">{logo.nombre}</span>
                  <BotonMini onClick={() => logoInputRef.current?.click()}>Reemplazar</BotonMini>
                  <BotonMini onClick={() => quitarMarca("logo")}>Quitar</BotonMini>
                </div>
              ) : (
                <div className="mt-1.5">
                  <BotonMini onClick={() => logoInputRef.current?.click()}>Cargar logo</BotonMini>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = "";
                  if (archivo) void subirMarca(archivo, "logo");
                }}
              />
            </div>

            <div className="rounded-xl border border-black/10 bg-white px-2.5 py-2">
              <h3 className="text-[11px] font-semibold">Membrete · portada</h3>
              <p className="text-[10.5px] text-black/45">Al inicio del documento, antes del título.</p>
              {membrete ? (
                <div className="mt-1.5 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={membrete.dataUrl} alt="" className="h-9 w-9 shrink-0 rounded bg-black/[0.03] object-contain" />
                  <span className="min-w-0 flex-1 truncate text-[11px]">{membrete.nombre}</span>
                  <BotonMini onClick={() => membreteInputRef.current?.click()}>Reemplazar</BotonMini>
                  <BotonMini onClick={() => quitarMarca("membrete")}>Quitar</BotonMini>
                </div>
              ) : (
                <div className="mt-1.5">
                  <BotonMini onClick={() => membreteInputRef.current?.click()}>Cargar membrete</BotonMini>
                </div>
              )}
              <input
                ref={membreteInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = "";
                  if (archivo) void subirMarca(archivo, "membrete");
                }}
              />
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-black/45">
            PNG, JPG, WebP o SVG hasta 1 MB por imagen (3 MB en total). Los SVG con contenido
            activo se rechazan.
          </p>
        </section>

        {/* Vista previa de solo lectura */}
        <section
          aria-label="Vista previa del documento final"
          className="min-h-0 overflow-y-auto rounded-[18px] border border-white/60 bg-black/[0.04] p-4"
        >
          <div className="mx-auto flex w-fit flex-col items-center gap-4">
            {vistaPrevia.paginas.map((pagina, i) => (
              <PaginaFija
                key={i}
                pagina={pagina}
                geo={vistaPrevia.geo}
                kit={kit}
                numero={i + 1}
                total={vistaPrevia.paginas.length}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página de solo lectura (misma paginación que el PDF)                 */
/* ------------------------------------------------------------------ */

function PaginaFija({
  pagina,
  geo,
  kit,
  numero,
  total
}: {
  pagina: PaginaPaginada;
  geo: GeometriaPagina;
  kit: BrandKit;
  numero: number;
  total: number;
}) {
  const familia = (f: "serif" | "sans" | "mono") =>
    f === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : f === "mono"
        ? "ui-monospace, Menlo, monospace"
        : "system-ui, sans-serif";
  const rgb = (c: [number, number, number]) =>
    `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  return (
    <div
      className="relative shrink-0 overflow-hidden bg-white shadow-tarjeta"
      style={{ width: geo.ancho, height: geo.alto }}
      role="img"
      aria-label={`Página ${numero} de ${total}`}
    >
      <div
        className="absolute"
        style={{
          left: geo.margenIzq,
          right: geo.margenDer,
          top: geo.margenSup,
          bottom: geo.margenInf + 26
        }}
      >
        {pagina.lineas.map((l, idx) =>
          l.texto === "__REGLA__" ? (
            <hr key={idx} className="my-1 border-black/20" />
          ) : (
            <div
              key={idx}
              style={{
                fontFamily: familia(l.estilo.fuente),
                fontSize: l.estilo.tamanoPt,
                fontWeight: l.estilo.negrita ? 700 : 400,
                fontStyle: l.estilo.cursiva ? "italic" : "normal",
                color: rgb(l.estilo.color),
                textAlign:
                  l.estilo.alineacion === "centrado"
                    ? "center"
                    : l.estilo.alineacion === "derecha"
                      ? "right"
                      : "left",
                lineHeight: l.estilo.interlineado,
                marginTop: l.estilo.espacioAntesPt,
                marginBottom: l.estilo.espacioDespuesPt,
                minHeight: l.texto ? undefined : l.estilo.tamanoPt * 0.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
              {l.texto || " "}
            </div>
          )
        )}
        {pagina.imagenes.map((im) => {
          const activo = kit.activos.find((a) => a.id === im.imagenId);
          if (!activo) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={im.imagenId}
              src={activo.dataUrl}
              alt=""
              style={{ height: im.altoPt, maxWidth: "100%", objectFit: "contain", margin: "6px auto" }}
            />
          );
        })}
      </div>
      <div
        className="absolute text-center text-black/50"
        style={{ left: geo.margenIzq, right: geo.margenDer, bottom: geo.margenInf }}
      >
        <span style={{ fontSize: 9 }}>
          {numero} / {total}
        </span>
      </div>
    </div>
  );
}
