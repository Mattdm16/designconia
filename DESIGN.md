---
name: DesignConia
description: Planificación curricular conversacional en mundo CodeEase — ficha editable trazable por OA.
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
  crema-tarjeta: "#FFFDF8"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "12px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-accent:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.crema-tarjeta}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  button-ghost:
    backgroundColor: "{colors.crema-tarjeta}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  card-float:
    backgroundColor: "{colors.crema-tarjeta}"
    rounded: "{rounded.lg}"
---

# Design System: DesignConia

## Overview

**Creative North Star: "La Sala Cálida"**

El mundo CodeEase pineado por el usuario con paleta Seedling/Sow: una sala Seedling de pantalla completa donde todo flota — nav, header, biblioteca OA, input — en tarjetas crema de radio grande sobre ondas Mist/Pebble. La IA habla en burbujas Sow; el usuario, en tarjetas claras con avatar inicial Redwood. Terracotta marca lo accionable: nuevo chat, enviar, exportar, lista-aula.

Sin alcances, sin enunciados largos: los OA son códigos cortos que al tocarse encienden su trazo Sprout en la ficha. La ficha editable vive como tarjeta clara dentro del flujo del chat.

**Key Characteristics:**
- Full-bleed: la app cubre todo el viewport, sin tarjeta centrada.
- Todo flota: tarjetas crema con sombra difusa cálida sobre duna.
- Trazabilidad por contacto: tocar un OA resalta sus bloques en Sprout.

## Colors

Paleta pineada por el usuario (brand guidelines Seedling/Sow): crema luminosa con marrón siembra y acentos tierra.

### Primary
- **Terracotta** (#B25D3E, hondo Redwood #6B3226): nuevo chat, enviar, lista-aula, exportar, foco y caret.

### Secondary
- **Sow** (#392525): burbujas IA con texto Seedling (#FAF5E9).

### Tertiary
- **Sprout** (#E3EB90): trazabilidad OA y selección de texto.

### Neutral
- **Seedling** (#FAF5E9): fondo de pantalla completa.
- **Mist** (#B6B7A5): ondas decorativas, scrollbar.
- **Pebble** (#7E7B62): segunda onda, anillo de trazo.
- **Rainfall** (#728B83): reserva para info secundaria.
- **Foliage** (#3E4734): reserva para estados de éxito.
- **Crema Tarjeta** (#FFFDF8): tarjetas flotantes, burbujas de usuario, ficha.
- **Tinta texto** (#211D19): texto principal sobre crema (heredado del mundo anterior, válido sobre Seedling).

### Named Rules
**The Warm Float Rule.** Toda superficie funcional es una tarjeta crema flotante con sombra difusa cálida; el fondo duna nunca lleva contenido directo.
**The One Accent Rule.** Solo Terracotta actúa. Sprout solo traza y selecciona.

## Typography

**Display Font:** System stack, semibold, tracking tight — títulos de ficha y header.
**Body Font:** System stack 0.875rem/1.6.
**Label/Mono Font:** Mono solo para códigos OA y folio; labels en mayúsculas +0.08em a 0.75rem en negro/45.

### Hierarchy
- **Display** (600, 0.9375–1rem): título editable de ficha, header.
- **Body** (400, 0.875rem, 1.6): mensajes y campos.
- **Label** (600, 0.75rem, mayúsculas): secciones Desglose/Actividades/Rúbrica, Biblioteca OA.
- **Mono** (400, 0.75rem): OA-07, folio DCN-2026-….

### Named Rules
**The Short OA Rule.** Ningún OA supera una línea corta: código + frase de 2–4 palabras.

## Layout

Tres rieles full-height con gap 12–16px y padding 12–16px: rail izquierda 228px (logo, nav, tarjeta OA oficiales, salir), centro fluido (header, chat con scroll, input fijo abajo), panel biblioteca 232px (solo ≥1280px; rail oculta <1024px con botón Nuevo en header). El chat hace autoscroll al final en cada mensaje.

## Elevation & Depth

Tarjetas: borde claro (blanco/60 o negro/7–10) + sombra difusa cálida `0 18px 45px -22px rgba(80,65,40,0.45)`; la burbuja IA profundiza a `0 24px 55px -24px rgba(40,30,15,0.65)`. Sin sombras duras ni halos de color.

### Named Rules
**The Warm Shadow Rule.** Toda sombra es marrón cálida, difusa y hacia abajo. Nunca negra pura ni halo.

## Shapes

Radio grande y amable: paneles 18px, burbujas y bloques 14–16px, pills y botones 999px, checks 999px. Iconos SVG de trazo 1.7 consistente; avatar con inicial (sin fotos).

## Components

### Buttons
- **Shape:** pill 999px.
- **Primary:** fondo Terracotta, texto crema; hover Redwood.
- **Ghost:** crema con borde negro/10; hover endurece borde.
- **Nav:** fila 12px radius; activa con fondo negro/5.

### Chips
- **Style:** OA como pills mono; inactivo negro/5, activo negro sólido con texto blanco.
- **State:** en biblioteca, activo invierte igual; el trazo Sprout vive en la ficha, no en el chip.

### Cards / Containers
- **Corner Style:** 18px flotantes, 14px bloques internos.
- **Background:** Crema #FFFDF8 al 95–100%.
- **Shadow Strategy:** ver Elevation & Depth.
- **Border:** blanco/60 o negro/7–10, 1px.
- **Internal Padding:** 10–16px.

### Inputs / Fields
- **Style:** transparentes o #FAFAFA según contexto, sin bordes salvo foco.
- **Focus:** borde negro/20, fondo blanco.
- **Input principal:** pill inferior con píldora de modelo y botón Terracotta de envío.

### Navigation
- **Rail izquierda:** logo + New chat terracotta + 5 ítems con estado activo + tarjeta OA oficiales terracotta + Log out.
- **Biblioteca OA derecha:** ejes con carpetas Terracotta, OAs clicables con trazo.

### Ficha (signature)
Tarjeta clara con folio mono, pills OA, secciones Desglose/Actividades/Rúbrica en filas cortas 100% editables y botón lista-aula terracotta. El trazo activo tiñe filas de Sprout translúcido con anillo Pebble.

## Do's and Don'ts

### Do:
- **Do** pantalla completa con los tres rieles flotando sobre duna.
- **Do** OA cortos: código + 2–4 palabras, siempre tocables.
- **Do** Terracotta solo para actuar; Sprout solo para trazar.
- **Do** datos sintéticos etiquetados hasta OA oficiales.

### Don't:
- **Don't** alcance Macro/Meso/Micro ni badges de alcance.
- **Don't** enunciados OA largos ni párrafos de desglose.
- **Don't** tarjeta centrada ni márgenes exteriores grises.
- **Don't** inventar precios, clientes o capacidades.
