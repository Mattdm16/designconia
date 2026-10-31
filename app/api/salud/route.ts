import { NextResponse } from "next/server";

import { normalizarClave, textoLegible } from "@/lib/errores";
import { BASE_URL_POR_DEFECTO, MODELO_POR_DEFECTO } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type EstadoConexion = "sin_clave" | "ok" | "clave_invalida" | "sin_saldo" | "red" | "proveedor";

type CuerpoSalud = {
  conexion: EstadoConexion;
  /** Si el asistente debería intentar generar. */
  ia: boolean;
  modelo: string;
  mensaje: string;
};

/** El resultado se recuerda unos segundos: el cliente consulta al montar. */
const VIGENCIA_MS = 30_000;
let cache: { en: number; cuerpo: CuerpoSalud } | null = null;

/**
 * Comprueba la clave contra DeepSeek con una llamada barata (listar modelos).
 * No genera nada ni consume tokens: es un GET que solo exige autenticación.
 *
 * Vale la pena el viaje: sin esto, una clave rechazada solo se descubre al
 * enviar el primer mensaje, que es justo cuando el docente está trabajando.
 */
async function comprobar(clave: string, modelo: string): Promise<CuerpoSalud> {
  const base = (process.env.DEEPSEEK_BASE_URL?.trim() || BASE_URL_POR_DEFECTO).replace(/\/+$/, "");

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), 10_000);

  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${clave}` },
      signal: control.signal,
      cache: "no-store"
    });

    if (res.ok) {
      return { conexion: "ok", ia: true, modelo, mensaje: `Clave válida. Asistente conectado · ${modelo}.` };
    }

    const detalle = textoLegible(await res.text());
    const cola = detalle ? ` Detalle del proveedor: ${detalle}` : "";

    if (res.status === 401 || res.status === 403) {
      return {
        conexion: "clave_invalida",
        ia: false,
        modelo,
        mensaje: `DeepSeek rechazó la clave (${res.status}). Revisa DEEPSEEK_API_KEY en .env.local y reinicia el servidor.${cola}`
      };
    }
    if (res.status === 402) {
      return {
        conexion: "sin_saldo",
        ia: false,
        modelo,
        mensaje: `La cuenta no tiene saldo disponible (402). Recarga crédito en DeepSeek.${cola}`
      };
    }
    return {
      conexion: "proveedor",
      ia: true,
      modelo,
      mensaje: `DeepSeek respondió ${res.status} al comprobar la clave. El asistente puede intentar generar igualmente.${cola}`
    };
  } catch (e) {
    const esTimeout = e instanceof Error && e.name === "AbortError";
    return {
      conexion: "red",
      ia: true,
      modelo,
      mensaje: esTimeout
        ? "DeepSeek no respondió en 10 segundos al comprobar la clave. Puede ser tu conexión."
        : "No se pudo contactar a DeepSeek para comprobar la clave. Puede ser tu conexión o un bloqueo de red."
    };
  } finally {
    clearTimeout(reloj);
  }
}

export async function GET() {
  const clave = normalizarClave(process.env.DEEPSEEK_API_KEY);
  const modelo = process.env.DEEPSEEK_MODEL?.trim() || MODELO_POR_DEFECTO;

  if (!clave) {
    return NextResponse.json<CuerpoSalud>({
      conexion: "sin_clave",
      ia: false,
      modelo,
      mensaje: "Falta DEEPSEEK_API_KEY. Añádela a .env.local y reinicia el servidor para conversar con la IA."
    });
  }

  const ahora = Date.now();
  if (cache && ahora - cache.en < VIGENCIA_MS) return NextResponse.json(cache.cuerpo);

  const cuerpo = await comprobar(clave, modelo);
  cache = { en: ahora, cuerpo };
  return NextResponse.json(cuerpo);
}
