# DesignConia — contexto y traspaso actualizado

**Actualizado:** 31 de octubre de 2026. Este documento refleja el estado comprobado de la rama de desarrollo. Si contradice una implementación posterior, manda el código y actualiza este handoff.

> **Resumen ejecutivo:** ya existe una base local V3 con los tres niveles de datos, migración segura y una primera versión funcional de los módulos Macro, Meso y Micro. El siguiente trabajo ya no es crear esos niveles desde cero: es completar la navegación entre varios documentos, la trazabilidad pedagógica de extremo a extremo, las exportaciones y la revisión visual. La interfaz nueva todavía no se ha inspeccionado en navegador.

## 1. Producto y requisitos acordados

**DesignConia** es una aplicación web asistida por IA para diseño curricular de **educación superior**. No usa modelos escolares ni marcos de educación básica/media.

| Nivel interno | Nombre visible | Alcance |
|---|---|---|
| **Macro** | Marco educativo institucional | Modelo educativo, principios, orientaciones y fuentes de la institución. No representa un currículo nacional. |
| **Meso** | Programa académico | Identidad del programa, perfiles de ingreso/egreso, resultados del programa y vínculo a un marco institucional. |
| **Micro** | Asignatura | Se conserva el microcurrículo existente de ocho secciones, con resultados por unidad, sesiones, metodología, evaluación, bibliografía y recursos. |

### Decisiones confirmadas por el usuario

- Un proyecto representa **un contexto institucional** y puede contener varios marcos/versiones y programas.
- En la interfaz de primera entrega, cada programa selecciona como máximo un **marco principal activo**; los vínculos anteriores se conservan como historial.
- Una asignatura puede permanecer independiente o asociarse a **un programa**. Cursos compartidos entre programas se dejan para una fase posterior.
- Se mantiene el arranque conversacional: el saludo pregunta qué quiere hacer la persona antes de pedir datos. Al existir un documento, se usa un selector compacto para cambiar de nivel; no se añade un tercer panel.
- La IA puede proponer principios/orientaciones como `sugerencia_IA`, pero no presentarlos como política oficial. El docente confirma o edita.
- Las fuentes curriculares son distintas de la bibliografía del Micro. No se inventan fuentes, emisores, vigencias ni datos oficiales.
- En esta primera versión las fuentes se capturan manualmente; no hay importación ni extracción automática de PDF/syllabus.
- Sin autenticación, roles, persistencia de servidor, colaboración ni sincronización entre dispositivos.

## 2. Requisitos: estado real y faltantes

| Requisito | Estado actual | Pendiente / límite actual |
|---|---|---|
| Crear y editar un marco institucional con IA | **Implementado**: editor, prompt, parseo, fusión y ruta API Macro. La IA puede proponer principios/orientaciones como sugerencias. | No se han recorrido visualmente sus estados en navegador; falta poder asociar una fuente a cada afirmación desde la UI. |
| Crear y editar un programa académico con IA | **Implementado**: editor, prompt, parseo, fusión y ruta API Meso. Incluye perfiles, resultados y vínculo principal a un Marco. | No hay lista/selector ni acción de «nuevo programa» para elegir entre varios programas. |
| Conservar el Micro y migrar el guardado previo | **Implementado**: V1/V2→V3, respaldo, staging y protección frente a datos corruptos. | El Micro aún no tiene IDs estables propios para sus resultados/unidades/evidencias. |
| Vincular Meso con Macro | **Implementado**: un marco principal activo por programa; al cambiarlo, el vínculo anterior se conserva como inactivo. | Hay tipos de alineación Macro→resultado Meso, pero no una matriz editable de alineación en la interfaz. |
| Vincular Micro con Meso | **Implementado**: desde el editor Meso se vincula/desvincula una asignatura independiente; la ficha nunca se borra al desvincular. | El vínculo es a nivel de asignatura, no entre resultados específicos. Una asignatura solo admite un programa en este MVP. |
| Elegir Macro/Meso/Micro conversando | **Implementado**: sin tarjetas ni selectores visibles; la IA decide el nivel por chat (enrutador con `aclarar` ante duda) y muestra una etiqueta pasiva de contexto. | Verificado solo con tipos, pruebas y build; sin inspección visual en navegador. |
| Manejar varios Marcos, Programas y Asignaturas | **Implementado**: botón «+» del compositor con adjuntar PDF, nuevo documento (por chat) y lista de documentos; abrir/crear preserva el proyecto y sus hilos. | El documento recién creado tarda un instante en aparecer en la lista (autosave con debounce). «Conversación nueva» sigue siendo borrado total y explícito del proyecto. |
| Adjuntar PDFs como fuentes (máx. 3 años) | **Implementado**: solo PDF con texto (sin OCR), validación de firma/tamaño/páginas, extracción local en navegador, año por metadatos o declarado, registro como fuente curricular con texto recortado. | Límite 10 MB por archivo, 3 por envío, 150 páginas; tope de texto para contexto y almacenamiento. Sin inspección visual en navegador. |
| Trazabilidad pedagógica completa | **Implementada**: RA con ids estables y actividades con `mideIds` en el Micro; bordes principio→resultado→RA (RA→actividad vive en `mideIds`); matrices editables Macro→programa y programa→RA en la ficha Meso; insignias «Responde a» en el contenido Micro; poda de huérfanas al editar. | Falta matriz RA→actividad como alineación editable (hoy vive en `mideIds` de cada actividad). `mide` se conserva como nota libre heredada. Sin inspección visual en navegador. |
| Citas de fuentes curriculares | **Implementada**: editor compartido de citas (fuente + localizador/página/sección) en cada afirmación Macro/Meso, con selectores de origen y estado; el cambio a documento/contrastada exige cita válida y la última cita respaldada no se puede quitar. | Sin inspección visual en navegador. |
| Exportación | **Implementada para Micro, Macro y Meso**: PDF de texto plano y copia Markdown en los tres niveles; el programa incluye trazabilidad (principios y RA vinculados) y asignaturas. | Resuelta con el expediente conjunto (ver abajo). |
| Revisión visual | El detector mecánico marcó 0 hallazgos en los objetivos examinados. | **No se hizo inspección visual en navegador ni capturas** de la interfaz Macro/Meso. |

### Próximo orden recomendado

1. ~~Chat conversacional con elección de nivel~~ Hecho: sin tarjetas ni selectores; enrutador por intención con `aclarar`, etiqueta pasiva de contexto y cambio de nivel por chat.
2. ~~Gestión de varios documentos por nivel~~ Hecho: botón «+» con adjuntar PDF, nuevo documento por chat y lista de documentos, con proyecto e hilos preservados.
3. ~~Trazabilidad Macro→Meso→Micro→evaluación~~ Hecho: ids estables en RA/actividades, matrices editables en Meso, `mideIds` en evaluación, poda de huérfanas y migración de datos heredados al leer.
4. ~~Citas curriculares y exportación Macro/Meso~~ Hecho: citas editables por afirmación con localizador, paridad de normalizadores y PDF/Markdown en los tres niveles.
5. ~~Expediente curricular conjunto~~ Hecho: `exportarExpediente.ts` reúne marcos, programas, asignaturas y alineaciones en texto plano/Markdown/PDF, con botones Copiar/Expediente en el encabezado.
6. ~~PDFs como fuentes con tope de 3 años~~ Hecho: `lib/pdf.ts` (validación, año, extractos) + `lib/inicio.ts` (enrutador), extracción local con worker en `/public`, citas con página y evidencia en los tres niveles.
7. Probar flujos completos y revisar visualmente escritorio/móvil (detector mecánico limpio; sin inspección en navegador).

## 3. Datos y contratos

### Agregado curricular

El modelo está en [proyecto.ts](lib/proyecto.ts). La forma general es:

```text
ProyectoCurricular
├── marcos: MarcoEducativoInstitucional[]
├── programas: ProgramaAcademico[]
├── asignaturas: Asignatura[]
├── fuentesCurriculares: FuenteCurricular[]
├── vinculosProgramaMarco: VinculoProgramaMarco[]
└── alineaciones: AlineacionCurricular[]
```

- `MarcoEducativoInstitucional`: id, nombre, emisor opcional, versión/vigencia/estado, principios y otras afirmaciones.
- `ProgramaAcademico`: id, nombre/código, perfiles y resultados del programa.
- `Asignatura`: id, `programaId: string | null` y el `Microcurriculo` canónico. No se duplica el esquema Micro.
- `AfirmacionCurricular`: id, texto, origen (`docente`, `documento`, `sugerencia_IA`, `derivado`), estado (`sin_confirmar`, `confirmado_por_docente`, `contrastado_con_fuente`) y citas.
- `FuenteCurricular` no se mezcla con bibliografía. Una afirmación de origen documental o contrastada exige una cita válida.
- Una alineación no equivale por sí sola a aprobación institucional.
- Nodos: `principio_marco`, `resultado_programa`, `ra_micro`, `actividad_evaluacion`; bordes permitidos principio→resultado→RA. Los nodos Micro llevan `contextoId` (asignatura) para desambiguar. Operaciones puras en [alineaciones.ts](lib/alineaciones.ts).

### Contrato Micro existente

El Micro canónico sigue en [schema.ts](lib/schema.ts). Conserva las ocho secciones y su flujo de generación por hitos. Los RA son `{id, texto}` con ids estables y las actividades llevan `{id, mide, mideIds}`; el `mide` heredado (texto libre) se resuelve al RA del mismo texto al normalizar. Los datos heredados se migran al leer sin romper el guard.

### Prompts y API

- [prompt.ts](lib/prompt.ts): contrato y prompt Micro existentes.
- [promptMacro.ts](lib/promptMacro.ts): prompt Macro. La respuesta usa JSON con `mensaje` primero, `generar` y `borrador` opcional; las fuentes no aportadas quedan fuera.
- [promptMeso.ts](lib/promptMeso.ts): prompt Meso. Recibe solo marcos disponibles por id para no inventar ni adjuntar un marco inexistente.
- [route.ts](app/api/chat/route.ts): `modulo: "macro"` usa el prompt Macro y solo recibe el marco activo; `modulo: "meso"` recibe el programa y marcos disponibles; sin módulo explícito, permanece el flujo Micro.
- El proxy SSE y extracción incremental de `mensaje` siguen comunes a los niveles.

### Persistencia y puentes de estado

- [persistencia.ts](lib/persistencia.ts): estado V3 en `designconia.proyecto.v3`; conserva respaldo, staging y claves de recuperación. Revisa payloads V1/V2 por versión antes de migrar; solo elimina snapshots reconocidos después de verificar el nuevo estado.
- Claves históricas: `designconia.micro.v2` y `designconia.micro.v1`.
- [estadoMicro.ts](lib/estadoMicro.ts), [estadoMacro.ts](lib/estadoMacro.ts) y [estadoMeso.ts](lib/estadoMeso.ts): adaptadores puros entre vista y agregado V3; protegen scopes, IDs y documentos/conversaciones hermanos.
- El vínculo Programa–Marco mantiene un marco principal activo por programa. El vínculo Asignatura–Programa actualiza solo `programaId`; desvincular conserva la asignatura.

## 4. Arquitectura actual

```text
app/
  page.tsx                       chat conversacional, enrutador, adjuntos PDF y guardado V3
  api/chat/route.ts              proxy SSE y ramas inicio/Micro/Macro/Meso + evidencia PDF
  api/salud/route.ts             valida conexión y clave
components/
  Chat.tsx                       hilo y compositor con botón «+», menú y chips de PDF
  ficha/Microcurriculo.tsx       editor de la asignatura existente
  ficha/Marco.tsx                editor del marco institucional
  ficha/Meso.tsx                 editor del programa y vínculos
  ficha/Seccion.tsx              acordeón del Micro
  ficha/Campos.tsx               controles editables reutilizables
  ficha/Citas.tsx                editor compartido de citas y afirmaciones Macro/Meso
lib/
  pdf.ts                         validación, año/antigüedad, extractos y worker local (8 pruebas)
  inicio.ts / promptInicio.ts    enrutador por intención + heurística de cambio (5 pruebas)
  exportarMacroTexto.ts          marco a texto plano (para PDF)
  exportarMesoTexto.ts           programa a texto plano con trazabilidad (para PDF)
  exportarExpediente.ts          expediente conjunto texto/Markdown de todo el proyecto
  exportarExpediente.test.ts     3 pruebas del expediente
  flujos.test.ts                 2 pruebas de flujos completos Macro→Meso→Micro→expediente
  exportarCurricular.test.ts     5 pruebas de exportación Macro/Meso
  schema.ts                      contrato Micro, normalización y 95 pruebas
  proyecto.ts                    agregado V3, guardas y migración Micro
  alineaciones.ts                definir/quitar/matriz de alineaciones + 11 pruebas (en trazabilidad.test.ts)
  trazabilidad.test.ts           11 pruebas de RA estables, bordes y poda
  persistencia.ts                migración/guardado local transaccional
  estadoMicro.ts                 puente vista Micro ↔ V3 (migra al leer, poda al editar)
  macro.ts / promptMacro.ts       lógica pura y prompt Macro
  estadoMacro.ts                 puente vista Marco ↔ V3 (poda al editar)
  meso.ts / promptMeso.ts         lógica pura y prompt Meso
  estadoMeso.ts                  puente vista Programa ↔ V3 y vínculos Micro (poda al editar)
```

## 5. Verificación comprobada

Último checkpoint de implementación: commit `84c8e57` (flujos E2E verificados y deriva PRODUCT/DESIGN resuelta) en la rama local `feature/curricular-project-foundation`. Los commits de desarrollo **no se han subido a GitHub**.

```text
npm test              → 271 pruebas (95 + 14 + 38 + 11 + 27 + 11 + 24 + 17 + 11 + 5 + 3 + 2 + 8 + 5)
impeccable detect     → [] sobre Citas, Marco, Meso, Secciones, Microcurriculo y page
npx tsc --noEmit      → limpio
npm run build         → correcto
API real Macro/Meso   → turnos conversacionales probados por HTTP; cierre SSE stop/[DONE]
```

No hay pruebas automatizadas de UI/API de extremo a extremo. Los smoke tests de API fueron breves; no sustituyen probar una conversación completa en navegador.

## 6. Sistema visual y estado visual

La adición Macro/Meso **hereda** el mundo visual confirmado en [DESIGN.md](DESIGN.md) y la paleta definida en [tailwind.config.ts](tailwind.config.ts): Seedling/Sow, tarjetas crema, acento Terracotta para acciones, Mora para contenido sin confirmar y Rainfall para contenido confirmado. No se cambió la identidad visual.

**Drift documental resuelto:** [PRODUCT.md](PRODUCT.md) y [DESIGN.md](DESIGN.md) ya describen los tres niveles, la trazabilidad, las citas y el expediente, conservando el mundo visual. Mora identifica lo sin verificar (bibliografía y afirmaciones); Rainfall lo cumplido/contrastado; Sow marca el origen documento.

- Estado inicial: solo el chat con saludo neutro; la IA decide el nivel conversando y muestra una etiqueta pasiva de contexto. No aparece ficha hasta que hay contenido.
- Al existir un documento: chat a la izquierda y ficha a la derecha, sin selectores visibles; el botón «+» del compositor concentra adjuntar PDF, nuevo documento y la lista de documentos, sin tercer riel.
- Macro/Meso/Micro permiten varios documentos por proyecto: el menú «+» cambia el documento activo y «Nuevo documento» vuelve al inicio por chat, preservando lo anterior y sus hilos. Los PDF adjuntos viajan como evidencia citada por página; solo se integran PDFs de hasta 3 años.
- **La interfaz no se ha inspeccionado visualmente en navegador.** Revisar al menos 375/768/1024/1280/1920 px, teclado/foco, estados vacíos, módulo activo, guardado y scopes no compatibles.

## 7. Alcance que sigue fuera

- Importación/subida de PDF, extracción automática o ingesta documental.
- Login, roles, trabajo colaborativo, persistencia de servidor o multi-institución.
- Cursos compartidos entre varios programas (relación N:M asignatura–programa).
- Exportación formal/estilizada o Word.

## 8. Cómo trabajar sin reintroducir fallos conocidos

```bash
cd D:\Devtools\Proyectos\DeepseekHS\disenoconia
npm run dev
npm test
npx tsc --noEmit
npm run build
```

- **No levantes dos servidores Next** sobre el mismo `.next`.
- **No ejecutes `next build` con el servidor de desarrollo vivo.**
- En esta máquina el entorno aislado puede bloquear `spawn` de workers de Next con `EPERM`; si ocurre, la compilación debe repetirse fuera del aislamiento (sin otro servidor activo).
- `.env.local` no se debe versionar; usa [.env.example](.env.example) como plantilla.
- No añadas secretos, fuentes institucionales inventadas ni nombres/códigos de programa inferidos.

## 9. Historial resumido

1. Se sustituyó el prototipo con IA simulada por el chat real con DeepSeek y streaming SSE.
2. El dominio se trasladó de una ficha escolar a un microcurrículo universitario de ocho secciones.
3. Se añadieron secuencia didáctica modular por unidad, instrumentos, recursos alineados y PDF de texto plano.
4. Se integró Macro/Meso en V3, con migración segura desde `designconia.micro.v1/v2` y continuidad del Micro.
5. Se añadieron los prompts, editores, API y vínculos Programa–Marco y Asignatura–Programa.
6. Se añadió gestión multi-documento (selector + «+ Nuevo» por nivel, entrada inicial por nivel con saludo/sugerencias).
7. Se implementó trazabilidad: RA/actividades con ids, bordes extendidos, matrices en Meso, `mideIds` en evaluación y poda de huérfanas.
8. Se implementaron citas editables por afirmación (fuente + localizador, con paridad macro/meso en normalizadores) y exportación Macro/Meso a PDF de texto plano y Markdown.
9. Se implementó el expediente curricular conjunto (texto plano/Markdown/PDF de todo el proyecto con trazabilidad) con 3 pruebas nuevas.
10. Se verificaron flujos completos a nivel de datos (2 pruebas en `flujos.test.ts`) y se resolvió la deriva en PRODUCT.md/DESIGN.md.
11. Chat conversacional con enrutador por intención (sin selectores visibles), botón «+» con adjuntos PDF y documentos, PDFs como fuentes con tope de 3 años y citas por página.

> Si cualquier sección histórica de este archivo o [PRODUCT.md](PRODUCT.md) aún describe un producto solo Micro, esta sección y el código reciente describen el estado actual; actualiza las discrepancias cuando corresponda.

---

*Handoff para continuar el proyecto: distinguir siempre entre lo que existe en el modelo, lo que está disponible en la interfaz y lo que todavía no se ha validado visualmente.*
