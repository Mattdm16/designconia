/**
 * DesignConia — modelo del estudio de documento (Fase 2: diseño).
 *
 * La Fase 1 (recopilación) ya existe: el currículo es la fuente de verdad.
 * Este módulo describe cómo SE VE el documento oficial sin duplicar el
 * contenido: cada bloque apunta al dato curricular por referencia (`ref`) y
 * solo guarda formato, orden y visibilidad. El texto local es la excepción
 * explícita ("solo en este documento").
 *
 * Todo es puro y testeable: no toca localStorage, red ni DOM.
 */

import type {
  FuenteCurricular,
  MarcoEducativoInstitucional,
  ProgramaAcademico
} from "./proyecto.ts";
import { ETIQUETA_TIPO_SESION, POR_DEFINIR, type FilaSesion, type Microcurriculo } from "./schema.ts";

/* ------------------------------------------------------------------ */
/* Página y estilos                                                    */
/* ------------------------------------------------------------------ */

export type TamanoPagina = "carta" | "a4";
export type OrientacionPagina = "vertical" | "horizontal";
export type FuenteDiseno = "serif" | "sans" | "mono";
export type AlineacionTexto = "izquierda" | "centrado" | "derecha";

/** Dimensiones en puntos PostScript (1/72 pulgada). */
export const DIMENSIONES_PAGINA: Record<TamanoPagina, { ancho: number; alto: number }> = {
  carta: { ancho: 612, alto: 792 },
  a4: { ancho: 595, alto: 842 }
};

export type MargenesMm = { arriba: number; abajo: number; izq: number; der: number };

export type PaginaDiseno = {
  tamano: TamanoPagina;
  orientacion: OrientacionPagina;
  /** Márgenes en milímetros. */
  margenesMm: MargenesMm;
  /** Texto del encabezado (puede llevar {pagina} y {paginas}). */
  encabezadoTexto: string;
  /** Texto del pie (puede llevar {pagina} y {paginas}). */
  pieTexto: string;
  mostrarNumeroPagina: boolean;
};

export type EstiloBloque = {
  fuente?: FuenteDiseno;
  tamanoPt?: number;
  negrita?: boolean;
  cursiva?: boolean;
  /** Hex `#rrggbb`. */
  color?: string;
  alineacion?: AlineacionTexto;
  espacioAntesPt?: number;
  espacioDespuesPt?: number;
  interlineado?: number;
};

/* ------------------------------------------------------------------ */
/* Bloques: la unidad que se arrastra                                  */
/* ------------------------------------------------------------------ */

export type ZonaBloque = "portada" | "encabezado" | "cuerpo" | "pie";

export type TipoBloque =
  | "titulo"
  | "subtitulo"
  | "parrafo"
  | "lista"
  | "cita"
  | "tabla"
  | "imagen"
  | "regla"
  | "espacio"
  | "salto"
  | "firma";

/**
 * Un bloque es una pieza ordenable del documento. `refContenido` apunta al
 * dato curricular (p. ej. "micro.justificacion"); `texto` + `usarTextoLocal`
 * es la excepción explícita que solo vive en este documento.
 */
export type BloqueDiseno = {
  id: string;
  tipo: TipoBloque;
  zona: ZonaBloque;
  refContenido?: string | null;
  /** Texto estático o redacción local ("solo en este documento"). */
  texto?: string;
  usarTextoLocal?: boolean;
  estilo?: EstiloBloque;
  /** Para tipo imagen: id del activo del kit de marca. */
  activoId?: string | null;
  visible: boolean;
};

export const ETIQUETA_TIPO_BLOQUE: Record<TipoBloque, string> = {
  titulo: "Título",
  subtitulo: "Subtítulo",
  parrafo: "Párrafo",
  lista: "Lista",
  cita: "Cita",
  tabla: "Tabla",
  imagen: "Imagen",
  regla: "Línea",
  espacio: "Espacio",
  salto: "Salto de página",
  firma: "Firmas"
};

export const ETIQUETA_ZONA: Record<ZonaBloque, string> = {
  portada: "Portada",
  encabezado: "Encabezado",
  cuerpo: "Cuerpo",
  pie: "Pie"
};

/* ------------------------------------------------------------------ */
/* Plantillas y kit de marca                                           */
/* ------------------------------------------------------------------ */

export type PlantillaDiseno = {
  id: string;
  nombre: string;
  descripcion: string;
  pagina: PaginaDiseno;
  /** Estilo base por tipo de bloque; el bloque puede sobrescribirlo. */
  estilos: Partial<Record<TipoBloque, EstiloBloque>>;
  colorPrimario: string;
  colorSecundario: string;
};

export type TipoActivo = "logo" | "membrete" | "sello" | "marca_agua" | "imagen";

export type ActivoMarca = {
  id: string;
  nombre: string;
  tipo: TipoActivo;
  /** image/png, image/jpeg, image/webp o image/svg+xml. */
  mime: string;
  /** dataURL listo para mostrar. */
  dataUrl: string;
  tamanoBytes: number;
};

export type BrandKit = {
  id: string;
  nombre: string;
  colores: { primario: string; secundario: string; acento: string };
  fuenteTitulos: FuenteDiseno;
  fuenteCuerpo: FuenteDiseno;
  activos: ActivoMarca[];
};

/* ------------------------------------------------------------------ */
/* Diseño aplicado a un documento                                      */
/* ------------------------------------------------------------------ */

export type NivelDiseno = "macro" | "meso" | "micro";

export type DisenoDocumento = {
  id: string;
  nivel: NivelDiseno;
  /** Documento curricular del que toma el contenido. */
  documentoId: string;
  nombre: string;
  plantillaId: string;
  pagina: PaginaDiseno;
  encabezadoTexto: string;
  pieTexto: string;
  mostrarNumeroPagina: boolean;
  bloques: BloqueDiseno[];
  /** ISO: cuándo se guardó por última vez. */
  actualizadoEn: string;
};

/* ------------------------------------------------------------------ */
/* Contenido resoluble: el puente con la Fase 1                        */
/* ------------------------------------------------------------------ */

export type DatosDiseno = {
  macro?: MarcoEducativoInstitucional | null;
  programa?: ProgramaAcademico | null;
  micro?: Microcurriculo | null;
  fuentes?: FuenteCurricular[];
};

/** Texto real (sin "[por definir]") o cadena vacía. */
function real(v: string): string {
  const t = v.trim();
  return t && t !== POR_DEFINIR ? t : "";
}

/**
 * Resuelve una referencia de bloque a párrafos de texto. Devuelve [] si el
 * dato no existe o está vacío: el aviso lo muestra la vista previa, nunca se
 * inventa contenido.
 */
export function resolverContenido(ref: string, datos: DatosDiseno): string[] {
  const fuentes = datos.fuentes ?? [];
  switch (ref) {
    case "doc.nombre": {
      const t =
        real(datos.macro?.nombre ?? "") ||
        real(datos.programa?.nombre ?? "") ||
        real(datos.micro?.ident.asignatura ?? "");
      return t ? [t] : [];
    }
    case "doc.detalle": {
      const partes: string[] = [];
      if (datos.programa) {
        if (real(datos.programa.codigo ?? "")) partes.push(datos.programa.codigo!.trim());
      }
      if (datos.micro) {
        const c = real(datos.micro.ident.codigo);
        if (c) partes.push(c);
        const p = real(datos.micro.ident.programa);
        if (p) partes.push(p);
        const s = real(datos.micro.ident.semestre);
        if (s) partes.push(s);
      }
      if (datos.macro) {
        const e = real(datos.macro.emisor ?? "");
        if (e) partes.push(e);
        const v = real(datos.macro.version);
        if (v) partes.push(`v. ${v}`);
      }
      return partes.length ? [partes.join(" · ")] : [];
    }
    case "marco.principios":
      return (datos.macro?.principios ?? []).map((a) => a.texto.trim()).filter(Boolean);
    case "marco.orientaciones":
      return (datos.macro?.afirmaciones ?? []).map((a) => a.texto.trim()).filter(Boolean);
    case "marco.fuentes":
      return fuentes.map((f) => f.titulo.trim()).filter(Boolean);
    case "meso.perfiles": {
      const p = datos.programa;
      if (!p) return [];
      const salida: string[] = [];
      p.perfilIngreso.forEach((a) => {
        if (a.texto.trim()) salida.push(`Ingreso: ${a.texto.trim()}`);
      });
      p.perfilEgreso.forEach((a) => {
        if (a.texto.trim()) salida.push(`Egreso: ${a.texto.trim()}`);
      });
      return salida;
    }
    case "meso.resultados":
      return (datos.programa?.resultadosPrograma ?? []).map((a) => a.texto.trim()).filter(Boolean);
    case "micro.identificacion": {
      const m = datos.micro;
      if (!m) return [];
      const partes = [
        real(m.ident.asignatura) ? `Asignatura: ${m.ident.asignatura.trim()}` : "",
        real(m.ident.codigo) ? `Código: ${m.ident.codigo.trim()}` : "",
        real(m.ident.programa) ? `Programa: ${m.ident.programa.trim()}` : "",
        m.ident.creditos > 0 ? `Créditos: ${m.ident.creditos}` : "",
        real(m.ident.semestre) ? `Semestre: ${m.ident.semestre.trim()}` : ""
      ].filter(Boolean);
      return partes;
    }
    case "micro.justificacion": {
      const t = real(datos.micro?.justificacion ?? "");
      return t ? [t] : [];
    }
    case "micro.objetivos": {
      const o = datos.micro?.objetivos;
      if (!o) return [];
      return [...o.generales, ...o.especificas].map((t) => t.trim()).filter(Boolean);
    }
    case "micro.unidades": {
      const salida: string[] = [];
      for (const u of datos.micro?.contenido.unidades ?? []) {
        if (real(u.titulo)) salida.push(`Unidad ${u.numero}. ${u.titulo.trim()}`);
        for (const t of u.temas) {
          if (real(t.nombre)) salida.push(`— ${t.nombre.trim()}`);
        }
        for (const ra of u.resultadosAprendizaje) {
          if (real(ra.texto)) salida.push(`RA: ${ra.texto.trim()}`);
        }
      }
      return salida;
    }
    case "micro.metodologia":
      return (datos.micro?.metodologia.estrategias ?? [])
        .map((e) => (e.descripcion ? `${e.nombre.trim()}: ${e.descripcion.trim()}` : e.nombre.trim()))
        .filter(Boolean);
    case "micro.evaluacion": {
      const salida: string[] = [];
      for (const c of datos.micro?.evaluacion.cortes ?? []) {
        if (real(c.nombre) || c.actividades.length) salida.push(`${c.nombre.trim() || "Corte"} — ${c.porcentaje}%`);
        for (const a of c.actividades) {
          if (real(a.nombre)) {
            salida.push(
              `· ${a.nombre.trim()}${a.instrumento.trim() ? ` (${a.instrumento.trim()})` : ""}`
            );
          }
        }
      }
      return salida;
    }
    case "micro.bibliografia": {
      const m = datos.micro;
      if (!m) return [];
      return [...m.bibliografia.obligatorias, ...m.bibliografia.complementarias]
        .map((r) => [r.autor, r.titulo].filter((x) => x.trim()).join(". ").trim())
        .filter(Boolean);
    }
    case "micro.recursos":
      return [...(datos.micro?.bibliografia.recursos ?? [])].map((r) => r.trim()).filter(Boolean);
    case "micro.secuencia": {
      const m = datos.micro;
      if (!m) return [];
      const salida: string[] = [];
      const sesiones = [...(m.secuencia?.sesiones ?? [])].sort((a, b) => a.numero - b.numero);
      for (const s of sesiones) {
        const titulo = real(s.tema) || "Sesión sin tema";
        salida.push(
          `Sesión ${s.numero} · Unidad ${s.unidad} · ${titulo.trim()} · ${ETIQUETA_TIPO_SESION[s.tipo] ?? s.tipo} · ${s.duracionMin} min`
        );
        const fases: [string, FilaSesion[]][] = [
          ["Inicio", s.inicio],
          ["Desarrollo", s.desarrollo],
          ["Cierre", s.cierre]
        ];
        for (const [nombre, filas] of fases) {
          for (const f of filas ?? []) {
            const partes: string[] = [];
            if (real(f.docente)) partes.push(`Docente: ${f.docente.trim()}`);
            if (real(f.estudiante)) partes.push(`Estudiante: ${f.estudiante.trim()}`);
            const recs = (f.recursos ?? []).map((r) => r.trim()).filter(Boolean);
            if (recs.length) partes.push(`Recursos: ${recs.join(", ")}`);
            if (partes.length) salida.push(`${nombre}: ${partes.join(" · ")}`);
          }
        }
      }
      for (const t of m.secuencia?.trabajosIndependientes ?? []) {
        if (!real(t.titulo) && !real(t.descripcion)) continue;
        salida.push(
          `Trabajo independiente · Unidad ${t.unidad} · ${(t.titulo.trim() || "Sin título")} · ${t.esfuerzoMin} min${real(t.descripcion) ? ` — ${t.descripcion.trim()}` : ""}`
        );
      }
      return salida;
    }
    case "fuentes.lista":
      return fuentes.map((f) => f.titulo.trim()).filter(Boolean);
    default:
      return [];
  }
}

/**
 * Texto final de un bloque: redacción local si está marcada, referencia al
 * currículo si la hay, o texto estático. Un bloque sin contenido resuelve [].
 */
export function resolverTextoBloque(bloque: BloqueDiseno, datos: DatosDiseno): string[] {
  if (bloque.usarTextoLocal) {
    const t = (bloque.texto ?? "").trim();
    return t ? [t] : [];
  }
  if (bloque.refContenido) {
    const resuelto = resolverContenido(bloque.refContenido, datos);
    if (resuelto.length > 0) return resuelto;
  }
  const t = (bloque.texto ?? "").trim();
  return t ? [t] : [];
}

/* ------------------------------------------------------------------ */
/* Plantillas base y kit por defecto                                   */
/* ------------------------------------------------------------------ */

function paginaBase(
  tamano: TamanoPagina = "carta",
  parcial?: Partial<PaginaDiseno>
): PaginaDiseno {
  return {
    tamano,
    orientacion: "vertical",
    margenesMm: { arriba: 25, abajo: 25, izq: 25, der: 25 },
    encabezadoTexto: "",
    pieTexto: "",
    mostrarNumeroPagina: true,
    ...parcial
  };
}

export const PLANTILLAS_BASE: PlantillaDiseno[] = [
  {
    id: "institucional-clasica",
    nombre: "Institucional clásica",
    descripcion: "Serif formal en títulos, portada centrada y colores sobrios.",
    pagina: paginaBase("carta", { encabezadoTexto: "", pieTexto: "" }),
    estilos: {
      titulo: { fuente: "serif", tamanoPt: 22, negrita: true, alineacion: "centrado", espacioDespuesPt: 6 },
      subtitulo: { fuente: "serif", tamanoPt: 13, alineacion: "centrado", color: "#555555", espacioDespuesPt: 12 },
      parrafo: { fuente: "sans", tamanoPt: 11, interlineado: 1.4, espacioDespuesPt: 6, alineacion: "izquierda" },
      lista: { fuente: "sans", tamanoPt: 11, interlineado: 1.4, espacioDespuesPt: 2 },
      cita: { fuente: "serif", tamanoPt: 10.5, cursiva: true, color: "#444444" },
      tabla: { fuente: "sans", tamanoPt: 10 },
      firma: { fuente: "sans", tamanoPt: 11, alineacion: "centrado", espacioAntesPt: 24 }
    },
    colorPrimario: "#392525",
    colorSecundario: "#6B3226"
  },
  {
    id: "academica-limpia",
    nombre: "Académica limpia",
    descripcion: "Sans en todo, aire generoso y reglas sutiles entre secciones.",
    pagina: paginaBase("carta"),
    estilos: {
      titulo: { fuente: "sans", tamanoPt: 20, negrita: true, alineacion: "izquierda", espacioDespuesPt: 4 },
      subtitulo: { fuente: "sans", tamanoPt: 12, color: "#555555", espacioDespuesPt: 10 },
      parrafo: { fuente: "sans", tamanoPt: 11, interlineado: 1.5, espacioDespuesPt: 6 },
      lista: { fuente: "sans", tamanoPt: 11, interlineado: 1.5, espacioDespuesPt: 2 },
      cita: { fuente: "sans", tamanoPt: 10.5, cursiva: true, color: "#555555" },
      tabla: { fuente: "sans", tamanoPt: 10 },
      firma: { fuente: "sans", tamanoPt: 11, alineacion: "izquierda", espacioAntesPt: 24 }
    },
    colorPrimario: "#1F3A5F",
    colorSecundario: "#728B83"
  },
  {
    id: "minimalista",
    nombre: "Minimalista",
    descripcion: "Blanco y negro, titulares sobrios y mínimo adorno.",
    pagina: paginaBase("a4", { mostrarNumeroPagina: true }),
    estilos: {
      titulo: { fuente: "sans", tamanoPt: 18, negrita: true, espacioDespuesPt: 2 },
      subtitulo: { fuente: "sans", tamanoPt: 11, color: "#666666", espacioDespuesPt: 12 },
      parrafo: { fuente: "sans", tamanoPt: 10.5, interlineado: 1.45, espacioDespuesPt: 5 },
      lista: { fuente: "sans", tamanoPt: 10.5, interlineado: 1.45, espacioDespuesPt: 1 },
      cita: { fuente: "sans", tamanoPt: 10, cursiva: true, color: "#666666" },
      tabla: { fuente: "sans", tamanoPt: 9.5 },
      firma: { fuente: "sans", tamanoPt: 10.5, alineacion: "izquierda", espacioAntesPt: 24 }
    },
    colorPrimario: "#111111",
    colorSecundario: "#666666"
  },
  {
    id: "en-blanco",
    nombre: "En blanco",
    descripcion: "Lienzo vacío con estilos neutros: todo se decide a mano.",
    pagina: paginaBase("carta", { mostrarNumeroPagina: false }),
    estilos: {
      titulo: { fuente: "sans", tamanoPt: 18, negrita: true },
      subtitulo: { fuente: "sans", tamanoPt: 12 },
      parrafo: { fuente: "sans", tamanoPt: 11, interlineado: 1.4 },
      lista: { fuente: "sans", tamanoPt: 11 },
      firma: { fuente: "sans", tamanoPt: 11, espacioAntesPt: 24 }
    },
    colorPrimario: "#000000",
    colorSecundario: "#444444"
  }
];

/** Kit de marca inicial: sin activos, listo para cargar el logo. */
export function brandKitPorDefecto(): BrandKit {
  return {
    id: "kit-institucional",
    nombre: "Identidad institucional",
    colores: { primario: "#392525", secundario: "#6B3226", acento: "#B25D3E" },
    fuenteTitulos: "serif",
    fuenteCuerpo: "sans",
    activos: []
  };
}

/* ------------------------------------------------------------------ */
/* Generación del diseño por defecto                                   */
/* ------------------------------------------------------------------ */

let contadorBloques = 0;

function idBloque(prefijo: string): string {
  contadorBloques += 1;
  return `bq_${prefijo}_${contadorBloques}`;
}

function bloque(
  tipo: TipoBloque,
  zona: ZonaBloque,
  parcial: Partial<BloqueDiseno> = {}
): BloqueDiseno {
  return {
    id: idBloque(tipo),
    tipo,
    zona,
    visible: true,
    ...parcial
  };
}

/**
 * Diseño inicial para un documento: portada con título/subtítulo y cuerpo
 * con las secciones del nivel. No inventa texto: cada bloque apunta al dato.
 */
export function disenoPorDefecto(
  nivel: "macro" | "meso" | "micro",
  documentoId: string,
  nombre: string,
  plantillaId = "institucional-clasica"
): DisenoDocumento {
  const bloques: BloqueDiseno[] = [
    bloque("titulo", "portada", { refContenido: "doc.nombre" }),
    bloque("subtitulo", "portada", { refContenido: "doc.detalle" })
  ];

  if (nivel === "macro") {
    bloques.push(
      bloque("titulo", "cuerpo", { texto: "Principios" }),
      bloque("lista", "cuerpo", { refContenido: "marco.principios" }),
      bloque("titulo", "cuerpo", { texto: "Orientaciones" }),
      bloque("lista", "cuerpo", { refContenido: "marco.orientaciones" }),
      bloque("titulo", "cuerpo", { texto: "Fuentes" }),
      bloque("lista", "cuerpo", { refContenido: "marco.fuentes" })
    );
  } else if (nivel === "meso") {
    bloques.push(
      bloque("titulo", "cuerpo", { texto: "Identidad del programa" }),
      bloque("parrafo", "cuerpo", { refContenido: "doc.detalle" }),
      bloque("titulo", "cuerpo", { texto: "Perfiles de ingreso y egreso" }),
      bloque("lista", "cuerpo", { refContenido: "meso.perfiles" }),
      bloque("titulo", "cuerpo", { texto: "Resultados del programa" }),
      bloque("lista", "cuerpo", { refContenido: "meso.resultados" })
    );
  } else {
    bloques.push(
      bloque("titulo", "cuerpo", { texto: "Datos de identificación" }),
      bloque("parrafo", "cuerpo", { refContenido: "micro.identificacion" }),
      bloque("titulo", "cuerpo", { texto: "Justificación" }),
      bloque("parrafo", "cuerpo", { refContenido: "micro.justificacion" }),
      bloque("titulo", "cuerpo", { texto: "Objetivos" }),
      bloque("lista", "cuerpo", { refContenido: "micro.objetivos" }),
      bloque("titulo", "cuerpo", { texto: "Contenido temático" }),
      bloque("lista", "cuerpo", { refContenido: "micro.unidades" }),
      bloque("titulo", "cuerpo", { texto: "Metodología" }),
      bloque("lista", "cuerpo", { refContenido: "micro.metodologia" }),
      bloque("titulo", "cuerpo", { texto: "Sistema de evaluación" }),
      bloque("lista", "cuerpo", { refContenido: "micro.evaluacion" }),
      bloque("titulo", "cuerpo", { texto: "Bibliografía y recursos" }),
      bloque("lista", "cuerpo", { refContenido: "micro.bibliografia" }),
      bloque("firma", "cuerpo", { texto: "Elaboró: ____________________       Revisó: ____________________" })
    );
  }

  const plantilla = PLANTILLAS_BASE.find((p) => p.id === plantillaId) ?? PLANTILLAS_BASE[0];
  return {
    id: `dis_${nivel}_${documentoId}`,
    nivel,
    documentoId,
    nombre: nombre ? `Diseño — ${nombre}` : "Diseño del documento",
    plantillaId: plantilla.id,
    pagina: { ...plantilla.pagina, margenesMm: { ...plantilla.pagina.margenesMm } },
    encabezadoTexto: "",
    pieTexto: "",
    mostrarNumeroPagina: plantilla.pagina.mostrarNumeroPagina,
    bloques,
    actualizadoEn: new Date().toISOString()
  };
}

/* ------------------------------------------------------------------ */
/* Operaciones puras sobre el diseño                                   */
/* ------------------------------------------------------------------ */

/** Ordena por zona y conserva el orden relativo dentro de cada zona. */
export function bloquesPorZona(bloques: BloqueDiseno[]): Record<ZonaBloque, BloqueDiseno[]> {
  const zonas: Record<ZonaBloque, BloqueDiseno[]> = { portada: [], encabezado: [], cuerpo: [], pie: [] };
  for (const b of bloques) zonas[b.zona]?.push(b);
  return zonas;
}

/**
 * Mueve un bloque dentro de su zona (cuadrícula magnética: las posiciones
 * válidas son los huecos entre vecinos; nunca se enciman ni salen de zona).
 * Devuelve la lista nueva o null si no hay movimiento posible.
 */
export function moverBloque(
  bloques: BloqueDiseno[],
  id: string,
  direccion: -1 | 1
): BloqueDiseno[] | null {
  const indice = bloques.findIndex((b) => b.id === id);
  if (indice === -1) return null;
  // Vecino anterior/siguiente dentro de la misma zona.
  let objetivo = -1;
  if (direccion === -1) {
    for (let i = indice - 1; i >= 0; i--) {
      if (bloques[i].zona === bloques[indice].zona) {
        objetivo = i;
        break;
      }
    }
  } else {
    for (let i = indice + 1; i < bloques.length; i++) {
      if (bloques[i].zona === bloques[indice].zona) {
        objetivo = i;
        break;
      }
    }
  }
  if (objetivo === -1) return null;
  const copia = [...bloques];
  const [movido] = copia.splice(indice, 1);
  copia.splice(objetivo, 0, movido);
  return copia;
}

/** Cambia un bloque de zona (portada, encabezado, cuerpo o pie). */
export function moverBloqueAZona(
  bloques: BloqueDiseno[],
  id: string,
  zona: ZonaBloque
): BloqueDiseno[] | null {
  const indice = bloques.findIndex((b) => b.id === id);
  if (indice === -1 || bloques[indice].zona === zona) return null;
  const copia = bloques.map((b) => (b.id === id ? { ...b, zona } : b));
  // Reordena: el bloque va al final de su nueva zona para no partir contenido.
  const movido = copia[indice];
  const resto = copia.filter((b) => b.id !== id);
  let insertar = resto.length;
  for (let i = resto.length - 1; i >= 0; i--) {
    if (resto[i].zona === zona) {
      insertar = i + 1;
      break;
    }
  }
  resto.splice(insertar, 0, movido);
  return resto;
}

export function alternarVisibilidadBloque(
  bloques: BloqueDiseno[],
  id: string
): BloqueDiseno[] | null {
  if (!bloques.some((b) => b.id === id)) return null;
  return bloques.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b));
}

export function aplicarEstiloBloque(
  bloques: BloqueDiseno[],
  id: string,
  parche: EstiloBloque
): BloqueDiseno[] | null {
  if (!bloques.some((b) => b.id === id)) return null;
  return bloques.map((b) =>
    b.id === id ? { ...b, estilo: { ...(b.estilo ?? {}), ...parche } } : b
  );
}

/** Fija una redacción solo para este documento (override explícito). */
export function establecerTextoLocal(
  bloques: BloqueDiseno[],
  id: string,
  texto: string
): BloqueDiseno[] | null {
  if (!bloques.some((b) => b.id === id)) return null;
  return bloques.map((b) =>
    b.id === id ? { ...b, texto, usarTextoLocal: true } : b
  );
}

/** Vuelve a tomar el texto del currículo (quita el override). */
export function quitarTextoLocal(bloques: BloqueDiseno[], id: string): BloqueDiseno[] | null {
  if (!bloques.some((b) => b.id === id)) return null;
  return bloques.map((b) => (b.id === id ? { ...b, usarTextoLocal: false } : b));
}

/** Agrega un bloque manual al final de una zona. */
export function agregarBloque(
  bloques: BloqueDiseno[],
  tipo: TipoBloque,
  zona: ZonaBloque,
  parcial: Partial<BloqueDiseno> = {}
): BloqueDiseno[] {
  if (bloques.length >= 200) return bloques;
  const nuevo = bloque(tipo, zona, parcial);
  // Los bloques nuevos van al final de su zona.
  const copia = [...bloques];
  let insertar = copia.length;
  for (let i = copia.length - 1; i >= 0; i--) {
    if (copia[i].zona === zona) {
      insertar = i + 1;
      break;
    }
  }
  copia.splice(insertar, 0, nuevo);
  return copia;
}

export function quitarBloque(bloques: BloqueDiseno[], id: string): BloqueDiseno[] | null {
  if (!bloques.some((b) => b.id === id)) return null;
  return bloques.filter((b) => b.id !== id);
}

/* ------------------------------------------------------------------ */
/* Activos de marca                                                    */
/* ------------------------------------------------------------------ */

export const MIMES_IMAGEN = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const TOPE_ACTIVO_BYTES = 1024 * 1024; // 1 MB por archivo
export const TOPE_KIT_BYTES = 3 * 1024 * 1024; // 3 MB por kit

/** Valida un archivo antes de aceptarlo en el kit. No lo almacena. */
export function validarActivo(
  nombre: string,
  mime: string,
  tamanoBytes: number
): { ok: true } | { ok: false; motivo: string } {
  if (!MIMES_IMAGEN.includes(mime)) {
    return { ok: false, motivo: `Formato no admitido (${mime || "desconocido"}). Usa PNG, JPG, WebP o SVG.` };
  }
  if (!Number.isFinite(tamanoBytes) || tamanoBytes <= 0) {
    return { ok: false, motivo: "El archivo está vacío." };
  }
  if (tamanoBytes > TOPE_ACTIVO_BYTES) {
    return { ok: false, motivo: `“${nombre}” pesa más de 1 MB. Comprímelo antes de cargarlo.` };
  }
  return { ok: true };
}

/** Rechaza SVG con contenido activo: scripts, manejadores o referencias. */
export function esSvgSeguro(textoSvg: string): boolean {
  const t = textoSvg.toLowerCase();
  if (t.includes("<script")) return false;
  if (/on[a-z]+\s*=/.test(t)) return false;
  if (t.includes("javascript:")) return false;
  if (t.includes("<foreignobject")) return false;
  if (t.includes("<iframe") || t.includes("<object") || t.includes("<embed")) return false;
  return true;
}

export function tamanoActivosKit(kit: BrandKit): number {
  return kit.activos.reduce((a, x) => a + (Number.isFinite(x.tamanoBytes) ? x.tamanoBytes : 0), 0);
}

/* ------------------------------------------------------------------ */
/* Validación del diseño                                               */
/* ------------------------------------------------------------------ */

/** Problemas legibles. Lista vacía = diseño utilizable. */
export function validarDiseno(diseno: DisenoDocumento, datos: DatosDiseno): string[] {
  const problemas: string[] = [];
  if (diseno.bloques.length === 0) {
    problemas.push("El diseño no tiene bloques: agrega al menos uno.");
    return problemas;
  }
  const ids = new Set<string>();
  for (const b of diseno.bloques) {
    if (ids.has(b.id)) problemas.push(`Hay bloques con id duplicado (${b.id}).`);
    ids.add(b.id);
    if (b.tipo === "imagen" && !b.activoId) {
      problemas.push("Un bloque de imagen no tiene activo asignado.");
    }
    if (b.refContenido && !b.usarTextoLocal) {
      const resuelto = resolverContenido(b.refContenido, datos);
      if (resuelto.length === 0) {
        problemas.push(`“${b.refContenido}” no tiene contenido todavía en el currículo.`);
      }
    }
  }
  return problemas.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Guardas                                                             */
/* ------------------------------------------------------------------ */

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function esHex(v: unknown): boolean {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function esEstilo(v: unknown): v is EstiloBloque {
  if (!esRegistro(v)) return false;
  if (v.fuente !== undefined && v.fuente !== "serif" && v.fuente !== "sans" && v.fuente !== "mono") return false;
  if (v.alineacion !== undefined && !["izquierda", "centrado", "derecha"].includes(v.alineacion as string)) return false;
  if (v.color !== undefined && !esHex(v.color)) return false;
  for (const k of ["tamanoPt", "espacioAntesPt", "espacioDespuesPt", "interlineado"] as const) {
    if (v[k] !== undefined && (typeof v[k] !== "number" || !Number.isFinite(v[k]))) return false;
  }
  return true;
}

const TIPOS_BLOQUE: readonly string[] = [
  "titulo", "subtitulo", "parrafo", "lista", "cita", "tabla", "imagen",
  "regla", "espacio", "salto", "firma"
];
const ZONAS: readonly string[] = ["portada", "encabezado", "cuerpo", "pie"];

function esBloque(v: unknown): v is BloqueDiseno {
  if (!esRegistro(v)) return false;
  return (
    typeof v.id === "string" &&
    Boolean(v.id.trim()) &&
    TIPOS_BLOQUE.includes(v.tipo as string) &&
    ZONAS.includes(v.zona as string) &&
    (v.refContenido === undefined || v.refContenido === null || typeof v.refContenido === "string") &&
    (v.texto === undefined || typeof v.texto === "string") &&
    (v.usarTextoLocal === undefined || typeof v.usarTextoLocal === "boolean") &&
    (v.estilo === undefined || esEstilo(v.estilo)) &&
    (v.activoId === undefined || v.activoId === null || typeof v.activoId === "string") &&
    typeof v.visible === "boolean"
  );
}

export function esDisenoDocumento(v: unknown): v is DisenoDocumento {
  if (!esRegistro(v)) return false;
  return (
    typeof v.id === "string" &&
    (v.nivel === "macro" || v.nivel === "meso" || v.nivel === "micro") &&
    typeof v.documentoId === "string" &&
    typeof v.nombre === "string" &&
    typeof v.plantillaId === "string" &&
    Array.isArray(v.bloques) &&
    (v.bloques as unknown[]).every(esBloque)
  );
}

export function esBrandKit(v: unknown): v is BrandKit {
  if (!esRegistro(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.nombre === "string" &&
    esRegistro(v.colores) &&
    Array.isArray(v.activos) &&
    (v.activos as unknown[]).every(
      (a) =>
        esRegistro(a) &&
        typeof a.id === "string" &&
        typeof a.nombre === "string" &&
        typeof a.mime === "string" &&
        typeof a.dataUrl === "string" &&
        typeof a.tamanoBytes === "number"
    )
  );
}
