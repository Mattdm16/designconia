"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";

import { BotonMini } from "@/components/ficha/Campos";
import { Icono } from "@/components/Icono";
import { aplicarPropuesta, type CambioDiseno } from "@/lib/propuestaDiseno";
import {
  agregarBloque,
  alternarVisibilidadBloque,
  aplicarEstiloBloque,
  brandKitPorDefecto,
  disenoPorDefecto,
  esSvgSeguro,
  establecerTextoLocal,
  ETIQUETA_ZONA,
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
  type OrientacionPagina,
  type PaginaDiseno,
  type TamanoPagina,
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
  onGuardar,
  cabecerasIA
}: {
  proyecto: ProyectoCurricular;
  nivel: NivelDiseno;
  documentoId: string;
  onVolver: () => void;
  /** Persiste diseño + kit en el proyecto (la página guarda y refresca). */
  onGuardar: (diseno: DisenoDocumento, kit: BrandKit) => void;
  /** Cabeceras para la IA (la clave propia viaja solo si existe). */
  cabecerasIA?: () => Record<string, string>;
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
  /* Overlay de zonas del papel sobre la vista previa (no sale en el PDF). */
  const [verZonas, setVerZonas] = useState(false);
  const vistaRefs = useRef(new Map<string, HTMLDivElement>());
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputActivoRef = useRef<HTMLInputElement | null>(null);
  const [tipoActivoNuevo, setTipoActivoNuevo] = useState<TipoActivo>("logo");
  /* Entrada al estudio: con diseño guardado se entra directo; si es nuevo,
     el docente elige entre proponer con IA o editar a mano. */
  const [entrada, setEntrada] = useState<"elegir" | "estudio">(() => (existente ? "estudio" : "elegir"));
  /* Propuesta con IA: instrucción, generación y revisión antes de confirmar. */
  const [panelIA, setPanelIA] = useState(false);
  const [plantillaElegida, setPlantillaElegida] = useState(diseno.plantillaId);
  const [instruccion, setInstruccion] = useState("");
  const [generando, setGenerando] = useState(false);
  /** Diseño previo a la propuesta en revisión: Descartar lo restaura. */
  const [anterior, setAnterior] = useState<{ diseno: DisenoDocumento; kit: BrandKit } | null>(null);
  const [mensajePropuesta, setMensajePropuesta] = useState<string | null>(null);
  const [resumenPropuesta, setResumenPropuesta] = useState<string[] | null>(null);

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

  /* -------- propuesta con IA: genera, revisa, confirma o descarta -------- */
  async function generarPropuestaCon(baseDiseno: DisenoDocumento, baseKit: BrandKit) {
    const texto = instruccion.trim();
    if (!texto || generando) return;
    setGenerando(true);
    setAviso(null);
    try {
      const cabeceras = { "Content-Type": "application/json", ...(cabecerasIA?.() ?? {}) };
      const res = await fetch("/api/diseno", {
        method: "POST",
        headers: cabeceras,
        body: JSON.stringify({ instruccion: texto, diseno: baseDiseno, kit: baseKit })
      });
      if (!res.ok) {
        let motivo = `El asistente respondió ${res.status}.`;
        try {
          const j = (await res.json()) as { error?: { mensaje?: string } };
          if (j?.error?.mensaje) motivo = j.error.mensaje;
        } catch {
          /* respuesta sin JSON: nos quedamos con el estado */
        }
        throw new Error(motivo);
      }
      const j = (await res.json()) as { mensaje?: string; cambios?: unknown };
      const cambios = Array.isArray(j.cambios) ? j.cambios : [];
      const r = aplicarPropuesta(baseDiseno, baseKit, cambios as CambioDiseno[]);
      if (r.aplicados.length === 0) {
        setAviso(r.rechazados.join(" ") || "La propuesta no trajo cambios aplicables. Reformula la instrucción.");
        return;
      }
      if (!anterior) setAnterior({ diseno: baseDiseno, kit: baseKit });
      setDiseno(r.diseno);
      setKit(r.kit);
      setMensajePropuesta(typeof j.mensaje === "string" && j.mensaje.trim() ? j.mensaje.trim() : null);
      setResumenPropuesta([...r.aplicados, ...r.rechazados.map((x) => `No aplicado: ${x}`)]);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo generar la propuesta.");
    } finally {
      setGenerando(false);
    }
  }

  function generarPropuesta() {
    // Regenerar parte del diseño previo a la propuesta en revisión.
    void generarPropuestaCon(anterior?.diseno ?? diseno, anterior?.kit ?? kit);
  }

  function confirmarPropuesta() {
    setAnterior(null);
    setMensajePropuesta(null);
    setResumenPropuesta(null);
  }

  /* -------- selección sincronizada estructura <-> vista previa -------- */
  function desplazarA(id: string, mapa: Map<string, HTMLDivElement>) {
    mapa.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function elegirEnEstructura(id: string) {
    setSeleccionado(id);
    desplazarA(id, vistaRefs.current);
  }

  function elegirEnVista(id: string) {
    setSeleccionado(id);
    document.getElementById(`estructura-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function descartarPropuesta() {
    if (anterior) {
      setDiseno(anterior.diseno);
      setKit(anterior.kit);
    }
    setAnterior(null);
    setMensajePropuesta(null);
    setResumenPropuesta(null);
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
        <button
          type="button"
          onClick={() => setPanelIA((v) => !v)}
          aria-expanded={panelIA}
          title="Pedir cambios de diseño a la IA con una instrucción"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:border-black/25 ${
            panelIA ? "border-pebble/60 bg-white" : "border-black/10 bg-white"
          }`}
        >
          <Icono nombre="chispa" className="h-3.5 w-3.5" /> Proponer con IA
        </button>
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

      {panelIA && (
        <PanelDisenoIA
          plantillaElegida={plantillaElegida}
          onPlantilla={setPlantillaElegida}
          instruccion={instruccion}
          onInstruccion={setInstruccion}
          generando={generando}
          onGenerar={generarPropuesta}
          mensaje={mensajePropuesta}
          resumen={resumenPropuesta}
          enRevision={anterior !== null}
          onConfirmar={confirmarPropuesta}
          onDescartar={descartarPropuesta}
        />
      )}

      {entrada === "elegir" ? (
        <EntradaEstudio
          nombreDoc={nombreDoc}
          plantillaElegida={plantillaElegida}
          onElegirBase={(id) => {
            if (id !== diseno.plantillaId) cambiarPlantilla(id);
            setPlantillaElegida(id);
            setEntrada("estudio");
          }}
          instruccion={instruccion}
          onInstruccion={setInstruccion}
          generando={generando}
          onGenerar={() => {
            const nueva = PLANTILLAS_BASE.find((p) => p.id === plantillaElegida);
            let base = diseno;
            if (nueva && nueva.id !== base.plantillaId) {
              base = {
                ...base,
                plantillaId: nueva.id,
                pagina: { ...nueva.pagina, margenesMm: { ...nueva.pagina.margenesMm } },
                actualizadoEn: new Date().toISOString()
              };
              setDiseno(base);
              setPlantillaElegida(nueva.id);
            }
            setEntrada("estudio");
            setPanelIA(true);
            void generarPropuestaCon(base, kit);
          }}
          continuar={existente !== null}
          onContinuar={() => setEntrada("estudio")}
          onManual={() => setEntrada("estudio")}
          onVolver={onVolver}
        />
      ) : (
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
                    id={`estructura-${b.id}`}
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
                      onClick={() => elegirEnEstructura(b.id)}
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
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-black/70">
              <input
                type="checkbox"
                checked={verZonas}
                onChange={(e) => setVerZonas(e.target.checked)}
              />
              Ver zonas del papel
            </label>
            {verZonas && (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-black/55" aria-hidden="true">
                {(Object.keys(COLOR_ZONA) as ZonaBloque[]).map((z) => (
                  <span key={z} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ZONA[z] }} />
                    {ETIQUETA_ZONA[z]}
                  </span>
                ))}
              </span>
            )}
          </div>
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
                bloques={diseno.bloques}
                seleccionado={seleccionado}
                verZonas={verZonas}
                onSeleccionar={elegirEnVista}
                registrarRef={(id, el) => {
                  if (el) vistaRefs.current.set(id, el);
                  else vistaRefs.current.delete(id);
                }}
              />
            ))}
          </div>
        </section>

        {/* Propiedades */}
        <div className="min-h-0 overflow-y-auto">
          <AjustesRapidos
            diseno={diseno}
            kit={kit}
            onDiseno={actualizar}
            onKit={(parche) => setKit((k) => ({ ...k, ...parche }))}
          />
          <div className="mt-3">
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
          </div>
          <details className="mt-3 rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
            <summary className="cursor-pointer font-display text-[13px] font-semibold tracking-tight">
              Avanzado
              <span className="ml-2 font-sans text-[11px] font-normal text-black/50">
                márgenes, encabezado, pie e identidad completa
              </span>
            </summary>
            <div className="mt-1">
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
          </details>
        </div>
      </div>
      )}
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
  total,
  bloques,
  seleccionado,
  verZonas,
  onSeleccionar,
  registrarRef
}: {
  pagina: { lineas: { texto: string; estilo: { fuente: FuenteDiseno; tamanoPt: number; negrita: boolean; cursiva: boolean; color: [number, number, number]; alineacion: AlineacionTexto; interlineado: number; espacioAntesPt: number; espacioDespuesPt: number }; bloqueId?: string | null; zona?: ZonaBloque | null }[]; imagenes: { imagenId: string; altoPt: number; bloqueId?: string | null; zona?: ZonaBloque | null }[] };
  geo: { ancho: number; alto: number; margenIzq: number; margenDer: number; margenSup: number; margenInf: number };
  diseno: DisenoDocumento;
  kit: BrandKit;
  numero: number;
  total: number;
  bloques: BloqueDiseno[];
  seleccionado: string | null;
  verZonas: boolean;
  onSeleccionar: (id: string) => void;
  registrarRef: (id: string, el: HTMLDivElement | null) => void;
}) {
  const familia = (f: FuenteDiseno) =>
    f === "serif" ? "Georgia, 'Times New Roman', serif" : f === "mono" ? "ui-monospace, Menlo, monospace" : "system-ui, sans-serif";
  const rgb = (c: [number, number, number]) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  const porId = new Map(bloques.map((b) => [b.id, b]));
  const etiquetaGrupo = (id: string | null | undefined) => {
    if (!id) return null;
    const b = porId.get(id);
    if (!b) return null;
    return `${ETIQUETA_ZONA[b.zona] ?? b.zona} · ${etiquetaBloque(b)}`;
  };
  // Agrupa líneas consecutivas del mismo bloque (un bloque puede partirse entre páginas).
  const grupos: { bloqueId: string | null; zona: ZonaBloque | null; lineas: { idx: number }[] }[] = [];
  pagina.lineas.forEach((l, idx) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.bloqueId === (l.bloqueId ?? null)) ultimo.lineas.push({ idx });
    else grupos.push({ bloqueId: l.bloqueId ?? null, zona: l.zona ?? null, lineas: [{ idx }] });
  });
  const estiloGrupo = (bloqueId: string | null, zona: ZonaBloque | null): CSSProperties => {
    if (bloqueId && bloqueId === seleccionado) {
      return { outline: "2px solid #7E7B62", outlineOffset: 1, borderRadius: 4, cursor: "pointer" };
    }
    if (verZonas && zona) {
      return { borderLeft: `1px solid ${COLOR_ZONA[zona]}`, backgroundColor: `${COLOR_ZONA[zona]}14`, paddingLeft: 6, borderRadius: 2, cursor: "pointer" };
    }
    return { cursor: "pointer" };
  };
  const chipGrupo = (bloqueId: string | null) => {
    if (!bloqueId) return null;
    const etiqueta = etiquetaGrupo(bloqueId);
    if (!etiqueta) return null;
    const marcado = bloqueId === seleccionado;
    if (!verZonas && !marcado) return null;
    const b = porId.get(bloqueId);
    return (
      <span
        className={`mb-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-px font-sans text-[10px] font-semibold uppercase tracking-wider leading-none ${
          marcado ? "bg-sow text-papel" : "bg-black/[0.05] text-black/60"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: b ? COLOR_ZONA[b.zona] : undefined }} />
        {etiqueta}
      </span>
    );
  };
  const activar = (bloqueId: string | null) => {
    if (bloqueId) onSeleccionar(bloqueId);
  };
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
        {grupos.map((g, gi) => (
          <div
            key={gi}
            ref={g.bloqueId ? (el) => registrarRef(g.bloqueId as string, el) : undefined}
            onClick={() => activar(g.bloqueId)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && g.bloqueId) {
                e.preventDefault();
                activar(g.bloqueId);
              }
            }}
            role={g.bloqueId ? "button" : undefined}
            tabIndex={g.bloqueId ? 0 : undefined}
            aria-label={g.bloqueId ? `Seleccionar bloque: ${etiquetaGrupo(g.bloqueId) ?? g.bloqueId}` : undefined}
            title={g.bloqueId ? `Bloque: ${etiquetaGrupo(g.bloqueId) ?? g.bloqueId}` : undefined}
            style={estiloGrupo(g.bloqueId, g.zona)}
          >
            {chipGrupo(g.bloqueId)}
            {g.lineas.map(({ idx }) => {
              const l = pagina.lineas[idx];
              return l.texto === "__REGLA__" ? (
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
                  {l.texto || "\u00a0"}
                </div>
              );
            })}
          </div>
        ))}
        {pagina.imagenes.map((im) => {
          const activo = kit.activos.find((a) => a.id === im.imagenId);
          if (!activo) return null;
          return (
            <div
              key={im.imagenId}
              ref={im.bloqueId ? (el) => registrarRef(im.bloqueId as string, el) : undefined}
              onClick={() => activar(im.bloqueId ?? null)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && im.bloqueId) {
                  e.preventDefault();
                  activar(im.bloqueId);
                }
              }}
              role={im.bloqueId ? "button" : undefined}
              tabIndex={im.bloqueId ? 0 : undefined}
              aria-label={im.bloqueId ? `Seleccionar bloque: ${etiquetaGrupo(im.bloqueId) ?? im.bloqueId}` : undefined}
              title={im.bloqueId ? `Bloque: ${etiquetaGrupo(im.bloqueId) ?? im.bloqueId}` : undefined}
              style={{
                textAlign: "center",
                margin: "6px 0",
                ...(im.bloqueId
                  ? estiloGrupo(im.bloqueId, im.zona ?? null)
                  : { cursor: "default" as const })
              }}
            >
              {chipGrupo(im.bloqueId ?? null)}
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

/* ------------------------------------------------------------------ */
/* Entrada al estudio: proponer con IA o editar a mano                 */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Esquema de zonas del papel (miniatura de plantilla)                   */
/* ------------------------------------------------------------------ */

const COLOR_ZONA: Record<ZonaBloque, string> = {
  portada: "#B25D3E",
  encabezado: "#6B4A6E",
  cuerpo: "#728B83",
  pie: "#7E7B62"
};

/** Miniatura del papel que muestra dónde cae cada zona: Portada, Encabezado, Cuerpo y Pie. */
function EsquemaZonas({ pagina, alto }: { pagina: PaginaDiseno; alto?: number }) {
  const horizontal = pagina.orientacion === "horizontal";
  const bandas: { zona: ZonaBloque; peso: number }[] = [
    { zona: "portada", peso: 3 },
    { zona: "encabezado", peso: 1 },
    { zona: "cuerpo", peso: 6 },
    { zona: "pie", peso: 1 }
  ];
  return (
    <div
      aria-hidden="true"
      className="flex overflow-hidden rounded-md border border-black/15 bg-white"
      style={{ height: alto ?? 120, aspectRatio: horizontal ? "1.29" : "0.78" }}
    >
      <div className="flex w-full flex-col">
        {bandas.map(({ zona, peso }) => (
          <div
            key={zona}
            className="flex min-h-0 flex-1 items-center justify-center"
            style={{ flexGrow: peso, backgroundColor: `${COLOR_ZONA[zona]}22`, borderTop: `1px solid ${COLOR_ZONA[zona]}55` }}
          >
            <span className="font-mono text-[10px] font-semibold uppercase leading-none tracking-wider" style={{ color: COLOR_ZONA[zona] }}>
              {zona === "portada" ? "Portada" : zona === "encabezado" ? "Enc." : zona === "cuerpo" ? "Cuerpo" : "Pie"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entrada al estudio: galería, IA o continuar                         */
/* ------------------------------------------------------------------ */

function EntradaEstudio({
  nombreDoc,
  plantillaElegida,
  onElegirBase,
  instruccion,
  onInstruccion,
  generando,
  onGenerar,
  continuar,
  onContinuar,
  onManual,
  onVolver
}: {
  nombreDoc: string;
  plantillaElegida: string;
  /** Elige la base (actualiza el borrador) y entra al editor. */
  onElegirBase: (id: string) => void;
  instruccion: string;
  onInstruccion: (t: string) => void;
  generando: boolean;
  onGenerar: () => void;
  /** true si ya hay un diseño guardado para continuar. */
  continuar: boolean;
  onContinuar: () => void;
  onManual: () => void;
  onVolver: () => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[980px] flex-1 content-start gap-3 overflow-y-auto">
      <section
        aria-label="Plantillas listas"
        className="rounded-[18px] border border-white/60 bg-crema/95 p-4 shadow-tarjeta"
      >
        <h2 className="font-display text-[15px] font-semibold tracking-tight">Elige una plantilla</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-black/60">
          Cada miniatura muestra qué zona del papel ocupa cada parte: Portada, Encabezado, Cuerpo y Pie.
          Al elegirla verás el documento con esa base antes de editar.
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PLANTILLAS_BASE.map((p) => {
            const activa = p.id === plantillaElegida;
            return (
              <li
                key={p.id}
                className={`flex flex-col items-center gap-1.5 rounded-xl border bg-white p-2.5 text-center transition-colors ${
                  activa ? "border-pebble/60 ring-1 ring-pebble/30" : "border-black/10"
                }`}
              >
                <EsquemaZonas pagina={p.pagina} />
                <span className="font-display text-[13px] font-semibold tracking-tight">{p.nombre}</span>
                <span className="text-[11px] leading-snug text-black/55">{p.descripcion}</span>
                <span className="font-mono text-[10px] uppercase tabular-nums text-black/40">
                  {p.pagina.tamano} · {p.pagina.orientacion === "horizontal" ? "horizontal" : "vertical"}
                </span>
                <button
                  type="button"
                  onClick={() => onElegirBase(p.id)}
                  aria-pressed={activa}
                  className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                    activa
                      ? "bg-sow text-papel"
                      : "border border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  {activa ? "Base elegida · Entrar" : "Usar esta base"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
      <section
        aria-label="Crear con IA"
        className="rounded-[18px] border border-white/60 bg-crema/95 p-4 shadow-tarjeta"
      >
        <h2 className="font-display text-[15px] font-semibold tracking-tight">Crear con IA</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-black/60">
          Parte de la base elegida y descríbelo en una frase. La IA propone cambios de apariencia
          y organización; nada se aplica sin tu visto bueno.
        </p>
        <label className="mt-2 block text-[11px] font-medium text-black/60">
          Cómo quieres el documento
          <textarea
            value={instruccion}
            onChange={(e) => onInstruccion(e.target.value)}
            rows={3}
            placeholder="Formal y sobrio, títulos en verde, portada sencilla…"
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onGenerar}
          disabled={!instruccion.trim() || generando}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood disabled:opacity-40"
        >
          <Icono nombre="chispa" className="h-3.5 w-3.5" />
          {generando ? "Generando…" : "Generar propuesta"}
        </button>
      </section>

      <section
        aria-label="Seguir editando"
        className="rounded-[18px] border border-white/60 bg-crema/95 p-4 shadow-tarjeta"
      >
        <h2 className="font-display text-[15px] font-semibold tracking-tight">
          {continuar ? "Continuar mi diseño" : "Editar a mano"}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-black/60">
          {continuar
            ? "Retoma el diseño guardado de «" + nombreDoc + "» tal como quedó, con sus bloques y ajustes."
            : "Ajusta lo esencial con controles sencillos: página, estilo, marca y orden. El documento base de «" +
              nombreDoc +
              "» ya trae sus bloques listos."}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {continuar ? (
            <button
              type="button"
              onClick={onContinuar}
              className="inline-flex items-center gap-1.5 rounded-full bg-sow px-3 py-1.5 text-xs font-medium text-papel hover:bg-black"
            >
              Continuar diseñando
            </button>
          ) : (
            <button
              type="button"
              onClick={onManual}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              Abrir el editor
            </button>
          )}
          <button
            type="button"
            onClick={onVolver}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
          >
            <Icono nombre="flecha" className="h-3.5 w-3.5 rotate-180" /> Volver a la ficha
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel de propuesta con IA (formulario + revisión)                   */
/* ------------------------------------------------------------------ */

function PanelDisenoIA({
  plantillaElegida,
  onPlantilla,
  instruccion,
  onInstruccion,
  generando,
  onGenerar,
  mensaje,
  resumen,
  enRevision,
  onConfirmar,
  onDescartar
}: {
  plantillaElegida: string;
  onPlantilla: (id: string) => void;
  instruccion: string;
  onInstruccion: (t: string) => void;
  generando: boolean;
  onGenerar: () => void;
  mensaje: string | null;
  resumen: string[] | null;
  enRevision: boolean;
  onConfirmar: () => void;
  onDescartar: () => void;
}) {
  return (
    <section
      aria-label="Propuesta de diseño con IA"
      className="shrink-0 rounded-[18px] border border-pebble/40 bg-crema/95 p-3 shadow-tarjeta"
    >
      {!enRevision ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-44 flex-1 basis-56 text-[11px] font-medium text-black/60">
            Describe el ajuste
            <textarea
              value={instruccion}
              onChange={(e) => onInstruccion(e.target.value)}
              rows={2}
              placeholder="Títulos en verde, portada con el logo arriba, A4 horizontal…"
              className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
            />
          </label>
          <label className="text-[11px] font-medium text-black/60">
            Base
            <select
              value={plantillaElegida}
              onChange={(e) => onPlantilla(e.target.value)}
              aria-label="Plantilla base de la propuesta"
              className="mt-0.5 block rounded-full border border-black/10 bg-white px-2 py-1.5 text-[11px] focus:outline-none"
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
            onClick={onGenerar}
            disabled={!instruccion.trim() || generando}
            className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood disabled:opacity-40"
          >
            <Icono nombre="chispa" className="h-3.5 w-3.5" />
            {generando ? "Generando…" : "Generar propuesta"}
          </button>
        </div>
      ) : (
        <div>
          <h3 className="font-display text-[13px] font-semibold tracking-tight">Esto entendí</h3>
          {mensaje && <p className="mt-0.5 text-[12.5px] leading-relaxed text-black/75">{mensaje}</p>}
          {resumen && resumen.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {resumen.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] text-black/70">
                  <Icono
                    nombre="check"
                    className={`mt-0.5 h-3 w-3 shrink-0 ${r.startsWith("No aplicado:") ? "text-terracotta" : "text-rainfall"}`}
                  />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onConfirmar}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood"
            >
              <Icono nombre="check" className="h-3.5 w-3.5" /> Aplicar
            </button>
            <button
              type="button"
              onClick={onGenerar}
              disabled={!instruccion.trim() || generando}
              title="Genera otra propuesta desde el diseño previo"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25 disabled:opacity-40"
            >
              <Icono nombre="deshacer" className="h-3.5 w-3.5" /> Regenerar
            </button>
            <button
              type="button"
              onClick={onDescartar}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
            >
              Descartar
            </button>
          </div>
          <p className="mt-1 text-[10.5px] text-black/45">
            La vista previa ya muestra la propuesta. Aplicar la conserva; Descartar vuelve al diseño previo.
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ajustes rápidos: lo esencial sin el editor técnico                  */
/* ------------------------------------------------------------------ */

const FUENTES_RAPIDAS: { valor: FuenteDiseno; etiqueta: string }[] = [
  { valor: "serif", etiqueta: "Serif formal" },
  { valor: "sans", etiqueta: "Sans neutra" },
  { valor: "mono", etiqueta: "Mono datos" }
];

function AjustesRapidos({
  diseno,
  kit,
  onDiseno,
  onKit
}: {
  diseno: DisenoDocumento;
  kit: BrandKit;
  onDiseno: (parche: Partial<DisenoDocumento>) => void;
  onKit: (parche: Partial<Pick<BrandKit, "colores" | "fuenteTitulos" | "fuenteCuerpo">>) => void;
}) {
  return (
    <section aria-label="Ajustes rápidos" className="rounded-[18px] border border-white/60 bg-crema/95 p-3 shadow-tarjeta">
      <h2 className="font-display text-[13px] font-semibold tracking-tight">Ajustes</h2>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <label className="text-[11px] text-black/60">
          Página
          <select
            value={diseno.pagina.tamano}
            onChange={(e) =>
              onDiseno({ pagina: { ...diseno.pagina, tamano: e.target.value as TamanoPagina } })
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
              onDiseno({ pagina: { ...diseno.pagina, orientacion: e.target.value as OrientacionPagina } })
            }
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </label>
        <label className="text-[11px] text-black/60">
          Títulos
          <select
            value={kit.fuenteTitulos}
            onChange={(e) => onKit({ fuenteTitulos: e.target.value as FuenteDiseno })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            {FUENTES_RAPIDAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-black/60">
          Cuerpo
          <select
            value={kit.fuenteCuerpo}
            onChange={(e) => onKit({ fuenteCuerpo: e.target.value as FuenteDiseno })}
            className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
          >
            {FUENTES_RAPIDAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-black/60">
          Color principal
          <input
            type="color"
            value={kit.colores.primario}
            onChange={(e) => onKit({ colores: { ...kit.colores, primario: e.target.value } })}
            className="mt-0.5 h-8 w-full rounded-lg border border-black/10 bg-white px-1 focus:outline-none"
          />
        </label>
        <label className="mt-5 inline-flex items-center gap-1.5 text-[11.5px] text-black/70">
          <input
            type="checkbox"
            checked={diseno.mostrarNumeroPagina}
            onChange={(e) => onDiseno({ mostrarNumeroPagina: e.target.checked })}
          />
          Numerar páginas
        </label>
      </div>
      <label className="mt-1.5 block text-[11px] text-black/60">
        Encabezado
        <input
          value={diseno.encabezadoTexto}
          onChange={(e) => onDiseno({ encabezadoTexto: e.target.value })}
          placeholder="Universidad · Modelo educativo"
          className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
        />
      </label>
      <label className="mt-1.5 block text-[11px] text-black/60">
        Pie de página
        <input
          value={diseno.pieTexto}
          onChange={(e) => onDiseno({ pieTexto: e.target.value })}
          placeholder="Documento oficial · 2026"
          className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] focus:outline-none"
        />
      </label>
    </section>
  );
}
