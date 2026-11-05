"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Chat, type AdjuntoChip, type DocMenuItem } from "@/components/Chat";
import { Icono } from "@/components/Icono";
import { MarcoFicha } from "@/components/ficha/Marco";
import { MesoFicha } from "@/components/ficha/Meso";
import { MicrocurriculoFicha } from "@/components/ficha/Microcurriculo";
import { textoLegible } from "@/lib/errores";
import {
  aplicarVistaMacroV3,
  leerVistaMacroV3,
  vistaMacroVacia,
  type VistaMacroPersistible
} from "@/lib/estadoMacro";
import {
  aplicarVistaMicroV3,
  crearEstadoGuardadoV3Vacio,
  leerVistaMicroV3,
  vistaMicroVacia,
  type VistaMicroPersistible
} from "@/lib/estadoMicro";
import { nombreArchivo, textoAPdf } from "@/lib/exportarPdf";
import { microcurriculoATexto } from "@/lib/exportarTexto";
import { marcoATexto } from "@/lib/exportarMacroTexto";
import { programaATexto, type ContextoProgramaTexto } from "@/lib/exportarMesoTexto";
import { expedienteAMarkdown, expedienteATexto } from "@/lib/exportarExpediente";
import { marcoAMarkdown, microcurriculoAMarkdown, programaAMarkdown } from "@/lib/markdown";
import {
  aplicarVistaMesoV3,
  asignaturasDelPrograma,
  asignaturasSinPrograma,
  desvincularAsignatura,
  leerVistaMesoV3,
  vincularAsignaturaAPrograma,
  vistaMesoVacia,
  type VistaMesoPersistible
} from "@/lib/estadoMeso";
import { agregarFuentesProyecto, fusionarMarco, parsearRespuestaMacro, pideRegistrarFuente, validarMarco, type SeccionMacro } from "@/lib/macro";
import { fusionarPrograma, parsearRespuestaMeso, validarPrograma, type SeccionMeso } from "@/lib/meso";
import { definirAlineacion, existeAlineacion, quitarAlineacion } from "@/lib/alineaciones";
import { SUGERENCIAS_APERTURA_MACRO } from "@/lib/promptMacro";
import { SUGERENCIAS_APERTURA_MESO } from "@/lib/promptMeso";
import { SUGERENCIAS_APERTURA_NEUTRAS } from "@/lib/inicio";
import { mencionaOtroNivel, pideNuevoDocumento, parsearRespuestaInicio } from "@/lib/inicio";
import {
  MAX_PDFS_POR_ENVIO,
  LIMITE_PDF_BYTES,
  anioVigente,
  construirFuentePdf,
  extractosRelevantes,
  idAdjunto,
  mensajeRechazoPdf,
  parecePdf,
  tieneFirmaPdfprimeros,
  tieneTextoAprovechable,
  type MotivoRechazoPdf
} from "@/lib/pdf";
import type {
  FuenteCurricular,
  MarcoEducativoInstitucional,
  NodoCurricular,
  ProgramaAcademico
} from "@/lib/proyecto";
import {
  CLAVE_MICRO_V1,
  CLAVE_MICRO_V2,
  CLAVE_PROYECTO_V3,
  CLAVE_PROYECTO_V3_RECUPERACION,
  CLAVE_PROYECTO_V3_RESPALDO,
  CLAVE_PROYECTO_V3_TEMP,
  CLAVE_PROYECTO_V3_TEMP_RECUPERACION,
  cargarEstadoPersistido,
  guardarEstadoV3
} from "@/lib/persistencia";
import { type EstadoGuardadoV3 } from "@/lib/proyecto";
import {
  SALUDO_APERTURA,
  SECCIONES,
  SUGERENCIAS_APERTURA,
  extraerMensajeParcial,
  folioNuevo,
  mergeMicrocurriculo,
  parsearRespuesta,
  rasDelMicro,
  validarMicrocurriculo,
  type ChatMensaje,
  type Intencion,
  type Microcurriculo,
  type SeccionId
} from "@/lib/schema";

const CLAVES_PERSISTENCIA_PROYECTO = [
  CLAVE_PROYECTO_V3,
  CLAVE_PROYECTO_V3_TEMP,
  CLAVE_PROYECTO_V3_TEMP_RECUPERACION,
  CLAVE_PROYECTO_V3_RESPALDO,
  CLAVE_PROYECTO_V3_RECUPERACION,
  CLAVE_MICRO_V2,
  CLAVE_MICRO_V1
] as const;

function esSeccionMicro(valor: string | null): valor is SeccionId {
  return valor !== null && (SECCIONES as readonly string[]).includes(valor);
}

function nombreErrorPersistencia(error: unknown): string {
  return error instanceof Error ? error.message : "Error de almacenamiento no identificado.";
}

type Salud = {
  conexion: "sin_clave" | "ok" | "clave_invalida" | "sin_saldo" | "red" | "proveedor";
  ia: boolean;
  modelo: string;
  mensaje: string;
};

/** Niveles curriculares con interfaz en esta página. */
type ModuloActivo = "micro" | "macro" | "meso";

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [micro, setMicro] = useState<Microcurriculo | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>(SUGERENCIAS_APERTURA);
  const [intencion, setIntencion] = useState<Intencion>("entender");
  const [seccionActiva, setSeccionActiva] = useState<SeccionId | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salud, setSalud] = useState<Salud | null>(null);
  const [hidratado, setHidratado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoPersistencia, setAvisoPersistencia] = useState<string | null>(null);
  const [persistenciaBloqueada, setPersistenciaBloqueada] = useState(false);
  const [datosNoRecuperables, setDatosNoRecuperables] = useState(false);
  const [scopeV3NoSoportado, setScopeV3NoSoportado] = useState(false);
  const [pildoraBorrador, setPildoraBorrador] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  /* Tema claro/oscuro: el script del layout ya puso la clase antes de pintar. */
  const [temaOscuro, setTemaOscuro] = useState(false);
  useEffect(() => {
    setTemaOscuro(document.documentElement.classList.contains("dark"));
  }, []);
  function alternarTema() {
    setTemaOscuro((anterior) => {
      const siguiente = !anterior;
      document.documentElement.classList.toggle("dark", siguiente);
      try {
        window.localStorage.setItem("designconia.tema", siguiente ? "oscuro" : "claro");
      } catch {
        /* sin almacenamiento: el tema vive solo en la sesión */
      }
      return siguiente;
    });
  }

  /* -------- módulo Macro: marco institucional y su conversación -------- */
  const [moduloActivo, setModuloActivo] = useState<ModuloActivo>("micro");
  const [marco, setMarco] = useState<MarcoEducativoInstitucional | null>(null);
  const [fuentes, setFuentes] = useState<FuenteCurricular[]>([]);
  const [mensajesMacro, setMensajesMacro] = useState<ChatMensaje[]>([]);
  const [sugerenciasMacro, setSugerenciasMacro] = useState<string[]>(SUGERENCIAS_APERTURA_MACRO);
  const [intencionMacro, setIntencionMacro] = useState<Intencion>("entender");
  const [seccionActivaMacro, setSeccionActivaMacro] = useState<SeccionMacro | null>(null);
  const [crudoMacro, setCrudoMacro] = useState("");

  /* -------- módulo Meso: programa académico y su conversación -------- */
  const [programa, setPrograma] = useState<ProgramaAcademico | null>(null);
  const [vinculoMarcoId, setVinculoMarcoId] = useState<string | null>(null);
  const [mensajesMeso, setMensajesMeso] = useState<ChatMensaje[]>([]);
  const [sugerenciasMeso, setSugerenciasMeso] = useState<string[]>(SUGERENCIAS_APERTURA_MESO);
  const [intencionMeso, setIntencionMeso] = useState<Intencion>("entender");
  const [seccionActivaMeso, setSeccionActivaMeso] = useState<SeccionMeso | null>(null);
  const [crudoMeso, setCrudoMeso] = useState("");

  const estadoV3Ref = useRef<EstadoGuardadoV3 | null>(null);
  /** Tocada cada vez que el agregado V3 cambia, para refrescar listas sin mutar refs. */
  const [versionProyecto, setVersionProyecto] = useState(0);
  const idProyectoNuevoRef = useRef<string | null>(null);
  const bloqueoPersistenciaRef = useRef(false);
  const scopeV3NoSoportadoRef = useRef(false);
  const legadosPendientesRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /**
   * Destino ya decidido por el enrutador mientras se sigue en inicio (solo
   * ocurre con Micro, que no tiene lienzo). Evita preguntar dos veces: el
   * siguiente turno ya crea la ficha directamente.
   */
  const destinoInicioRef = useRef<ModuloActivo | null>(null);
  const ultimaPeticion = useRef("");
  const avisoRef = useRef<number | null>(null);

  /**
   * El proveedor a veces cierra un turno con finish_reason normal y cero
   * contenido. En vez de mostrar un error, se reintenta una vez en silencio:
   * esta bandera le dice al finally que dispare ese reintento cuando la
   * llamada en curso ya terminó de limpiar su controlador.
   */
  const reintentarVacio = useRef(false);

  /**
   * Contexto de la última falla de parseo. Reintentar con la misma petición
   * reproduciría el mismo error; con esto, el turno le dice al modelo qué
   * pasó y le pide cambiar de estrategia.
   */
  const ultimoErrorRef = useRef<{ motivo: string; fin: string | null; bruto: string } | null>(null);

  /**
   * Última respuesta cruda del modelo. Se reinyecta como turno `assistant`
   * para que la IA recuerde lo que propuso sin tener que volver a describirlo.
   */
  const [crudoUltimo, setCrudoUltimo] = useState("");
  const crudoRef = useRef("");

  /** El microcurrículo vivo, para leerlo dentro de callbacks sin stale state. */
  const microRef = useRef<Microcurriculo | null>(null);
  microRef.current = micro;

  /** El marco vivo y el módulo visible, por la misma razón. */
  const marcoRef = useRef<MarcoEducativoInstitucional | null>(null);
  marcoRef.current = marco;
  /** Las fuentes vivas, para leerlas dentro de callbacks sin stale state. */
  const fuentesRef = useRef<FuenteCurricular[]>([]);
  fuentesRef.current = fuentes;
  const moduloActivoRef = useRef<ModuloActivo>("micro");
  moduloActivoRef.current = moduloActivo;
  /** Último documento abierto en cada módulo, para volver a él al cambiar. */
  const docIdPorModuloRef = useRef<Record<ModuloActivo, string | null>>({
    micro: null,
    macro: null,
    meso: null
  });
  /** Última respuesta cruda del módulo Macro, para su historial. */
  const crudoMacroRef = useRef("");
  /** Última respuesta cruda del módulo Meso, para su historial. */
  const crudoMesoRef = useRef("");
  /** El programa vivo, para leerlo dentro de callbacks sin stale state. */
  const programaRef = useRef<ProgramaAcademico | null>(null);
  programaRef.current = programa;
  /** El vínculo principal en edición, por la misma razón. */
  const vinculoMarcoIdRef = useRef<string | null>(null);
  vinculoMarcoIdRef.current = vinculoMarcoId;

  /**
   * PDFs adjuntos al turno en curso. Viven fuera de los módulos: el docente
   * puede adjuntar en cualquier punto y viajan con el siguiente envío.
   * Al registrarse como fuente quedan en el proyecto aunque se quite el chip.
   */
  type AdjuntoPdf = {
    id: string;
    nombre: string;
    estado: "extrayendo" | "listo" | "error" | "anio";
    detalle?: string;
    paginas?: number;
    anio?: number | null;
    textoPorPagina?: string[];
    tituloFuente?: string;
    fuenteId?: string;
  };
  const [adjuntos, setAdjuntos] = useState<AdjuntoPdf[]>([]);
  const adjuntosRef = useRef<AdjuntoPdf[]>([]);
  adjuntosRef.current = adjuntos;

  /** Chips del compositor (subconjunto visible del estado de adjuntos). */
  const adjuntosChips: AdjuntoChip[] = adjuntos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    estado: a.estado,
    detalle: a.detalle
  }));

  function actualizarAdjunto(id: string, parche: Partial<AdjuntoPdf>) {
    setAdjuntos((lista) => lista.map((a) => (a.id === id ? { ...a, ...parche } : a)));
  }

  /** Registra un PDF validado como fuente curricular del proyecto. */
  function registrarFuentePdf(adjunto: AdjuntoPdf, anio: number): boolean {
    const base = estadoV3Ref.current;
    if (!base || adjunto.textoPorPagina === undefined || adjunto.paginas === undefined) return false;
    const construido = construirFuentePdf(
      { nombre: adjunto.nombre, paginas: adjunto.paginas, anio, textoPorPagina: adjunto.textoPorPagina },
      new Date()
    );
    if (!construido.ok) {
      actualizarAdjunto(adjunto.id, { estado: "error", detalle: mensajeRechazoPdf("antiguo", adjunto.nombre) });
      return false;
    }
    const fuente = { ...construido.fuente, tipo: "otro" as const };
    const yaExiste = base.proyecto.fuentesCurriculares.some((f) => f.id === fuente.id);
    const siguiente: EstadoGuardadoV3 = {
      ...base,
      proyecto: {
        ...base.proyecto,
        fuentesCurriculares: yaExiste
          ? base.proyecto.fuentesCurriculares
          : [...base.proyecto.fuentesCurriculares, fuente]
      }
    };
    estadoV3Ref.current = siguiente;
    if (yaExiste) {
      const previa = base.proyecto.fuentesCurriculares.find((f) => f.id === fuente.id);
      actualizarAdjunto(adjunto.id, {
        estado: "listo",
        detalle: `${adjunto.paginas} págs · ${previa?.anio ?? anio} (fuente ya registrada)`,
        tituloFuente: previa?.titulo ?? fuente.titulo,
        fuenteId: fuente.id
      });
    } else {
      setFuentes((lista) => [...lista, fuente]);
      actualizarAdjunto(adjunto.id, {
        estado: "listo",
        detalle: `${adjunto.paginas} págs · ${anio}`,
        tituloFuente: fuente.titulo,
        fuenteId: fuente.id
      });
    }
    const guardado = guardarEstadoV3(window.localStorage, siguiente);
    if (!guardado.ok) {
      setAvisoPersistencia(
        "La fuente se registró en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
      );
    } else {
      estadoV3Ref.current = guardado.estado;
    }
    setVersionProyecto((v) => v + 1);
    return true;
  }

  /** Valida, extrae y registra cada PDF elegido en el menú del compositor. */
  async function adjuntarArchivos(archivos: File[]) {
    const activos = adjuntosRef.current.filter((a) => a.estado !== "error");
    if (activos.length + archivos.length > MAX_PDFS_POR_ENVIO) {
      mostrarAviso(`Puedes adjuntar ${MAX_PDFS_POR_ENVIO} PDFs por envío. Quita uno para añadir otro.`);
      return;
    }
    for (const archivo of archivos) {
      const nombre = archivo.name.trim() || "documento.pdf";
      if (!parecePdf(nombre, archivo.type)) {
        mostrarAviso(mensajeRechazoPdf("no_pdf", nombre));
        continue;
      }
      if (archivo.size > LIMITE_PDF_BYTES) {
        mostrarAviso(mensajeRechazoPdf("demasiado_grande", nombre));
        continue;
      }
      const id = idAdjunto(nombre, archivo.size);
      if (adjuntosRef.current.some((a) => a.id === id && a.estado !== "error")) continue;
      setAdjuntos((lista) => [...lista, { id, nombre, estado: "extrayendo", detalle: "Leyendo PDF…" }]);
      try {
        const bytes = new Uint8Array(await archivo.arrayBuffer());
        if (!tieneFirmaPdfprimeros(bytes)) {
          actualizarAdjunto(id, { estado: "error", detalle: mensajeRechazoPdf("no_pdf", nombre) });
          continue;
        }
        const { extraerTextoPdf } = await import("@/lib/pdf");
        const extraido = await extraerTextoPdf(bytes, nombre);
        if (!tieneTextoAprovechable(extraido.textoPorPagina)) {
          actualizarAdjunto(id, { estado: "error", detalle: mensajeRechazoPdf("sin_texto", nombre) });
          continue;
        }
        const anio = extraido.anio ?? null;
        const base: AdjuntoPdf = {
          id,
          nombre,
          estado: "listo",
          paginas: extraido.paginas,
          anio,
          textoPorPagina: extraido.textoPorPagina,
          detalle: `${extraido.paginas} págs`
        };
        if (anio === null) {
          // Sin fecha legible el año lo declara el docente: sin año no se integra.
          setAdjuntos((lista) => lista.map((a) => (a.id === id ? { ...base, estado: "anio", detalle: "Indica el año del documento" } : a)));
          continue;
        }
        if (!anioVigente(anio, new Date())) {
          actualizarAdjunto(id, { estado: "error", detalle: mensajeRechazoPdf("antiguo", nombre) });
          continue;
        }
        setAdjuntos((lista) => lista.map((a) => (a.id === id ? base : a)));
        registrarFuentePdf({ ...base, textoPorPagina: extraido.textoPorPagina }, anio);
      } catch (error) {
        const motivo = (error as { motivo?: MotivoRechazoPdf } | null)?.motivo ?? "ilegible";
        actualizarAdjunto(id, { estado: "error", detalle: mensajeRechazoPdf(motivo, nombre) });
      }
    }
  }

  function quitarAdjunto(id: string) {
    // Quitar el chip no borra la fuente: ya quedó registrada para poder citarla.
    setAdjuntos((lista) => lista.filter((a) => a.id !== id));
  }

  function confirmarAnioAdjunto(id: string, anio: number) {
    const adjunto = adjuntosRef.current.find((a) => a.id === id);
    if (!adjunto || adjunto.estado !== "anio") return;
    if (!anioVigente(anio, new Date())) {
      actualizarAdjunto(id, { estado: "error", detalle: mensajeRechazoPdf("antiguo", adjunto.nombre) });
      return;
    }
    const completo: AdjuntoPdf = { ...adjunto, anio };
    setAdjuntos((lista) => lista.map((a) => (a.id === id ? completo : a)));
    registrarFuentePdf(completo, anio);
  }

  /** Evidencia lista para el siguiente envío (título, páginas y extractos). */
  function fuentesPdfParaEnvio(mensaje: string): { titulo: string; paginas: number; extractos: string[] }[] {
    return adjuntosRef.current
      .filter((a) => a.estado === "listo" && a.textoPorPagina && a.tituloFuente)
      .map((a) => ({
        titulo: a.tituloFuente as string,
        paginas: a.paginas ?? 0,
        extractos: extractosRelevantes(a.textoPorPagina as string[], mensaje)
      }))
      .filter((f) => f.extractos.length > 0);
  }

  const saludRef = useRef<Salud | null>(null);
  saludRef.current = salud;

  const hayBorrador =
    moduloActivo === "macro" ? marco !== null : moduloActivo === "meso" ? programa !== null : micro !== null;

  /* -------- avisos efímeros -------- */
  const mostrarAviso = useCallback((texto: string) => {
    setAviso(texto);
    if (avisoRef.current) window.clearTimeout(avisoRef.current);
    avisoRef.current = window.setTimeout(() => setAviso(null), 6000);
  }, []);

  /* -------- persistencia V3 -------- */
  useEffect(() => {
    try {
      const carga = cargarEstadoPersistido(window.localStorage);
      if (carga.ok) {
        estadoV3Ref.current = carga.estado;
        idProyectoNuevoRef.current = carga.estado.proyecto.id;
        legadosPendientesRef.current =
          carga.clavesLegadasPendientes.length > 0 ||
          carga.clavesTemporalesPendientes.length > 0 ||
          carga.clavesConflictivas.length > 0;

        const avisarCarga = () => {
          if (!carga.guardado) {
            setAvisoPersistencia(
              "Pude recuperar tu trabajo y está disponible en esta sesión, pero el navegador no confirmó el nuevo guardado. No cierres la pestaña hasta resolverlo."
            );
          } else if (carga.clavesLegadasPendientes.length || carga.clavesTemporalesPendientes.length) {
            setAvisoPersistencia(
              "El proyecto está abierto; quedaron copias locales pendientes de limpieza y no se eliminaron sin confirmación del almacén."
            );
          } else if (carga.clavesConflictivas.length) {
            setAvisoPersistencia(
              "El proyecto está abierto. Conservé algunas claves antiguas que no pude validar; no se sobrescribieron."
            );
          } else {
            setAvisoPersistencia(null);
          }
        };

        const bloquearScope = () => {
          bloqueoPersistenciaRef.current = true;
          scopeV3NoSoportadoRef.current = true;
          setPersistenciaBloqueada(true);
          setScopeV3NoSoportado(true);
          setAvisoPersistencia(
            "Este proyecto está guardado, pero esta página todavía no puede abrir ese módulo. No cambié la selección ni el guardado para proteger sus datos."
          );
        };

        const desbloquear = () => {
          bloqueoPersistenciaRef.current = false;
          scopeV3NoSoportadoRef.current = false;
          setPersistenciaBloqueada(false);
          setScopeV3NoSoportado(false);
          setDatosNoRecuperables(false);
        };

        if (carga.estado.seleccion.modulo === "macro") {
          const resultadoVista = leerVistaMacroV3(carga.estado);
          if (!resultadoVista.ok) {
            bloquearScope();
          } else {
            desbloquear();
            const vista = resultadoVista.vista;
            docIdPorModuloRef.current = {
              micro: carga.estado.proyecto.asignaturas[0]?.id ?? null,
              macro: carga.estado.seleccion.documentoId,
              meso: carga.estado.proyecto.programas[0]?.id ?? null
            };
            setModuloActivo("macro");
            setMarco(vista.marco);
            setFuentes(vista.fuentes);
            setMensajesMacro(vista.mensajes);
            setSugerenciasMacro(
              vista.sugerencias.length ? vista.sugerencias : SUGERENCIAS_APERTURA_MACRO
            );
            setIntencionMacro(vista.intencion);
            setSeccionActivaMacro(vista.seccionActiva);
            setCrudoMacro(vista.crudo);
            crudoMacroRef.current = vista.crudo;
            avisarCarga();
            if (carga.migrado && carga.guardado) {
              mostrarAviso("Tu proyecto se migró al formato V3.");
            }
          }
        } else if (carga.estado.seleccion.modulo === "meso") {
          const resultadoVista = leerVistaMesoV3(carga.estado);
          if (!resultadoVista.ok) {
            bloquearScope();
          } else {
            desbloquear();
            const vista = resultadoVista.vista;
            docIdPorModuloRef.current = {
              micro: carga.estado.proyecto.asignaturas[0]?.id ?? null,
              macro: carga.estado.proyecto.marcos[0]?.id ?? null,
              meso: carga.estado.seleccion.documentoId
            };
            setModuloActivo("meso");
            setPrograma(vista.programa);
            setVinculoMarcoId(vista.vinculoMarcoId);
            setMensajesMeso(vista.mensajes);
            setSugerenciasMeso(
              vista.sugerencias.length ? vista.sugerencias : SUGERENCIAS_APERTURA_MESO
            );
            setIntencionMeso(vista.intencion);
            setSeccionActivaMeso(vista.seccionActiva);
            setCrudoMeso(vista.crudo);
            crudoMesoRef.current = vista.crudo;
            avisarCarga();
            if (carga.migrado && carga.guardado) {
              mostrarAviso("Tu proyecto se migró al formato V3.");
            }
          }
        } else {
          const resultadoVista = leerVistaMicroV3(carga.estado);
          if (!resultadoVista.ok) {
            bloquearScope();
          } else {
            desbloquear();
            const vista = resultadoVista.vista;
            const seccion = esSeccionMicro(vista.seccionActiva) ? vista.seccionActiva : null;
            docIdPorModuloRef.current = {
              micro:
                carga.estado.seleccion.modulo === "micro"
                  ? carga.estado.seleccion.documentoId
                  : (carga.estado.proyecto.asignaturas[0]?.id ?? null),
              macro: carga.estado.proyecto.marcos[0]?.id ?? null,
              meso: carga.estado.proyecto.programas[0]?.id ?? null
            };
            setMicro(vista.microcurriculo);
            setMensajes(vista.mensajes);
            setSugerencias(vista.sugerencias);
            setIntencion(vista.intencion);
            setSeccionActiva(seccion);
            setCrudoUltimo(vista.crudo);
            crudoRef.current = vista.crudo;
            avisarCarga();
            if (carga.migrado && carga.guardado) {
              mostrarAviso("Tu microcurrículo y conversación se migraron al proyecto V3.");
            }
          }
        }
      } else if (carga.estadoCarga === "sin_datos") {
        estadoV3Ref.current = null;
        idProyectoNuevoRef.current = null;
        bloqueoPersistenciaRef.current = false;
        scopeV3NoSoportadoRef.current = false;
        legadosPendientesRef.current = false;
        setPersistenciaBloqueada(false);
        setScopeV3NoSoportado(false);
        setDatosNoRecuperables(false);
        setAvisoPersistencia(null);
      } else {
        // No se guarda un estado vacío encima de claves ilegibles o inaccesibles.
        estadoV3Ref.current = null;
        bloqueoPersistenciaRef.current = true;
        legadosPendientesRef.current = false;
        setPersistenciaBloqueada(true);
        setDatosNoRecuperables(true);
        setAvisoPersistencia(
          carga.estadoCarga === "almacen_inaccesible"
            ? "No pude leer el almacenamiento de este navegador. No guardé ni borré nada; puedes seguir solo en memoria o elegir explícitamente empezar de cero."
            : "Encontré datos guardados que no pude leer. Los conservé y bloqueé el guardado automático; puedes elegir explícitamente descartarlos para empezar de cero."
        );
      }
    } catch {
      estadoV3Ref.current = null;
      bloqueoPersistenciaRef.current = true;
      setPersistenciaBloqueada(true);
      setDatosNoRecuperables(true);
      setAvisoPersistencia(
        "No pude acceder al guardado de este navegador. No se sobrescribió nada; elige explícitamente empezar de cero si quieres descartarlo."
      );
    }
    setHidratado(true);
  }, [mostrarAviso]);

  useEffect(() => {
    if (!hidratado || bloqueoPersistenciaRef.current || scopeV3NoSoportadoRef.current) return;
    // No se escribe un proyecto vacío por el mero hecho de abrir la página.
    if (micro === null && mensajes.length === 0) return;

    const id = window.setTimeout(() => {
      try {
        if (!idProyectoNuevoRef.current) {
          idProyectoNuevoRef.current = `proyecto_${folioNuevo()}`;
        }
        const vista: VistaMicroPersistible = {
          microcurriculo: micro,
          mensajes,
          sugerencias,
          intencion,
          seccionActiva,
          crudo: crudoUltimo
        };
        const base =
          estadoV3Ref.current ?? crearEstadoGuardadoV3Vacio(idProyectoNuevoRef.current);
        const siguiente = aplicarVistaMicroV3(
          base,
          vista,
          idProyectoNuevoRef.current
        );
        // Si el almacenamiento falla, se mantiene este estado V3 en memoria y
        // los siguientes turnos no pierden los documentos/conversaciones hermanos.
        estadoV3Ref.current = siguiente;
        const guardado = guardarEstadoV3(window.localStorage, siguiente);
        if (!guardado.ok) {
          setAvisoPersistencia(
            `El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador (${guardado.error}). No cierres la pestaña hasta resolverlo.`
          );
          return;
        }

        estadoV3Ref.current = guardado.estado;
        setVersionProyecto((v) => v + 1);
        const temporalPendiente = guardado.clavesTemporalesPendientes.length > 0;
        if (legadosPendientesRef.current) {
          // Una carga migrada en memoria puede guardar V3 en un turno posterior;
          // volver a cargar verifica V3 y retira solo snapshots legacy reconocidos.
          const limpieza = cargarEstadoPersistido(window.localStorage);
          if (limpieza.ok && limpieza.guardado) {
            estadoV3Ref.current = limpieza.estado;
            legadosPendientesRef.current =
              limpieza.clavesLegadasPendientes.length > 0 ||
              limpieza.clavesTemporalesPendientes.length > 0 ||
              limpieza.clavesConflictivas.length > 0;
            if (limpieza.clavesConflictivas.length) {
              setAvisoPersistencia("El proyecto se guardó; conservé copias antiguas que no pude validar.");
              return;
            }
          }
        }

        if (temporalPendiente || legadosPendientesRef.current) {
          setAvisoPersistencia("El proyecto se guardó, pero quedaron claves locales pendientes de limpieza.");
        } else {
          setAvisoPersistencia(null);
        }
      } catch (errorPersistencia) {
        setAvisoPersistencia(
          `El proyecto sigue disponible en esta sesión, pero no se pudo guardar (${nombreErrorPersistencia(errorPersistencia)}). No cierres la pestaña hasta resolverlo.`
        );
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [micro, mensajes, sugerencias, intencion, seccionActiva, crudoUltimo, hidratado]);

  /* -------- autosave del módulo Macro (espejo del anterior) -------- */
  useEffect(() => {
    if (!hidratado || bloqueoPersistenciaRef.current || scopeV3NoSoportadoRef.current) return;
    if (moduloActivo !== "macro") return;
    // No se escribe un proyecto vacío por el mero hecho de abrir la página.
    if (marco === null && mensajesMacro.length === 0) return;

    const id = window.setTimeout(() => {
      try {
        if (!idProyectoNuevoRef.current) {
          idProyectoNuevoRef.current = `proyecto_${folioNuevo()}`;
        }
        const vista: VistaMacroPersistible = {
          marco,
          fuentes,
          mensajes: mensajesMacro,
          sugerencias: sugerenciasMacro,
          intencion: intencionMacro,
          seccionActiva: seccionActivaMacro,
          crudo: crudoMacro
        };
        const base =
          estadoV3Ref.current ?? crearEstadoGuardadoV3Vacio(idProyectoNuevoRef.current);
        const siguiente = aplicarVistaMacroV3(base, vista, idProyectoNuevoRef.current);
        estadoV3Ref.current = siguiente;
        const guardado = guardarEstadoV3(window.localStorage, siguiente);
        if (!guardado.ok) {
          setAvisoPersistencia(
            `El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador (${guardado.error}). No cierres la pestaña hasta resolverlo.`
          );
          return;
        }

        estadoV3Ref.current = guardado.estado;
        setVersionProyecto((v) => v + 1);
        const temporalPendiente = guardado.clavesTemporalesPendientes.length > 0;
        if (legadosPendientesRef.current) {
          const limpieza = cargarEstadoPersistido(window.localStorage);
          if (limpieza.ok && limpieza.guardado) {
            estadoV3Ref.current = limpieza.estado;
            legadosPendientesRef.current =
              limpieza.clavesLegadasPendientes.length > 0 ||
              limpieza.clavesTemporalesPendientes.length > 0 ||
              limpieza.clavesConflictivas.length > 0;
            if (limpieza.clavesConflictivas.length) {
              setAvisoPersistencia("El proyecto se guardó; conservé copias antiguas que no pude validar.");
              return;
            }
          }
        }

        if (temporalPendiente || legadosPendientesRef.current) {
          setAvisoPersistencia("El proyecto se guardó, pero quedaron claves locales pendientes de limpieza.");
        } else {
          setAvisoPersistencia(null);
        }
      } catch (errorPersistencia) {
        setAvisoPersistencia(
          `El proyecto sigue disponible en esta sesión, pero no se pudo guardar (${nombreErrorPersistencia(errorPersistencia)}). No cierres la pestaña hasta resolverlo.`
        );
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [marco, fuentes, mensajesMacro, sugerenciasMacro, intencionMacro, seccionActivaMacro, crudoMacro, hidratado, moduloActivo]);

  useEffect(() => {
    crudoRef.current = crudoUltimo;
  }, [crudoUltimo]);

  useEffect(() => {
    crudoMacroRef.current = crudoMacro;
  }, [crudoMacro]);

  useEffect(() => {
    crudoMesoRef.current = crudoMeso;
  }, [crudoMeso]);

  /* -------- autosave del módulo Meso (espejo de los anteriores) -------- */
  useEffect(() => {
    if (!hidratado || bloqueoPersistenciaRef.current || scopeV3NoSoportadoRef.current) return;
    if (moduloActivo !== "meso") return;
    // No se escribe un proyecto vacío por el mero hecho de abrir la página.
    if (programa === null && mensajesMeso.length === 0) return;

    const id = window.setTimeout(() => {
      try {
        if (!idProyectoNuevoRef.current) {
          idProyectoNuevoRef.current = `proyecto_${folioNuevo()}`;
        }
        const vista: VistaMesoPersistible = {
          programa,
          vinculoMarcoId,
          mensajes: mensajesMeso,
          sugerencias: sugerenciasMeso,
          intencion: intencionMeso,
          seccionActiva: seccionActivaMeso,
          crudo: crudoMeso
        };
        const base =
          estadoV3Ref.current ?? crearEstadoGuardadoV3Vacio(idProyectoNuevoRef.current);
        const siguiente = aplicarVistaMesoV3(base, vista, idProyectoNuevoRef.current);
        estadoV3Ref.current = siguiente;
        const guardado = guardarEstadoV3(window.localStorage, siguiente);
        if (!guardado.ok) {
          setAvisoPersistencia(
            `El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador (${guardado.error}). No cierres la pestaña hasta resolverlo.`
          );
          return;
        }

        estadoV3Ref.current = guardado.estado;
        setVersionProyecto((v) => v + 1);
        const temporalPendiente = guardado.clavesTemporalesPendientes.length > 0;
        if (legadosPendientesRef.current) {
          const limpieza = cargarEstadoPersistido(window.localStorage);
          if (limpieza.ok && limpieza.guardado) {
            estadoV3Ref.current = limpieza.estado;
            legadosPendientesRef.current =
              limpieza.clavesLegadasPendientes.length > 0 ||
              limpieza.clavesTemporalesPendientes.length > 0 ||
              limpieza.clavesConflictivas.length > 0;
            if (limpieza.clavesConflictivas.length) {
              setAvisoPersistencia("El proyecto se guardó; conservé copias antiguas que no pude validar.");
              return;
            }
          }
        }

        if (temporalPendiente || legadosPendientesRef.current) {
          setAvisoPersistencia("El proyecto se guardó, pero quedaron claves locales pendientes de limpieza.");
        } else {
          setAvisoPersistencia(null);
        }
      } catch (errorPersistencia) {
        setAvisoPersistencia(
          `El proyecto sigue disponible en esta sesión, pero no se pudo guardar (${nombreErrorPersistencia(errorPersistencia)}). No cierres la pestaña hasta resolverlo.`
        );
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [programa, vinculoMarcoId, mensajesMeso, sugerenciasMeso, intencionMeso, seccionActivaMeso, crudoMeso, hidratado, moduloActivo]);

  /* -------- configuración del asistente -------- */
  useEffect(() => {
    let vivo = true;
    fetch("/api/salud")
      .then((r) => r.json() as Promise<Salud>)
      .then((d) => vivo && setSalud(d))
      .catch(
        () =>
          vivo &&
          setSalud({
            conexion: "red",
            ia: false,
            modelo: "?",
            mensaje: "No se pudo comprobar la configuración del asistente."
          })
      );
    return () => {
      vivo = false;
    };
  }, []);

  /* -------- autoscroll -------- */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, enviando]);

  /* -------- abortar al desmontar -------- */
  useEffect(() => () => abortRef.current?.abort(), []);

  /* -------- edición del microcurrículo -------- */
  function editarMicro(siguiente: Microcurriculo) {
    setMicro(siguiente);
  }

  /* -------- edición del marco institucional -------- */
  function editarMarco(siguiente: { marco: MarcoEducativoInstitucional; fuentes: FuenteCurricular[] }) {
    setMarco(siguiente.marco);
    setFuentes(siguiente.fuentes);
  }

  /* -------- edición del programa académico -------- */
  function editarPrograma(siguiente: { programa: ProgramaAcademico; vinculoMarcoId: string | null }) {
    setPrograma(siguiente.programa);
    setVinculoMarcoId(siguiente.vinculoMarcoId);
  }

  function vistaMicroActual(): VistaMicroPersistible {
    return {
      microcurriculo: microRef.current,
      mensajes,
      sugerencias,
      intencion,
      seccionActiva,
      crudo: crudoUltimo
    };
  }

  function vistaMacroActual(): VistaMacroPersistible {
    return {
      marco: marcoRef.current,
      fuentes,
      mensajes: mensajesMacro,
      sugerencias: sugerenciasMacro,
      intencion: intencionMacro,
      seccionActiva: seccionActivaMacro,
      crudo: crudoMacro
    };
  }

  function vistaMesoActual(): VistaMesoPersistible {
    return {
      programa: programaRef.current,
      vinculoMarcoId,
      mensajes: mensajesMeso,
      sugerencias: sugerenciasMeso,
      intencion: intencionMeso,
      seccionActiva: seccionActivaMeso,
      crudo: crudoMeso
    };
  }

  /** Recarga los estados visibles del programa desde el agregado. */
  function recargarMeso(estado: EstadoGuardadoV3) {
    const r = leerVistaMesoV3(estado);
    if (!r.ok) throw new Error("la vista del programa no está disponible");
    setPrograma(r.vista.programa);
    setVinculoMarcoId(r.vista.vinculoMarcoId);
    setMensajesMeso(r.vista.mensajes);
    setSugerenciasMeso(r.vista.sugerencias.length ? r.vista.sugerencias : SUGERENCIAS_APERTURA_MESO);
    setIntencionMeso(r.vista.intencion);
    setSeccionActivaMeso(r.vista.seccionActiva);
    setCrudoMeso(r.vista.crudo);
    crudoMesoRef.current = r.vista.crudo;
  }

  /** Guarda el agregado y, si verifica, lo deja como fuente y refresca la vista. */
  function persistirProyecto(estado: EstadoGuardadoV3, exito: string) {
    const guardado = guardarEstadoV3(window.localStorage, estado);
    if (!guardado.ok) {
      setAvisoPersistencia(
        "El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
      );
      return;
    }
    estadoV3Ref.current = guardado.estado;
    recargarMeso(guardado.estado);
    setVersionProyecto((v) => v + 1);
    mostrarAviso(exito);
  }

  function vincularAsignaturaAlPrograma(asignaturaId: string) {
    const base = estadoV3Ref.current;
    const prog = programaRef.current;
    if (!base || !prog) return;
    const siguiente = vincularAsignaturaAPrograma(base, prog.id, asignaturaId);
    if (!siguiente) {
      setAvisoPersistencia("No pude vincular esa asignatura. No se cambió nada.");
      return;
    }
    persistirProyecto(siguiente, "Asignatura vinculada al programa.");
  }

  function desvincularAsignaturaDelPrograma(asignaturaId: string) {
    const base = estadoV3Ref.current;
    if (!base) return;
    const siguiente = desvincularAsignatura(base, asignaturaId);
    if (!siguiente) {
      setAvisoPersistencia("No pude desvincular esa asignatura. No se cambió nada.");
      return;
    }
    persistirProyecto(siguiente, "Asignatura desvinculada. La ficha se conserva.");
  }

  /**
   * Crea o quita la alineación de un borde (Macro→Meso o Meso→Micro) sin tocar
   * documentos ni conversaciones. La matriz se repinta sola con el cambio.
   */
  function alternarAlineacion(origen: NodoCurricular, destino: NodoCurricular) {
    const base = estadoV3Ref.current;
    if (!base || scopeV3NoSoportadoRef.current) return;
    const siguiente = existeAlineacion(base.proyecto, origen, destino)
      ? quitarAlineacion(base, origen, destino)
      : definirAlineacion(base, origen, destino);
    if (!siguiente) {
      setAvisoPersistencia("No pude actualizar la alineación. No se cambió nada.");
      return;
    }
    const guardado = guardarEstadoV3(window.localStorage, siguiente);
    if (!guardado.ok) {
      setAvisoPersistencia(
        "La alineación cambió en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
      );
      return;
    }
    estadoV3Ref.current = guardado.estado;
    recargarMeso(guardado.estado);
    setVersionProyecto((v) => v + 1);
  }

  function idProyectoActual(): string {
    if (!idProyectoNuevoRef.current) {
      idProyectoNuevoRef.current = `proyecto_${folioNuevo()}`;
    }
    return idProyectoNuevoRef.current;
  }

  /**
   * Guarda la vista del módulo visible en el agregado en memoria, sin debounce
   * y sin escribir al almacén. Devuelve el agregado actualizado o null si aún
   * no hay proyecto. Nunca muta documentos ni conversaciones hermanas.
   */
  function guardarVistaActual(): EstadoGuardadoV3 | null {
    const base = estadoV3Ref.current;
    if (!base) return null;
    if (moduloActivoRef.current === "micro") {
      const vista = vistaMicroActual();
      if (vista.microcurriculo === null && vista.mensajes.length === 0) return base;
      const siguiente = aplicarVistaMicroV3(base, vista, idProyectoActual());
      estadoV3Ref.current = siguiente;
      return siguiente;
    }
    if (moduloActivoRef.current === "macro") {
      const vista = vistaMacroActual();
      if (vista.marco === null && vista.mensajes.length === 0) return base;
      const siguiente = aplicarVistaMacroV3(base, vista, idProyectoActual());
      estadoV3Ref.current = siguiente;
      return siguiente;
    }
    const vista = vistaMesoActual();
    if (vista.programa === null && vista.mensajes.length === 0) return base;
    const siguiente = aplicarVistaMesoV3(base, vista, idProyectoActual());
    estadoV3Ref.current = siguiente;
    return siguiente;
  }

  /** Carga en los estados visibles la vista Macro de la selección dada. */
  function mostrarVistaMacro(base: EstadoGuardadoV3) {
    const r = leerVistaMacroV3(base);
    if (!r.ok) throw new Error("la vista del marco no está disponible");
    setMarco(r.vista.marco);
    setFuentes(r.vista.fuentes);
    setMensajesMacro(r.vista.mensajes);
    setSugerenciasMacro(r.vista.sugerencias.length ? r.vista.sugerencias : SUGERENCIAS_APERTURA_MACRO);
    setIntencionMacro(r.vista.intencion);
    setSeccionActivaMacro(r.vista.seccionActiva);
    setCrudoMacro(r.vista.crudo);
    crudoMacroRef.current = r.vista.crudo;
  }

  /** Carga en los estados visibles la vista Micro de la selección dada. */
  function mostrarVistaMicro(base: EstadoGuardadoV3) {
    const r = leerVistaMicroV3(base);
    if (!r.ok) throw new Error("la vista del microcurrículo no está disponible");
    setMicro(r.vista.microcurriculo);
    setMensajes(r.vista.mensajes);
    setSugerencias(r.vista.sugerencias);
    setIntencion(r.vista.intencion);
    setSeccionActiva(esSeccionMicro(r.vista.seccionActiva) ? r.vista.seccionActiva : null);
    setCrudoUltimo(r.vista.crudo);
    crudoRef.current = r.vista.crudo;
  }

  function existeDocumento(base: EstadoGuardadoV3, modulo: ModuloActivo, id: string): boolean {
    if (modulo === "micro") return base.proyecto.asignaturas.some((a) => a.id === id);
    if (modulo === "macro") return base.proyecto.marcos.some((m) => m.id === id);
    return base.proyecto.programas.some((p) => p.id === id);
  }

  /**
   * Abre un documento existente (o el lienzo con id null) sin borrar nada.
   * Para Micro, el lienzo es la conversación de inicio: nunca se usa una
   * selección "micro:null" porque esa lista no es una ficha legible.
   */
  function abrirDocumento(modulo: ModuloActivo, id: string | null) {
    if (enviando) return;
    abortRef.current?.abort();
    try {
      const base = guardarVistaActual() ?? estadoV3Ref.current;
      if (!base) {
        if (modulo !== moduloActivoRef.current) setModuloActivo(modulo);
        return;
      }
      if (id !== null && !existeDocumento(base, modulo, id)) {
        throw new Error("ese documento ya no existe en el proyecto");
      }
      const seleccion =
        modulo === "micro"
          ? id === null
            ? { modulo: "inicio" as const, documentoId: null }
            : { modulo: "micro" as const, documentoId: id }
          : { modulo, documentoId: id };
      const conSeleccion: EstadoGuardadoV3 = { ...base, seleccion };
      estadoV3Ref.current = conSeleccion;
      docIdPorModuloRef.current[modulo] = id;

      if (modulo === "macro") mostrarVistaMacro(conSeleccion);
      else if (modulo === "meso") recargarMeso(conSeleccion);
      else mostrarVistaMicro(conSeleccion);
      if (modulo !== moduloActivoRef.current) setModuloActivo(modulo);

      const guardado = guardarEstadoV3(window.localStorage, conSeleccion);
      if (!guardado.ok) {
        setAvisoPersistencia(
          "El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
        );
      } else {
        estadoV3Ref.current = guardado.estado;
      }
      setVersionProyecto((v) => v + 1);
    } catch (errorCambio) {
      setAvisoPersistencia(
        `No pude abrir ese documento (${nombreErrorPersistencia(errorCambio)}). No se perdió nada: seguís donde estabas.`
      );
    }
  }

  /**
   * Empieza un documento nuevo del módulo indicado sin descartar el proyecto.
   * Guarda primero lo visible; el documento actual queda en la lista y el chat
   * vuelve al lienzo (inicio para Micro) para conversar el nuevo desde cero.
   * "Conversación nueva" sigue existiendo para el borrado total y explícito.
   */
  function nuevoDocumento(modulo: ModuloActivo) {
    if (enviando || scopeV3NoSoportadoRef.current) return;
    abortRef.current?.abort();
    try {
      const base = guardarVistaActual() ?? estadoV3Ref.current;
      if (!base) {
        if (modulo === "macro") {
          const vacia = vistaMacroVacia();
          setMarco(vacia.marco);
          setMensajesMacro(vacia.mensajes);
          setSugerenciasMacro(SUGERENCIAS_APERTURA_MACRO);
          setIntencionMacro(vacia.intencion);
          setSeccionActivaMacro(vacia.seccionActiva);
          setCrudoMacro(vacia.crudo);
          crudoMacroRef.current = vacia.crudo;
        } else if (modulo === "meso") {
          const vacia = vistaMesoVacia();
          setPrograma(vacia.programa);
          setVinculoMarcoId(vacia.vinculoMarcoId);
          setMensajesMeso(vacia.mensajes);
          setSugerenciasMeso(SUGERENCIAS_APERTURA_MESO);
          setIntencionMeso(vacia.intencion);
          setSeccionActivaMeso(vacia.seccionActiva);
          setCrudoMeso(vacia.crudo);
          crudoMesoRef.current = vacia.crudo;
        } else {
          const vacia = vistaMicroVacia();
          setMicro(vacia.microcurriculo);
          setMensajes(vacia.mensajes);
          setSugerencias(SUGERENCIAS_APERTURA);
          setIntencion(vacia.intencion);
          setSeccionActiva(null);
          setCrudoUltimo(vacia.crudo);
          crudoRef.current = vacia.crudo;
        }
        if (modulo !== moduloActivoRef.current) setModuloActivo(modulo);
        return;
      }
      const seleccion =
        modulo === "micro"
          ? { modulo: "inicio" as const, documentoId: null }
          : { modulo, documentoId: null };
      const conSeleccion: EstadoGuardadoV3 = { ...base, seleccion };
      estadoV3Ref.current = conSeleccion;
      docIdPorModuloRef.current[modulo] = null;

      if (modulo === "macro") mostrarVistaMacro(conSeleccion);
      else if (modulo === "meso") recargarMeso(conSeleccion);
      else mostrarVistaMicro(conSeleccion);
      if (modulo !== moduloActivoRef.current) setModuloActivo(modulo);

      const guardado = guardarEstadoV3(window.localStorage, conSeleccion);
      if (!guardado.ok) {
        setAvisoPersistencia(
          "El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
        );
      } else {
        estadoV3Ref.current = guardado.estado;
      }
      setVersionProyecto((v) => v + 1);
      mostrarAviso(
        modulo === "micro"
          ? "Listo para una nueva asignatura: lo anterior quedó guardado en el proyecto."
          : modulo === "meso"
            ? "Listo para un nuevo programa: lo anterior quedó guardado en el proyecto."
            : "Listo para un nuevo marco: lo anterior quedó guardado en el proyecto."
      );
    } catch (errorNuevo) {
      setAvisoPersistencia(
        `No pude empezar un documento nuevo (${nombreErrorPersistencia(errorNuevo)}). No se perdió nada: seguís donde estabas.`
      );
    }
  }

  /**
   * Cambia de módulo guardando primero lo del módulo actual (sin debounce) y
   * cargando después la vista del destino desde el agregado. Nunca mezcla
   * conversaciones ni documentos entre módulos.
   */
  /**
   * Núcleo del cambio de módulo sin guardas: guarda la vista actual, apunta
   * la selección al destino (recordado, primero o lienzo) y carga su vista.
   * Lo usan tanto el cambio explícito como el enrutador conversacional.
   */
  function ejecutarCambioModulo(destino: ModuloActivo) {
    destinoInicioRef.current = null;
    try {
      let base = guardarVistaActual() ?? estadoV3Ref.current;
      if (base) {
        const sel = base.seleccion;
        if (sel.modulo === "micro" || sel.modulo === "macro" || sel.modulo === "meso") {
          docIdPorModuloRef.current[sel.modulo] = sel.documentoId;
        }
        // Apunta la selección al destino: documento recordado, primero que
        // exista, o lienzo. Se verifica que el recordado siga existiendo.
        // Para Micro el lienzo es la conversación de inicio: una selección
        // "micro:null" no es una ficha legible y rompería la lectura.
        const recordado = docIdPorModuloRef.current[destino];
        const primero =
          destino === "micro"
            ? base.proyecto.asignaturas[0]?.id
            : destino === "macro"
              ? base.proyecto.marcos[0]?.id
              : base.proyecto.programas[0]?.id;
        const candidato = recordado ?? primero ?? null;
        const existe =
          candidato === null || existeDocumento(base, destino, candidato);
        const elegido = existe ? candidato : null;
        const conSeleccion: EstadoGuardadoV3 =
          destino === "micro" && elegido === null
            ? { ...base, seleccion: { modulo: "inicio", documentoId: null } }
            : { ...base, seleccion: { modulo: destino, documentoId: elegido } };
        base = conSeleccion;
        estadoV3Ref.current = base;

        if (destino === "macro") {
          mostrarVistaMacro(base);
        } else if (destino === "meso") {
          recargarMeso(base);
        } else {
          mostrarVistaMicro(base);
        }
        docIdPorModuloRef.current[destino] = destino === "micro" && elegido === null ? null : elegido;
        setModuloActivo(destino);

        const guardado = guardarEstadoV3(window.localStorage, base);
        if (!guardado.ok) {
          setAvisoPersistencia(
            "El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
          );
        } else {
          estadoV3Ref.current = guardado.estado;
        }
        setVersionProyecto((v) => v + 1);
      } else {
        // Sin proyecto todavía: el cambio es solo de vista.
        setModuloActivo(destino);
      }
    } catch (errorCambio) {
      setAvisoPersistencia(
        `No pude cambiar de módulo (${nombreErrorPersistencia(errorCambio)}). No se perdió nada: seguís donde estabas.`
      );
    }
  }

  function nuevo() {
    // Nunca borra un proyecto en un scope que la página no sabe abrir.
    if (scopeV3NoSoportadoRef.current) return;
    destinoInicioRef.current = null;

    if (hayAlgoQueBorrar) {
      const detalleRecuperacion = datosNoRecuperables
        ? " También se eliminarán las claves guardadas que no se pudieron leer y sus respaldos."
        : "";
      const ok = window.confirm(
        `¿Descartar este proyecto y empezar de cero?\n\nSe borrarán de este navegador las conversaciones, el microcurrículo, el marco, el programa y los respaldos del proyecto. No se puede deshacer.${detalleRecuperacion}`
      );
      if (!ok) return;
    }

    abortRef.current?.abort();
    const vistaVacia = vistaMicroVacia();
    setMicro(vistaVacia.microcurriculo);
    setMensajes(vistaVacia.mensajes);
    setSugerencias(SUGERENCIAS_APERTURA);
    setIntencion(vistaVacia.intencion);
    setSeccionActiva(null);
    setCrudoUltimo(vistaVacia.crudo);
    crudoRef.current = vistaVacia.crudo;
    const vistaMacroVaciaNueva = vistaMacroVacia();
    setMarco(vistaMacroVaciaNueva.marco);
    setFuentes(vistaMacroVaciaNueva.fuentes);
    setMensajesMacro(vistaMacroVaciaNueva.mensajes);
    setSugerenciasMacro(SUGERENCIAS_APERTURA_MACRO);
    setIntencionMacro(vistaMacroVaciaNueva.intencion);
    setSeccionActivaMacro(vistaMacroVaciaNueva.seccionActiva);
    setCrudoMacro(vistaMacroVaciaNueva.crudo);
    crudoMacroRef.current = vistaMacroVaciaNueva.crudo;
    const vistaMesoVaciaNueva = vistaMesoVacia();
    setPrograma(vistaMesoVaciaNueva.programa);
    setVinculoMarcoId(vistaMesoVaciaNueva.vinculoMarcoId);
    setMensajesMeso(vistaMesoVaciaNueva.mensajes);
    setSugerenciasMeso(SUGERENCIAS_APERTURA_MESO);
    setIntencionMeso(vistaMesoVaciaNueva.intencion);
    setSeccionActivaMeso(vistaMesoVaciaNueva.seccionActiva);
    setCrudoMeso(vistaMesoVaciaNueva.crudo);
    crudoMesoRef.current = vistaMesoVaciaNueva.crudo;
    setModuloActivo("micro");
    setError(null);
    setPildoraBorrador(false);
    setChatVisible(true);

    estadoV3Ref.current = null;
    idProyectoNuevoRef.current = null;
    legadosPendientesRef.current = false;
    docIdPorModuloRef.current = { micro: null, macro: null, meso: null };
    scopeV3NoSoportadoRef.current = false;
    setScopeV3NoSoportado(false);

    const clavesFallidas: string[] = [];
    for (const clave of CLAVES_PERSISTENCIA_PROYECTO) {
      try {
        window.localStorage.removeItem(clave);
        if (window.localStorage.getItem(clave) !== null) clavesFallidas.push(clave);
      } catch {
        clavesFallidas.push(clave);
      }
    }

    if (clavesFallidas.length) {
      bloqueoPersistenciaRef.current = true;
      setPersistenciaBloqueada(true);
      setDatosNoRecuperables(true);
      setAvisoPersistencia(
        "No pude confirmar la limpieza de todas las claves del proyecto. No guardaré encima de los restos; puedes volver a intentar «Conversación nueva»."
      );
      return;
    }

    bloqueoPersistenciaRef.current = false;
    setPersistenciaBloqueada(false);
    setDatosNoRecuperables(false);
    setAvisoPersistencia(null);
    mostrarAviso("Empezamos una conversación nueva. Lo anterior se descartó de este navegador.");
  }

  /**
   * El portapapeles sigue entregando Markdown: es lo útil para pegar en un
   * chat, un correo o un editor. La descarga, en cambio, es PDF de texto plano.
   */
  async function copiar() {
    if (!micro) return;
    try {
      await navigator.clipboard.writeText(microcurriculoAMarkdown(micro));
      mostrarAviso("Microcurrículo copiado como Markdown, listo para pegar.");
    } catch {
      mostrarAviso("El navegador no permitió copiar al portapapeles.");
    }
  }

  /** Descarga el microcurrículo como PDF de texto plano, sin estilos. */
  function descargarPdf() {
    if (!micro) return;
    try {
      const bytes = textoAPdf(microcurriculoATexto(micro));
      // Se copia el buffer a un ArrayBuffer propio: Blob no acepta el
      // ArrayBufferLike que exponen los tipos nuevos de Uint8Array.
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo(micro.folio, "pdf");
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarAviso("No se pudo generar el PDF. Prueba con «Copiar» y pégalo en un documento.");
    }
  }

  function descargarTextoPdf(texto: string, base: string, etiqueta: string) {
    try {
      const bytes = textoAPdf(texto);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo(base, "pdf");
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarAviso(`No se pudo generar el PDF del ${etiqueta}. Prueba con «Copiar» y pégalo en un documento.`);
    }
  }

  /** Contexto de trazabilidad para exportar el programa activo. */
  function contextoPrograma(): ContextoProgramaTexto | null {
    if (!programa || !proyectoEnVista) return null;
    const principiosPorId = new Map((marcoVinculado?.principios ?? []).map((a) => [a.id, a.texto] as const));
    const rasPorId = new Map(
      rasAsignaturas.map((r) => [r.raId, `${r.texto} (${r.asignaturaNombre} · U${r.unidad})`] as const)
    );
    const principiosPorResultado: Record<string, string[]> = {};
    const rasPorResultado: Record<string, string[]> = {};
    for (const al of alineacionesEnVista) {
      if (al.origen.tipo === "principio_marco" && al.destino.tipo === "resultado_programa") {
        const t = principiosPorId.get(al.origen.id);
        if (t) (principiosPorResultado[al.destino.id] ??= []).push(t);
      }
      if (al.origen.tipo === "resultado_programa" && al.destino.tipo === "ra_micro") {
        const t = rasPorId.get(al.destino.id);
        if (t) (rasPorResultado[al.origen.id] ??= []).push(t);
      }
    }
    return {
      marcoNombre: marcoVinculado?.nombre ?? null,
      principiosPorResultado,
      rasPorResultado,
      asignaturas: microsDelPrograma.map(
        (a) => a.microcurriculo.ident.asignatura.trim() || "Asignatura sin nombre"
      ),
      fuentes: proyectoEnVista.fuentesCurriculares
    };
  }

  async function copiarMarco() {
    if (!marco) return;
    try {
      await navigator.clipboard.writeText(marcoAMarkdown(marco, fuentes));
      mostrarAviso("Marco copiado como Markdown, listo para pegar.");
    } catch {
      mostrarAviso("El navegador no permitió copiar al portapapeles.");
    }
  }

  function descargarMarcoPdf() {
    if (!marco) return;
    descargarTextoPdf(marcoATexto(marco, fuentes), marco.nombre || "marco", "marco");
  }

  async function copiarPrograma() {
    if (!programa) return;
    const ctx = contextoPrograma();
    if (!ctx) return;
    try {
      await navigator.clipboard.writeText(programaAMarkdown(programa, ctx));
      mostrarAviso("Programa copiado como Markdown, listo para pegar.");
    } catch {
      mostrarAviso("El navegador no permitió copiar al portapapeles.");
    }
  }

  /** Expediente conjunto: todo el proyecto en un solo documento. */
  async function copiarExpediente() {
    if (!proyectoEnVista) return;
    try {
      await navigator.clipboard.writeText(expedienteAMarkdown(proyectoEnVista));
      mostrarAviso("Expediente copiado como Markdown, listo para pegar.");
    } catch {
      mostrarAviso("El navegador no permitió copiar al portapapeles.");
    }
  }

  function descargarExpedientePdf() {
    if (!proyectoEnVista) return;
    const nombre = proyectoEnVista.nombre || "expediente";
    descargarTextoPdf(expedienteATexto(proyectoEnVista), nombre, "expediente");
  }

  function descargarProgramaPdf() {
    if (!programa) return;
    const ctx = contextoPrograma();
    if (!ctx) return;
    descargarTextoPdf(programaATexto(programa, ctx), programa.nombre || "programa", "programa");
  }

  /* -------- el núcleo: conversar e iterar -------- */
  const enviar = useCallback(
    async (texto: string, opciones?: { reintento?: boolean }) => {
      const t = texto.trim();
      if (!t || enviando || !hidratado) return;
      if (scopeV3NoSoportadoRef.current) {
        setError("Este proyecto está en un módulo que esta página todavía no puede abrir. Sus datos permanecen intactos.");
        return;
      }
      if (saludRef.current && !saludRef.current.ia && saludRef.current.conexion === "sin_clave") {
        setError(saludRef.current.mensaje);
        return;
      }

      ultimaPeticion.current = t;
      setError(null);
      setEnviando(true);

      const idUsuario = `u${Date.now()}`;
      const idIA = `a${Date.now()}-b`;
      setMensajes((m) => [...m, { id: idUsuario, role: "usuario", texto: t }, { id: idIA, role: "asistente", texto: "" }]);

      const control = new AbortController();
      abortRef.current = control;

      /**
       * La ficha viaja SIEMPRE que exista. Antes se omitía cuando no había
       * cambiado, para ahorrar tokens, y el modelo quedaba dependiendo de un
       * JSON enterrado en el historial: por eso a veces contestaba "¿qué
       * estrategias querés?" como si no supiera la asignatura. La ficha
       * explícita es la fuente de verdad, y el coste es asumible.
       */
      const enviarBorrador = microRef.current;

      const historia: { role: string; content: string }[] = [];
      if (crudoRef.current) historia.push({ role: "assistant", content: crudoRef.current });
      for (const m of mensajes.slice(-8)) {
        historia.push({ role: m.role === "usuario" ? "user" : "assistant", content: m.texto });
      }

      let bruto = "";
      let meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null } = {};
      let respuestaLlego = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: control.signal,
          body: JSON.stringify({ mensaje: t, microcurriculo: enviarBorrador, historia, fuentesPdf: fuentesPdfParaEnvio(t) })
        });
        respuestaLlego = true;

        // Un error llega como JSON con estado HTTP, nunca como stream.
        const tipo = res.headers.get("content-type") ?? "";
        if (!res.ok || !tipo.includes("text/event-stream")) {
          // Un 404 aquí significa que la petición no alcanzó el route handler:
          // o el servidor que responde no es el de esta carpeta, o la pestaña
          // quedó con un bundle viejo tras una recompilación.
          if (res.status === 404) {
            throw new Error(
              `El servidor respondió 404 en ${res.url || "/api/chat"}. ` +
                "La petición no llegó al servidor de la app: comprueba que `npm run dev` esté corriendo en el puerto de esta pestaña y recarga con Ctrl+Shift+R."
            );
          }
          let motivo = `El asistente respondió ${res.status}.`;
          try {
            const j = (await res.json()) as unknown;
            const detalle = textoLegible(j);
            if (detalle) motivo = detalle;
          } catch {
            /* respuesta sin JSON: nos quedamos con el estado */
          }
          throw new Error(motivo);
        }

        const lector = res.body!.getReader();
        const decodificador = new TextDecoder();
        let buffer = "";
        /**
         * ¿El servidor cerró el stream como es debido? Debe mandar `meta` con
         * `fin` antes del [DONE]. Sin esta comprobación, una conexión cortada
         * se daba por buena y el usuario veía «Respuesta interrumpida» sin
         * causa.
         */
        let cerradoPorServidor = false;

        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          buffer += decodificador.decode(value, { stream: true });

          let corte: number;
          while ((corte = buffer.indexOf("\n\n")) !== -1) {
            const evento = buffer.slice(0, corte);
            buffer = buffer.slice(corte + 2);

            for (const linea of evento.split("\n")) {
              if (!linea.startsWith("data:")) continue;
              const carga = linea.slice(5).trim();
              if (!carga || carga === "[DONE]") continue;
              try {
                const trozo = JSON.parse(carga) as { t?: string; meta?: typeof meta };
                if (trozo.t) bruto += trozo.t;
                if (trozo.meta) {
                  meta = trozo.meta;
                  if (trozo.meta.fin) cerradoPorServidor = true;
                }
              } catch {
                /* un trozo ilegible no invalida lo ya recibido */
              }
            }

            // El chat muestra el texto legible del JSON que aún se está formando.
            const parcial = extraerMensajeParcial(bruto);
            if (parcial) {
              setMensajes((m) => m.map((x) => (x.id === idIA ? { ...x, texto: parcial } : x)));
            }
          }
        }

        // Una conexión cortada a mitad no debe pasar por respuesta válida.
        if (!cerradoPorServidor) {
          throw new Error(
            "La conexión se cortó antes de que el asistente terminara de responder. " +
              "Suele pasar si el servidor se reinició mientras se generaba. Reintenta."
          );
        }

        /**
         * El proveedor a veces cierra un turno con finish_reason normal y
         * CERO contenido. No es culpa de la petición, y reintentar a mano con
         * el mismo texto suele funcionar; así que se reintenta solo, una vez,
         * sin que el docente note nada más que una espera algo más larga.
         */
        if (!bruto.trim() && !meta.error) {
          if (!opciones?.reintento) {
            reintentarVacio.current = true;
            return;
          }
          throw new Error(
            "El asistente devolvió un turno vacío dos veces seguidas. Vuelve a intentarlo: si se repite, reformula la petición o continúa desde la ficha."
          );
        }

        const resultado = parsearRespuesta(bruto, meta);
        if (!resultado.ok) {
          // Si el proveedor reportó un error dentro del stream, es la causa
          // real y hay que mostrarla antes que cualquier otra explicación.
          const causaReal = meta.error ? ` El proveedor reportó: ${meta.error}` : "";
          const motivo = resultado.motivo + causaReal;
          ultimoErrorRef.current = { motivo, fin: meta.fin ?? null, bruto };
          throw new Error(motivo);
        }
        ultimoErrorRef.current = null;

        setMensajes((m) => m.map((x) => (x.id === idIA ? { ...x, texto: resultado.mensaje } : x)));
        setSugerencias(resultado.sugerencias);
        setIntencion(resultado.intencion);
        setSeccionActiva(resultado.seccionActiva);
        setCrudoUltimo(bruto);
        crudoRef.current = bruto;
        setAdjuntos([]);

        // SOLO con borrador se toca la ficha. Un turno conversacional no
        // puede borrar lo que el docente ya tenía.
        if (resultado.borrador) {
          const fusionado = mergeMicrocurriculo(microRef.current, {
            ...resultado.microcurriculo,
            folio: microRef.current?.folio ?? folioNuevo()
          });
          const problemas = validarMicrocurriculo(fusionado);
          const primero = microRef.current === null;

          setMicro(fusionado);
          if (primero) {
            setPildoraBorrador(true);
            setChatVisible(true);
          }
          if (problemas.length) mostrarAviso(problemas.join(" "));
        }
      } catch (e) {
        const abortado = e instanceof DOMException && e.name === "AbortError";
        /**
         * Distinguir "no llegó respuesta" de "llegó vacía" importa: lo primero
         * es un fallo de red o del servidor, y decir "la IA devolvió una
         * respuesta vacía" en ese caso manda a buscar el problema al lugar
         * equivocado.
         */
        const falloDeRed = !abortado && !respuestaLlego;
        const motivo = abortado
          ? "Detuviste la respuesta. El microcurrículo quedó como estaba."
          : falloDeRed
            ? "No se pudo contactar al servidor de la app. Comprueba que `npm run dev` siga corriendo y recarga la página."
            : e instanceof Error
              ? e.message
              : "Ocurrió un error inesperado.";

        setMensajes((m) => m.map((x) => (x.id === idIA ? { ...x, texto: x.texto || motivo, incompleto: true } : x)));
        if (!abortado) setError(motivo);
      } finally {
        setEnviando(false);
        abortRef.current = null;

        /**
         * El reintento silencioso se dispara aquí, no dentro del try: así la
         * llamada en curso ya limpió su controlador y no se pisa el del
         * reintento. También se quita la burbuja vacía para que el docente no
         * vea un turno en blanco.
         */
        if (reintentarVacio.current) {
          reintentarVacio.current = false;
          setMensajes((m) => m.filter((x) => x.id !== idIA));
          window.setTimeout(() => void enviar(t, { reintento: true }), 0);
          return;
        }
      }
    },
    [enviando, mensajes, mostrarAviso, hidratado]
  );

  /* -------- el núcleo Macro: conversar e iterar sobre el marco -------- */
  const enviarMacro = useCallback(
    async (texto: string, opciones?: { reintento?: boolean }) => {
      const t = texto.trim();
      if (!t || enviando) return;
      if (saludRef.current && !saludRef.current.ia && saludRef.current.conexion === "sin_clave") {
        setError(saludRef.current.mensaje);
        return;
      }

      ultimaPeticion.current = t;
      setError(null);
      setEnviando(true);

      const idUsuario = `u${Date.now()}`;
      const idIA = `a${Date.now()}-b`;
      setMensajesMacro((m) => [...m, { id: idUsuario, role: "usuario", texto: t }, { id: idIA, role: "asistente", texto: "" }]);

      const control = new AbortController();
      abortRef.current = control;

      /**
       * El marco viaja SIEMPRE que exista: es la fuente de verdad del nivel,
       * igual que la ficha lo es para el microcurrículo.
       */
      const marcoEnviar = marcoRef.current;

      const historia: { role: string; content: string }[] = [];
      if (crudoMacroRef.current) historia.push({ role: "assistant", content: crudoMacroRef.current });
      for (const m of mensajesMacro.slice(-8)) {
        historia.push({ role: m.role === "usuario" ? "user" : "assistant", content: m.texto });
      }

      let bruto = "";
      let meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null } = {};
      let respuestaLlego = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: control.signal,
          body: JSON.stringify({
            mensaje: t,
            modulo: "macro",
            marco: marcoEnviar,
            fuentes: fuentesRef.current.map((f) => ({ id: f.id, titulo: f.titulo })),
            historia,
            fuentesPdf: fuentesPdfParaEnvio(t)
          })
        });
        respuestaLlego = true;

        const tipo = res.headers.get("content-type") ?? "";
        if (!res.ok || !tipo.includes("text/event-stream")) {
          if (res.status === 404) {
            throw new Error(
              `El servidor respondió 404 en ${res.url || "/api/chat"}. ` +
                "La petición no llegó al servidor de la app: comprueba que `npm run dev` esté corriendo en el puerto de esta pestaña y recarga con Ctrl+Shift+R."
            );
          }
          let motivo = `El asistente respondió ${res.status}.`;
          try {
            const j = (await res.json()) as unknown;
            const detalle = textoLegible(j);
            if (detalle) motivo = detalle;
          } catch {
            /* respuesta sin JSON: nos quedamos con el estado */
          }
          throw new Error(motivo);
        }

        const lector = res.body!.getReader();
        const decodificador = new TextDecoder();
        let buffer = "";
        let cerradoPorServidor = false;

        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          buffer += decodificador.decode(value, { stream: true });

          let corte: number;
          while ((corte = buffer.indexOf("\n\n")) !== -1) {
            const evento = buffer.slice(0, corte);
            buffer = buffer.slice(corte + 2);

            for (const linea of evento.split("\n")) {
              if (!linea.startsWith("data:")) continue;
              const carga = linea.slice(5).trim();
              if (!carga || carga === "[DONE]") continue;
              try {
                const trozo = JSON.parse(carga) as { t?: string; meta?: typeof meta };
                if (trozo.t) bruto += trozo.t;
                if (trozo.meta) {
                  meta = trozo.meta;
                  if (trozo.meta.fin) cerradoPorServidor = true;
                }
              } catch {
                /* un trozo ilegible no invalida lo ya recibido */
              }
            }

            const parcial = extraerMensajeParcial(bruto);
            if (parcial) {
              setMensajesMacro((m) => m.map((x) => (x.id === idIA ? { ...x, texto: parcial } : x)));
            }
          }
        }

        if (!cerradoPorServidor) {
          throw new Error(
            "La conexión se cortó antes de que el asistente terminara de responder. " +
              "Suele pasar si el servidor se reinició mientras se generaba. Reintenta."
          );
        }

        if (!bruto.trim() && !meta.error) {
          if (!opciones?.reintento) {
            reintentarVacio.current = true;
            return;
          }
          throw new Error(
            "El asistente devolvió un turno vacío dos veces seguidas. Vuelve a intentarlo: si se repite, reformula la petición o continúa desde la ficha."
          );
        }

        const resultado = parsearRespuestaMacro(bruto, marcoRef.current, meta);
        if (!resultado.ok) {
          const causaReal = meta.error ? ` El proveedor reportó: ${meta.error}` : "";
          const motivo = resultado.motivo + causaReal;
          ultimoErrorRef.current = { motivo, fin: meta.fin ?? null, bruto };
          throw new Error(motivo);
        }
        ultimoErrorRef.current = null;

        setMensajesMacro((m) => m.map((x) => (x.id === idIA ? { ...x, texto: resultado.mensaje } : x)));
        setSugerenciasMacro(resultado.sugerencias);
        setIntencionMacro(resultado.intencion);
        setSeccionActivaMacro(resultado.seccionActiva);
        setCrudoMacro(bruto);
        crudoMacroRef.current = bruto;
        setAdjuntos([]);

        // SOLO con borrador se toca el documento. Un turno conversacional no
        // puede borrar lo que el docente ya tenía.
        if (resultado.borrador) {
          const fusionado = fusionarMarco(marcoRef.current, resultado.marco);
          const problemas = validarMarco(fusionado);
          const primero = marcoRef.current === null;

          setMarco(fusionado);
          // Las fuentes solo se dan de alta cuando el docente las pidió
          // explícitamente: una mención casual no autoriza a crearlas. El
          // formulario de la sección Fuentes sigue disponible para el alta
          // manual.
          if (pideRegistrarFuente(t) && resultado.fuentes.length > 0) {
            const combinadas = agregarFuentesProyecto(fuentesRef.current, resultado.fuentes);
            if (combinadas.length > fuentesRef.current.length) {
              setFuentes(combinadas);
            }
          } else if (pideRegistrarFuente(t)) {
            mostrarAviso(
              "No pude registrar la fuente desde el chat porque no trajo datos suficientes. Usa «Añadir fuente» en la sección Fuentes."
            );
          }
          if (primero) {
            setPildoraBorrador(true);
            setChatVisible(true);
          }
          if (problemas.length) mostrarAviso(problemas.join(" "));
        }
      } catch (e) {
        const abortado = e instanceof DOMException && e.name === "AbortError";
        const falloDeRed = !abortado && !respuestaLlego;
        const motivo = abortado
          ? "Detuviste la respuesta. El marco quedó como estaba."
          : falloDeRed
            ? "No se pudo contactar al servidor de la app. Comprueba que `npm run dev` siga corriendo y recarga la página."
            : e instanceof Error
              ? e.message
              : "Ocurrió un error inesperado.";

        setMensajesMacro((m) => m.map((x) => (x.id === idIA ? { ...x, texto: x.texto || motivo, incompleto: true } : x)));
        if (!abortado) setError(motivo);
      } finally {
        setEnviando(false);
        abortRef.current = null;

        if (reintentarVacio.current) {
          reintentarVacio.current = false;
          setMensajesMacro((m) => m.filter((x) => x.id !== idIA));
          window.setTimeout(() => void enviarMacro(t, { reintento: true }), 0);
          return;
        }
      }
    },
    [enviando, mensajesMacro, mostrarAviso, hidratado]
  );

  /* -------- el núcleo Meso: conversar e iterar sobre el programa -------- */
  const enviarMeso = useCallback(
    async (texto: string, opciones?: { reintento?: boolean }) => {
      const t = texto.trim();
      if (!t || enviando) return;
      if (saludRef.current && !saludRef.current.ia && saludRef.current.conexion === "sin_clave") {
        setError(saludRef.current.mensaje);
        return;
      }

      ultimaPeticion.current = t;
      setError(null);
      setEnviando(true);

      const idUsuario = `u${Date.now()}`;
      const idIA = `a${Date.now()}-b`;
      setMensajesMeso((m) => [...m, { id: idUsuario, role: "usuario", texto: t }, { id: idIA, role: "asistente", texto: "" }]);

      const control = new AbortController();
      abortRef.current = control;

      /** El programa viaja SIEMPRE que exista: es la fuente de verdad del nivel. */
      const programaEnviar = programaRef.current;
      /** Marcos disponibles para que el modelo cite el vínculo por id. */
      const marcosDisponibles =
        estadoV3Ref.current?.proyecto.marcos.map((m) => ({ id: m.id, nombre: m.nombre })) ?? [];

      const historia: { role: string; content: string }[] = [];
      if (crudoMesoRef.current) historia.push({ role: "assistant", content: crudoMesoRef.current });
      for (const m of mensajesMeso.slice(-8)) {
        historia.push({ role: m.role === "usuario" ? "user" : "assistant", content: m.texto });
      }

      let bruto = "";
      let meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null } = {};
      let respuestaLlego = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: control.signal,
          body: JSON.stringify({ mensaje: t, modulo: "meso", programa: programaEnviar, marcos: marcosDisponibles, historia, fuentesPdf: fuentesPdfParaEnvio(t) })
        });
        respuestaLlego = true;

        const tipo = res.headers.get("content-type") ?? "";
        if (!res.ok || !tipo.includes("text/event-stream")) {
          if (res.status === 404) {
            throw new Error(
              `El servidor respondió 404 en ${res.url || "/api/chat"}. ` +
                "La petición no llegó al servidor de la app: comprueba que `npm run dev` esté corriendo en el puerto de esta pestaña y recarga con Ctrl+Shift+R."
            );
          }
          let motivo = `El asistente respondió ${res.status}.`;
          try {
            const j = (await res.json()) as unknown;
            const detalle = textoLegible(j);
            if (detalle) motivo = detalle;
          } catch {
            /* respuesta sin JSON: nos quedamos con el estado */
          }
          throw new Error(motivo);
        }

        const lector = res.body!.getReader();
        const decodificador = new TextDecoder();
        let buffer = "";
        let cerradoPorServidor = false;

        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          buffer += decodificador.decode(value, { stream: true });

          let corte: number;
          while ((corte = buffer.indexOf("\n\n")) !== -1) {
            const evento = buffer.slice(0, corte);
            buffer = buffer.slice(corte + 2);

            for (const linea of evento.split("\n")) {
              if (!linea.startsWith("data:")) continue;
              const carga = linea.slice(5).trim();
              if (!carga || carga === "[DONE]") continue;
              try {
                const trozo = JSON.parse(carga) as { t?: string; meta?: typeof meta };
                if (trozo.t) bruto += trozo.t;
                if (trozo.meta) {
                  meta = trozo.meta;
                  if (trozo.meta.fin) cerradoPorServidor = true;
                }
              } catch {
                /* un trozo ilegible no invalida lo ya recibido */
              }
            }

            const parcial = extraerMensajeParcial(bruto);
            if (parcial) {
              setMensajesMeso((m) => m.map((x) => (x.id === idIA ? { ...x, texto: parcial } : x)));
            }
          }
        }

        if (!cerradoPorServidor) {
          throw new Error(
            "La conexión se cortó antes de que el asistente terminara de responder. " +
              "Suele pasar si el servidor se reinició mientras se generaba. Reintenta."
          );
        }

        if (!bruto.trim() && !meta.error) {
          if (!opciones?.reintento) {
            reintentarVacio.current = true;
            return;
          }
          throw new Error(
            "El asistente devolvió un turno vacío dos veces seguidas. Vuelve a intentarlo: si se repite, reformula la petición o continúa desde la ficha."
          );
        }

        const resultado = parsearRespuestaMeso(
          bruto,
          programaRef.current,
          marcosDisponibles.map((m) => m.id),
          meta
        );
        if (!resultado.ok) {
          const causaReal = meta.error ? ` El proveedor reportó: ${meta.error}` : "";
          const motivo = resultado.motivo + causaReal;
          ultimoErrorRef.current = { motivo, fin: meta.fin ?? null, bruto };
          throw new Error(motivo);
        }
        ultimoErrorRef.current = null;

        setMensajesMeso((m) => m.map((x) => (x.id === idIA ? { ...x, texto: resultado.mensaje } : x)));
        setSugerenciasMeso(resultado.sugerencias);
        setIntencionMeso(resultado.intencion);
        setSeccionActivaMeso(resultado.seccionActiva);
        setCrudoMeso(bruto);
        crudoMesoRef.current = bruto;
        setAdjuntos([]);

        // SOLO con borrador se toca el documento. Un turno conversacional no
        // puede borrar lo que el docente ya tenía.
        if (resultado.borrador) {
          const fusionado = fusionarPrograma(programaRef.current, resultado.programa);
          const problemas = validarPrograma(fusionado);
          const primero = programaRef.current === null;

          setPrograma(fusionado);
          // El vínculo solo cambia si el modelo cita un marco válido; un
          // borrador sin vínculo no borra el que el docente ya eligió.
          if (resultado.marcoPrincipalId !== null) setVinculoMarcoId(resultado.marcoPrincipalId);
          if (primero) {
            setPildoraBorrador(true);
            setChatVisible(true);
          }
          if (problemas.length) mostrarAviso(problemas.join(" "));
        }
      } catch (e) {
        const abortado = e instanceof DOMException && e.name === "AbortError";
        const falloDeRed = !abortado && !respuestaLlego;
        const motivo = abortado
          ? "Detuviste la respuesta. El programa quedó como estaba."
          : falloDeRed
            ? "No se pudo contactar al servidor de la app. Comprueba que `npm run dev` siga corriendo y recarga la página."
            : e instanceof Error
              ? e.message
              : "Ocurrió un error inesperado.";

        setMensajesMeso((m) => m.map((x) => (x.id === idIA ? { ...x, texto: x.texto || motivo, incompleto: true } : x)));
        if (!abortado) setError(motivo);
      } finally {
        setEnviando(false);
        abortRef.current = null;

        if (reintentarVacio.current) {
          reintentarVacio.current = false;
          setMensajesMeso((m) => m.filter((x) => x.id !== idIA));
          window.setTimeout(() => void enviarMeso(t, { reintento: true }), 0);
          return;
        }
      }
    },
    [enviando, mensajesMeso, mostrarAviso, hidratado]
  );

  /**
   * Lee el stream del chat y devuelve el JSON crudo + meta. Lanza con un
   * mensaje legible si la conexión se cortó o el servidor falló. Lo usan los
   * turnos del enrutador para no triplicar el bucle SSE.
   */
  async function consumirStreamChat(
    res: Response,
    control: AbortController,
    onParcial: (parcial: string) => void
  ): Promise<{
    bruto: string;
    meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null };
  }> {
    const tipo = res.headers.get("content-type") ?? "";
    if (!res.ok || !tipo.includes("text/event-stream")) {
      if (res.status === 404) {
        throw new Error(
          `El servidor respondió 404 en ${res.url || "/api/chat"}. ` +
            "La petición no llegó al servidor de la app: comprueba que `npm run dev` esté corriendo en el puerto de esta pestaña y recarga con Ctrl+Shift+R."
        );
      }
      let motivo = `El asistente respondió ${res.status}.`;
      try {
        const j = (await res.json()) as unknown;
        const detalle = textoLegible(j);
        if (detalle) motivo = detalle;
      } catch {
        /* respuesta sin JSON: nos quedamos con el estado */
      }
      throw new Error(motivo);
    }

    const lector = res.body!.getReader();
    const decodificador = new TextDecoder();
    let buffer = "";
    let bruto = "";
    let meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null } = {};
    let cerradoPorServidor = false;

    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });

      let corte: number;
      while ((corte = buffer.indexOf("\n\n")) !== -1) {
        const evento = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 2);

        for (const linea of evento.split("\n")) {
          if (!linea.startsWith("data:")) continue;
          const carga = linea.slice(5).trim();
          if (!carga || carga === "[DONE]") continue;
          try {
            const trozo = JSON.parse(carga) as { t?: string; meta?: typeof meta };
            if (trozo.t) bruto += trozo.t;
            if (trozo.meta) {
              meta = trozo.meta;
              if (trozo.meta.fin) cerradoPorServidor = true;
            }
          } catch {
            /* un trozo ilegible no invalida lo ya recibido */
          }
        }

        const parcial = extraerMensajeParcial(bruto);
        if (parcial) onParcial(parcial);
      }
    }

    if (!cerradoPorServidor) {
      throw new Error(
        "La conexión se cortó antes de que el asistente terminara de responder. " +
          "Suele pasar si el servidor se reinició mientras se generaba. Reintenta."
      );
    }
    void control;
    return { bruto, meta };
  }

  /* -------- el inicio: la IA decide el nivel conversando -------- */
  const enviarInicio = useCallback(
    async (texto: string, opciones?: { reintento?: boolean }) => {
      const t = texto.trim();
      if (!t || enviando || !hidratado) return;
      if (scopeV3NoSoportadoRef.current) {
        setError("Este proyecto está en un módulo que esta página todavía no puede abrir. Sus datos permanecen intactos.");
        return;
      }
      if (saludRef.current && !saludRef.current.ia && saludRef.current.conexion === "sin_clave") {
        setError(saludRef.current.mensaje);
        return;
      }

      ultimaPeticion.current = t;
      setError(null);
      setEnviando(true);

      const idUsuario = `u${Date.now()}`;
      const idIA = `a${Date.now()}-b`;
      const msgUsuario: ChatMensaje = { id: idUsuario, role: "usuario", texto: t };
      const msgIA: ChatMensaje = { id: idIA, role: "asistente", texto: "" };
      setMensajes((m) => [...m, msgUsuario, msgIA]);

      const control = new AbortController();
      abortRef.current = control;

      const proyecto = estadoV3Ref.current?.proyecto ?? null;
      const documentos: { nivel: "macro" | "meso" | "micro"; nombre: string }[] = proyecto
        ? [
            ...proyecto.marcos.map((m) => ({ nivel: "macro" as const, nombre: m.nombre })),
            ...proyecto.programas.map((p) => ({ nivel: "meso" as const, nombre: p.nombre })),
            ...proyecto.asignaturas.map((a) => ({
              nivel: "micro" as const,
              nombre: a.microcurriculo.ident.asignatura
            }))
          ]
        : [];
      const historia: { role: string; content: string }[] = [];
      if (crudoRef.current) historia.push({ role: "assistant", content: crudoRef.current });
      for (const m of mensajes.slice(-8)) {
        historia.push({ role: m.role === "usuario" ? "user" : "assistant", content: m.texto });
      }

      let bruto = "";
      let meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null } = {};
      let respuestaLlego = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: control.signal,
          body: JSON.stringify({
            mensaje: t,
            modulo: "inicio",
            documentos,
            historia,
            fuentesPdf: fuentesPdfParaEnvio(t)
          })
        });
        respuestaLlego = true;

        const leido = await consumirStreamChat(res, control, (parcial) =>
          setMensajes((m) => m.map((x) => (x.id === idIA ? { ...x, texto: parcial } : x)))
        );
        bruto = leido.bruto;
        meta = leido.meta;

        if (!bruto.trim() && !meta.error) {
          if (!opciones?.reintento) {
            reintentarVacio.current = true;
            return;
          }
          throw new Error(
            "El asistente devolvió un turno vacío dos veces seguidas. Vuelve a intentarlo: si se repite, reformula la petición."
          );
        }

        const resultado = parsearRespuestaInicio(bruto, meta);
        if (!resultado.ok) {
          const causaReal = meta.error ? ` El proveedor reportó: ${meta.error}` : "";
          const motivo = resultado.motivo + causaReal;
          ultimoErrorRef.current = { motivo, fin: meta.fin ?? null, bruto };
          throw new Error(motivo);
        }
        ultimoErrorRef.current = null;

        const iaFinal: ChatMensaje = { id: idIA, role: "asistente", texto: resultado.mensaje };
        setMensajes((m) => m.map((x) => (x.id === idIA ? iaFinal : x)));
        setSugerencias(resultado.sugerencias);
        setCrudoUltimo(bruto);
        crudoRef.current = bruto;

        if (resultado.destino !== "aclarar") {
          // Guarda el hilo de inicio y cambia al nivel elegido. Para Micro no
          // hay lienzo: se queda en inicio hasta que el primer dato cree la ficha.
          const transferencia: ChatMensaje[] = [...mensajes, msgUsuario, iaFinal];
          let base = guardarVistaActual() ?? estadoV3Ref.current;
          if (!base) {
            base = aplicarVistaMicroV3(
              null,
              {
                microcurriculo: null,
                mensajes: transferencia,
                sugerencias: resultado.sugerencias,
                intencion: "entender",
                seccionActiva: null,
                crudo: bruto
              },
              idProyectoActual()
            );
          }
          setModuloActivo(resultado.destino);
          destinoInicioRef.current = resultado.destino === "micro" ? "micro" : null;
          if (resultado.destino !== "micro") {
            const scopeId = `${resultado.destino}:sin-documento`;
            const conversacion = {
              scopeId,
              modulo: resultado.destino,
              documentoId: null,
              mensajes: transferencia,
              sugerencias: resultado.sugerencias,
              intencion: "entender" as const,
              seccionActiva: null,
              crudo: bruto
            };
            const conSeleccion: EstadoGuardadoV3 = {
              ...base,
              conversaciones: { ...base.conversaciones, [scopeId]: conversacion },
              seleccion: { modulo: resultado.destino, documentoId: null }
            };
            estadoV3Ref.current = conSeleccion;
            if (resultado.destino === "macro") mostrarVistaMacro(conSeleccion);
            else recargarMeso(conSeleccion);
            const guardado = guardarEstadoV3(window.localStorage, conSeleccion);
            if (!guardado.ok) {
              setAvisoPersistencia(
                "El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
              );
            } else {
              estadoV3Ref.current = guardado.estado;
            }
            setVersionProyecto((v) => v + 1);
          }
        }
        setAdjuntos([]);
      } catch (e) {
        const abortado = e instanceof DOMException && e.name === "AbortError";
        const falloDeRed = !abortado && !respuestaLlego;
        const motivo = abortado
          ? "Detuviste la respuesta. Seguís donde estabas."
          : falloDeRed
            ? "No se pudo contactar al servidor de la app. Comprueba que `npm run dev` siga corriendo y recarga la página."
            : e instanceof Error
              ? e.message
              : "Ocurrió un error inesperado.";

        setMensajes((m) => m.map((x) => (x.id === idIA ? { ...x, texto: x.texto || motivo, incompleto: true } : x)));
        if (!abortado) setError(motivo);
      } finally {
        setEnviando(false);
        abortRef.current = null;

        if (reintentarVacio.current) {
          reintentarVacio.current = false;
          setMensajes((m) => m.filter((x) => x.id !== idIA));
          window.setTimeout(() => void enviarInicio(t, { reintento: true }), 0);
          return;
        }
      }
    },
    [enviando, mensajes, mostrarAviso, hidratado]
  );

  /**
   * Dentro de un nivel, si el docente pide cambiar de nivel o empezar otro
   * documento, el enrutador confirma y se cambia sin perder el hilo actual.
   */
  const enviarRouterCambio = useCallback(
    async (texto: string, actual: ModuloActivo, opciones?: { reintento?: boolean }) => {
      const t = texto.trim();
      if (!t || enviando || !hidratado) return;
      if (saludRef.current && !saludRef.current.ia && saludRef.current.conexion === "sin_clave") {
        setError(saludRef.current.mensaje);
        return;
      }

      ultimaPeticion.current = t;
      setError(null);
      setEnviando(true);

      const idUsuario = `u${Date.now()}`;
      const idIA = `a${Date.now()}-b`;
      const msgUsuario: ChatMensaje = { id: idUsuario, role: "usuario", texto: t };
      const msgIA: ChatMensaje = { id: idIA, role: "asistente", texto: "" };
      const poner = (fn: (lista: ChatMensaje[]) => ChatMensaje[]) => {
        if (actual === "macro") setMensajesMacro(fn);
        else if (actual === "meso") setMensajesMeso(fn);
        else setMensajes(fn);
      };
      poner((m) => [...m, msgUsuario, msgIA]);

      const control = new AbortController();
      abortRef.current = control;

      const proyecto = estadoV3Ref.current?.proyecto ?? null;
      const documentos: { nivel: "macro" | "meso" | "micro"; nombre: string }[] = proyecto
        ? [
            ...proyecto.marcos.map((m) => ({ nivel: "macro" as const, nombre: m.nombre })),
            ...proyecto.programas.map((p) => ({ nivel: "meso" as const, nombre: p.nombre })),
            ...proyecto.asignaturas.map((a) => ({
              nivel: "micro" as const,
              nombre: a.microcurriculo.ident.asignatura
            }))
          ]
        : [];
      const hilo = actual === "macro" ? mensajesMacro : actual === "meso" ? mensajesMeso : mensajes;
      const historia: { role: string; content: string }[] = [];
      for (const m of hilo.slice(-8)) {
        historia.push({ role: m.role === "usuario" ? "user" : "assistant", content: m.texto });
      }

      let bruto = "";
      let meta: { fin?: string | null; tokens?: number | null; vacio?: boolean; error?: string | null } = {};
      let respuestaLlego = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: control.signal,
          body: JSON.stringify({
            mensaje: t,
            modulo: "inicio",
            documentos,
            historia,
            fuentesPdf: fuentesPdfParaEnvio(t)
          })
        });
        respuestaLlego = true;

        const leido = await consumirStreamChat(res, control, (parcial) =>
          poner((m) => m.map((x) => (x.id === idIA ? { ...x, texto: parcial } : x)))
        );
        bruto = leido.bruto;
        meta = leido.meta;

        if (!bruto.trim() && !meta.error) {
          if (!opciones?.reintento) {
            reintentarVacio.current = true;
            return;
          }
          throw new Error("El asistente devolvió un turno vacío dos veces seguidas. Vuelve a intentarlo.");
        }

        const resultado = parsearRespuestaInicio(bruto, meta);
        if (!resultado.ok) {
          const causaReal = meta.error ? ` El proveedor reportó: ${meta.error}` : "";
          throw new Error(resultado.motivo + causaReal);
        }
        ultimoErrorRef.current = null;

        poner((m) => m.map((x) => (x.id === idIA ? { ...x, texto: resultado.mensaje } : x)));
        if (actual === "macro") setSugerenciasMacro(resultado.sugerencias);
        else if (actual === "meso") setSugerenciasMeso(resultado.sugerencias);
        else setSugerencias(resultado.sugerencias);
        setAdjuntos([]);

        if (resultado.destino !== "aclarar" && resultado.destino !== actual) {
          ejecutarCambioModulo(resultado.destino);
        } else if (resultado.destino !== "aclarar" && pideNuevoDocumento(t)) {
          // Mismo nivel pero pide otro documento: vuelve al lienzo por chat.
          nuevoDocumento(actual);
        }
      } catch (e) {
        const abortado = e instanceof DOMException && e.name === "AbortError";
        const falloDeRed = !abortado && !respuestaLlego;
        const motivo = abortado
          ? "Detuviste la respuesta. Seguís donde estabas."
          : falloDeRed
            ? "No se pudo contactar al servidor de la app. Comprueba que `npm run dev` siga corriendo y recarga la página."
            : e instanceof Error
              ? e.message
              : "Ocurrió un error inesperado.";

        poner((m) => m.map((x) => (x.id === idIA ? { ...x, texto: x.texto || motivo, incompleto: true } : x)));
        if (!abortado) setError(motivo);
      } finally {
        setEnviando(false);
        abortRef.current = null;

        if (reintentarVacio.current) {
          reintentarVacio.current = false;
          poner((m) => m.filter((x) => x.id !== idIA));
          window.setTimeout(() => void enviarRouterCambio(t, actual, { reintento: true }), 0);
          return;
        }
      }
    },
    [enviando, mensajes, mensajesMacro, mensajesMeso, mostrarAviso, hidratado]
  );

  /**
   * Nuevo documento por chat: vuelve al inicio con el hilo limpio para que la
   * IA pregunte qué se quiere crear. No borra ningún documento del proyecto.
   */
  function nuevoHilo() {
    if (enviando || scopeV3NoSoportadoRef.current) return;
    abortRef.current?.abort();
    destinoInicioRef.current = null;
    try {
      const base = guardarVistaActual() ?? estadoV3Ref.current;
      if (!base) {
        const vacia = vistaMicroVacia();
        setMicro(vacia.microcurriculo);
        setMensajes(vacia.mensajes);
        setSugerencias(SUGERENCIAS_APERTURA_NEUTRAS);
        setIntencion(vacia.intencion);
        setSeccionActiva(null);
        setCrudoUltimo(vacia.crudo);
        crudoRef.current = vacia.crudo;
        setModuloActivo("micro");
        return;
      }
      const conInicio: EstadoGuardadoV3 = { ...base, seleccion: { modulo: "inicio", documentoId: null } };
      const limpio = aplicarVistaMicroV3(
        conInicio,
        { ...vistaMicroVacia(), mensajes: [], sugerencias: SUGERENCIAS_APERTURA_NEUTRAS },
        idProyectoActual()
      );
      estadoV3Ref.current = limpio;
      mostrarVistaMicro(limpio);
      setSugerencias(SUGERENCIAS_APERTURA_NEUTRAS);
      setModuloActivo("micro");
      const guardado = guardarEstadoV3(window.localStorage, limpio);
      if (!guardado.ok) {
        setAvisoPersistencia(
          "El proyecto sigue disponible en esta sesión, pero no se pudo guardar en el navegador. No cierres la pestaña hasta resolverlo."
        );
      } else {
        estadoV3Ref.current = guardado.estado;
      }
      setVersionProyecto((v) => v + 1);
    } catch (errorNuevo) {
      setAvisoPersistencia(
        `No pude empezar un documento nuevo (${nombreErrorPersistencia(errorNuevo)}). No se perdió nada: seguís donde estabas.`
      );
    }
  }

  const reintentar = useCallback(() => {
    const base = ultimaPeticion.current;
    if (!base) return;
    const falla = ultimoErrorRef.current;
    const conContexto = falla
      ? `${base}\n\n[El intento anterior falló: ${falla.motivo} No repitas la misma respuesta completa; ` +
        `devuelve algo más acotado y bien formado.]`
      : base;
    const seleccion = estadoV3Ref.current?.seleccion ?? null;
    if (!estadoV3Ref.current || seleccion?.modulo === "inicio") {
      void enviarInicio(conContexto);
      return;
    }
    if (moduloActivoRef.current === "macro") void enviarMacro(conContexto);
    else if (moduloActivoRef.current === "meso") void enviarMeso(conContexto);
    else void enviar(conContexto);
  }, [enviar, enviarInicio, enviarMacro, enviarMeso]);

  const sinClave = salud !== null && salud.conexion === "sin_clave";
  const problemaClave =
    salud !== null &&
    salud.conexion !== "sin_clave" &&
    salud.conexion !== "ok" &&
    salud.conexion !== "proveedor";

  const hayAlgoQueBorrar =
    mensajes.length > 0 ||
    micro !== null ||
    mensajesMacro.length > 0 ||
    marco !== null ||
    mensajesMeso.length > 0 ||
    programa !== null ||
    (persistenciaBloqueada && !scopeV3NoSoportado);

  const etiquetaSalud = (() => {
    if (salud === null) return "Comprobando…";
    switch (salud.conexion) {
      case "ok":
        return `Asistente conectado · ${salud.modelo}`;
      case "sin_clave":
        return "Asistente sin configurar";
      case "clave_invalida":
        return "Clave rechazada";
      case "sin_saldo":
        return "Sin saldo";
      case "red":
        return "Sin contacto con DeepSeek";
      default:
        return "Asistente conectado";
    }
  })();

  /* -------- vista por módulo: el chat y la ficha siguen al nivel activo -------- */
  const esMacro = moduloActivo === "macro";
  const esMeso = moduloActivo === "meso";
  const chatMensajes = esMacro ? mensajesMacro : esMeso ? mensajesMeso : mensajes;
  const chatSugerencias = esMacro ? sugerenciasMacro : esMeso ? sugerenciasMeso : sugerencias;
  /* En inicio decide la IA; dentro de un nivel, un pedido explícito de cambio
     o de documento nuevo también pasa por el enrutador. */
  const seleccionParaEnvio = estadoV3Ref.current?.seleccion ?? null;
  const enInicio = !estadoV3Ref.current || seleccionParaEnvio?.modulo === "inicio";
  const chatEnviar = (t: string) => {
    const texto = t.trim();
    if (!texto || enviando) return;
    if (enInicio && destinoInicioRef.current === null) {
      void enviarInicio(texto);
      return;
    }
    if (enInicio) {
      // El nivel ya quedó decidido conversando: el turno crea la ficha.
      destinoInicioRef.current = null;
      void enviar(texto);
      return;
    }
    if (mencionaOtroNivel(texto, moduloActivo) || pideNuevoDocumento(texto)) {
      void enviarRouterCambio(texto, moduloActivo);
      return;
    }
    void (esMacro ? enviarMacro(texto) : esMeso ? enviarMeso(texto) : enviar(texto));
  };
  const textoPildora = esMacro
    ? "Aquí va tomando forma tu marco. Sigue conversando: cada dato cae en su sección."
    : esMeso
      ? "Aquí va tomando forma tu programa. Sigue conversando: cada dato cae en su sección."
      : "Aquí va tomando forma tu microcurrículo. Sigue conversando: cada dato cae en su sección.";
  const notaGuardado = esMacro
    ? "Tu marco se guarda en este navegador. Lo que genera el asistente es una propuesta: revísalo, confirma cada afirmación y ajústalo antes de presentarlo."
    : esMeso
      ? "Tu programa se guarda en este navegador. Lo que genera el asistente es una propuesta: revísalo, confirma cada afirmación y ajústalo antes de presentarlo."
      : "Tu microcurrículo se guarda en este navegador. Lo que genera el asistente es una propuesta: revísalo, confirma la bibliografía y ajústalo antes de presentarlo.";
  /* Listas del proyecto para el editor del programa: se leen del agregado. */
  // versionProyecto solo fuerza el re-render cuando el agregado cambia en memoria.
  void versionProyecto;
  const proyectoEnVista = estadoV3Ref.current?.proyecto ?? null;
  const seleccionEnVista = estadoV3Ref.current?.seleccion ?? null;
  const marcosDisponibles = (proyectoEnVista?.marcos ?? []).map((m) => ({
    id: m.id,
    nombre: m.nombre,
    estado: m.estado
  }));
  /* Documentos del proyecto para el menú «+» del compositor. */
  const documentosMenu: DocMenuItem[] = proyectoEnVista
    ? [
        ...proyectoEnVista.marcos.map((m) => ({
          id: m.id,
          nombre: m.nombre.trim() || "Marco sin nombre",
          nivel: "macro" as const
        })),
        ...proyectoEnVista.programas.map((p) => ({
          id: p.id,
          nombre: p.nombre.trim() || "Programa sin nombre",
          nivel: "meso" as const
        })),
        ...proyectoEnVista.asignaturas.map((a) => ({
          id: a.id,
          nombre: a.microcurriculo.ident.asignatura.trim() || `Asignatura ${a.microcurriculo.folio}`,
          nivel: "micro" as const
        }))
      ]
    : [];
  /* Etiqueta pasiva del contexto: informa dónde se está, no elige. El nivel lo
     decide la conversación, no un selector. */
  const etiquetaContexto = (() => {
    if (!proyectoEnVista || !seleccionEnVista || seleccionEnVista.modulo === "inicio") {
      return "Conversación inicial";
    }
    if (seleccionEnVista.modulo === "macro") {
      const m = proyectoEnVista.marcos.find((x) => x.id === seleccionEnVista.documentoId);
      return `Marco · ${m?.nombre.trim() || "sin nombre"}`;
    }
    if (seleccionEnVista.modulo === "meso") {
      const p = proyectoEnVista.programas.find((x) => x.id === seleccionEnVista.documentoId);
      return `Programa · ${p?.nombre.trim() || "sin nombre"}`;
    }
    const a = proyectoEnVista.asignaturas.find((x) => x.id === seleccionEnVista.documentoId);
    return `Asignatura · ${a?.microcurriculo.ident.asignatura.trim() || "sin nombre"}`;
  })();
  /* Saludo único y neutro: no propone niveles, solo invita a conversar. */
  const saludoUnico = SALUDO_APERTURA;
  const asignaturasVinculadas =
    programa === null || !proyectoEnVista
      ? []
      : asignaturasDelPrograma(proyectoEnVista, programa.id);
  const asignaturasDisponibles = proyectoEnVista ? asignaturasSinPrograma(proyectoEnVista) : [];
  /* Datos para la matriz de trazabilidad del programa activo. */
  const marcoVinculado =
    vinculoMarcoId && proyectoEnVista
      ? (proyectoEnVista.marcos.find((m) => m.id === vinculoMarcoId) ?? null)
      : null;
  const principiosMarco = (marcoVinculado?.principios ?? []).map((a) => ({ id: a.id, texto: a.texto }));
  const microsDelPrograma =
    programa === null || !proyectoEnVista
      ? []
      : proyectoEnVista.asignaturas.filter((a) => a.programaId === programa.id);
  const rasAsignaturas = microsDelPrograma.flatMap((a) => {
    const nombre = a.microcurriculo.ident.asignatura.trim() || "Asignatura sin nombre";
    return rasDelMicro(a.microcurriculo).map((r) => ({
      asignaturaId: a.id,
      asignaturaNombre: nombre,
      raId: r.id,
      texto: r.texto,
      unidad: r.unidad
    }));
  });
  const alineacionesEnVista = proyectoEnVista?.alineaciones ?? [];
  /* En la ficha Micro: qué resultados del programa responde cada RA. */
  const asignaturaActualId =
    seleccionEnVista?.modulo === "micro" ? (seleccionEnVista.documentoId ?? null) : null;
  const vinculosRa: Record<string, string[]> = {};
  if (asignaturaActualId && proyectoEnVista) {
    const textosResultado = new Map<string, string>();
    for (const p of proyectoEnVista.programas) {
      for (const r of p.resultadosPrograma) textosResultado.set(`${p.id}:${r.id}`, r.texto);
    }
    for (const a of proyectoEnVista.alineaciones) {
      if (a.destino.tipo !== "ra_micro" || (a.destino.contextoId ?? null) !== asignaturaActualId) continue;
      if (a.origen.tipo !== "resultado_programa") continue;
      const programaId = a.origen.contextoId ?? proyectoEnVista.programas.find((p) => p.resultadosPrograma.some((r) => r.id === a.origen.id))?.id;
      const texto = programaId ? (textosResultado.get(`${programaId}:${a.origen.id}`) ?? null) : null;
      if (!texto) continue;
      const lista = vinculosRa[a.destino.id] ?? [];
      if (!lista.includes(texto)) lista.push(texto);
      vinculosRa[a.destino.id] = lista;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Modo conversación: solo el chat. Sin ficha, sin rieles, sin tabs.   */
  /* ------------------------------------------------------------------ */

  if (!hayBorrador) {
    return (
      <div className="relative flex h-screen flex-col overflow-hidden bg-seedling">
        <Ondas />
        <header className="relative z-10 flex shrink-0 items-center gap-2.5 px-4 py-3 sm:px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sow text-papel">
            <Icono nombre="chispa" className="h-4 w-4" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">DesignConia</span>
          <button
            type="button"
            onClick={nuevo}
            disabled={!hayAlgoQueBorrar || scopeV3NoSoportado}
            title={
              scopeV3NoSoportado
                ? "El proyecto contiene un módulo que esta página no puede descartar"
                : hayAlgoQueBorrar
                  ? "Descartar esta conversación y empezar de cero"
                  : "Todavía no hay nada que borrar"
            }
            className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-crema/95 px-3 py-1.5 text-xs font-medium text-black/70 hover:border-black/25 hover:text-black disabled:opacity-40 disabled:hover:border-black/10"
          >
            <Icono nombre="deshacer" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conversación nueva</span>
            <span className="sr-only sm:hidden">Conversación nueva</span>
          </button>
          <span className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full border border-black/10 bg-crema/95 px-3 py-1.5 text-xs font-medium text-black/70">
            <Icono nombre="chispa" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{etiquetaContexto}</span>
          </span>
          <BotonTema oscuro={temaOscuro} onCambiar={alternarTema} />
          <span className="ml-auto flex items-center gap-2 text-[11px] text-black/50">
            <span
              className={`h-2 w-2 rounded-full ${sinClave ? "bg-terracotta" : salud === null ? "bg-mist" : "bg-rainfall"}`}
              aria-hidden="true"
            />
            <span className="hidden truncate sm:inline">{etiquetaSalud}</span>
          </span>
        </header>

        <main className="relative z-10 flex min-h-0 flex-1 flex-col px-3 pb-4 sm:px-6">
          {avisoPersistencia && <AvisoPersistencia texto={avisoPersistencia} />}
          {/* Con clave presente pero inservible se avisa, y se deja intentar. */}
          {problemaClave && salud && (
            <div className="mx-auto w-full max-w-[640px] pb-2">
              <p className="flex items-start gap-2 rounded-xl bg-terracotta/10 px-3 py-2 text-[12px] leading-relaxed text-black/75">
                <Icono nombre="alerta" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta" />
                <span>
                  {salud.mensaje} Puedes intentar enviar igual, pero lo más probable es que falle.
                </span>
              </p>
            </div>
          )}
          <Chat
            mensajes={chatMensajes}
            enviando={enviando}
            error={error}
            onEnviar={chatEnviar}
            onDetener={() => abortRef.current?.abort()}
            onReintentar={reintentar}
            sugerencias={chatMensajes.length === 0 ? SUGERENCIAS_APERTURA_NEUTRAS : chatSugerencias}
            saludo={saludoUnico}
            variante="limpio"
            adjuntos={adjuntosChips}
            onQuitarAdjunto={quitarAdjunto}
            onConfirmarAnio={confirmarAnioAdjunto}
            menu={{
              documentos: documentosMenu,
              onNuevoDocumento: nuevoHilo,
              onAbrirDocumento: (nivel, id) => abrirDocumento(nivel, id),
              onAdjuntar: adjuntarArchivos
            }}
            deshabilitado={!hidratado || sinClave || scopeV3NoSoportado}
            motivoDeshabilitado={
              scopeV3NoSoportado
                ? "Este proyecto está en un módulo que esta página todavía no puede abrir."
                : !hidratado
                  ? "Recuperando el proyecto guardado…"
                  : salud?.mensaje
            }
            scrollRef={scrollRef}
          />
        </main>

        {aviso && <Aviso texto={aviso} onCerrar={() => setAviso(null)} />}
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Modo borrador: el chat conduce, la ficha crece al lado.             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="relative flex h-screen flex-col gap-3 overflow-hidden bg-seedling p-3 sm:p-4 xl:flex-row">
      <Ondas />

      {/* Chat: conductor de la conversación */}
      {chatVisible && (
        <aside
          className="relative z-10 flex max-h-[38vh] min-h-[11rem] shrink-0 flex-col rounded-[18px] border border-white/60 bg-crema/70 p-2.5 shadow-tarjeta xl:max-h-none xl:w-[480px]"
          aria-label="Asistente"
        >
          <div className="flex shrink-0 items-center gap-2 px-1 pb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sow text-papel">
              <Icono nombre="chispa" className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">DesignConia</span>
            <button
              type="button"
              onClick={nuevo}
              disabled={!hayAlgoQueBorrar || scopeV3NoSoportado}
              title={
                scopeV3NoSoportado
                  ? "El proyecto contiene un módulo que esta página no puede descartar"
                  : "Descartar este proyecto y empezar de cero"
              }
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-black/60 hover:border-black/25 hover:text-black disabled:opacity-40"
            >
              <Icono nombre="deshacer" className="h-3 w-3" />
              <span className="hidden sm:inline">Nueva</span>
              <span className="sr-only sm:hidden">Conversación nueva</span>
            </button>
            <button
              type="button"
              onClick={() => setChatVisible(false)}
              aria-label="Ocultar el chat y dejar la ficha a pantalla completa"
              className="rounded-full border border-black/10 bg-white p-1 text-black/55 hover:border-black/25 hover:text-black"
            >
              <Icono nombre="chevron" className="h-3.5 w-3.5 rotate-180" />
            </button>
          </div>

          <Chat
            mensajes={chatMensajes}
            enviando={enviando}
            error={error}
            onEnviar={chatEnviar}
            onDetener={() => abortRef.current?.abort()}
            onReintentar={reintentar}
            sugerencias={chatSugerencias}
            saludo={saludoUnico}
            variante="lateral"
            adjuntos={adjuntosChips}
            onQuitarAdjunto={quitarAdjunto}
            onConfirmarAnio={confirmarAnioAdjunto}
            menu={{
              documentos: documentosMenu,
              onNuevoDocumento: nuevoHilo,
              onAbrirDocumento: (nivel, id) => abrirDocumento(nivel, id),
              onAdjuntar: adjuntarArchivos
            }}
            deshabilitado={!hidratado || sinClave || scopeV3NoSoportado}
            motivoDeshabilitado={
              scopeV3NoSoportado
                ? "Este proyecto está en un módulo que esta página todavía no puede abrir."
                : !hidratado
                  ? "Recuperando el proyecto guardado…"
                  : salud?.mensaje
            }
            scrollRef={scrollRef}
          />
        </aside>
      )}

      {/* Ficha */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        {avisoPersistencia && <AvisoPersistencia texto={avisoPersistencia} />}
        <header className="flex shrink-0 flex-wrap items-center gap-2 rounded-[18px] border border-white/60 bg-crema/95 px-3 py-2 shadow-tarjeta">
          {!chatVisible && (
            <button
              type="button"
              onClick={() => setChatVisible(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-redwood"
            >
              <Icono nombre="panel" className="h-3.5 w-3.5" /> Mostrar chat
            </button>
          )}
          {!chatVisible && (
            <button
              type="button"
              onClick={nuevo}
              disabled={!hayAlgoQueBorrar || scopeV3NoSoportado}
              title={scopeV3NoSoportado ? "El proyecto contiene un módulo que esta página no puede descartar" : undefined}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 hover:border-black/25 disabled:opacity-40"
            >
              <Icono nombre="deshacer" className="h-3.5 w-3.5" /> Nueva
            </button>
          )}

          <span className="flex items-center gap-2 text-[11px] text-black/50">
            <span
              className={`h-2 w-2 rounded-full ${sinClave ? "bg-terracotta" : problemaClave ? "bg-terracotta" : "bg-rainfall"}`}
              aria-hidden="true"
            />
            <span className="hidden truncate sm:inline">{etiquetaSalud}</span>
          </span>

          <span className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium text-black/70">
            <Icono nombre="chispa" className="h-3 w-3 shrink-0" />
            <span className="truncate">{etiquetaContexto}</span>
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <BotonTema oscuro={temaOscuro} onCambiar={alternarTema} />
            {proyectoEnVista &&
              (proyectoEnVista.marcos.length > 0 ||
                proyectoEnVista.programas.length > 0 ||
                proyectoEnVista.asignaturas.length > 0) && (
                <>
                  <button
                    type="button"
                    onClick={copiarExpediente}
                    aria-label="Copiar el expediente curricular como Markdown, para pegar"
                    title="Copiar expediente como Markdown para pegar"
                    className="rounded-full border border-black/10 bg-white p-1.5 hover:border-black/25"
                  >
                    <Icono nombre="documento" />
                  </button>
                  <button
                    type="button"
                    onClick={descargarExpedientePdf}
                    title="Descargar el expediente como PDF de texto plano"
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
                  >
                    <Icono nombre="descargar" className="h-3.5 w-3.5" /> Expediente
                  </button>
                </>
              )}
            {moduloActivo === "micro" && (
              <button
                type="button"
                onClick={copiar}
                aria-label="Copiar el microcurrículo como Markdown, para pegar"
                title="Copiar como Markdown para pegar"
                className="rounded-full border border-black/10 bg-white p-1.5 hover:border-black/25"
              >
                <Icono nombre="copiar" />
              </button>
            )}
            {moduloActivo === "micro" && (
              <button
                type="button"
                onClick={descargarPdf}
                title="Descargar como PDF de texto plano"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
              >
                <Icono nombre="descargar" className="h-3.5 w-3.5" /> Exportar PDF
              </button>
            )}
            {moduloActivo === "macro" && marco && (
              <button
                type="button"
                onClick={copiarMarco}
                aria-label="Copiar el marco como Markdown, para pegar"
                title="Copiar como Markdown para pegar"
                className="rounded-full border border-black/10 bg-white p-1.5 hover:border-black/25"
              >
                <Icono nombre="copiar" />
              </button>
            )}
            {moduloActivo === "macro" && marco && (
              <button
                type="button"
                onClick={descargarMarcoPdf}
                title="Descargar como PDF de texto plano"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
              >
                <Icono nombre="descargar" className="h-3.5 w-3.5" /> Exportar PDF
              </button>
            )}
            {moduloActivo === "meso" && programa && (
              <button
                type="button"
                onClick={copiarPrograma}
                aria-label="Copiar el programa como Markdown, para pegar"
                title="Copiar como Markdown para pegar"
                className="rounded-full border border-black/10 bg-white p-1.5 hover:border-black/25"
              >
                <Icono nombre="copiar" />
              </button>
            )}
            {moduloActivo === "meso" && programa && (
              <button
                type="button"
                onClick={descargarProgramaPdf}
                title="Descargar como PDF de texto plano"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"
              >
                <Icono nombre="descargar" className="h-3.5 w-3.5" /> Exportar PDF
              </button>
            )}
          </div>
        </header>

        {pildoraBorrador && (
          <div className="flex shrink-0 items-center gap-2.5 rounded-[18px] border border-white/60 bg-sprout/50 px-3 py-2 text-[12px] text-black/75">
            <Icono nombre="chispa" className="h-4 w-4 shrink-0 text-redwood" />
            <p className="min-w-0 flex-1">{textoPildora}</p>
            <button
              type="button"
              onClick={() => setPildoraBorrador(false)}
              aria-label="Descartar el aviso"
              className="shrink-0 rounded-full px-2 py-1 text-black/50 hover:text-black"
            >
              ×
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          {esMacro ? (
            marco && (
              <MarcoFicha
                marco={marco}
                fuentes={fuentes}
                activa={seccionActivaMacro}
                onChange={editarMarco}
              />
            )
          ) : esMeso ? (
            programa && (
              <MesoFicha
                programa={programa}
                vinculoMarcoId={vinculoMarcoId}
                marcos={marcosDisponibles}
                asignaturas={asignaturasVinculadas}
                disponibles={asignaturasDisponibles}
                fuentes={proyectoEnVista?.fuentesCurriculares ?? []}
                activa={seccionActivaMeso}
                onChange={editarPrograma}
                onVincular={vincularAsignaturaAlPrograma}
                onDesvincular={desvincularAsignaturaDelPrograma}
                principiosMarco={principiosMarco}
                nombreMarco={marcoVinculado?.nombre ?? null}
                rasAsignaturas={rasAsignaturas}
                alineaciones={alineacionesEnVista}
                onToggleAlineacion={alternarAlineacion}
              />
            )
          ) : (
            micro && (
              <MicrocurriculoFicha
                micro={micro}
                activa={seccionActiva}
                onChange={editarMicro}
                vinculosRa={vinculosRa}
              />
            )
          )}
          <p className="px-1 pb-2 pt-3 text-[11px] leading-relaxed text-black/40">{notaGuardado}</p>
        </div>
      </div>

      {aviso && <Aviso texto={aviso} onCerrar={() => setAviso(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas de la página                                                 */
/* ------------------------------------------------------------------ */

function BotonTema({ oscuro, onCambiar }: { oscuro: boolean; onCambiar: () => void }) {
  return (
    <button
      type="button"
      onClick={onCambiar}
      title={oscuro ? "Cambiar al modo claro" : "Cambiar al modo oscuro"}
      aria-label={oscuro ? "Cambiar al modo claro" : "Cambiar al modo oscuro"}
      aria-pressed={oscuro}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-crema/95 px-3 py-1.5 text-xs font-medium text-black/70 hover:border-black/25 hover:text-black"
    >
      <Icono nombre={oscuro ? "sol" : "luna"} className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{oscuro ? "Claro" : "Oscuro"}</span>
    </button>
  );
}

function Ondas() {
  return (
    <svg
      aria-hidden="true"
      className="ondas pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 1440 900"
    >
      <path
        d="M-40 620 C 240 540, 420 700, 720 640 S 1180 560, 1500 640 L1500 940 L-40 940 Z"
        fill="#B6B7A5"
        opacity="0.55"
      />
      <path
        d="M-40 700 C 260 630, 480 770, 780 710 S 1200 650, 1500 720 L1500 940 L-40 940 Z"
        fill="#7E7B62"
        opacity="0.45"
      />
    </svg>
  );
}

function AvisoPersistencia({ texto }: { texto: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-[840px] rounded-xl border border-terracotta/20 bg-terracotta/10 px-3 py-2 text-[11.5px] leading-relaxed text-black/75"
    >
      <p className="flex items-start gap-2">
        <Icono nombre="alerta" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta" />
        <span>{texto}</span>
      </p>
    </div>
  );
}

function Aviso({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full border border-white/60 bg-sow px-4 py-2 text-[12.5px] text-papel shadow-burbuja"
    >
      <Icono nombre="alerta" className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[70ch]">{texto}</span>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar el aviso"
        className="ml-1 opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
