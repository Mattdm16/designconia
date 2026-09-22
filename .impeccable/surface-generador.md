# Surface brief — Generador (split chat/canvas)

Scope: Generador de planificación DesignConia, ruta `/`. Visitor mode: Operate.
Audience/job: docentes, directivos y coordinadores que pasan de OA a planificación lista en minutos.
Action/task: prompt inicial → alcance detectado (Macro/Meso/Micro) → desglose + actividades trazables → edición intensiva en canvas mientras se itera en chat.
Proof/content: datos sintéticos etiquetados hasta contar con OA oficiales; sin claims comerciales.
Constraints: web daylight, español, Next.js + React + Tailwind; 3 estados (vacío/generando/editando); todo editable; trazabilidad OA visible.
Memorable moment: el chat central se desliza a tarjetero lateral y la ficha se timbra a la derecha.
Unresolved: currículum oficial objetivo; datos OA reales; auth/roles; import/export.

## Direction contract

THESIS: La planificación se pide por intención, no por formulario. El sistema enruta Macro/Meso/Micro desde el prompt y lo demuestra en un canvas que cambia de forma. Rehúsa el dashboard AI genérico de chat centrado + cards.
OWN-WORLD: Mundo CodeEase pineado por usuario: fondo beige con ondas, tarjetas flotantes crema de radio grande, burbuja IA oscura, acento naranja durazno, panel biblioteca OA a la derecha. Sin alcance Macro/Meso/Micro, OA en corto, pantalla completa.
STORY: El docente escribe qué necesita, ve el alcance detectado con confianza, corrige si hace falta, y refina la ficha editable sin perder de qué OA viene cada actividad.
FIRST VIEWPORT: Vacío centrado con papeleta de pedido. Al enviar, el chat se desliza a 380px a la izquierda y a la derecha aparece la ficha: franja de folio + badge de alcance + sello de estado, pestañas Desglose/Actividades/Evaluación, columna marginal de trazo OA. Primaria: Enviar y Editar.
FORM: Dirección pineada por usuario desde imagen CodeEase (reemplazo total, sin sorteo), seed key b1d3cbd2 ya descargada por pin. Sin alcance, OA en corto, full-bleed. Ronda de decisión /opciones (A espejo / B centrada / C split): usuario bloqueó COMP A, ya implementado en `/`.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
