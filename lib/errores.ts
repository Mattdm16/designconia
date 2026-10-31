/**
 * Convierte lo que devuelve un proveedor en texto legible.
 *
 * Existe porque los dos errores se cometieron por separado en el servidor y en
 * el cliente: cada uno asumía UNA forma (`{ error: { message } }` y
 * `{ error: { mensaje } }`) y, cuando el otro la recibía, terminaba mostrando
 * el JSON crudo o perdiendo el detalle del proveedor. Aquí se aceptan todas las
 * formas razonables y nunca se devuelve un objeto.
 *
 * Es puro (no usa Node ni el DOM) para poder compartirse con el cliente.
 */

function deObjeto(o: Record<string, unknown>): string | null {
  // Las claves que usan los proveedores, de más específica a más genérica.
  for (const clave of ["message", "mensaje", "detail", "error_description", "description", "code"]) {
    const v = o[clave];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Texto legible a partir de cualquier valor. Cadena vacía si no hay nada útil. */
export function textoLegible(v: unknown, limite = 300): string {
  if (v === null || v === undefined) return "";

  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "";
    // A veces el cuerpo entero es un JSON en texto: se intenta una vez.
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        const anidado = textoLegible(JSON.parse(t), limite);
        if (anidado) return anidado;
      } catch {
        /* no era JSON: se usa tal cual */
      }
    }
    return t.slice(0, limite);
  }

  if (typeof v === "number" || typeof v === "boolean") return String(v);

  if (typeof v === "object") {
    const o = v as Record<string, unknown>;

    // {"error": ...} envuelto, que es la forma de DeepSeek.
    if ("error" in o) {
      const interno = textoLegible(o.error, limite);
      if (interno) return interno;
    }

    const directo = deObjeto(o);
    if (directo) return directo.slice(0, limite);

    try {
      const json = JSON.stringify(v);
      if (json && json !== "{}" && json !== "[]") return json.slice(0, limite);
    } catch {
      /* referencias circulares u otros: no hay nada que mostrar */
    }
  }

  return "";
}

/** Stderr de PowerShell u otros: normaliza una variable de entorno pegada. */
export function normalizarClave(v: string | undefined): string {
  if (!v) return "";
  return v
    .trim()
    .replace(/^["']|["']$/g, "") // comillas pegadas por accidente
    .replace(/^Bearer\s+/i, "") // el prefijo del header, si lo pegaron entero
    .trim();
}
