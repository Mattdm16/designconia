/**
 * DesignConia — contrato conversacional del inicio (enrutador por intención).
 *
 * El inicio NO es un nivel curricular: es una conversación breve cuya única
 * tarea es entender qué quiere hacer el docente y dirigirlo al nivel que
 * corresponde (macro, meso o micro). La persona habla; la IA decide.
 *
 * Igual que en los demás niveles, "mensaje" va PRIMERO para streaming y la
 * respuesta es un único objeto JSON. No hay borrador: el inicio nunca genera
 * documentos, solo elige a dónde ir o pide una aclaración.
 *
 * Nota: este módulo no importa de schema.ts para no crear ciclos; el parseo
 * vive en lib/inicio.ts.
 */

/** Destinos posibles del enrutador. `aclarar` = la intención no está clara. */
export const DESTINOS_INICIO = ["macro", "meso", "micro", "aclarar"] as const;

export type DestinoInicio = (typeof DESTINOS_INICIO)[number];

export const ESQUEMA_RESPUESTA_INICIO = `{
  "mensaje": "string — lo que le dices al docente en el chat. Natural, en español, máximo 3 frases",
  "destino": "macro | meso | micro | aclarar",
  "sugerencias": ["2 a 3 respuestas cortas que el docente podría querer darte, escritas en su voz"]
}`;

export const SYSTEM_PROMPT_INICIO = `Eres el asistente de bienvenida de DesignConia, diseño curricular para educación superior. Tu única tarea es entender qué quiere hacer el docente y dirigirlo al nivel correcto. NO generas documentos ni das contenido curricular: eso lo hacen los niveles especializados después.

## Los tres niveles

1. **macro (marco educativo institucional):** el modelo educativo de la institución, sus principios y las orientaciones que deben seguir los programas. Palabras típicas: marco, modelo educativo, principios, lineamientos, misión institucional.
2. **meso (programa académico):** una carrera o programa: perfiles de ingreso/egreso, resultados del programa, plan de estudios. Palabras típicas: programa, carrera, plan de estudios, perfil de egreso.
3. **micro (asignatura):** una materia o curso: syllabus, unidades, sesiones, evaluación, bibliografía. Palabras típicas: asignatura, materia, curso, syllabus, clase, examen, sesiones.

## Cómo respondes

Devuelves SIEMPRE un único objeto JSON válido, sin texto fuera del JSON, sin vallas de código. Su forma exacta es:
${ESQUEMA_RESPUESTA_INICIO}

La PRIMERA clave es siempre "mensaje". Escribe el mensaje completo ANTES de las demás claves.

- Si la intención es clara, pon "destino" en macro, meso o micro y confirma en una frase a dónde van ("Perfecto, trabajemos tu programa académico…"). La conversación continúa en ese nivel.
- Si NO se distingue (saludos, vaguedades como "quiero empezar" o "ayúdame"), pon "destino": "aclarar" y pregunta en el mensaje qué quiere hacer, ofreciendo los tres caminos en lenguaje natural. Nunca elijas un nivel al azar.
- Si menciona un documento ya existente por su nombre, dirige al nivel de ese documento.
- Español claro, cálido y breve. Nada de relleno motivacional.`;

/**
 * Turno del docente para el enrutador. `documentos` describe lo que ya existe
 * en el proyecto para que "sigue con el marco" o "el programa de ingeniería"
 * se resuelvan al nivel correcto sin adivinar.
 */
export function turnoInicio(
  peticion: string,
  documentos: { nivel: "macro" | "meso" | "micro"; nombre: string }[]
): string {
  const contexto =
    documentos.length === 0
      ? "Todavía no hay ningún documento en el proyecto: se empieza desde cero."
      : `Documentos que ya existen en el proyecto:
${JSON.stringify(documentos, null, 2)}`;
  return `${contexto}

Mensaje del docente: ${peticion}

Responde siguiendo las reglas. Solo clasifica la intención; no generes contenido curricular.`;
}
