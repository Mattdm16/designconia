# context.md — Traspaso para un agente con visión

Este archivo existe para que **otro agente, que sí puede ver imágenes, audite la interfaz** de este proyecto. Fue escrito por quien construyó la app sin poder verla nunca: este entorno no tiene navegador y bloquea la descarga de binarios. Todo lo que sigue sobre el *código* está verificado; todo lo que sigue sobre lo *visual* es intención medida en CSS, no resultado observado.

> **Lo primero que debes saber:** no hay ninguna captura guardada en el repo. Si te piden auditar, tienes que generar las capturas tú.

---

## 1. Qué es esto

**DesignConia** — aplicación web donde un docente universitario construye **el microcurrículo completo de una asignatura** conversando con una IA. La ficha tiene ocho secciones:

1. **Justificación** — propósito de la asignatura y su lugar en el perfil de egreso.
2. **Objetivos o competencias** — generales y específicas.
3. **Contenido temático** — unidades con temas, subtemas y resultados de aprendizaje (obligatorios, con verbo medible).
4. **Secuencia didáctica** — las horas clase por clase, en **dos niveles**: primero la lista de unidades y, al abrir una, solo las sesiones de esa unidad con duración, tipo y las tres fases (Inicio, Desarrollo, Cierre) con acciones del docente y del estudiante.
5. **Metodología** — estrategias pedagógicas con cómo se aplican.
6. **Sistema de evaluación** — cortes con porcentajes que deben sumar 100, con instrumento y herramientas por entregable.
7. **Datos de identificación** — asignatura, código, programa, créditos, horas (HT/HP/HTI), prerrequisitos, semestre.
8. **Bibliografía y recursos** — obligatorias, complementarias y herramientas, con año, edición e ISBN.

- **Usuario:** docente o coordinador académico de **educación superior**. No es educación escolar.
- **Idioma:** español rioplatense neutro («¿Qué querés hacer hoy?», «pedí cambios»).
- **Modelo de datos:** `Microcurriculo` en [schema.ts](lib/schema.ts).
- **Fuera de alcance:** autenticación, roles, persistencia en servidor, listas de microcurrículos, importación de PDF/syllabus, PDF con estilos.

### Estado real

| Aspecto | Estado |
|---|---|
| Compila, arranca, sirve la app | ✅ verificado |
| IA real (DeepSeek) | ✅ clave válida (`/api/salud` → `"conexion":"ok"`) |
| Generación real de microcurrículos | ✅ verificada por HTTP contra la API real (8/8 secciones) |
| Pruebas unitarias | ✅ 95/95 |
| Detector de calidad visual | ✅ 0 hallazgos |
| **PDF exportado** | ✅ **verificado visualmente** con LibreOffice (5 páginas, sin fuentes faltantes) |
| **Interfaz de la app** | ❌ **nunca vista. Es lo que necesitas auditar.** |

Muestras reales generadas por la app (no inventadas), todas de la misma corrida:
[microcurriculo-ejemplo.pdf](microcurriculo-ejemplo.pdf) · [.txt](microcurriculo-ejemplo.txt) · [.md](microcurriculo-ejemplo.md) · [.json](microcurriculo-ejemplo.json) — 8/8 secciones, 3 unidades con RA, 3 sesiones, cortes 30/30/40, bibliografía marcada `[SIN CONFIRMAR]`.

El `.json` es el microcurrículo normalizado: sirve para regenerar el PDF y el texto **sin volver a llamar a la IA**.

---

## 2. Cómo levantarla

> **Ahora mismo el servidor está apagado.** Se detuvo al cerrar la sesión de trabajo; no hay nada escuchando en 3000. Arrancarlo es el comando de abajo.

```bash
cd D:\Devtools\Proyectos\DeepseekHS
npm run dev          # http://localhost:3000
```

**Nunca dos servidores de desarrollo.** Next levanta el segundo en 3001 sobre el mismo `.next` y ambos se pisan los artefactos: produce 404 de assets, chunks corruptos y respuestas cortadas. Es la causa de la mitad de los bugs "misteriosos" de este proyecto.

El `.env.local` ya tiene una API key válida. Si `/api/salud` dijera `clave_invalida`, hay que reponer `DEEPSEEK_API_KEY` y **reiniciar** el servidor.

```bash
npm test             # 95 pruebas, runner propio sin dependencias
npx tsc --noEmit
npx next build       # NO ejecutar con el dev server vivo
```

### Cómo llegar a cada estado

La app arranca **siempre** en el chat vacío. La ficha solo nace de una conversación real con la IA (requiere la clave), porque no hay ruta ni botón que inyecte datos de ejemplo. Para capturar el estado poblado: conversar de verdad, o falsificar `localStorage` bajo `designconia.micro.v2` (la forma está en `EstadoGuardado`, en [schema.ts](lib/schema.ts)). Un guardado `v1` se migra solo.

---

## 3. Modelo de dos estados (esto define la composición)

Cuál se monta depende de si existe microcurrículo (`micro !== null`).

### Estado A — «Conversación» (inicial)

**Solo el chat.** Sin ficha, sin rieles.

- Fondo `#FAF5E9` a pantalla completa, con dos ondas SVG (`#B6B7A5` 55 %, `#7E7B62` 45 %) en el tercio inferior.
- Cabecera sin tarjeta: círculo marrón con destello + «DesignConia» en serif; botón **«Conversación nueva»** (deshabilitado si no hay nada que borrar); indicador de estado del asistente a la derecha.
- Hilo centrado a **640 px**: burbuja marrón con el saludo y **tres chips** de sugerencia.
- Compositor anclado al fondo, misma medida.

**Copy exacto:** `Hola. Soy tu asistente de diseño curricular para educación superior. ¿Qué querés hacer hoy?`

**Regla:** el saludo **no pide datos**. Es local, no lo genera la IA, para que el modelo no pueda adelantarse.

### Estado B — «Borrador»

- **Chat a la izquierda, 480 px** (solo ≥1280 px; debajo se apila arriba con `max-height: 38vh`).
- **Ficha fluida a la derecha.** **No hay tercer riel.**
- Encabezado de la ficha: estado del asistente, copiar (Markdown, para pegar), **«Exportar PDF»** (texto plano, sin estilos); y «Mostrar chat» cuando está plegado.
- Píldora verde (`#E3EB90` al 50 %) al nacer el borrador: «Aquí va tomando forma tu microcurrículo…».

### La ficha (pieza central)

1. **Franja de identificación**: asignatura en serif 16 px, folio mono a la derecha, línea `Programa · Semestre · Créditos · Horas`.
2. **Ocho marcas de progreso** (una por sección, `bg-rainfall` si está completa, `bg-black/10` si no) y el contador `n/8` en mono tabular.
3. **Píldoras de aviso** cuando hay problemas globales: unidades sin RA, unidades sin sesiones, actividades sin instrumento, «Evaluación suma 47 %» (Terracotta), «2 referencias por confirmar» (Mora).
4. **Ocho acordeones** en el orden del documento (identificación, justificación, objetivos, contenido, **secuencia didáctica**, metodología, evaluación, bibliografía). Cada uno: chevron, círculo con check si está cerrado, título en serif, resumen de una línea a su derecha. La sección que el asistente trabaja queda abierta y con anillo Pebble.

Dentro de Contenido: unidades en tarjetas `arena/40` con el número en círculo Sow; los temas, blancos y anidados.

**Secuencia en dos niveles:** abre en una lista de tarjetas —una por unidad, con el número, el título y `N sesiones · X h`, o la píldora «sin sesiones»—; al tocar una, la sección se transforma en las sesiones de **esa** unidad, con «Volver a unidades» en la cabecera. El estado de navegación vive en `useState` y el acordeón desmonta su contenido al cerrarse, así que **reabrir la sección siempre devuelve a la lista de unidades**. Las sesiones huérfanas (de una unidad borrada) aparecen en un grupo residual «Sesiones sin unidad».

En Evaluación: instrumento, «Mide» y chips de herramientas por actividad, y una banda Terracotta con «Ajustar a 100» si la suma no da 100. En Bibliografía: cada referencia con píldora **Mora «Sugerencia»** o **Rainfall «Confirmada»**, campos de año/edición/ISBN, y cada recurso con la insignia «usada en N» o «sin uso».

---

## 4. Sistema visual — tokens exactos

Definidos en [tailwind.config.ts](tailwind.config.ts) y documentados en [DESIGN.md](DESIGN.md).

| Token | Hex | Uso |
|---|---|---|
| `seedling` | `#FAF5E9` | fondo de pantalla |
| `crema` | `#FFFDF8` | tarjetas, burbujas del docente, ficha |
| `sow` | `#392525` | burbujas de la IA, círculo del número de unidad |
| `terracotta` | `#B25D3E` | **solo acción**: enviar, exportar, ajustar a 100 |
| `redwood` | `#6B3226` | hover de terracotta |
| `sprout` | `#E3EB90` | banda «tomando forma», selección de texto |
| `mora` | `#6B4A6E` | **solo lo no verificado**: referencias «Sugerencia» |
| `rainfall` | `#728B83` | **solo lo cumplido**: sección completa, «Confirmada», 100 % |
| `arena` | `#EFE7D6` | tarjetas de unidad |
| `mist` / `pebble` | `#B6B7A5` / `#7E7B62` | ondas, anillo de foco |

**Tipografía:** display `"Palatino Linotype", "Book Antiqua", Cambria, Georgia, serif` (serif caligráfico instalado, **no** webfont); cuerpo system-ui; mono solo para datos (folio, `HT/HP/HTI`, porcentajes, `n/8`, `S1`) siempre `tabular-nums`. Rampa documentada: 16, 15, 14, 13, 12, 11, 10 px.

**Reglas de marca:** solo terracotta actúa; toda sombra es marrón cálida difusa (`0 18px 45px -22px rgba(107,50,38,0.45)`); el fondo duna nunca lleva contenido directo; radios 4/8/12/14/18/999.

---

## 5. Checklist de auditoría visual

Lo que nadie ha visto, por riesgo:

### A. Estado A
1. **¿Se lee como un chat?** Cualquier rastro de documento es un fallo del objetivo.
2. **640 px de medida:** ¿línea cómoda (65–75 caracteres) o franja estrecha?
3. **Vacío vertical:** ¿el compositor flota demasiado alto con solo saludo + 3 chips?
4. **«Conversación nueva»** deshabilitado junto al logo: ¿se ve apagado y no roto?

### B. Estado B — aquí está el riesgo real
5. **Proporción 480 px + ficha.** ¿La ficha conserva aire o el chat la estrangula?
6. **Chat apilado arriba** entre 1024 y 1280 px (`38vh`): ¿se siente decisión o accidente?
7. **Las ocho marcas de progreso:** ¿se leen como secciones o como una barra genérica?
8. **Acordeones cerrados:** ¿el resumen («3 unidades · 6 temas», «3 sesiones · 4,5 h») se entiende sin abrir?
9. **Sección en foco con anillo Pebble:** ¿se distingue de la sección simplemente abierta?
10. **Contenido temático:** tres niveles de anidación (unidad → tema → subtema). ¿Sigue legible o se vuelve una madriguera?
11. **Secuencia didáctica, nivel 1 (unidades):** ¿se entiende que cada tarjeta es una entrada y no un resumen? ¿La píldora «sin sesiones» se lee como pendiente y no como error? ¿El `n/total` de la cabecera se interpreta como unidades con sesiones?
12. **Secuencia didáctica, nivel 2 (sesiones):** ¿el «Volver a unidades» se ve como navegación y no como otra acción? ¿Al entrar a una unidad queda claro que solo ves sus sesiones? Cada sesión tiene tres columnas de fase con filas de docente/estudiante: ¿se vuelve ilegible? ¿Sobra anidación?
13. **Evaluación desbalanceada:** la banda Terracotta y «Ajustar a 100» — ¿se entiende de un vistazo? ¿Y el aviso de actividad sin instrumento?
14. **Bibliografía:** píldoras Mora «Sugerencia» vs Rainfall «Confirmada». ¿Se distinguen del acento de acción? ¿La insignia «usada en N» de los recursos se lee como información o como ruido?

### C. Transversal
15. **Quiebres:** 375, 768, 1024, 1280, 1920.
16. **Estados:** vacío, escribiendo (cursor en la burbuja), error con «Reintentar», clave rechazada, aviso efímero abajo al centro.
16. **Accesibilidad:** foco terracotta visible en todo control; `prefers-reduced-motion` anula animaciones; `aria-expanded` en cada acordeón; en la lista de unidades, cada tarjeta es un `button` con `aria-label` que anuncia cuántas sesiones tiene.
17. **Superficies del navegador:** selección `#E3EB90`, caret terracotta, scrollbar `#B6B7A5` sobre `#FAF5E9`.

> **Navegación interna de la Secuencia:** el estado «qué unidad está abierta» vive en `useState` dentro de `SecuenciaSeccion`, y el acordeón desmonta su contenido al cerrarse ([Seccion.tsx](components/ficha/Seccion.tsx)). Por eso **al reabrir la sección siempre se vuelve a la lista de unidades**. Es el comportamiento pedido: no lo «arregles» persistiendo la unidad abierta.

### D. El PDF (esta sí está verificada)
El PDF de texto plano **ya se revisó visualmente**: 5 páginas, acentos correctos, indentación preservada, sin fuentes faltantes. Lo que conviene vigilar si se toca el generador: saltos de página que dejen un encabezado huérfano (hay guarda), líneas de más de ~91 caracteres (se envuelven) y referencias con `[SIN CONFIRMAR]`.

---

## 6. Arquitectura

```
app/
  page.tsx                 orquesta todo: estados, modos, envío, localStorage
  api/chat/route.ts        proxy SSE a DeepSeek; guardas, timeouts, errores
  api/salud/route.ts       valida la clave con GET /models (cache 30 s)
  api/diagnostico/route.ts últimas trazas (solo si DESIGNCONIA_DIAGNOSTICO=1)
components/
  Chat.tsx                 hilo, compositor, chips; variante "limpio" | "lateral"
  Icono.tsx                iconos SVG a mano, trazo 1.7
  ficha/Microcurriculo.tsx franja, progreso n/8, orquesta las 8 secciones
  ficha/Seccion.tsx        acordeón con estado y resumen
  ficha/Secciones.tsx      los ocho cuerpos editables (incluye secuencia en dos niveles)
  ficha/Campos.tsx         campo, área, número, lista de textos, botón mini
lib/
  schema.ts                modelo, normalización, validación, fusión, parseo, migración
                           + agrupación de la secuencia: sesionesDeUnidad, horasTotales,
                             unidadesDeSecuencia, unidadesConSesiones
  prompt.ts                prompt de sistema y contrato JSON
  exportarTexto.ts         microcurrículo → texto plano
  exportarPdf.ts           texto plano → PDF mínimo (Helvetica/WinAnsi), sin dependencias
  markdown.ts              microcurrículo → Markdown (para «Copiar»)
  errores.ts               textoLegible() y normalizarClave()
  traza.ts                 memoria de las últimas peticiones
  schema.test.ts           95 pruebas, runner propio
```

### El contrato con la IA

```json
{ "mensaje": "...", "sugerencias": ["..."], "intencion": "entender|crear|editar|consultar",
  "seccionActiva": "justificacion|objetivos|contenido|secuencia|metodologia|evaluacion|ident|bibliografia",
  "generar": false, "borrador": null }
```

- `mensaje` va **primero**: el cliente lo extrae en streaming ([extraerMensajeParcial](lib/schema.ts)) mientras el resto llega.
- **`borrador` es opcional.** `null` = turno conversacional, no toca nada.
- **Generación por hitos:** en cuanto hay un dato real, `generar: true` con el borrador **parcial**. No espera a las ocho secciones.
- `seccionActiva` decide qué acordeón se abre y se resalta.
- Si el JSON llega **desbalanceado al final**, `repararJSON` lo cierra de forma determinista; si el daño es interno, no se toca y se pide reintentar.
- **Sesiones:** se generan por unidad y se acumulan en el merge (`fusionarSesiones`), así pedir las de la unidad 2 no borra las de la 1.
- **ISBN:** el prompt prohíbe proponerlo. Año y edición sí se proponen, siempre como sugerencia.

**Bugs de raíz corregidos — no los reintroduzcas:**
1. El prompt obligaba a generar siempre → el modelo no podía preguntar.
2. Se normalizaba una ficha vacía en cada respuesta y se fusionaba → un turno que solo preguntaba **borraba** lo anterior. Ahora la unión es discriminada: sin borrador no existe ficha.
3. `max_tokens: 8000` truncaba el JSON. Ahora 32000 y el `finish_reason` llega al cliente.
4. Las confirmaciones de bibliografía viven en el docente: el merge las restaura comparando autor y título, porque el modelo siempre devuelve `confirmada: false`. La migración hace lo mismo.
5. `envolver()` del PDF partía por palabras y **perdía la sangría**: los ítems anidados acababan al ras. Se conserva explícitamente.

### Persistencia

`localStorage`, clave **`designconia.micro.v2`**, con `{ version, microcurriculo, mensajes, sugerencias, intencion, seccionActiva, crudo }`. `microcurriculo` es `null` sin borrador. Se valida con `esEstadoGuardado`.

Un guardado de la versión anterior (`designconia.micro.v1`) **se migra** con `migrarEstadoV1`: se normalizan los campos nuevos (secuencia vacía, instrumentos vacíos, año/edición/ISBN vacíos) y se conservan las confirmaciones de bibliografía. Las claves de la ficha de sesión (`designconia.ficha.v3/v2`) sí se borran: son de otro producto.

---

## 7. Verificación que ya existe

```
95 pruebas         npm test
tipos              npx tsc --noEmit      → limpio
build              npx next build        → correcto
detector visual    impeccable detect     → 0 hallazgos
PDF                render con LibreOffice → 5 páginas, sin fuentes faltantes
```

Verificado por HTTP contra la API real: turno conversacional (no genera), turno con datos (borrador parcial con la asignatura), iteración (agrega unidades y cortes sin perder lo previo), generación completa **8/8** con secuencia didáctica, e iteración de la secuencia por unidad sin borrar las demás.

Lo verificado **visualmente** es solo el PDF. **La interfaz de la app sigue sin verse**: no hay navegador en este entorno.

---

## 8. Errores conocidos

| Síntoma | Causa | Solución |
|---|---|---|
| `__webpack_modules__[moduleId] is not a function` | `.next` mezclado por dos dev servers | borrar `.next`, dejar **uno** |
| 404 en `/api/chat` | la pestaña apunta a otro puerto (3001) | abrir `localhost:3000` |
| 404 al primer request tras arrancar | Next responde 404 mientras compila la ruta | reintentar; ya está precalentado |
| `Authentication Fails` (401) | clave inválida | reponer `DEEPSEEK_API_KEY` y reiniciar |
| «La respuesta se cortó…» | se agotó el presupuesto de tokens | pedir una unidad por vez |
| «La conexión se cortó…» | el servidor se reinició a mitad del stream | reintentar |

---

## 9. Historial de entregas

Lo que existe hoy es el resultado de seis rondas. Sirve para entender por qué hay código que parece de otro producto (spoiler: lo fue).

1. **Prototipo visual** — un mockup de una sola pantalla con datos fijos y una «IA» que era un `setTimeout` devolviendo frases escritas a mano. Mundo visual CodeEase (duna + crema + Terracotta), tres rieles. Hubo una ronda de tres composiciones y el usuario eligió la A.
2. **IA real** — se sustituyó el simulacro por el proxy SSE a DeepSeek (`/api/chat`), más `/api/salud` (valida la clave antes de que el docente escriba) y `/api/diagnostico` (trazas de las últimas peticiones). Llegaron con ella: streaming del mensaje mientras el JSON aún se está formando, `finish_reason` para explicar cortes, `repararJSON` para cierres desbalanceados, reintento automático del turno vacío y `textoLegible()` para no perder el detalle del proveedor.
3. **Flujo conversacional** — el borrador pasó a ser **opcional** en el contrato. Antes, cada respuesta generaba una ficha; un turno que solo preguntaba **borraba** la anterior. Ahora la ficha nace por hitos, el arranque es un chat limpio con «¿Qué qués hacer hoy?» y existe «Conversación nueva».
4. **Dominio universitario** — de ficha de sesión escolar (OA, 5° básico) a **microcurrículo de asignatura** de educación superior: siete secciones, bibliografía que nace como sugerencia, «Ajustar a 100» y contador `n/7`.
5. **Ocho secciones** — se añadió la **secuencia didáctica** (sesiones con tres fases), instrumentos por entregable, herramientas alineadas a las actividades, año/edición/ISBN, exportación a **PDF de texto plano** (el Markdown se quedó para «Copiar»), chat a 480 px y migración del estado guardado `v1 → v2`. Las pruebas pasaron de 60 a 87.
6. **Secuencia en dos niveles** — la sección abre en la lista de unidades y al tocar una muestra solo sus sesiones, con «Volver a unidades», indicador `unidades con sesiones / total` y grupo residual para sesiones huérfanas. 95 pruebas.

**Bugs que costaron tiempo y ya están cerrados** (están detallados en §6): la ficha que se borraba sola, `max_tokens` corto, dos servidores de desarrollo pisándose `.next`, el `404` de una pestaña en el puerto equivocado, `ref` como prop reservada de React y la sangría que se perdía al envolver líneas del PDF.

---

## 10. Historia de decisiones

1. **Mundo visual pineado** por el usuario desde una imagen de referencia (CodeEase). No negociable.
2. **Composición:** se eligió COMP A (tres rieles) en una ronda de tres propuestas.
3. **Dominio:** empezó escolar (OA, 5° básico) → **educación superior** → **microcurrículo completo de asignatura** (esta entrega). La sesión quedó fuera.
4. **Flujo:** chat primero; el asistente pregunta antes de producir; la ficha crece por hitos.
5. **Sugerencias aceptadas por el usuario en esta entrega:** estados por sección, «Ajustar a 100», bibliografía honesta marcada como sugerencia, orden de preguntas empezando por el propósito con la identificación al final, y resultados de aprendizaje por unidad.
6. **Segunda ronda de sugerencias del usuario (esta entrega):** resultados de aprendizaje obligatorios con verbos medibles, **secuencia didáctica** con sesiones y tres fases, instrumentos de evaluación por entregable, año/edición/ISBN en la bibliografía, herramientas integradas en las actividades, **exportación a PDF** de texto plano (el Markdown se conserva solo para «Copiar»), y chat más ancho (480 px).
7. **El ISBN no se genera nunca con IA.** Decisión explícita: un ISBN inventado parece autoritativo y es verificable como falso. El asistente pide el dato.
8. **Tercera ronda: la secuencia se navega en dos niveles.** El usuario pidió ver las unidades al abrir la sección y entrar a una para ver solo sus sesiones. Es navegación, no cambio de modelo: no se tocaron esquema, prompt, API ni persistencia. El estado de la unidad abierta queda en memoria y se reinicia al cerrar el acordeón, a propósito.

---

## 11. Qué NO hacer

- No reintroducir vocabulario escolar (OA, niveles, SEP, NEM).
- No generar un microcurrículo completo antes del primer dato: la ficha debe crecer por hitos.
- No dejar que un turno conversacional toque la ficha.
- No presentar una referencia sin confirmar como obligatoria.
- No inventar ISBN, ni siquiera como sugerencia.
- No generar las veinte sesiones del curso de una vez: la secuencia es modular, por unidad.
- No usar emoji como iconos, degradados de texto, ni sombras negras.
- No usar Mora para decorar ni terracotta para algo que no sea acción.
- No inventar código, programa, créditos ni semestre: `[por definir]`.
- No ejecutar `next build` con el servidor de desarrollo vivo: se pisan los artefactos de `.next`.

---

*Documento de traspaso. Si algo aquí contradice el código, manda el código — y conviene anotar la discrepancia.*
