---
name: DesignConia
description: Proyecto curricular universitario conversacional — marcos, programas y microcurrículos editables en pantalla, trazables de principio a evidencia.
colors:
  seedling: "#FAF5E9"
  sow: "#392525"
  redwood: "#6B3226"
  rainfall: "#728B83"
  sprout: "#E3EB90"
  mist: "#B6B7A5"
  foliage: "#3E4734"
  terracotta: "#B25D3E"
  pebble: "#7E7B62"
  crema: "#FFFDF8"
  tinta: "#211D19"
  arena: "#EFE7D6"
  mora: "#6B4A6E"
typography:
  display:
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Cambria, Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  display-lg:
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Cambria, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  label-sm:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
  micro:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  mono:
    fontFamily: "ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
  mono-sm:
    fontFamily: "ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.6875rem"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-accent:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.crema}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  button-ghost:
    backgroundColor: "{colors.crema}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  card-float:
    backgroundColor: "{colors.crema}"
    rounded: "{rounded.lg}"
    border: "1px solid rgba(255,255,255,0.6)"
    shadow: "0 18px 45px -22px rgba(107,50,38,0.45)"
  fase-header:
    backgroundColor: "{colors.arena}"
    textColor: "{colors.tinta}"
  agente-chip:
    backgroundColor: "{colors.mora}"
    textColor: "{colors.crema}"
    rounded: "{rounded.pill}"
---

# Design System: DesignConia

## Overview

**Creative North Star: "La Sala Cálida"**

El mundo CodeEase pineado por el usuario con paleta Seedling/Sow: una sala Seedling de pantalla completa donde todo flota —chat, encabezado, secciones— en tarjetas crema de radio grande sobre ondas Mist/Pebble. La IA habla en burbujas Sow; el usuario, en tarjetas claras con avatar inicial Redwood. Terracotta marca lo accionable.

El producto es un **proyecto curricular universitario** en tres niveles: marco institucional, programa académico y microcurrículo de asignatura (ocho secciones que se leen de arriba abajo), mientras a un lado se conversa con el asistente que los va llenando. Por eso el display pasó a un serif caligráfico: el registro tipográfico de un documento académico, no el de un panel de control. Y por eso el progreso se dibuja como marcas de sección (`n/8` en el Micro), no como una barra abstracta.

**Key Characteristics:**
- Full-bleed: la app cubre todo el viewport, sin tarjeta centrada.
- Todo flota: tarjetas crema con sombra difusa cálida sobre duna.
- Progreso por sección: cada sección muestra su estado sin abrirla; la que el asistente trabaja queda en foco con anillo Pebble.
- Honestidad visible: lo sin verificar lleva Mora y la palabra «sugerencia» — referencias bibliográficas y afirmaciones propuestas por la IA.

## Colors

Paleta pineada por el usuario (brand guidelines Seedling/Sow): crema luminosa con marrón siembra y acentos tierra.

### Primary
- **Terracotta** (#B25D3E, hondo Redwood #6B3226): enviar, exportar, «Ajustar a 100», avisos de desbalance, foco y caret.

### Secondary
- **Sow** (#392525): burbujas de la IA con texto Seedling (#FAF5E9); círculo del número de unidad.

### Tertiary
- **Sprout** (#E3EB90): banda del aviso «aquí va tomando forma» y selección de texto.
- **Mora** (#6B4A6E): **solo** identifica lo que está sin verificar — referencias bibliográficas y afirmaciones propuestas por el asistente. Nunca decora.

### Neutral
- **Seedling** (#FAF5E9): fondo de pantalla completa.
- **Mist** (#B6B7A5): ondas decorativas, scrollbar.
- **Pebble** (#7E7B62): segunda onda, anillo de la sección en foco.
- **Arena** (#EFE7D6): fondo de las tarjetas de unidad del contenido temático. Separa sin competir con el acento.
- **Rainfall** (#728B83): estado cumplido — sección completa, «Confirmada», porcentajes que suman 100.
- **Foliage** (#3E4734): reserva.
- **Crema** (#FFFDF8): tarjetas flotantes, burbujas de usuario, ficha.
- **Tinta** (#211D19): texto principal sobre crema.

### Named Rules
**The Warm Float Rule.** Toda superficie funcional es una tarjeta crema flotante con sombra difusa cálida; el fondo duna nunca lleva contenido directo.
**The One Accent Rule.** Solo Terracotta actúa. Sprout solo avisa. Mora solo identifica lo no verificado. Rainfall solo marca lo cumplido.
**The Unit Band Rule.** Las unidades del contenido temático se separan con bandas Arena, nunca con bordes de color.

## Typography

**Display Font:** `Palatino Linotype` (respaldo Book Antiqua → Cambria → Georgia → serif), semibold, tracking tight. Es un serif caligráfico de tradición editorial impresa, coherente con un documento académico, y está instalado de serie en Windows y macOS.
**Body Font:** System stack 0.875rem/1.6. El contraste serif/sans es lo que separa "documento" de "panel".
**Label/Mono Font:** Mono solo para datos: folio (DCN-2026-…), códigos SC01, minutos y conteos. Labels en mayúsculas +0.08em a 0.75rem en negro/40.

### Hierarchy
- **Display** (600, 0.9375–1rem, serif): título de la ficha, tema de la sesión, headings de sección.
- **Body** (400, 0.875rem; 0.8125rem en burbujas de chat, 1.6): mensajes, campos, descriptores de rúbrica.
- **Label** (600, 0.75rem, mayúsculas): Inicio / Desarrollo / Cierre, Desglose, Evaluación, Rúbrica, Productos y evidencias.
- **Label-sm** (500, 0.6875rem): micro-etiquetas dentro de las filas (Docente, Estudiante, Recursos) y ayudas.
- **Micro** (600, 0.625rem, +0.1em): rótulos mínimos — `SC01`, `01`, columnas del mapa de sesión.
- **Mono** (400, 0.75rem; 0.6875rem en chips, `tabular-nums`): folio, S1/SC01, HT/HP/HTI/créditos, minutos, conteos.

### Named Rules
**The Tabular Rule.** Todo número que se compara —horas, minutos, conteos de actividad— usa `tabular-nums`, nunca cifras proporcionales.
**The No-Unregistered-Size Rule.** Los escalones de la rampa son los de arriba (13px, 12px, 11px, 10px, 14px y 15px). Un tamaño nuevo entra documentándolo aquí, nunca escribiéndolo suelto en un componente.

## Rounded
- **xs** (4px): anillo de foco y esquinas de texto seleccionado.
- **sm** (8px): miniaturas del sistema operativo, scrollbar.
- **md** (12px): bloques internos, inputs, filas de lista, botones de nav.
- **lg** (14px): burbujas de chat y contenedores internos.
- **xl** (18px): paneles flotantes, la ficha y sus secciones.
- **pill** (999px): botones, chips, checks, cargadores.

## Layout

**Dos modos, no uno.** La app arranca en modo conversación y solo pasa a modo borrador cuando la IA genera algo. El cambio de modo es la decisión de layout más importante del producto: obliga a que la ficha no ocupe espacio antes de existir.

### Modo conversación (estado inicial, y al que se puede volver)

Una sola cosa en pantalla: el chat. Sin rieles, sin lienzo de ficha, sin tabs de sesión, sin encabezado de documento. Cabecera mínima con la marca a la izquierda y el indicador de estado del asistente a la derecha. El hilo se centra a **640px** —medida de lectura, no de panel— con el mensaje de apertura y las sugerencias semilla debajo. El compositor vive anclado al fondo, con el mismo ancho que el hilo.

Un chat que arranca con un lienzo de documento al lado no es un chat. Este modo no es una versión reducida del otro: es el estado por defecto del producto.

### Modo borrador

Dos columnas full-height con gap 12px y padding 12–16px: **chat a la izquierda, 480px**, y la ficha fluida a la derecha. Sin tercer riel: el espacio es del documento. Bajo 1280px el chat se apila arriba con `max-height: 38vh` y la ficha manda.

El chat es plegable: ocultarlo devuelve el ancho completo a la ficha y deja «Mostrar chat» en el encabezado. Las sugerencias del turno se dibujan como chips encima del compositor, en ambos modos.

### La ficha del microcurrículo

La ficha es un **documento de ocho secciones**, no una tarjeta con pestañas. Arriba va una franja de identificación (asignatura en serif, folio mono, programa · semestre · créditos · horas) y debajo **ocho marcas de progreso** —una por sección— con el contador `n/8`. Es progreso de documento, no una barra genérica: cada marca corresponde a una sección real.

Las secciones se ordenan como el documento oficial (identificación, justificación, objetivos, contenido, **secuencia didáctica**, metodología, evaluación, bibliografía), no como la conversación. Cada una es un acordeón con su estado visible **sin abrirla**: check en círculo cuando está cerrada, y el resumen de una línea («3 unidades · 6 temas», «3 sesiones · 4,5 h», «3 cortes · 100%»). La sección que el asistente está trabajando queda abierta y con anillo Pebble: el trazo indica *qué está cambiando ahora*.

**Exigencias visibles, no bloqueos.** El documento avisa —sin impedir— cuando falta lo que lo hace utilizable: unidades sin resultados de aprendizaje, unidades sin sesiones, actividades sin instrumento de calificación, porcentajes que no suman 100, referencias sin confirmar. Los avisos son píldoras Terracotta arriba de la ficha y notas dentro de la sección correspondiente.

## Elevation & Depth

Tarjetas: borde claro (blanco/60) + sombra difusa cálida `0 18px 45px -22px rgba(107,50,38,0.45)`; el lienzo de la ficha profundiza a `0 24px 55px -26px rgba(107,50,38,0.5)` y la burbuja de la IA a `0 24px 55px -24px rgba(57,37,37,0.55)`. Sin sombras duras ni halos de color.

### Named Rules
**The Warm Shadow Rule.** Toda sombra es marrón cálida, difusa y hacia abajo. Nunca negra pura ni halo.
**The One Elevation Rule.** Borde claro o sombra, nunca los dos compitiendo: la tarjeta lleva su borde blanco y una sola sombra declarada.

## Shapes

Radio grande y amable: paneles 18px, bloques y filas 12–16px, pills y botones 999px, checks 999px. Iconos SVG de trazo 1.7 consistente, dibujados en el proyecto (nunca emoji ni glifos de fuente); avatar con inicial (sin fotos).

## Components

### Buttons
- **Shape:** pill 999px.
- **Primary:** fondo Terracotta, texto crema; hover Redwood.
- **Ghost:** crema con borde negro/10; hover endurece borde.
- **Sow (detener):** fondo Sow, texto Seedling.

### Chips
- **Sugerencia (respuesta):** pill crema con borde negro/10, texto alineado a la izquierda. Es una respuesta que el docente puede tocar para enviarla; nunca se envía sola.
- **Sugerencia (bibliografía):** pill Mora sólido con el texto «Sugerencia». Marca una referencia que el asistente propuso y el docente **no** ha verificado. Un toque la confirma.
- **Confirmada (bibliografía):** pill Rainfall sólido con «Confirmada». Es el único estado en que una referencia cuenta como obligatoria.
- **Sugerencia de IA (afirmación):** pill Mora con «Sugerencia de IA». **Documento:** pill Sow. **Contrastada/Confirmada:** pill Rainfall. El respaldo se lista debajo como texto mono («Fuente · localizador»).
- **RA vinculado (evaluación y matrices):** pill Rainfall tenue cuando el RA o el borde ya están alineados; fondo neutro cuando no.
- **Porcentaje de evaluación:** pill mono tabular; Rainfall al 10% si suma 100, Terracotta al 10% si no.

### Cards / Containers
- **Corner Style:** 18px flotantes, 12px bloques internos.
- **Background:** Crema #FFFDF8 al 60–100% según si la superficie es lienzo o tarjeta.
- **Border:** blanco/60 en tarjetas, negro/7–10 en bloques internos. Las zonas vacías usan borde punteado negro/15.
- **Internal Padding:** 12–16px.

### Inputs / Fields
- **Style:** transparentes hasta el foco; borde negro/20 y fondo blanco al enfocar. Sin bordes permanentes.
- **Estructura:** las unidades del contenido temático viven en tarjetas Arena al 40% con el número en un círculo Sow; los temas, en tarjetas blancas anidadas. La numeración la pone la interfaz, nunca el modelo.
- **Evaluación:** los cortes son filas con nombre, porcentaje en mono y sus actividades; cuando la suma no da 100 aparece una banda de aviso Terracotta con el botón «Ajustar a 100». Cada actividad declara instrumento (con sugerencias en `datalist`), los RA que mide con chips (U+número + texto) y qué herramientas exige; la que no tiene instrumento o no mide ningún RA lo dice en Terracotta.
- **Secuencia didáctica (dos niveles):** abre en una **lista de unidades** —tarjetas con el número en círculo Sow, título, temas y `N sesiones · X h`, o la píldora «sin sesiones»—; al tocar una, la sección se transforma en las **sesiones de esa unidad** con un botón «Volver a unidades» en la cabecera. Cada sesión es una tarjeta con insignia `S1`, tema, unidad, tipo y minutos; sus tres fases van en bandas Arena, cada una con filas de docente / estudiante y sus recursos en píldoras Mora. La cabecera del acordeón muestra `unidades con sesiones / total` en mono tabular.

### Navigation
- **Modo conversación:** sin navegación visible. La marca, «Conversación nueva», una etiqueta pasiva de contexto («Conversación inicial», «Marco · …») y el estado del asistente bastan. El nivel lo decide la IA conversando, no un selector.
- **Modo borrador:** sin rieles laterales. El chat (480px) es la navegación de la conversación y la ficha se recorre con su propio scroll; el encabezado concentra la etiqueta de contexto, copiar (Markdown, para pegar) y exportar (PDF de texto plano) por nivel más el expediente conjunto, además de plegar el chat.

### Chat (signature)
Burbujas Sow de la IA y tarjetas crema del docente, con avatar de inicial Redwood. La IA escribe su mensaje en streaming mientras el resto del JSON todavía llega, así que el texto se lee como conversación y nunca se ve crudo. Debajo de la última respuesta, los chips de sugerencia. Bajo el hilo, el compositor: botón «+» a la izquierda (menú: adjuntar PDF, nuevo documento por chat, documentos del proyecto), textarea que crece hasta 8rem y botón Terracotta de envío, que se convierte en «Detener» mientras hay una respuesta en curso. Los PDF adjuntos aparecen como chips encima del textarea con su estado (leyendo, listo con páginas y año, error legible o año por declarar); quitar el chip no borra la fuente ya registrada.

### Microcurrículo (signature)
Franja de identificación con la asignatura en serif, folio mono y la línea programa · semestre · créditos · horas. Debajo, ocho marcas de progreso y el contador `n/8`. Luego ocho acordeones —Identificación, Justificación, Objetivos, Contenido temático, Secuencia didáctica, Metodología, Sistema de evaluación, Bibliografía y recursos— con check de cerrada y resumen de una línea. La sección en foco lleva anillo Pebble. Los avisos globales (RAs faltantes, unidades sin sesiones, actividades sin instrumento, porcentajes que no suman 100, referencias sin confirmar) se muestran como píldoras arriba, y también dentro de su sección.

### Niveles Macro y Meso
Misma sala, mismo documento-acordeón: franja de identificación en serif, marcas de progreso y secciones plegables con resumen de una línea. Cada afirmación (principio, orientación, perfil, resultado) lleva su insignia de estado, sus selectores de origen/estado y su bloque de respaldo en fuentes con citas (fuente + localizador/página/sección). Sin fuentes registradas no se puede citar: la UI lo dice en vez de inventar.

### Trazabilidad y expediente
La ficha Meso cierra con la sección **Trazabilidad**: matrices principio→resultado y resultado→RA con chips que se prenden y apagan, más el conteo de resultados sin sostén. En el Micro, cada RA muestra a qué resultado responde («↳ Responde a: …») y cada actividad, los RA que mide. El encabezado exporta por nivel y el **expediente conjunto** (todo el proyecto con su trazabilidad) en Markdown para pegar y PDF de texto plano.

## Motion

Un solo momento intencionado: la ficha entra con `canvas-rise` (0.45s, cubic-bezier(0.16,1,0.3,1)) cuando la IA la actualiza. El cursor de escritura de la burbuja es un pulso. Todo se anula bajo `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** pantalla completa con los rieles flotando sobre duna.
- **Do** mantener el texto editable en el sitio: la IA propone, el docente sobrescribe el mismo campo.
- **Do** Terracotta solo para actuar; Sprout solo para trazar; Mora solo para identificar.
- **Do** etiquetar como ejemplo cualquier dato que no venga de una fuente curricular oficial.
- **Do** declarar `[por definir]` en lugar de inventar carrera, créditos o docente.

### Don't:
- **Don't** vocabulario escolar: OA, niveles, asignaturas de educación básica o media, SEP, NEM.
- **Don't** tarjeta centrada ni márgenes exteriores grises.
- **Don't** modales: todo se edita y se corrige donde está.
- **Don't** inventar precios, clientes, capacidades ni datos institucionales.
- **Don't** usar Mora como acento decorativo ni como fondo de sección.
