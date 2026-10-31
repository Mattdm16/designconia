import { NextResponse } from "next/server";

import { totalTrazas, ultimasTrazas } from "@/lib/traza";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico de las últimas peticiones al asistente.
 *
 * Se activa explícitamente con DESIGNCONIA_DIAGNOSTICO=1 en .env.local, para
 * que no exponga nada por defecto aunque la app se despliegue.
 */
export async function GET() {
  const activo = process.env.DESIGNCONIA_DIAGNOSTICO === "1";
  if (!activo) {
    return NextResponse.json({ activo: false, total: 0, trazas: [] });
  }
  return NextResponse.json({ activo: true, total: totalTrazas(), trazas: ultimasTrazas() });
}
