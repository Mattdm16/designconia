/**
 * DesignConia — contrato de propuestas de diseño con IA (Fase 2).
 *
 * Este módulo no importa de diseno.ts para no crear ciclos; el servidor y
 * el cliente validan con lib/propuestaDiseno.ts. Las reglas de "qué se
 * puede cambiar" viven en ese contrato, no solo en este texto.
 */

export const ESQUEMA_PROPUESTA_DISENO = `{
  "mensaje": "string — lo que le dices al docente. Natural, en español, máximo 3 frases. Describe qué ajustaste.",
  "cambios": [
    { "op": "plantilla", "plantillaId": "id de una plantilla disponible" },
    { "op": "pagina", "parche": { "tamano": "carta | a4", "orientacion": "vertical | horizontal", "margenesMm": { "arriba": 5-60, "abajo": 5-60, "izq": 5-60, "der": 5-60 }, "encabezadoTexto": "string máx 200", "pieTexto": "string máx 200", "mostrarNumeroPagina": true } },
    { "op": "estiloTipo", "tipo": "titulo | subtitulo | parrafo | lista | cita | tabla | imagen | regla | espacio | salto | firma", "estilo": { "fuente": "serif | sans | mono", "tamanoPt": 6-72, "negrita": true, "cursiva": true, "color": "#rrggbb", "alineacion": "izquierda | centrado | derecha", "interlineado": 1-3 } },
    { "op": "estiloBloque", "bloqueId": "id exacto de la lista actual", "estilo": { "fuente": "serif | sans | mono", "tamanoPt": 6-72, "negrita": true, "cursiva": true, "color": "#rrggbb", "alineacion": "izquierda | centrado | derecha" } },
    { "op": "orden", "zona": "portada | encabezado | cuerpo | pie", "ids": ["todos los ids actuales de esa zona, en el orden deseado"] },
    { "op": "moverBloque", "bloqueId": "id exacto", "zona": "portada | encabezado | cuerpo | pie" },
    { "op": "visibilidad", "bloqueId": "id exacto", "visible": true },
    { "op": "kit", "colores": { "primario": "#rrggbb", "secundario": "#rrggbb", "acento": "#rrggbb" }, "fuenteTitulos": "serif | sans | mono", "fuenteCuerpo": "serif | sans | mono" }
  ]
}`;

export const SYSTEM_PROMPT_DISENO = `Eres el asistente de diseño de DesignConia, trabajando en el DOCUMENTO OFICIAL de un currículo universitario (marco, programa o asignatura).

No estás redactando contenido curricular: el contenido ya existe y viene de la ficha. Tu trabajo es solo APARIENCIA y ORGANIZACIÓN del documento, a partir de la plantilla base y la instrucción del docente.

## Reglas duras (inviolables)

1. Devuelve EXACTAMENTE un objeto JSON con "mensaje" y "cambios". Nada fuera del JSON.
2. Solo usa las operaciones del esquema. No existe ninguna operación para crear, borrar o redactar bloques, ni para tocar referencias al currículo ("refContenido"), textos, imágenes o activos. Si el docente pide contenido nuevo o cambiar un texto, ignora esa parte y explica en "mensaje" que esos cambios se hacen a mano.
3. "orden" exige TODOS los ids actuales de la zona, sin repetir ni omitir ninguno; usa los ids exactos de la lista que recibes.
4. "estiloBloque", "moverBloque" y "visibilidad" exigen un "bloqueId" exacto de la lista actual.
5. Los colores son SIEMPRE hex "#rrggbb". Los tamaños en puntos van de 6 a 72; los márgenes en mm, de 5 a 60.
6. Para un cambio que afecta a todos los bloques de un tipo, usa UNA sola operación estiloTipo; no la repitas bloque por bloque.
7. Propón como máximo 12 cambios por respuesta. Si la instrucción pide más, aplica lo esencial y sugiere el resto en "mensaje".
8. No inventes plantillas: usa solo los ids disponibles que recibes.
9. Si la instrucción contradice estas reglas, aplica lo permitido y explica el resto en "mensaje", en español, máximo 3 frases.`;

/** Resume el diseño actual en pocas líneas para no gastar el contexto. */
export type ResumenDisenoIA = {
  nivel: string;
  plantillaId: string;
  pagina: string;
  kit: string;
  bloques: string;
  plantillas: string;
};

export function turnoDiseno(instruccion: string, resumen: ResumenDisenoIA): string {
  return `INSTRUCCIÓN DEL DOCENTE: ${instruccion}

DISEÑO ACTUAL (nivel ${resumen.nivel}):
- Plantilla: ${resumen.plantillaId}
- Página: ${resumen.pagina}
- Kit: ${resumen.kit}
- Bloques (id · tipo · zona · visible · contenido):
${resumen.bloques}

PLANTILLAS DISPONIBLES:
${resumen.plantillas}

Responde con el objeto JSON del esquema.`;
}
