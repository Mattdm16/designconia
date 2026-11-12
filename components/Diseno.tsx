"use client";

import { useMemo, useRef, useState } from "react";

import { BotonMini } from "@/components/ficha/Campos";
import { Icono } from "@/components/Icono";
import {
  agregarBloque,
  alternarVisibilidadBloque,
  aplicarEstiloBloque,
  brandKitPorDefecto,
  disenoPorDefecto,
  esSvgSeguro,
  establecerTextoLocal,
  moverBloque,
  moverBloqueAZona,
  PLANTILLAS_BASE,
  quitarBloque,
  quitarTextoLocal,
  resolverTextoBloque,
  tamanoActivosKit,
  TOPE_KIT_BYTES,
  validarActivo,
  validarDiseno,
  type AlineacionTexto,
  type BloqueDiseno,
  type BrandKit,
  type DatosDiseno,
  type DisenoDocumento,
  type FuenteDiseno,
  type NivelDiseno,
  type TipoActivo,
  type TipoBloque,
  type ZonaBloque
} from "@/lib/diseno";
import {
  bloquesAElementos,
  disenoAPdf,
  geometriaPagina,
  paginar,
  rasterizarImagen
} from "@/lib/exportarDisenoPdf";
import type { ProyectoCurricular } from "@/lib/proyecto";

/* ------------------------------------------------------------------ */
/* Ayudas                                                              */
/* ------------------------------------------------------------------ */

function datosParaDiseno(
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
  if (nivel === "meso") return proyecto.programas.find((p) => p.id === documentoId)?.nombre ?? "Programa";
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
/* Estudio                                                             */
/* ------------------------------------------------------------------ */

export function DisenoEstudio({
  proyecto,
  nivel,
  documentoId,
  onVolver,
  onGuardar
}: {
  proyecto: ProyectoCurricular;
  nivel: NivelDiseno;
  documentoId: string;
  onVolver: () => void;
  /** Persiste diseño + kit en el proyecto (la página guarda y refresca). */
  onGuardar: (diseno: DisenoDocumento, kit: BrandKit) => void;
}) {
  const existente =
    proyecto.disenos?.find((d) => d.nivel === nivel && d.documentoId === documentoId) ?? null;
  const nombreDoc = nombreDocumento(proyecto, nivel, documentoId);
  const [diseno, setDiseno] = useState<DisenoDocumento>(
    () => existente ?? disenoPorDefecto(nivel, documentoId, nombreDoc)
  );
  const [kit, setKit] = useState<BrandKit>(() => proyecto.brandKits?.[0] ?? brandKitPorDefecto());
  const [kitId] = useState(() => kit.id);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputActivoRef = useRef<HTMLInputElement | null>(null);
  const [tipoActivoNuevo, setTipoActivoNuevo] = useState<TipoActivo>("logo");

  const datos = useMemo(
    () => datosParaDiseno(proyecto, nivel, documentoId),
    [proyecto, nivel, documentoId]
  );
  const plantilla =
    PLANTILLAS_BASE.find((p) => p.id === diseno.plantillaId) ?? PLANTILLAS_BASE[0];

  const problemas = useMemo(() => validarDiseno(diseno, datos), [diseno, datos]);
  const zonas = useMemo(() => {
    const agrupadas: Record<ZonaBloque, BloqueDiseno[]> = {
      portada: [],
      encabezado: [],
      cuerpo: [],
      pie: []
    };
    for (const b of diseno.bloques) agrupadas[b.zona].push(b);
    return agrupadas;
  }, [diseno.bloques]);

  // Vista previa paginada con el mismo motor de orden que el PDF.
  const vistaPrevia = useMemo(() => {
    const elementos = bloquesAElementos(diseno, plantilla, datos);
    const geo = geometriaPagina(diseno);
    const reservaSup = diseno.encabezadoTexto.trim() ? 26 : 0;
    const reservaInf = diseno.pieTexto.trim() || diseno.mostrarNumeroPagina ? 26 : 0;
    const paginas = paginar(elementos, geo, reservaSup, reservaInf);
    return { paginas, geo };
  }, [diseno, plantilla, datos]);

  function actualizar(parche: Partial<DisenoDocumento>) {
    setDiseno((d) => ({ ...d, ...parche, actualizadoEn: new Date().toISOString() }));
  }

  function actualizarBloques(bloques: BloqueDiseno[] | null) {
    if (!bloques) return;
    actualizar({ bloques });
  }

  function cambiarPlantilla(id: string) {
    const nueva = PLANTILLAS_BASE.find((p) => p.id === id);
    if (!nueva) return;
    actualizar({
      plantillaId: nueva.id,
      pagina: { ...nueva.pagina, margenesMm: { ...nueva.pagina.margenesMm } }
    });
  }

  async function agregarActivo(archivo: File) {
    const chequeo = validarActivo(archivo.name, archivo.type, archivo.size);
    if (!chequeo.ok) {
      setAviso(chequeo.motivo);
      return;
    }
    if (tamanoActivosKit(kit) + archivo.size > TOPE_KIT_BYTES) {
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
      const id = `act_${Date.now().toString(36)}`;
      setKit((k) => ({
        ...k,
        activos: [
          ...k.activos,
          { id, nombre: archivo.name, tipo: tipoActivoNuevo, mime: archivo.type, dataUrl, tamanoBytes: archivo.size }
        ]
      }));
      setAviso(null);
    } catch {
      setAviso("No se pudo leer el archivo.");
    }
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
      a.download = `diseno-${nivel}-${base}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso("No se pudo generar el PDF. Revisa los bloques marcados.");
    } finally {
      setExportando(false);
    }
  }

  const bloqueSel = diseno.bloques.find((b) => b.id === seleccionado) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Barra del estudio */}
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
          Diseñar documento — {nombreDoc}
        </span>
        <label className="inline-flex items-center gap-1.5 text-[11px] text-black/60">
          Plantilla
          <select
            value={diseno.plantillaId}
            onChange={(e) => cambiarPlantilla(e.target.value)}
            aria-label="Plantilla del documento"
            className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] focus:outline-none"
          >
            {PLANTILLAS_BASE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onGuardar(diseno, { ...kit, id: kitId })}
          title="Guardar diseño y kit en el proyecto"
          className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood"
        >
          <Icono nombre="check" className="h-3.5 w-3.5" /> Guardar
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
          Revisa el diseño: {problemas.join(" ")}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_1fr_300px]">
        {/* Estructura */}
        <section aria-label="Estructura del documento" className="min-h-0 overflow-y-auto rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
          <h2 className="font-display text-[13px] font-semibold tracking-tight">Estructura</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-black/50">
            Arrastra o usa las flechas para reordenar dentro de cada zona.
          </p>
          {(Object.keys(zonas) as (keyof typeof zonas)[]).map((zona) => (
            <div key={zona} className="mt-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {zona === "portada" ? "Portada" : zona === "encabezado" ? "Encabezado" : zona === "cuerpo" ? "Cuerpo" : "Pie"} · {zonas[zona].length}
              </h3>
              <ul className="mt-1 space-y-1">
                {zonas[zona].map((b, i, arr) => (
                  <li
                    key={b.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const origen = e.dataTransfer.getData("text/plain");
                      if (!origen || origen === b.id) return;
                      // Reubica el origen junto al destino, sin salir de su zona.
                      setDiseno((d) => {
                        const lista = [...d.bloques];
                        const io = lista.findIndex((x) => x.id === origen);
                        const ib = lista.findIndex((x) => x.id === b.id);
                        if (io === -1 || ib === -1 || lista[io].zona !== lista[ib].zona) return d;
                        const [movido] = lista.splice(io, 1);
                        const destino = lista.findIndex((x) => x.id === b.id);
                        lista.splice(io < ib ? destino + 1 : destino, 0, movido);
                        return { ...d, bloques: lista, actualizadoEn: new Date().toISOString() };
                      });
                    }}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-left ${
                      seleccionado === b.id ? "border-pebble bg-white shadow-sm" : "border-black/10 bg-white/70"
                    } ${b.visible ? "" : "opacity-50"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSeleccionado(b.id)}
                      className="min-w-0 flex-1 truncate text-left text-[12px]"
                      title="Editar propiedades"
                    >
                      <span className="font-medium">{etiquetaBloque(b)}</span>
                      <span className="ml-1 text-black/45">{previewBloque(b)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarBloques(moverBloque(diseno.bloques, b.id, -1))}
                      disabled={i === 0}
                      aria-label="Subir bloque"
                      className="rounded p-0.5 text-black/40 hover:text-black disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarBloques(moverBloque(diseno.bloques, b.id, 1))}
                      disabled={i === arr.length - 1}
                      aria-label="Bajar bloque"
                      className="rounded p-0.5 text-black/40 hover:text-black disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarBloques(alternarVisibilidadBloque(diseno.bloques, b.id))}
                      aria-label={b.visible ? "Ocultar bloque" : "Mostrar bloque"}
                      aria-pressed={b.visible}
                      className="rounded p-0.5 text-black/40 hover:text-black"
                    >
                      <Icono nombre={b.visible ? "ojo" : "ojoCerrado"} className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <AgregarBloque
            onAgregar={(tipo, zona) => actualizarBloques(agregarBloque(diseno.bloques, tipo, zona))}
          />
        </section>

        {/* Vista previa */}
        <section aria-label="Vista previa" className="min-h-0 overflow-y-auto rounded-[18px] border border-white/60 bg-black/[0.04] p-4">
          <div className="mx-auto flex w-fit flex-col items-center gap-4">
            {vistaPrevia.paginas.map((pagina, i) => (
              <PaginaPrevia
                key={i}
                pagina={pagina}
                geo={vistaPrevia.geo}
                diseno={diseno}
                kit={kit}
                numero={i + 1}
                total={vistaPrevia.paginas.length}
              />
            ))}
          </div>
        </section>

        {/* Propiedades */}
        <div className="min-h-0 overflow-y-auto">
          <PropiedadesBloque
            bloque={bloqueSel}
            kit={kit}
            onChange={(parche) => {
              if (!bloqueSel) return;
              // Cambiar de zona reubica al final de ella para no partir contenido.
              if (parche.zona && parche.zona !== bloqueSel.zona) {
                actualizarBloques(
                  moverBloqueAZona(diseno.bloques, bloqueSel.id, parche.zona) ?? diseno.bloques
                );
                return;
              }
              actualizarBloques(
                diseno.bloques.map((b) => (b.id === bloqueSel.id ? { ...b, ...parche } : b))
              );
            }}
            onEstilo={(parche) => {
              if (!bloqueSel) return;
              actualizarBloques(aplicarEstiloBloque(diseno.bloques, bloqueSel.id, parche) ?? diseno.bloques);
            }}
            onQuitar={() => {
              if (!bloqueSel) return;
              actualizarBloques(quitarBloque(diseno.bloques, bloqueSel.id) ?? diseno.bloques);
              setSeleccionado(null);
            }}
          />
          <PropiedadesDocumento diseno={diseno} onChange={actualizar} />
          <MarcaKit
            kit={kit}
            onChange={setKit}
            inputRef={inputActivoRef}
            tipoNuevo={tipoActivoNuevo}
            onTipoNuevo={setTipoActivoNuevo}
            onArchivo={agregarActivo}
          />
        </div>
      </div>
    </div>
  );
}

function etiquetaBloque(b: { tipo: string }): string {
  const etiquetas: Record<string, string> = {
    titulo: "Título", subtitulo: "Subtítulo", parrafo: "Párrafo", lista: "Lista", cita: "Cita",
    tabla: "Tabla", imagen: "Imagen", regla: "Línea", espacio: "Espacio", salto: "Salto", firma: "Firmas"
  };
  return etiquetas[b.tipo] ?? b.tipo;
}

function previewBloque(b: { tipo: string; texto?: string; refContenido?: string | null }): string {
  if (b.texto?.trim()) return b.texto.trim().slice(0, 32);
  if (b.refContenido) return b.refContenido;
  return b.tipo === "imagen" ? "imagen" : "—";
}

/* ------------------------------------------------------------------ */
/* Agregar bloque                                                       */
/* ------------------------------------------------------------------ */

const TIPOS_AGREGABLES: { tipo: Parameters<typeof agregarBloque>[1]; etiqueta: string }[] = [
  { tipo: "titulo", etiqueta: "Título" },
  { tipo: "subtitulo", etiqueta: "Subtítulo" },
  { tipo: "parrafo", etiqueta: "Párrafo" },
  { tipo: "lista", etiqueta: "Lista" },
  { tipo: "cita", etiqueta: "Cita" },
  { tipo: "tabla", etiqueta: "Tabla" },
  { tipo: "imagen", etiqueta: "Imagen" },
  { tipo: "regla", etiqueta: "Línea" },
  { tipo: "espacio", etiqueta: "Espacio" },
  { tipo: "salto", etiqueta: "Salto de página" },
  { tipo: "firma", etiqueta: "Firmas" }
];

function AgregarBloque({
  onAgregar
}: {
  onAgregar: (tipo: TipoBloque, zona: "portada" | "encabezado" | "cuerpo" | "pie") => void;
}) {
  const [tipo, setTipo] = useState<TipoBloque>("parrafo");
  const [zona, setZona] = useState<"portada" | "encabezado" | "cuerpo" | "pie">("cuerpo");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-black/[0.03] p-2">
      <label className="flex items-center gap-1 text-[11px]">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoBloque)}
          aria-label="Tipo de bloque nuevo"
          className="rounded-full bg-white px-2 py-1 text-[11px] focus:outline-none"
        >
          {TIPOS_AGREGABLES.map((t) => (
            <option key={t.tipo} value={t.tipo}>
              {t.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[11px]">
        <select
          value={zona}
          onChange={(e) => setZona(e.target.value as typeof zona)}
          aria-label="Zona del bloque nuevo"
          className="rounded-full bg-white px-2 py-1 text-[11px] focus:outline-none"
        >
          <option value="portada">Portada</option>
          <option value="encabezado">Encabezado</option>
          <option value="cuerpo">Cuerpo</option>
          <option value="pie">Pie</option>
        </select>
      </label>
      <BotonMini onClick={() => onAgregar(tipo, zona)}>Añadir</BotonMini>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista previa paginada (misma paginación que el PDF)                 */
/* ------------------------------------------------------------------ */

function PaginaPrevia({
  pagina,
  geo,
  diseno,
  kit,
  numero,
  total
}: {
  pagina: { lineas: { texto: string; estilo: { fuente: FuenteDiseno; tamanoPt: number; negrita: boolean; cursiva: boolean; color: [number, number, number]; alineacion: AlineacionTexto; interlineado: number; espacioAntesPt: number; espacioDespuesPt: number } }[]; imagenes: { imagenId: string; altoPt: number }[] };
  geo: { ancho: number; alto: number; margenIzq: number; margenDer: number; margenSup: number; margenInf: number };
  diseno: DisenoDocumento;
  kit: BrandKit;
  numero: number;
  total: number;
}) {
  const familia = (f: FuenteDiseno) =>
    f === "serif" ? "Georgia, 'Times New Roman', serif" : f === "mono" ? "ui-monospace, Menlo, monospace" : "system-ui, sans-serif";
  const rgb = (c: [number, number, number]) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  return (
    <div
      className="relative shrink-0 overflow-hidden bg-white shadow-tarjeta"
      style={{ width: geo.ancho, height: geo.alto }}
      role="img"
      aria-label={`Página ${numero} de ${total}`}
    >
      {diseno.encabezadoTexto.trim() && (
        <div
          className="absolute truncate text-black/60"
          style={{ left: geo.margenIzq, right: geo.margenDer, top: geo.margenSup - 26, fontSize: 9 }}
        >
          {diseno.encabezadoTexto.replaceAll("{pagina}", String(numero)).replaceAll("{paginas}", String(total))}
        </div>
      )}
      <div
        className="absolute"
        style={{
          left: geo.margenIzq,
          right: geo.margenDer,
          top: geo.margenSup + (diseno.encabezadoTexto.trim() ? 26 : 0),
          bottom: geo.margenInf + (diseno.pieTexto.trim() || diseno.mostrarNumeroPagina ? 26 : 0)
        }}
      >
        {pagina.lineas.map((l, i) =>
          l.texto === "__REGLA__" ? (
            <hr key={i} className="my-1 border-black/20" />
          ) : (
            <div
              key={i}
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
              {l.texto || "\u00a0"}
            </div>
          )
        )}
        {pagina.imagenes.map((im) => {
          const activo = kit.activos.find((a) => a.id === im.imagenId);
          if (!activo) return null;
          return (
            <div key={im.imagenId} style={{ textAlign: "center", margin: "6px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activo.dataUrl}
                alt={activo.nombre}
                style={{ maxWidth: "100%", height: im.altoPt, objectFit: "contain" }}
              />
            </div>
          );
        })}
      </div>
      {(diseno.pieTexto.trim() || diseno.mostrarNumeroPagina) && (
        <div
          className="absolute truncate text-black/60"
          style={{ left: geo.margenIzq, right: geo.margenDer, bottom: geo.margenInf - 22, fontSize: 9 }}
        >
          {[diseno.pieTexto.trim(), diseno.mostrarNumeroPagina ? `Página ${numero} de ${total}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
      <div className="absolute bottom-1 right-2 font-mono text-[9px] text-black/30">
        {numero}/{total}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Propiedades del bloque                                               */
/* ------------------------------------------------------------------ */

const FUENTES: { valor: FuenteDiseno; etiqueta: string }[] = [
  { valor: "serif", etiqueta: "Serif formal" },
  { valor: "sans", etiqueta: "Sans neutra" },
  { valor: "mono", etiqueta: "Mono datos" }
];

const ALINEACIONES: { valor: AlineacionTexto; etiqueta: string }[] = [
  { valor: "izquierda", etiqueta: "Izquierda" },
  { valor: "centrado", etiqueta: "Centrado" },
  { valor: "derecha", etiqueta: "Derecha" }
];

function PropiedadesBloque({
  bloque,
  kit,
  onChange,
  onEstilo,
  onQuitar
}: {
  bloque: BloqueDiseno | null;
  kit: BrandKit;
  onChange: (parche: Partial<BloqueDiseno>) => void;
  onEstilo: (parche: Partial<NonNullable<BloqueDiseno["estilo"]>>) => void;
  onQuitar: () => void;
}) {
  if (!bloque) {
    return (
      <section aria-label="Propiedades" className="rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
        <h2 className="font-display text-[13px] font-semibold tracking-tight">Propiedades</h2>
        <p className="mt-1 text-[11.5px] leading-relaxed text-black/50">
          Selecciona un bloque de la estructura para editar su texto, zona y estilo.
        </p>
      </section>
    );
  }
  const estilo = bloque.estilo ?? {};
  return (
    <section aria-label="Propiedades del bloque" className="rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-[13px] font-semibold tracking-tight">Bloque</h2>
        <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/50">
          {bloque.tipo}
        </span>
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar bloque"
          className="ml-auto rounded-full p-1 text-black/40 hover:text-terracotta"
        >
          <Icono nombre="papelera" className="h-3.5 w-3.5" />
        </button>
      </div>

      <label className="mt-2 block text-[11px] font-medium text-black/60">
        Zona
        <select
          value={bloque.zona}
          onChange={(e) =>
            onChange({ zona: e.target.value as BloqueDiseno["zona"] })
          }
          className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
        >
          {Object.entries({ portada: "Portada", encabezado: "Encabezado", cuerpo: "Cuerpo", pie: "Pie" }).map(
            ([v, e]) => (
              <option key={v} value={v}>
                {e}
              </option>
            )
          )}
        </select>
      </label>
      <p className="mt-1 text-[10.5px] leading-relaxed text-black/45">
        Al cambiar de zona el bloque se reubica al final de ella para no partir el contenido.
      </p>

      {bloque.refContenido && (
        <div className="mt-2 rounded-xl bg-black/[0.03] p-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
            Contenido del currículo
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-black/60">{bloque.refContenido}</p>
          <label className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-black/70">
            <input
              type="checkbox"
              checked={Boolean(bloque.usarTextoLocal)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? { usarTextoLocal: true, texto: bloque.texto ?? "" }
                    : { usarTextoLocal: false }
                )
              }
              className="mt-0.5"
            />
            Redactar solo para este documento (no cambia la ficha)
          </label>
          {bloque.usarTextoLocal && (
            <textarea
              value={bloque.texto ?? ""}
              onChange={(e) => onChange({ texto: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
            />
          )}
        </div>
      )}
      {!bloque.refContenido && bloque.tipo !== "imagen" && bloque.tipo !== "regla" && bloque.tipo !== "espacio" && bloque.tipo !== "salto" && (
        <label className="mt-2 block text-[11px] font-medium text-black/60">
          Texto fijo
          <textarea
            value={bloque.texto ?? ""}
            onChange={(e) => onChange({ texto: e.target.value })}
            rows={2}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          />
        </label>
      )}
      {bloque.tipo === "imagen" && (
        <label className="mt-2 block text-[11px] font-medium text-black/60">
          Imagen del kit
          <select
            value={bloque.activoId ?? ""}
            onChange={(e) => onChange({ activoId: e.target.value || null })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="">— elegir —</option>
            {kit.activos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.tipo})
              </option>
            ))}
          </select>
        </label>
      )}

      <h3 className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-black/40">Estilo</h3>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        <label className="text-[11px] text-black/60">
          Fuente
          <select
            value={estilo.fuente ?? ""}
            onChange={(e) => onEstilo({ fuente: (e.target.value || undefined) as FuenteDiseno | undefined })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="">Plantilla</option>
            {FUENTES.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-black/60">
          Tamaño (pt)
          <input
            type="number"
            min={6}
            max={72}
            step={0.5}
            value={estilo.tamanoPt ?? ""}
            placeholder="Plantilla"
            onChange={(e) =>
              onEstilo({ tamanoPt: e.target.value ? Number(e.target.value) : undefined })
            }
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          />
        </label>
        <label className="text-[11px] text-black/60">
          Color
          <input
            type="color"
            value={estilo.color ?? "#000000"}
            onChange={(e) => onEstilo({ color: e.target.value })}
            className="mt-0.5 h-8 w-full rounded-lg border border-black/10 bg-white px-1 focus:outline-none"
          />
        </label>
        <label className="text-[11px] text-black/60">
          Alineación
          <select
            value={estilo.alineacion ?? ""}
            onChange={(e) => onEstilo({ alineacion: (e.target.value || undefined) as AlineacionTexto | undefined })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="">Plantilla</option>
            {ALINEACIONES.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[11.5px] text-black/70">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={Boolean(estilo.negrita)}
            onChange={(e) => onEstilo({ negrita: e.target.checked })}
          />
          Negrita
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={Boolean(estilo.cursiva)}
            onChange={(e) => onEstilo({ cursiva: e.target.checked })}
          />
          Cursiva
        </label>
      </div>
      <p className="mt-1 text-[10.5px] text-black/45">
        Vacío = hereda la plantilla. El color vacío vuelve al negro del documento.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Propiedades del documento                                            */
/* ------------------------------------------------------------------ */

function PropiedadesDocumento({
  diseno,
  onChange
}: {
  diseno: DisenoDocumento;
  onChange: (parche: Partial<DisenoDocumento>) => void;
}) {
  const m = diseno.pagina.margenesMm;
  const setMargen = (clave: keyof typeof m, valor: number) => {
    if (!Number.isFinite(valor) || valor < 5 || valor > 60) return;
    onChange({ pagina: { ...diseno.pagina, margenesMm: { ...m, [clave]: valor } } });
  };
  return (
    <section aria-label="Propiedades del documento" className="mt-3 rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
      <h2 className="font-display text-[13px] font-semibold tracking-tight">Documento</h2>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <label className="text-[11px] text-black/60">
          Página
          <select
            value={diseno.pagina.tamano}
            onChange={(e) =>
              onChange({
                pagina: { ...diseno.pagina, tamano: e.target.value as "carta" | "a4" }
              })
            }
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="carta">Carta</option>
            <option value="a4">A4</option>
          </select>
        </label>
        <label className="text-[11px] text-black/60">
          Orientación
          <select
            value={diseno.pagina.orientacion}
            onChange={(e) =>
              onChange({
                pagina: { ...diseno.pagina, orientacion: e.target.value as "vertical" | "horizontal" }
              })
            }
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </label>
      </div>
      <fieldset className="mt-1.5">
        <legend className="text-[11px] text-black/60">Márgenes (mm)</legend>
        <div className="mt-0.5 grid grid-cols-4 gap-1">
          {(["arriba", "abajo", "izq", "der"] as const).map((k) => (
            <label key={k} className="text-[10px] text-black/50">
              {k === "izq" ? "Izq." : k === "der" ? "Der." : k === "arriba" ? "Sup." : "Inf."}
              <input
                type="number"
                min={5}
                max={60}
                value={m[k]}
                onChange={(e) => setMargen(k, Number(e.target.value))}
                className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-1.5 py-1 text-[12px] focus:outline-none"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-1.5 block text-[11px] text-black/60">
        Encabezado <span className="text-black/40">(usa {"{pagina}"} y {"{paginas}"})</span>
        <input
          value={diseno.encabezadoTexto}
          onChange={(e) => onChange({ encabezadoTexto: e.target.value })}
          placeholder="Universidad · Modelo educativo"
          className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
        />
      </label>
      <label className="mt-1.5 block text-[11px] text-black/60">
        Pie de página
        <input
          value={diseno.pieTexto}
          onChange={(e) => onChange({ pieTexto: e.target.value })}
          placeholder="Documento oficial · 2026"
          className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
        />
      </label>
      <label className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-black/70">
        <input
          type="checkbox"
          checked={diseno.mostrarNumeroPagina}
          onChange={(e) => onChange({ mostrarNumeroPagina: e.target.checked })}
        />
        Numerar páginas
      </label>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kit de marca                                                         */
/* ------------------------------------------------------------------ */

function MarcaKit({
  kit,
  onChange,
  inputRef,
  tipoNuevo,
  onTipoNuevo,
  onArchivo
}: {
  kit: BrandKit;
  onChange: (kit: BrandKit) => void;
  inputRef: { current: HTMLInputElement | null };
  tipoNuevo: TipoActivo;
  onTipoNuevo: (t: TipoActivo) => void;
  onArchivo: (archivo: File) => void;
}) {
  return (
    <section aria-label="Identidad visual" className="mt-3 rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
      <h2 className="font-display text-[13px] font-semibold tracking-tight">Identidad visual</h2>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {(["primario", "secundario", "acento"] as const).map((k) => (
          <label key={k} className="text-[11px] text-black/60">
            {k === "primario" ? "Primario" : k === "secundario" ? "Secundario" : "Acento"}
            <input
              type="color"
              value={kit.colores[k]}
              onChange={(e) => onChange({ ...kit, colores: { ...kit.colores, [k]: e.target.value } })}
              className="mt-0.5 h-8 w-full rounded-lg border border-black/10 bg-white px-1 focus:outline-none"
            />
          </label>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <label className="text-[11px] text-black/60">
          Títulos
          <select
            value={kit.fuenteTitulos}
            onChange={(e) => onChange({ ...kit, fuenteTitulos: e.target.value as BrandKit["fuenteTitulos"] })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="serif">Serif formal</option>
            <option value="sans">Sans neutra</option>
            <option value="mono">Mono datos</option>
          </select>
        </label>
        <label className="text-[11px] text-black/60">
          Cuerpo
          <select
            value={kit.fuenteCuerpo}
            onChange={(e) => onChange({ ...kit, fuenteCuerpo: e.target.value as BrandKit["fuenteCuerpo"] })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="serif">Serif formal</option>
            <option value="sans">Sans neutra</option>
            <option value="mono">Mono datos</option>
          </select>
        </label>
      </div>
      <h3 className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-black/40">
        Imágenes ({kit.activos.length})
      </h3>
      {kit.activos.length > 0 && (
        <ul className="mt-1 space-y-1">
          {kit.activos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.dataUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain bg-black/[0.03]" />
              <span className="min-w-0 flex-1 truncate text-[11.5px]">
                {a.nombre}
                <span className="ml-1 text-black/45">({a.tipo})</span>
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...kit, activos: kit.activos.filter((x) => x.id !== a.id) })}
                aria-label={`Quitar ${a.nombre}`}
                className="shrink-0 rounded-full p-1 text-black/40 hover:text-terracotta"
              >
                <Icono nombre="papelera" className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        <select
          value={tipoNuevo}
          onChange={(e) => onTipoNuevo(e.target.value as TipoActivo)}
          aria-label="Tipo de imagen"
          className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] focus:outline-none"
        >
          <option value="logo">Logo</option>
          <option value="membrete">Membrete</option>
          <option value="sello">Sello</option>
          <option value="marca_agua">Marca de agua</option>
          <option value="imagen">Imagen</option>
        </select>
        <BotonMini onClick={() => inputRef.current?.click()}>Cargar imagen</BotonMini>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (archivo) onArchivo(archivo);
          }}
        />
      </div>
      <p className="mt-1 text-[10.5px] leading-relaxed text-black/45">
        PNG, JPG, WebP o SVG hasta 1 MB. Los SVG con contenido activo se rechazan.
      </p>
    </section>
  );
}
