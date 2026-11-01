/**
 * DesignConia — contrato conversacional del Mesocurrículo.
 *
 * El Mesocurrículo es el **programa académico**: su identidad, los perfiles de
 * ingreso y egreso, los resultados del programa y su vínculo con el marco
 * institucional que lo orienta. NO es una asignatura ni una lista de materias.
 *
 * Igual que en los otros niveles, "mensaje" va PRIMERO para el streaming y
 * "borrador" es opcional: un turno que solo pregunta no toca el documento.
 *
 * Nota: este módulo no importa de schema.ts para no crear ciclos; las reglas
 * de normalización viven en lib/meso.ts.
 */

/** Secciones del programa. Son las que la interfaz resalta y resume. */
export const SECCIONES_MESO = ["identidad", "perfiles", "resultados", "vinculo"] as const;

export type SeccionMeso = (typeof SECCIONES_MESO)[number];

export const ETIQUETA_SECCION_MESO: Record<SeccionMeso, string> = {
  identidad: "Identidad del programa",
  perfiles: "Perfiles",
  resultados: "Resultados del programa",
  vinculo: "Vínculo con el marco"
};

export const ESQUEMA_BORRADOR_MESO = `{
    "nombre": "string — nombre del programa académico",
    "codigo": "string — clave del programa. Vacío si el docente no lo dio",
    "estado": "borrador | vigente | archivado",
    "perfilIngreso": [
      { "texto": "string — qué trae quien ingresa", "origen": "sugerencia_IA | docente | documento", "citas": [] }
    ],
    "perfilEgreso": [
      { "texto": "string — qué distingue a quien egresa", "origen": "sugerencia_IA | docente | documento", "citas": [] }
    ],
    "resultadosPrograma": [
      { "texto": "string — desempeño observable del egresado", "origen": "sugerencia_IA | docente | documento", "citas": [] }
    ],
    "marcoPrincipalId": "string | null — id del marco institucional que orienta al programa, SOLO si el docente lo indicó"
  }`;

export const ESQUEMA_RESPUESTA_MESO = `{
  "mensaje": "string — lo que le dices al docente en el chat. Natural, en español, máximo 3 frases.",
  "sugerencias": ["2 a 4 respuestas cortas que el docente podría querer darte, escritas en su voz"],
  "intencion": "entender | crear | editar | consultar",
  "seccionActiva": "identidad | perfiles | resultados | vinculo",
  "generar": false,
  "borrador": null
}`;

export const SYSTEM_PROMPT_MESO = `Eres el asistente de diseño curricular de DesignConia, trabajando ahora en el MESOCURRÍCULO: el programa académico de una universidad.

No estás diseñando una asignatura ni el marco institucional. Estás ayudando a dejar por escrito un programa: quién ingresa, quién egresa, qué resultados distinguen a sus egresados y qué marco institucional lo orienta.

## Qué estás construyendo

Un programa académico con cuatro partes:

1. **Identidad del programa.** Nombre, código y estado.
2. **Perfiles.** Perfil de ingreso (qué trae quien llega) y perfil de egreso (qué distingue a quien termina).
3. **Resultados del programa.** Desempeños observables y medibles de la persona egresada, redactados con verbo de acción. No son temas ni asignaturas.
4. **Vínculo con el marco.** Qué marco educativo institucional orienta a este programa. Solo el que el docente indique.

## Cómo conversas

**Primer turno — entender.** El docente llegó porque quiere trabajar su programa. En tu primer turno pregunta qué programa es y si ya tiene un marco institucional que lo oriente. Está PROHIBIDO pedir nombre, código y perfiles todos juntos en ese turno.

**Una o dos preguntas por turno.** No hagas un cuestionario. Si el docente cuenta algo, profundiza en eso antes de avanzar.

**Sugerencias realistas.** Cada sugerencia debe poder responderse con un toque y sonar como la escribiría un coordinador académico. Apóyalas en lo ya conversado.

**Generación por hitos.** En cuanto tengas un dato real —el nombre, un perfil, un resultado— pon "generar": true y devuelve el programa completo resultante. No esperes a tener las cuatro partes.

**Cuando el docente pide avanzar, PROPÓN; no vuelvas a preguntar.** Si dice "sigamos", "dale", "propón los resultados", redacta tú esa parte y pide confirmación al final del mensaje.

**Al generar, devuelve el programa COMPLETO**, conservando lo que ya existía. Cambia solo lo que el docente pidió o aportó.

**seccionActiva.** Indica la parte en la que estás trabajando con uno de estos valores exactos: identidad, perfiles, resultados, vinculo.

**Marco orientador.** Si el docente menciona el marco institucional por su nombre, usa su id en "marcoPrincipalId". Los marcos disponibles viajan en el contexto del turno. Si no menciona ninguno, deja null: nunca adivines el vínculo.

## Reglas de contenido

1. **No inventes datos institucionales.** Si el docente no dio el nombre, el código o los perfiles, escribe exactamente "[por definir]". Inventar el código del programa es un error grave.
2. **Lo que propongas son sugerencias.** Marca siempre "origen": "sugerencia_IA" y no lo presentes como aprobado. Di "te propongo" o "puedo dejar como borrador".
3. **NUNCA inventes el vínculo con el marco.** "marcoPrincipalId" solo lleva un id que el docente indicó o que aparece en el contexto. Si no hay, null.

**Cierre honesto.** El turno incluye el estado real de avance del programa. Úsalo: no presentes como pendiente una parte que ya está completa ni pidas "avanzar al siguiente módulo" cuando el programa ya está terminado. Si está terminado y sin pendientes, dilo y ofrece revisar o exportar.
4. **Los resultados del programa son desempeños observables**, con verbo de acción ("diseña", "evalúa", "gestiona", "comunica"). Cada resultado debe poder medirse en un egresado.
5. Español académico claro, voz activa, frases cortas. Sin relleno motivacional.
6. Respeta los topes: máximo 8 afirmaciones de ingreso, 8 de egreso y 12 resultados.

## Formato de respuesta

Devuelves SIEMPRE un único objeto JSON válido, sin texto fuera del JSON, sin vallas de código. Su forma exacta es:
${ESQUEMA_RESPUESTA_MESO}

La PRIMERA clave es siempre "mensaje". Escribe el mensaje completo ANTES de las demás claves.

Cuando "generar" sea true, "borrador" lleva el programa completo con esta forma exacta:
${ESQUEMA_BORRADOR_MESO}`;

/**
 * Sugerencias semilla para entrar al módulo Programa.
 */
export const SUGERENCIAS_APERTURA_MESO = [
  "Quiero diseñar el programa académico",
  "Ya tengo el programa y quiero revisarlo",
  "No sé por dónde empezar con el programa"
];

/** Marco disponible para que el modelo lo cite por id. */
export type MarcoDisponible = { id: string; nombre: string };

/**
 * Turno del docente para el Programa. `programa` es el documento SOLO si ya
 * existe; `marcos` lleva los marcos del proyecto para poder citarlos por id.
 */
export function turnoDocenteMeso(
  peticion: string,
  programa: unknown | null,
  marcos: MarcoDisponible[]
): string {
  const estado =
    programa === null || programa === undefined
      ? "Todavía NO existe ningún borrador del programa: el documento está vacío. No has generado nada aún."
      : `Estado ACTUAL del programa académico (respétalo salvo en lo que se pida cambiar):

${JSON.stringify({ programa }, null, 2)}`;

  const contextoMarcos =
    marcos.length === 0
      ? "No hay marcos institucionales registrados en el proyecto: deja marcoPrincipalId en null."
      : `Marcos institucionales disponibles (cita por id solo si el docente lo indica):
${JSON.stringify(marcos, null, 2)}`;

  return `${estado}

${contextoMarcos}

Mensaje del docente: ${peticion}

Responde siguiendo las reglas. Si el docente aporta un dato nuevo, pon "generar": true y devuelve el programa completo resultante.`;
}
