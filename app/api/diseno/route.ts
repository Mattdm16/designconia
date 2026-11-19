import type { NextRequest } from "next/server";

import { BASE_URL_POR_DEFECTO, MODELO_POR_DEFECTO } from "@/lib/prompt";
import { ESQUEMA_PROPUESTA_DISENO, SYSTEM_PROMPT_DISENO, turnoDiseno } from "@/lib/promptDiseno";
import { esBrandKit, esDisenoDocumento, PLANTILLAS_BASE } from "@/lib/diseno";
import { parsearPropuestaDiseno } from "@/lib/propuestaDiseno";
import { resolverClaveIA } from "@/lib/clave";
import { textoLegible } from "@/lib/errores";
import { registrarTraza } from "@/lib/traza";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La propuesta es chica: no necesita streaming. */
const TIMEOUT_MS = 60_000;
const MAX_OPS = 30;

type Cuerpo = {
  instruccion?: unknown;
  diseno?: unknown;
  kit?: unknown;
};

function errorJson(status: number, code: string, mensaje: string) {
  registrarTraza({
    en: new Date().toISOString(),
    ok: false,
    upstream: status,
    error: `${code}: ${mensaje}`.slice(0, 200)
  });
  return Response.json({ error: { code, mensaje } }, { status });
}

/** Traduce el estado HTTP de DeepSeek a algo accionable en español. */
function mensajeDeEstado(status: number, detalle: string, clavePropia: boolean): string {
  const dondeRevisar = clavePropia
    ? "Revisa tu clave en «Clave IA» (espacio Proyecto › Asistente)."
    : "Revisa DEEPSEEK_API_KEY en .env.local.";
  const cola = detalle ? ` Detalle del proveedor: ${detalle.slice(0, 300)}` : "";
  if (status === 401) return `La API key de DeepSeek fue rechazada (401). ${dondeRevisar}${cola}`;
  if (status === 402) return `La cuenta de DeepSeek no tiene saldo disponible (402). Recarga crédito o cambia de clave.${cola}`;
  if (status === 429) return `Se alcanzó el límite de peticiones de DeepSeek (429). Espera unos segundos y reintenta.${cola}`;
  if (status >= 500) return `DeepSeek devolvió un error interno (${status}). Reintenta en un momento.${cola}`;
  return `DeepSeek respondió ${status}.${cola}`;
}

function comoTexto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
}

export async function POST(req: NextRequest) {
  const { clave, esPropia } = resolverClaveIA(
    req.headers.get("x-clave-ia"),
    process.env.DEEPSEEK_API_KEY
  );
  if (!clave) {
    return errorJson(
      503,
      "sin_clave",
      "Falta la clave de DeepSeek. Añade tu clave en «Clave IA» o configura DEEPSEEK_API_KEY en .env.local y reinicia el servidor de desarrollo."
    );
  }

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await req.json()) as Cuerpo;
  } catch {
    return errorJson(400, "cuerpo_invalido", "El cuerpo de la petición no es JSON válido.");
  }

  const instruccion = comoTexto(cuerpo.instruccion, 2000);
  if (!instruccion) {
    return errorJson(400, "sin_instruccion", "Describe qué quieres ajustar del diseño.");
  }
  if (!esDisenoDocumento(cuerpo.diseno)) {
    return errorJson(400, "diseno_invalido", "El diseño actual no es válido. Recarga el estudio e inténtalo de nuevo.");
  }
  if (!esBrandKit(cuerpo.kit)) {
    return errorJson(400, "kit_invalido", "El kit de marca actual no es válido. Recarga el estudio e inténtalo de nuevo.");
  }
  const diseno = cuerpo.diseno;
  const kit = cuerpo.kit;

  // Resumen compacto: la IA solo necesita ids, tipos, zonas y estilos base.
  const bloques = diseno.bloques
    .map((b) => {
      const contenido = b.usarTextoLocal
        ? (b.texto ?? "").trim().slice(0, 40) || "texto local"
        : b.refContenido || b.texto?.trim().slice(0, 40) || b.tipo;
      return `- ${b.id} · ${b.tipo} · ${b.zona} · ${b.visible ? "visible" : "oculto"} · ${contenido}`;
    })
    .join("\n");
  const plantillas = PLANTILLAS_BASE.map((p) => `- ${p.id}: ${p.nombre}. ${p.descripcion}`).join("\n");

  const turno = turnoDiseno(instruccion, {
    nivel: diseno.nivel,
    plantillaId: diseno.plantillaId,
    pagina: `${diseno.pagina.tamano} ${diseno.pagina.orientacion}, márgenes ${diseno.pagina.margenesMm.arriba}/${diseno.pagina.margenesMm.abajo}/${diseno.pagina.margenesMm.izq}/${diseno.pagina.margenesMm.der} mm, encabezado “${diseno.encabezadoTexto.trim() || "—"}”, pie “${diseno.pieTexto.trim() || "—"}”${diseno.mostrarNumeroPagina ? ", numerado" : ""}`,
    kit: `primario ${kit.colores.primario}, secundario ${kit.colores.secundario}, acento ${kit.colores.acento}; títulos ${kit.fuenteTitulos}, cuerpo ${kit.fuenteCuerpo}; ${kit.activos.length} activos`,
    bloques: bloques || "(sin bloques)",
    plantillas
  });

  const base = (process.env.DEEPSEEK_BASE_URL?.trim() || BASE_URL_POR_DEFECTO).replace(/\/+$/, "");
  const modelo = process.env.DEEPSEEK_MODEL?.trim() || MODELO_POR_DEFECTO;

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
  const abortar = () => control.abort();
  req.signal.addEventListener("abort", abortar);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${clave}` },
      signal: control.signal,
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT_DISENO}\n\nESQUEMA DE RESPUESTA:\n${ESQUEMA_PROPUESTA_DISENO}` },
          { role: "user", content: turno }
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: 4000
      })
    });
  } catch (error) {
    clearTimeout(reloj);
    req.signal.removeEventListener("abort", abortar);
    if (req.signal.aborted) return errorJson(499, "cancelado", "La petición fue cancelada.");
    const esTimeout = error instanceof Error && error.name === "AbortError";
    return errorJson(
      esTimeout ? 504 : 502,
      esTimeout ? "timeout" : "red",
      esTimeout
        ? "DeepSeek tardó más de 60 segundos. Pide una modificación más acotada."
        : "No se pudo contactar a DeepSeek. Revisa tu conexión e inténtalo de nuevo."
    );
  } finally {
    clearTimeout(reloj);
    req.signal.removeEventListener("abort", abortar);
  }

  if (!respuesta.ok) {
    let detalle = "";
    try {
      detalle = textoLegible(await respuesta.text());
    } catch {
      /* sin detalle */
    }
    return errorJson(respuesta.status, "proveedor", mensajeDeEstado(respuesta.status, detalle, esPropia));
  }

  let bruto = "";
  try {
    const json = (await respuesta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    bruto = json.choices?.[0]?.message?.content ?? "";
  } catch {
    return errorJson(502, "respuesta_invalida", "DeepSeek devolvió una respuesta ilegible. Vuelve a intentarlo.");
  }

  const parseo = parsearPropuestaDiseno(bruto);
  if (!parseo.ok) {
    return errorJson(502, "propuesta_invalida", parseo.motivo);
  }
  if (parseo.propuesta.cambios.length > MAX_OPS) {
    return errorJson(502, "propuesta_grande", "La propuesta trae demasiados cambios. Pide una modificación más acotada.");
  }

  return Response.json({ mensaje: parseo.propuesta.mensaje, cambios: parseo.propuesta.cambios });
}
