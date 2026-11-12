/**
 * DesignConia — persistencia remota opcional en Supabase.
 *
 * Un solo docente, una sola fila: cada cuenta guarda su proyecto V3 completo
 * en `proyectos.datos` (JSONB) con `owner_id = auth.uid()`. Las políticas RLS
 * impiden leer o escribir proyectos ajenos.
 *
 * Sin variables de entorno no hay cliente: la app sigue 100% local. El
 * módulo nunca toca localStorage ni el estado de la página; solo construye
 * y valida el payload que viaja a la nube.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { esEstadoGuardadoV3, type EstadoGuardadoV3 } from "./proyecto.ts";

/** El backend remoto está configurado (URL + clave pública). */
export function nubeDisponible(): boolean {
  try {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  } catch {
    return false;
  }
}

let cliente: SupabaseClient | null = null;

/** Cliente perezoso: solo se crea cuando hay configuración. */
export async function obtenerClienteNube(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anon) return null;
  if (!cliente) {
    const { createClient } = await import("@supabase/supabase-js");
    cliente = createClient(url, anon);
  }
  return cliente;
}

/** Fila mínima de la tabla `proyectos` (ver supabase/migraciones). */
export type FilaProyecto = {
  owner_id: string;
  datos: EstadoGuardadoV3;
  app_version: string;
};

/** Construye la fila a subir. Lanza si el estado no es un V3 válido. */
export function construirFilaProyecto(
  ownerId: string,
  estado: EstadoGuardadoV3,
  appVersion: string
): FilaProyecto {
  if (!ownerId.trim()) throw new Error("Falta el usuario propietario.");
  if (!esEstadoGuardadoV3(estado)) throw new Error("El estado local no es un proyecto V3 válido.");
  return { owner_id: ownerId, datos: estado, app_version: appVersion };
}

/** Valida lo que baja de la nube antes de tocar el estado local. */
export function validarFilaProyecto(v: unknown): EstadoGuardadoV3 | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const datos = (v as Record<string, unknown>).datos;
  return esEstadoGuardadoV3(datos) ? datos : null;
}

/** Envía un enlace mágico al correo del docente (sin contraseña). */
export async function iniciarSesionNube(
  c: SupabaseClient,
  email: string
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const limpio = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(limpio)) return { ok: false, motivo: "Escribe un correo válido." };
  const { error } = await c.auth.signInWithOtp({ email: limpio });
  if (error) return { ok: false, motivo: error.message || "No se pudo enviar el enlace." };
  return { ok: true };
}

export async function cerrarSesionNube(c: SupabaseClient): Promise<void> {
  await c.auth.signOut();
}

/** Sube el proyecto actual, reemplazando la copia remota del docente. */
export async function subirProyecto(
  c: SupabaseClient,
  estado: EstadoGuardadoV3,
  appVersion: string
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const { data } = await c.auth.getSession();
  const ownerId = data.session?.user?.id ?? "";
  let fila: FilaProyecto;
  try {
    fila = construirFilaProyecto(ownerId, estado, appVersion);
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "Estado inválido." };
  }
  const { error } = await c.from("proyectos").upsert(fila, { onConflict: "owner_id" });
  if (error) return { ok: false, motivo: error.message || "No se pudo subir el proyecto." };
  return { ok: true };
}

/** Baja la copia remota del docente, validada antes de entregarla. */
export async function bajarProyecto(
  c: SupabaseClient
): Promise<{ ok: true; estado: EstadoGuardadoV3 } | { ok: false; motivo: string }> {
  const { data } = await c.auth.getSession();
  if (!data.session) return { ok: false, motivo: "Inicia sesión primero." };
  const { data: fila, error } = await c
    .from("proyectos")
    .select("datos")
    .eq("owner_id", data.session.user.id)
    .maybeSingle();
  if (error) return { ok: false, motivo: error.message || "No se pudo descargar el proyecto." };
  if (!fila) return { ok: false, motivo: "Todavía no hay copia en la nube para esta cuenta." };
  const estado = validarFilaProyecto(fila);
  if (!estado) return { ok: false, motivo: "La copia remota no es un proyecto válido." };
  return { ok: true, estado };
}
