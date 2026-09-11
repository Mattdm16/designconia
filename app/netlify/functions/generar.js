// Netlify Function: proxy hacia la API de Gemini.
// La clave (GEMINI_API_KEY) vive solo en variables de entorno del servidor.
// Las instrucciones se incrustan en tiempo de construcción desde asistentes/*.md
// (ver app/scripts/inline-asistentes.js): lo versionado en git es lo que se ejecuta.
import { BASE_COMUN, ASISTENTES } from "../shared/asistentes.bundle.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_ANEXO_BYTES = 4 * 1024 * 1024; // 4 MB por archivo (límite efectivo Netlify con base64)
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Solo POST" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: "Servidor sin GEMINI_API_KEY configurada" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Cuerpo JSON inválido" });
  }

  const { asistente, pedido, contexto = "", anexos = [] } = body;
  if (!ASISTENTES[asistente]) return json(400, { error: `Asistente desconocido: ${asistente}` });
  if (!pedido || typeof pedido !== "string" || pedido.length > 20000) {
    return json(400, { error: "Pedido inválido" });
  }

  const parts = [
    { text: `Contexto ya validado por el docente:\n${contexto}\n\nPedido:\n${pedido}` },
  ];
  let totalBytes = 0;
  for (const a of anexos) {
    if (!a || typeof a.base64 !== "string" || typeof a.mime !== "string") {
      return json(400, { error: "Anexo inválido" });
    }
    const bytes = Math.floor(a.base64.length * 0.75);
    if (bytes > MAX_ANEXO_BYTES) {
      return json(413, { error: `El anexo ${a.nombre || ""} supera los 4 MB` });
    }
    totalBytes += bytes;
    parts.push({ inlineData: { mimeType: a.mime, data: a.base64 } });
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return json(413, { error: "Los anexos superan 5 MB en total" });
  }

  const payload = {
    system_instruction: { parts: [{ text: `${BASE_COMUN}\n\n---\n\n${ASISTENTES[asistente]}` }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.7 },
  };

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(55000),
      }
    );
  } catch (e) {
    return json(502, { error: `Sin respuesta de Gemini: ${e.message}` });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json(502, { error: data?.error?.message || `Gemini respondió ${res.status}` });
  }
  const texto = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("");
  if (!texto) return json(502, { error: "Gemini no devolvió texto" });
  return json(200, { texto });
};
