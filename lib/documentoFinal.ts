/**
 * DesignConia — documento final de primera entrega.
 *
 * Rama `feature/entrega-plantillas-fijas`: el recolector de datos sigue
 * siendo la fuente de verdad y cada nivel (marco, programa, asignatura)
 * tiene UNA plantilla institucional fija, sin edición. Lo único que el
 * docente puede agregar son el logo y el membrete, cada uno en su lugar
 * predeterminado: el membrete abre la portada y el logo vive en el
 * encabezado. Nada de esto toca el contenido curricular: los bloques
 * resuelven por referencia (`refContenido`) con el mismo motor que el PDF.
 *
 * Todo es puro y testeable: no toca localStorage, red ni DOM.
 */

import {
  PLANTILLAS_BASE,
  type BloqueDiseno,
  type BrandKit,
  type DisenoDocumento,
  type NivelDiseno,
  type PlantillaDiseno,
  type TipoBloque,
  type ZonaBloque
} from "./diseno.ts";

/* ------------------------------------------------------------------ */
/* Plantilla fija por nivel                                            */
/* ------------------------------------------------------------------ */

/** Base compartida por nivel: carta vertical con márgenes de 25 mm. */
export const PLANTILLA_FIJA_POR_NIVEL: Record<NivelDiseno, string> = {
  macro: "institucional-clasica",
  meso: "academica-limpia",
  micro: "institucional-clasica"
};

export const ETIQUETA_PLANTILLA_FIJA: Record<NivelDiseno, string> = {
  macro: "Marco institucional — entrega",
  meso: "Programa académico — entrega",
  micro: "Asignatura — entrega"
};

/**
 * Plantilla institucional fija de un nivel: hereda los estilos de su base
 * pero congela página (carta vertical, 25 mm) y numeración. El docente no
 * puede cambiarla desde la interfaz de entrega.
 */
export function plantillaFijaPara(nivel: NivelDiseno): PlantillaDiseno {
  const base =
    PLANTILLAS_BASE.find((p) => p.id === PLANTILLA_FIJA_POR_NIVEL[nivel]) ?? PLANTILLAS_BASE[0];
  return {
    ...base,
    id: `fija-${nivel}`,
    nombre: ETIQUETA_PLANTILLA_FIJA[nivel],
    descripcion: "Plantilla institucional fija de primera entrega: no editable.",
    pagina: {
      tamano: "carta",
      orientacion: "vertical",
      margenesMm: { arriba: 25, abajo: 25, izq: 25, der: 25 },
      encabezadoTexto: "",
      pieTexto: "",
      mostrarNumeroPagina: true
    },
    estilos: { ...base.estilos }
  };
}

/* ------------------------------------------------------------------ */
/* Bloques fijos por nivel                                             */
/* ------------------------------------------------------------------ */

type DescriptorBloque = {
  tipo: TipoBloque;
  zona: ZonaBloque;
  refContenido?: string;
  texto?: string;
};

/** Estructura fija del documento final por nivel. La secuencia del Micro sí se incluye. */
export function descriptoresFijos(nivel: NivelDiseno): DescriptorBloque[] {
  const portada: DescriptorBloque[] = [
    { tipo: "titulo", zona: "portada", refContenido: "doc.nombre" },
    { tipo: "subtitulo", zona: "portada", refContenido: "doc.detalle" }
  ];
  if (nivel === "macro") {
    return [
      ...portada,
      { tipo: "titulo", zona: "cuerpo", texto: "Principios" },
      { tipo: "lista", zona: "cuerpo", refContenido: "marco.principios" },
      { tipo: "titulo", zona: "cuerpo", texto: "Orientaciones" },
      { tipo: "lista", zona: "cuerpo", refContenido: "marco.orientaciones" },
      { tipo: "titulo", zona: "cuerpo", texto: "Fuentes" },
      { tipo: "lista", zona: "cuerpo", refContenido: "marco.fuentes" }
    ];
  }
  if (nivel === "meso") {
    return [
      ...portada,
      { tipo: "titulo", zona: "cuerpo", texto: "Identidad del programa" },
      { tipo: "parrafo", zona: "cuerpo", refContenido: "doc.detalle" },
      { tipo: "titulo", zona: "cuerpo", texto: "Perfiles de ingreso y egreso" },
      { tipo: "lista", zona: "cuerpo", refContenido: "meso.perfiles" },
      { tipo: "titulo", zona: "cuerpo", texto: "Resultados del programa" },
      { tipo: "lista", zona: "cuerpo", refContenido: "meso.resultados" }
    ];
  }
  return [
    ...portada,
    { tipo: "titulo", zona: "cuerpo", texto: "Datos de identificación" },
    { tipo: "parrafo", zona: "cuerpo", refContenido: "micro.identificacion" },
    { tipo: "titulo", zona: "cuerpo", texto: "Justificación" },
    { tipo: "parrafo", zona: "cuerpo", refContenido: "micro.justificacion" },
    { tipo: "titulo", zona: "cuerpo", texto: "Objetivos" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.objetivos" },
    { tipo: "titulo", zona: "cuerpo", texto: "Contenido temático" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.unidades" },
    { tipo: "titulo", zona: "cuerpo", texto: "Secuencia didáctica" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.secuencia" },
    { tipo: "titulo", zona: "cuerpo", texto: "Metodología" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.metodologia" },
    { tipo: "titulo", zona: "cuerpo", texto: "Sistema de evaluación" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.evaluacion" },
    { tipo: "titulo", zona: "cuerpo", texto: "Bibliografía y recursos" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.bibliografia" },
    { tipo: "lista", zona: "cuerpo", refContenido: "micro.recursos" },
    {
      tipo: "firma",
      zona: "cuerpo",
      texto: "Elaboró: ____________________       Revisó: ____________________"
    }
  ];
}

/**
 * Diseño fijo en memoria para un documento: ids estables por nivel y
 * posición. No se guarda en el proyecto (solo el kit de marca se
 * persiste); cada apertura lo reconstruye igual.
 */
export function construirDisenoFijo(
  nivel: NivelDiseno,
  documentoId: string,
  nombre: string
): DisenoDocumento {
  const plantilla = plantillaFijaPara(nivel);
  const bloques: BloqueDiseno[] = descriptoresFijos(nivel).map((d, i) => ({
    id: `fijo_${nivel}_${i + 1}`,
    tipo: d.tipo,
    zona: d.zona,
    refContenido: d.refContenido ?? null,
    texto: d.texto,
    usarTextoLocal: false,
    visible: true
  }));
  return {
    id: `fijo_${nivel}_${documentoId}`,
    nivel,
    documentoId,
    nombre: nombre ? `Documento final — ${nombre}` : "Documento final",
    plantillaId: plantilla.id,
    pagina: { ...plantilla.pagina, margenesMm: { ...plantilla.pagina.margenesMm } },
    encabezadoTexto: "",
    pieTexto: "",
    mostrarNumeroPagina: true,
    bloques,
    actualizadoEn: new Date().toISOString()
  };
}

/* ------------------------------------------------------------------ */
/* Marca en lugares predeterminados                                    */
/* ------------------------------------------------------------------ */

/**
 * Los dos únicos lugares personalizables del documento final: el
 * membrete abre la portada y el logo vive en el encabezado. Si el kit no
 * trae ese activo, el lugar simplemente queda vacío (sin huecos ni
 * avisos que rompan el documento).
 */
export function aplicarMarcasFijas(
  bloquesBase: BloqueDiseno[],
  kit: BrandKit
): BloqueDiseno[] {
  const salida = [...bloquesBase];
  const membrete = kit.activos.find((a) => a.tipo === "membrete");
  if (membrete) {
    salida.unshift({
      id: "fijo_membrete",
      tipo: "imagen",
      zona: "portada",
      activoId: membrete.id,
      visible: true
    });
  }
  const logo = kit.activos.find((a) => a.tipo === "logo");
  if (logo) {
    const bloqueLogo: BloqueDiseno = {
      id: "fijo_logo",
      tipo: "imagen",
      zona: "encabezado",
      activoId: logo.id,
      visible: true
    };
    let insertar = salida.findIndex((b) => b.zona === "encabezado");
    if (insertar === -1) {
      insertar = salida.findIndex((b) => b.zona !== "portada");
      if (insertar === -1) insertar = salida.length;
    }
    salida.splice(insertar, 0, bloqueLogo);
  }
  return salida;
}
