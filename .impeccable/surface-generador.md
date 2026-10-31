# Surface brief — Microcurrículo universitario

Scope: Generador de microcurrículo de DesignConia, ruta `/`. Visitor mode: Operate.
Audience/job: docentes universitarios y coordinadores académicos que necesitan el microcurrículo completo de una asignatura —no una sesión— sin escribirlo desde cero.
Action/task: el asistente abre preguntando qué se quiere hacer hoy → pregunta por la asignatura y su propósito → desde el primer dato real aparece el borrador a un lado y la ficha crece sección por sección → el asistente sigue preguntando (justificación → objetivos → contenido → metodología → evaluación → identificación → bibliografía) → el docente corrige en la ficha, confirma la bibliografía y exporta a Markdown.
Proof/content: sin datos curriculares oficiales ni claims comerciales; el asistente escribe `[por definir]` en lugar de inventar código, programa, créditos o semestre, y toda referencia bibliográfica nace marcada como sugerencia.
Constraints: web daylight, español, Next.js 14 + React 18 + Tailwind 3, API de DeepSeek desde un route handler, persistencia en localStorage. Sin auth, sin listas de microcurrículos, sin importación.
Memorable moment: la ficha aparece por primera vez con solo la asignatura escrita, y a partir de ahí cada respuesta del docente enciende una sección nueva mientras el contador sube de 1/7 a 7/7.
Unresolved: marco institucional concreto (ninguna universidad en particular), plantilla oficial de microcurrículo de una institución real, exportación distinta de Markdown.

## Direction contract

THESIS: El microcurrículo se conversa, no se rellena por formulario. El asistente pregunta en el orden en que el docente tiene las ideas, y el documento crece visiblemente mientras habla; la ficha no es el premio al final, es el registro del diálogo.
OWN-WORLD: Mundo CodeEase pineado por el usuario: fondo duna con ondas, tarjetas crema flotantes de radio 18px, burbuja IA Sow, acento Terracotta para actuar. Mora solo identifica lo no verificado; Rainfall solo lo cumplido. Display serif caligráfico (Palatino Linotype) porque el objeto es un documento académico, no un panel de control.
STORY: El docente abre y ve un chat, no un documento vacío. Cuenta qué asignatura dicta y por qué importa; la ficha aparece con eso. Sigue respondiendo y ve formarse las siete secciones, con su estado visible y el contador n/7. Al final confirma la bibliografía que el asistente le propuso y exporta.
FIRST VIEWPORT: Solo el chat: cabecera mínima con la marca, «Conversación nueva» y el estado del asistente, hilo centrado a 640px con el saludo de apertura («¿Qué querés hacer hoy?») y tres sugerencias semilla, compositor anclado al fondo. Sin ficha, sin rieles. Primaria: escribir la respuesta.
FORM: Dirección pineada por el usuario desde imagen CodeEase (reemplazo total, sin sorteo). Ronda de decisión `/opciones` (A espejo / B centrada / C split): el usuario bloqueó COMP A.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Nota sobre la composición

El usuario eligió COMP A (tres rieles sobre duna) y luego pidió, en dos pasos, un estado inicial de chat limpio y una ficha lateral que crezca con la conversación. Esta entrega **retira el tercer riel**: con el microcurrículo completo, el espacio es del documento y el chat es una columna de 400px a la izquierda. El split de COMP C no se reintrodujo; lo que hay es chat + documento, no chat + lienzo de sesión.
