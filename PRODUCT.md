# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14 (App Router) con React 18, TypeScript y Tailwind CSS. Sin base de datos: la ficha se guarda en localStorage del navegador. La IA se consume por `fetch` a la API de DeepSeek desde un route handler del servidor.

## Users

Docentes universitarios y coordinadores académicos de educación superior. Preparan e imparten asignaturas en carreras de nivel universitario y necesitan dejar por escrito la planificación de cada sesión antes de entrar al aula, en escritorio, en español, con sesiones de planificación recurrentes.

## Product Purpose

DesignConia (nombre temporal) convierte una conversación en el **diseño curricular completo de un contexto institucional universitario**, listo para presentar: marco educativo institucional (principios, orientaciones y fuentes), programas académicos (perfiles, resultados y vínculo al marco) y microcurrículos de asignatura (identificación, justificación, objetivos, contenido por unidades con resultados de aprendizaje, secuencia didáctica, metodología, evaluación con porcentajes e instrumentos, y bibliografía). Éxito = el docente responde preguntas durante unos minutos y obtiene documentos coherentes y editables, con la última palabra sobre cada línea.

## Positioning

El asistente no entrega un documento terminado: entrega un **proyecto curricular vivo** que crece sección por sección mientras se conversa, y que el docente corrige en pantalla. Cada nivel (marco, programa, asignatura) muestra en todo momento qué está cerrado y qué falta, y marca sin disimulo lo que aún no está verificado —empezando por la bibliografía del Micro y las sugerencias de IA sin confirmar.

## Operating Context

Flujo: el asistente abre con un saludo y pregunta **qué se quiere hacer hoy**, sin pedir datos todavía → la conversación decide si se trata de un marco, un programa o una asignatura (el docente habla, la IA clasifica; ante la duda pregunta) → a partir del primer dato real **empieza a generarse el borrador**, y la ficha aparece al lado del chat → el asistente sigue preguntando en un orden pensado según el nivel, una o dos cosas por turno → el docente ve la ficha cambiar con cada respuesta, corrige lo que quiera y exporta a PDF o copia el Markdown.

No hay selectores de nivel ni de documento a la vista: el botón **+** del compositor concentra adjuntar PDF, empezar un documento nuevo (por chat) y retomar documentos del proyecto. Los PDF adjuntos se leen en el navegador y viajan como evidencia citada por página; solo se integran como fuentes los de hasta 3 años de antigüedad.

El orden de las preguntas empieza por el propósito y deja los datos administrativos (código, créditos, horas, semestre) para el final, que es cuando el docente los tiene a mano. La secuencia didáctica se genera **por unidad y a pedido**, no de golpe: nadie planifica veinte clases con el mismo detalle en una sola pasada. El chat se puede ocultar para trabajar el documento a pantalla completa, y volver a mostrar para seguir conversando.

## Capabilities and Constraints

- Capacidades confirmadas: conversación guiada por IA que entiende antes de pedir datos; generación **por hitos** (la ficha se llena desde el primer dato, no al final); edición total en pantalla de cada campo; tres niveles (marco, programa, asignatura) con varios documentos por nivel y conversaciones independientes; secuencia didáctica con Inicio, Desarrollo y Cierre por sesión; evaluación con porcentajes que se validan y se ajustan a 100, con instrumento declarado y RA vinculado por entregable; bibliografía que se propone como sugerencia y solo cuenta como obligatoria cuando el docente la confirma; citas a fuentes curriculares por afirmación (fuente + localizador/página), con PDFs adjuntos como evidencia citada por página; trazabilidad principio→resultado→RA editable en matrices; **exportación a PDF de texto plano** y copia del Markdown en los tres niveles más expediente curricular conjunto; persistencia local con migración del estado anterior.
- Terminología: universitaria. Marco educativo institucional, programa académico, microcurrículo, justificación, objetivos generales y específicos, unidades y resultados de aprendizaje, secuencia didáctica, estrategias metodológicas, cortes de evaluación con porcentajes e instrumentos, bibliografía obligatoria y complementaria.
- Explícitamente fuera de alcance: persistencia en servidor, login, autenticación, roles, OCR de PDFs escaneados, PDF con estilos o tablas formales, y exportación a Word.
- El ISBN **no lo propone la IA**: un número inventado parece autoritativo y es comprobable como falso. El asistente propone año y edición como sugerencia, y pide el ISBN.
- La intención del docente (`crear`, `editar`, `consultar`, `entender`) se detecta y se registra, pero todavía **no habilita ni deshabilita funciones**: editar y consultar aún no existen como capacidades de la app. Dejar lugar para ellas es intencional; simularlas, no.
- Marco curricular: **educación superior únicamente**. No se usa el modelo escolar ni de otros países: nada de OA por nivel, SEP, NEM ni currículums de educación básica o media.
- Dependencia externa: requiere `DEEPSEEK_API_KEY`. Sin ella la aplicación funciona y avisa, pero el asistente no conversa ni genera.

## Brand Commitments

Nombre temporal: DesignConia — usarlo como nombre de producto hasta reemplazo. Sin logo, voz ni identidad confirmada que preservar.

## Evidence on Hand

No hay datos curriculares oficiales de ninguna institución, ni testimonios, casos, métricas ni assets. La ficha de arranque es un ejemplo explícito, no un currículum real. Trabajo futuro no debe inventar precios, clientes, benchmarks ni capacidades. El asistente está instruido para escribir `[por definir]` en lugar de inventar datos institucionales como la carrera, los créditos o el nombre del docente.

## Product Principles

1. Ahorro administrativo primero: cada pantalla debe reducir horas, no añadir pasos.
2. Alineación trazable: toda actividad y toda evidencia muestran a qué subcompetencia responden.
3. Adaptable por el docente: la IA propone, el docente decide y edita. Cada campo de la ficha es editable en el sitio, sin modales.
4. Entender antes de producir: el asistente no genera un documento hasta saber qué se necesita. Adelantarse a generar ahorra escribir pero cuesta pensar, y eso no es ahorro.
5. Utilizable en aula: lenguaje y estructura listos para llevar a clase, no solo para archivar.
6. Honestidad del dato: lo que no se sabe se declara `[por definir]`, nunca se rellena con una invención plausible.
