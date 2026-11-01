import type { NextRequest } from "next/server";

import {
  BASE_URL_POR_DEFECTO,
  MODELO_POR_DEFECTO,
  SYSTEM_PROMPT,
  recortarHistoria,
  turnoDocente
} from "@/lib/prompt";
import { SYSTEM_PROMPT_INICIO, turnoInicio } from "@/lib/promptInicio";
import { SYSTEM_PROMPT_MACRO, turnoDocenteMacro } from "@/lib/promptMacro";
import { marcoVacio, normalizarMarco } from "@/lib/macro";
import { SYSTEM_PROMPT_MESO, turnoDocenteMeso, type MarcoDisponible } from "@/lib/promptMeso";
import { normalizarPrograma, programaVacio } from "@/lib/meso";
import { normalizarClave, textoLegible } from "@/lib/errores";
import type { MarcoEducativoInstitucional, ProgramaAcademico } from "@/lib/proyecto";
import { microcurriculoVacio, normalizarMicrocurriculo, type Microcurriculo } from "@/lib/schema";
import { registrarTraza, type Traza } from "@/lib/traza";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Corta la llamada a DeepSeek si el modelo se queda colgado. */
const TIMEOUT_MS = 60_000;

type Turno = { role: "user" | "assistant"; content: string };

type Cuerpo = {
  mensaje?: unknown;
  microcurriculo?: unknown;
  historia?: unknown;
  /** Nivel al que va dirigido el turno. Sin él, el comportamiento Micro queda intacto. */
  modulo?: unknown;
  /** Documento del nivel Macro, solo cuando `modulo` es "macro". */
  marco?: unknown;
  /** Documento del nivel Meso, solo cuando `modulo` es "meso". */
  programa?: unknown;
  /** Marcos del proyecto para citar por id, solo en el nivel Meso. */
  marcos?: unknown;
  /** Documentos existentes (para que el inicio resuelva "sigue con el marco"). */
  documentos?: unknown;
  /** Extractos de PDFs adjuntos como evidencia (texto + páginas, nunca el binario). */
  fuentesPdf?: unknown;
};

function errorJson(status: number, code: string, mensaje: string) {
  // Los fallos tempranos también dejan huella: si no, el diagnóstico parece
  // vacío justo cuando algo va mal.
  registrarTraza({
    en: new Date().toISOString(),
    ok: false,
    upstream: status,
    error: `${code}: ${mensaje}`.slice(0, 200)
  });
  return Response.json({ error: { code, mensaje } }, { status });
}

/** Traduce el estado HTTP de DeepSeek a algo accionable en español. */
function mensajeDeEstado(status: number, detalle: string): { code: string; mensaje: string } {
  const cola = detalle ? ` Detalle del proveedor: ${detalle.slice(0, 300)}` : "";
  switch (status) {
    case 401:
      return {
        code: "clave_invalida",
        mensaje: `La API key de DeepSeek fue rechazada (401). Revisa DEEPSEEK_API_KEY en .env.local.${cola}`
      };
    case 402:
      return {
        code: "sin_saldo",
        mensaje: `La cuenta de DeepSeek no tiene saldo disponible (402). Recarga crédito o cambia de clave.${cola}`
      };
    case 422:
      return {
        code: "peticion_invalida",
        mensaje: `DeepSeek rechazó la petición por su contenido (422). Reformula la petición.${cola}`
      };
    case 429:
      return {
        code: "limite",
        mensaje: `Se alcanzó el límite de peticiones de DeepSeek (429). Espera unos segundos y reintenta.${cola}`
      };
    case 400:
      return {
        code: "peticion_invalida",
        mensaje: `DeepSeek rechazó la petición (400).${cola}`
      };
    default:
      if (status >= 500) {
        return {
          code: "proveedor",
          mensaje: `DeepSeek devolvió un error interno (${status}). Reintenta en un momento.${cola}`
        };
      }
      return { code: "proveedor", mensaje: `DeepSeek respondió ${status}.${cola}` };
  }
}

/**
 * Interpreta el `microcurriculo` entrante como borrador.
 *
 * A propósito NO exigimos la forma completa de un microcurrículo guardado: el
 * folio lo genera el cliente, y un borrador sin folio sigue siendo un borrador
 * real que hay que preservar. Basta con que traiga contenido.
 */
function comoBorrador(v: unknown): Microcurriculo | null {
  const normalizado = normalizarMicrocurriculo(v);
  return microcurriculoVacio(normalizado) ? null : normalizado;
}

/**
 * Interpreta el `marco` entrante como documento del nivel Macro.
 *
 * Igual que el borrador Micro, un marco vacío equivale a no tener documento:
 * la conversación va sin ficha y el modelo no puede inventarse que la tiene.
 */
function comoMarco(v: unknown): MarcoEducativoInstitucional | null {
  const normalizado = normalizarMarco(v);
  return marcoVacio(normalizado) ? null : normalizado;
}

/**
 * Interpreta el `programa` entrante como documento del nivel Meso.
 *
 * Igual que los otros niveles, un programa vacío equivale a no tener
 * documento: la conversación va sin ficha.
 */
function comoPrograma(v: unknown): ProgramaAcademico | null {
  const normalizado = normalizarPrograma(v);
  return programaVacio(normalizado) ? null : normalizado;
}

/** Documentos existentes que el cliente declara para el enrutador de inicio. */
function comoDocumentosExistentes(v: unknown): { nivel: "macro" | "meso" | "micro"; nombre: string }[] {
  if (!Array.isArray(v)) return [];
  const salida: { nivel: "macro" | "meso" | "micro"; nombre: string }[] = [];
  for (const crudo of v) {
    if (typeof crudo !== "object" || crudo === null || Array.isArray(crudo)) continue;
    const o = crudo as Record<string, unknown>;
    if ((o.nivel === "macro" || o.nivel === "meso" || o.nivel === "micro") && typeof o.nombre === "string" && o.nombre.trim()) {
      salida.push({ nivel: o.nivel, nombre: o.nombre.trim().slice(0, 120) });
    }
  }
  return salida.slice(0, 20);
}

export type FuentePdfContexto = { titulo: string; paginas: number; extractos: string[] };

/** Extractos de PDF que el cliente adjunta como evidencia (con topes). */
function comoFuentesPdf(v: unknown): FuentePdfContexto[] {
  if (!Array.isArray(v)) return [];
  const salida: FuentePdfContexto[] = [];
  for (const crudo of v) {
    if (typeof crudo !== "object" || crudo === null || Array.isArray(crudo)) continue;
    const o = crudo as Record<string, unknown>;
    if (typeof o.titulo !== "string" || !o.titulo.trim()) continue;
    const extractos = Array.isArray(o.extractos)
      ? o.extractos.filter((e): e is string => typeof e === "string" && e.trim().length > 0).map((e) => e.slice(0, 1200)).slice(0, 6)
      : [];
    if (extractos.length === 0) continue;
    const paginas = typeof o.paginas === "number" && Number.isFinite(o.paginas) ? Math.floor(o.paginas) : 0;
    salida.push({ titulo: o.titulo.trim().slice(0, 120), paginas, extractos });
  }
  return salida.slice(0, 3);
}

/** Bloque de evidencia que se añade al turno cuando hay PDFs adjuntos. */
function bloqueFuentesPdf(fuentes: FuentePdfContexto[]): string {
  if (fuentes.length === 0) return "";
  const partes = fuentes.map(
    (f) => `[${f.titulo} (${f.paginas} págs.)]\n${f.extractos.join("\n")}`
  );
  return (
    `\n\nFUENTES APORTADAS POR EL DOCENTE (PDF, solo lectura):\n${partes.join("\n\n").slice(0, 8000)}\n\n` +
    "Si afirmas algo que salga de ellas, cita «título, p. N». Si el PDF no contiene evidencia suficiente, dilo y pide precisión. " +
    "Nunca presentes una afirmación como oficial solo porque venga de un adjunto."
  );
}

/** Marcos que el cliente declara para poder citarlos por id en el nivel Meso. */
function comoMarcosDisponibles(v: unknown): MarcoDisponible[] {
  if (!Array.isArray(v)) return [];
  const salida: MarcoDisponible[] = [];
  for (const crudo of v) {
    if (typeof crudo !== "object" || crudo === null || Array.isArray(crudo)) continue;
    const o = crudo as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id.trim() || typeof o.nombre !== "string") continue;
    salida.push({ id: o.id.trim(), nombre: o.nombre });
  }
  return salida.slice(0, 20);
}

function leerHistoria(v: unknown): Turno[] {
  if (!Array.isArray(v)) return [];
  const salida: Turno[] = [];
  for (const t of v) {
    if (typeof t !== "object" || t === null) continue;
    const o = t as Record<string, unknown>;
    const role = o.role === "assistant" ? "assistant" : o.role === "user" ? "user" : null;
    const content = typeof o.content === "string" ? o.content.trim() : "";
    if (role && content) salida.push({ role, content });
  }
  return recortarHistoria(salida);
}

/** Extrae el texto de error que devuelve DeepSeek, sin reventar si no es JSON. */
async function detalleDeError(res: Response): Promise<string> {
  try {
    return textoLegible(await res.text());
  } catch {
    return "";
  }
}

/**
 * Últimas peticiones vistas por este proceso: se consultan desde
 * /api/diagnostico para explicar una respuesta vacía sin la consola.
 */
export async function POST(req: NextRequest) {
  const clave = normalizarClave(process.env.DEEPSEEK_API_KEY);
  if (!clave) {
    return errorJson(
      503,
      "sin_clave",
      "Falta la clave de DeepSeek. Añade DEEPSEEK_API_KEY a tu .env.local y reinicia el servidor de desarrollo."
    );
  }

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await req.json()) as Cuerpo;
  } catch {
    return errorJson(400, "cuerpo_invalido", "El cuerpo de la petición no es JSON válido.");
  }

  const mensajeUsuario = typeof cuerpo.mensaje === "string" ? cuerpo.mensaje.trim() : "";
  if (!mensajeUsuario) {
    return errorJson(400, "sin_mensaje", "Falta la petición del docente.");
  }
  if (mensajeUsuario.length > 4000) {
    return errorJson(400, "mensaje_largo", "La petición es demasiado larga. Divídela en partes.");
  }

  // Ramas por nivel: el cliente indica el nivel y manda solo ese documento.
  // Sin `modulo`, el comportamiento Micro queda intacto.
  const esMacro = cuerpo.modulo === "macro";
  const esMeso = cuerpo.modulo === "meso";
  const esInicio = cuerpo.modulo === "inicio";

  // El documento es OPCIONAL: si no existe todavía, la conversación va sin
  // ficha y el modelo no puede inventarse que la tiene.
  const borrador = esMacro || esMeso || esInicio ? null : comoBorrador(cuerpo.microcurriculo);
  const marcoBase = esMacro ? comoMarco(cuerpo.marco) : null;
  const programaBase = esMeso ? comoPrograma(cuerpo.programa) : null;
  const marcosDisponibles = esMeso ? comoMarcosDisponibles(cuerpo.marcos) : [];
  const documentosExistentes = esInicio ? comoDocumentosExistentes(cuerpo.documentos) : [];
  const fuentesPdf = comoFuentesPdf(cuerpo.fuentesPdf);

  const turnoBase = esInicio
    ? turnoInicio(mensajeUsuario, documentosExistentes)
    : esMacro
      ? turnoDocenteMacro(mensajeUsuario, marcoBase)
      : esMeso
        ? turnoDocenteMeso(mensajeUsuario, programaBase, marcosDisponibles)
        : turnoDocente(mensajeUsuario, borrador);
  const turnoUsuario = turnoBase + bloqueFuentesPdf(fuentesPdf);

  const mensajes = [
    {
      role: "system" as const,
      content: esInicio ? SYSTEM_PROMPT_INICIO : esMacro ? SYSTEM_PROMPT_MACRO : esMeso ? SYSTEM_PROMPT_MESO : SYSTEM_PROMPT
    },
    ...leerHistoria(cuerpo.historia),
    { role: "user" as const, content: turnoUsuario }
  ];

  const base = (process.env.DEEPSEEK_BASE_URL?.trim() || BASE_URL_POR_DEFECTO).replace(/\/+$/, "");
  const modelo = process.env.DEEPSEEK_MODEL?.trim() || MODELO_POR_DEFECTO;

  // El cliente puede cancelar: propagamos el abort a DeepSeek.
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
  const abortar = () => control.abort();
  req.signal.addEventListener("abort", abortar);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clave}`
      },
      signal: control.signal,
      body: JSON.stringify({
        model: modelo,
        messages: mensajes,
        stream: true,
        // El contrato exige un objeto JSON: el prompt lo describe explícitamente.
        response_format: { type: "json_object" },
        // Sin modo pensamiento: necesitamos la ficha, no la deliberación.
        thinking: { type: "disabled" },
        // Alto a propósito: una ficha microcurricular completa (varias sesiones
        // con sus tres fases, evidencias, instrumentos y rúbrica) es un JSON
        // grande, y quedarse corto produce exactamente un JSON truncado.
        // El tope del modelo es 384K.
        max_tokens: 32000
      })
    });
  } catch (error) {
    clearTimeout(reloj);
    req.signal.removeEventListener("abort", abortar);
    if (req.signal.aborted) {
      return errorJson(499, "cancelado", "La petición fue cancelada.");
    }
    const esTimeout = error instanceof Error && error.name === "AbortError";
    return errorJson(
      esTimeout ? 504 : 502,
      esTimeout ? "timeout" : "red",
      esTimeout
        ? "DeepSeek tardó más de 60 segundos. Reintenta o pide una modificación más acotada."
        : "No se pudo contactar a DeepSeek. Revisa tu conexión e inténtalo de nuevo."
    );
  }

  if (!respuesta.ok || !respuesta.body) {
    const detalle = await detalleDeError(respuesta);
    clearTimeout(reloj);
    req.signal.removeEventListener("abort", abortar);
    const { code, mensaje } = mensajeDeEstado(respuesta.status, detalle);
    return errorJson(respuesta.status, code, mensaje);
  }

  // Reenviamos el SSE de DeepSeek en un formato propio: data: {"t":"…"} y [DONE].
  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  const codificador = new TextEncoder();

  const traza: Traza = {
    en: new Date().toISOString(),
    ok: true,
    upstream: respuesta.status,
    mensajeChars: mensajeUsuario.length,
    historiaChars: mensajes.reduce((a, m) => a + m.content.length, 0),
    borradorEnviado: esMacro ? marcoBase !== null : esMeso ? programaBase !== null : borrador !== null,
    eventos: 0,
    contenido: 0,
    fin: null,
    error: null
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controlador) {
      let buffer = "";
      let cerrado = false;
      let fin: string | null = null;
      let tokens: number | null = null;
      let eventos = 0;
      let contenidoChars = 0;
      let errorArriba: string | null = null;
      /** Primeros caracteres del stream del proveedor, para saber qué mandó. */
      let crudoInicio = "";

      const enviar = (payload: string) => {
        controlador.enqueue(codificador.encode(payload));
      };

      const terminar = () => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(reloj);
        req.signal.removeEventListener("abort", abortar);

        traza.eventos = eventos;
        traza.contenido = contenidoChars;
        traza.fin = fin;
        traza.error = errorArriba;
        traza.crudoInicio = crudoInicio.slice(0, 240);
        registrarTraza(traza);

        try {
          // Aviso cuando el proveedor no mandó ni un carácter: es la única
          // forma de distinguir "vacío" de "me quedé sin red" desde el cliente.
          if (contenidoChars === 0) {
            enviar(
              `data: ${JSON.stringify({
                meta: { fin, tokens, vacio: true, error: errorArriba, eventos }
              })}\n\n`
            );
          } else if (fin || tokens !== null) {
            enviar(`data: ${JSON.stringify({ meta: { fin, tokens } })}\n\n`);
          }
          enviar("data: [DONE]\n\n");
          controlador.close();
        } catch {
          /* el cliente ya se fue */
        }
      };

      try {
        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;

          buffer += decodificador.decode(value, { stream: true });
          if (!crudoInicio && buffer) crudoInicio = buffer;

          // Los eventos SSE se separan por línea en blanco.
          let corte: number;
          while ((corte = buffer.indexOf("\n\n")) !== -1) {
            const evento = buffer.slice(0, corte);
            buffer = buffer.slice(corte + 2);

            for (const linea of evento.split("\n")) {
              if (!linea.startsWith("data:")) continue;
              const carga = linea.slice(5).trim();
              if (!carga || carga === "[DONE]") continue;

              try {
                const trozo = JSON.parse(carga) as {
                  choices?: {
                    delta?: { content?: string | null };
                    finish_reason?: string | null;
                  }[];
                  usage?: { completion_tokens?: number; prompt_tokens?: number };
                  error?: unknown;
                };
                eventos++;
                // DeepSeek puede mandar un error DENTRO del stream, con HTTP 200.
                // Antes se ignoraba y el cliente solo veía una respuesta vacía.
                if (trozo.error) {
                  errorArriba = textoLegible(trozo.error) || "error del proveedor";
                  enviar(`data: ${JSON.stringify({ meta: { error: errorArriba } })}\n\n`);
                }
                const eleccion = trozo.choices?.[0];
                const delta = eleccion?.delta?.content;
                if (delta) {
                  contenidoChars += delta.length;
                  enviar(`data: ${JSON.stringify({ t: delta })}\n\n`);
                }
                // El motivo de corte explica casi todos los JSON truncados:
                // sin esto, un "length" se veía igual que una respuesta rota.
                if (eleccion?.finish_reason) fin = eleccion.finish_reason;
                if (trozo.usage) tokens = trozo.usage.completion_tokens ?? null;
              } catch {
                // Un trozo ilegible no debe tumbar el stream completo.
              }
            }
          }
        }
        terminar();
      } catch {
        // Se interrumpió a mitad: cerramos ordenadamente sin inventar contenido.
        terminar();
      } finally {
        try {
          await lector.cancel();
        } catch {
          /* ya estaba cerrado */
        }
      }
    },
    cancel() {
      clearTimeout(reloj);
      req.signal.removeEventListener("abort", abortar);
      void lector.cancel().catch(() => undefined);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
