# DesignConia — contexto y traspaso actualizado

**Actualizado:** 19 de noviembre de 2026. Este documento refleja el estado comprobado de la rama de desarrollo. Si contradice una implementación posterior, manda el código y actualiza este handoff.

> **Resumen ejecutivo:** la base V3 tiene los tres niveles con trazabilidad de extremo a extremo, chat-first sin selectores, citas, PDFs como fuentes (tope 3 años), carga horaria verificable y exportaciones incluido el expediente. Encima está el **piloto unipersonal**: clave IA propia por sesión, respaldo/restauración JSON, catálogo con duplicado y finalizado, nube Supabase opcional (una fila por docente) y la **Fase 2** de documento oficial con estudio de diseño (4 plantillas Carta/A4, kit de marca con imágenes, bloques arrastrables por zonas y PDF fiel). La recolección se reordenó en **dos espacios** (trabajo: chat + ficha; proyecto: gestión) con **ficha compacta** (índice de secciones + acordeón exclusivo). Todo está **subido a GitHub**. Pendiente: inspección visual en navegador (incluido Meso profundo y el estudio), desplegar a Vercel con acceso protegido y, si hace falta multi-navegador, activar el proyecto Supabase.

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
- Se mantiene el arranque conversacional: el saludo pregunta qué quiere hacer la persona antes de pedir datos. No hay selectores visibles de nivel ni de documento: la IA decide por chat (con `aclarar` ante duda) y solo se muestra una etiqueta pasiva de contexto; no hay tercer panel.
- La IA puede proponer principios/orientaciones como `sugerencia_IA`, pero no presentarlos como política oficial. El docente confirma o edita.
- Las fuentes curriculares son distintas de la bibliografía del Micro. No se inventan fuentes, emisores, vigencias ni datos oficiales.
- Las fuentes pueden registrarse a mano o integrarse desde un PDF adjunto (texto extraído localmente, sin OCR); solo se integran PDFs de hasta 3 años, con año por metadatos o declarado por el docente.
- Sin roles, colaboración multiusuario ni multi-institución. La nube opcional (Supabase) autentica a **una cuenta por docente** con enlace mágico y guarda una fila con todo su proyecto; no hay login con contraseña.
- **Fase 2 (documento oficial), confirmado por el usuario:** dos fases separadas — recopilar (el currículo sigue siendo la fuente de verdad) y diseñar. Carta **y** A4; **solo exportación PDF** (sin Word). Arrastre con **cuadrícula magnética por zonas** y reflujo automático: nada queda en coordenadas libres ni se superpone. La redacción en el diseñador sincroniza con la ficha por defecto; el «solo en este documento» es un override explícito y marcado. Kit institucional compartido con ajustes por documento; 4 plantillas neutrales iniciales (no hay formato oficial de referencia). El expediente conjunto queda fuera del diseñador en esta primera entrega.

## 2. Requisitos: estado real y faltantes

| Requisito | Estado actual | Pendiente / límite actual |
|---|---|---|
| Crear y editar un marco institucional con IA | **Implementado**: editor, prompt, parseo, fusión y ruta API Macro. La IA puede proponer principios/orientaciones como sugerencias. | Verificado solo con tipos, pruebas y build; sin inspección visual en navegador. |
| Crear y editar un programa académico con IA | **Implementado**: editor, prompt, parseo, fusión y ruta API Meso. Incluye perfiles, resultados y vínculo principal a un Marco. | Verificado solo con tipos, pruebas y build; sin inspección visual en navegador. |
| Conservar el Micro y migrar el guardado previo | **Implementado**: V1/V2→V3, respaldo, staging y protección frente a datos corruptos. | Sin inspección visual en navegador. |
| Vincular Meso con Macro | **Implementado**: un marco principal activo por programa; al cambiarlo, el vínculo anterior se conserva como inactivo, más matriz editable principio→resultado en la ficha Meso. | Sin inspección visual en navegador. |
| Vincular Micro con Meso | **Implementado**: desde el editor Meso se vincula/desvincula una asignatura independiente; la ficha nunca se borra al desvincular. El vínculo trazable programa→RA vive en la matriz Meso; una asignatura solo admite un programa en este MVP. | Sin inspección visual en navegador. |
| Elegir Macro/Meso/Micro conversando | **Implementado**: sin tarjetas ni selectores visibles; la IA decide el nivel por chat (enrutador con `aclarar` ante duda) y muestra una etiqueta pasiva de contexto. | Verificado solo con tipos, pruebas y build; sin inspección visual en navegador. |
| Manejar varios Marcos, Programas y Asignaturas | **Implementado**: botón «+» del compositor con adjuntar PDF, nuevo documento (por chat) y lista de documentos; abrir/crear preserva el proyecto y sus hilos. | El documento recién creado tarda un instante en aparecer en la lista (autosave con debounce). «Conversación nueva» sigue siendo borrado total y explícito del proyecto. |
| Adjuntar PDFs como fuentes (máx. 3 años) | **Implementado**: solo PDF con texto (sin OCR), validación de firma/tamaño/páginas, extracción local en navegador, año por metadatos o declarado, registro como fuente curricular con texto recortado. | Límite 10 MB por archivo, 3 por envío, 150 páginas; tope de texto para contexto y almacenamiento. Sin inspección visual en navegador. |
| Trazabilidad pedagógica completa | **Implementada**: RA con ids estables y actividades con `mideIds` en el Micro; bordes principio→resultado→RA (RA→actividad vive en `mideIds`); matrices editables Macro→programa y programa→RA en la ficha Meso; insignias «Responde a» en el contenido Micro; poda de huérfanas al editar. | Falta matriz RA→actividad como alineación editable (hoy vive en `mideIds` de cada actividad). `mide` se conserva como nota libre heredada. Sin inspección visual en navegador. |
| Citas de fuentes curriculares | **Implementada**: editor compartido de citas (fuente + localizador/página/sección) en cada afirmación Macro/Meso, con selectores de origen y estado; el cambio a documento/contrastada exige cita válida y la última cita respaldada no se puede quitar. | Sin inspección visual en navegador. |
| Exportación | **Implementada en dos vías**: (1) PDF de texto plano y Markdown por nivel + expediente conjunto; (2) **Fase 2**: estudio de diseño → PDF vectorial fiel con plantillas Carta/A4, marca, imágenes y numeración. | Solo PDF en el diseñador (sin Word). El expediente conjunto no pasa por el diseñador. |
| Carga horaria verificable | **Implementada**: comparación por minutos exactos con tolerancia de 30 min por tipo; aviso con delta («faltan 50 h I»); confirmación verde al cuadrar y estado neutral sin horas declaradas; trabajos independientes con esfuerzo propio (hasta 6000 min c/u) y `reemplazoSecuencia` para reequilibrios globales; la IA recibe minutos exactos y no declara TERMINADO con carga descuadrada. | Sin inspección visual en navegador. |
| Reutilización de currículos | **Implementado**: catálogo con búsqueda por código/nombre (insensible a tildes), abrir, **duplicar como base** (ids y trazabilidad propios, `origenCopia` registrado, sin vínculos heredados) y marca **Finalizado** (señal del docente, no aprobación oficial). | La búsqueda solo cubre documentos del proyecto local/nube actual. Sin inspección visual en navegador. |
| Clave IA propia (BYOK) | **Implementada**: panel «Clave IA» con guardar/probar/olvidar; vive solo en sessionStorage, viaja por cabecera `x-clave-ia`, nunca en copias, exportaciones ni logs; el servidor la usa de forma transitoria y distingue su origen en los errores. | Sin «recordar entre sesiones» (decisión de seguridad deliberada). Sin inspección visual en navegador. |
| Respaldo del proyecto | **Implementado**: botones Respaldo/Restaurar; JSON validado con el mismo guard V3 (archivo corrupto o ajeno se rechaza sin tocar nada); restaurar pide confirmación. | Sin inspección visual en navegador. |
| Nube opcional (Supabase) | **Implementado el código completo**: sesión por enlace mágico, subir/bajar proyecto (una fila por docente, RLS por propietario), migración SQL y guía en [docs/NUBE.md](docs/NUBE.md). | **Sin proyecto Supabase creado todavía**: requiere cuenta del usuario, ejecutar la migración y 2 variables de entorno. Sin env, todo sigue local. |
| Espacios trabajo/proyecto + ficha compacta | **Implementado**: estado `trabajo ↔ proyecto` en `page.tsx`; el encabezado queda en 5 controles y la gestión (documento en trabajo, expediente, catálogo, respaldo, nube, clave, apariencia, empezar de cero) vive en `components/Proyecto.tsx`. Índice de secciones con estado + acordeón exclusivo en las 3 fichas (acordeones controlados). Abrir/duplicar devuelve al trabajo; el punto de salud es botón solo si la clave falla. | Sin inspección visual en navegador. |
| Fase 2: documento oficial | **Implementada**: botón «Diseñar documento» abre el estudio (estructura arrastrable por zonas con flechas accesibles, vista previa paginada real, propiedades de bloque/documento, kit de marca con PNG/JPG/WebP/SVG sanitizado hasta 3 MB) y exporta PDF vectorial fiel (fuentes, tamaños, colores, alineación, encabezado/pie, JPEG incrustado, títulos sin huérfanos). Los bloques apuntan al currículo por `ref`; la redacción local es override explícito. | **Nunca abierto en navegador**: probar plantillas, arrastre, logo y comparar PDF vs vista previa. 4 plantillas base fijas; sin plantillas propias guardadas. |
| Revisión visual | El detector mecánico marcó 0 hallazgos en los objetivos examinados. | **No se hizo inspección visual en navegador ni capturas** de la interfaz (Meso solo se probó rellenando campos). |

### Próximo orden recomendado

1. ~~Chat conversacional con elección de nivel~~ Hecho: sin tarjetas ni selectores; enrutador por intención con `aclarar`, etiqueta pasiva de contexto y cambio de nivel por chat.
2. ~~Gestión de varios documentos por nivel~~ Hecho: botón «+» con adjuntar PDF, nuevo documento por chat y lista de documentos, con proyecto e hilos preservados.
3. ~~Trazabilidad Macro→Meso→Micro→evaluación~~ Hecho: ids estables en RA/actividades, matrices editables en Meso, `mideIds` en evaluación, poda de huérfanas y migración de datos heredados al leer.
4. ~~Citas curriculares y exportación Macro/Meso~~ Hecho: citas editables por afirmación con localizador, paridad de normalizadores y PDF/Markdown en los tres niveles.
5. ~~Expediente curricular conjunto~~ Hecho: `exportarExpediente.ts` reúne marcos, programas, asignaturas y alineaciones en texto plano/Markdown/PDF, con botones Copiar/Expediente en el encabezado.
6. ~~PDFs como fuentes con tope de 3 años~~ Hecho: `lib/pdf.ts` (validación, año, extractos) + `lib/inicio.ts` (enrutador), extracción local con worker en `/public`, citas con página y evidencia en los tres niveles.
7. ~~Piloto unipersonal~~ Hecho: BYOK por sesión, respaldo/restauración JSON, catálogo con duplicado/finalizado y nube Supabase opcional (código listo).
8. ~~Fase 2: estudio de documento oficial~~ Hecho: `lib/diseno.ts` + `components/Diseno.tsx` + `lib/exportarDisenoPdf.ts`; solo PDF, sin Word.
9. ~~Espacios trabajo/proyecto + ficha compacta~~ Hecho: `components/Proyecto.tsx` + `components/BotonTema.tsx` + `ficha/Indice.tsx`; acordeones controlados (`Seccion`, `Marco`, `Meso`) con índice y apertura exclusiva; headers en 5 controles; «Conversación nueva» vive en el hub como «Empezar de cero».
10. **Probar en navegador**: Meso en profundidad (vinculación Macro/Micro, trazabilidad, persistencia), estudio de diseño completo con exportación, clave IA, respaldo, catálogo y modo oscuro en escritorio/móvil.
11. **Desplegar a Vercel** (plan Hobby) con `DEEPSEEK_API_KEY` como secreto y **protección de acceso** para que la URL no exponga la clave del proveedor.
12. **Solo si el docente usa varios navegadores**: crear el proyecto Supabase gratuito, ejecutar `supabase/migraciones/001_proyectos.sql` y añadir las 2 variables de [docs/NUBE.md](docs/NUBE.md).

## 3. Datos y contratos

### Agregado curricular

El modelo está en [proyecto.ts](lib/proyecto.ts). La forma general es:

```text
ProyectoCurricular
├── marcos: MarcoEducativoInstitucional[]      (finalizado, origenCopia)
├── programas: ProgramaAcademico[]             (finalizado, origenCopia)
├── asignaturas: Asignatura[]                   (finalizado, origenCopia)
├── fuentesCurriculares: FuenteCurricular[]
├── vinculosProgramaMarco: VinculoProgramaMarco[]
├── alineaciones: AlineacionCurricular[]
├── brandKits: BrandKit[]                       ← Fase 2: identidad institucional
└── disenos: DisenoDocumento[]                  ← Fase 2: diseño por documento
```

- `brandKits` y `disenos` son opcionales para el guard: los estados V3 heredados sin ellos siguen valiendo y el código los trata como listas vacías.
- `DisenoDocumento` (ver [diseno.ts](lib/diseno.ts)): nivel + documentoId + plantillaId + `pagina` (Carta/A4, orientación, márgenes mm) + `bloques` (cada uno con `refContenido` al currículo, texto local opcional, estilo y zona). El contenido nunca se duplica: se resuelve por referencia.
- `BrandKit`: colores, tipografías y `activos` (logo/membrete/sello/marca de agua) como dataURL validados (PNG/JPG/WebP/SVG sanitizado; 1 MB por archivo, 3 MB por kit).

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
- [route.ts](app/api/chat/route.ts): `modulo: "inicio"` enruta por intención (con documentos existentes); `"macro"` usa el prompt Macro y recibe el marco activo **más las fuentes registradas** (para no re-pedir lo que ya está); `"meso"` recibe el programa y marcos disponibles; sin módulo explícito, permanece el flujo Micro. Todos aceptan `fuentesPdf` (título, páginas y extractos) como evidencia citada por página. La clave de DeepSeek se resuelve por llamada: cabecera `x-clave-ia` del docente primero, `DEEPSEEK_API_KEY` del servidor después; nunca se guarda ni se registra.
- El proxy SSE y extracción incremental de `mensaje` siguen comunes a los niveles.

### Persistencia y puentes de estado

- [persistencia.ts](lib/persistencia.ts): estado V3 en `designconia.proyecto.v3`; conserva respaldo, staging y claves de recuperación. Revisa payloads V1/V2 por versión antes de migrar; solo elimina snapshots reconocidos después de verificar el nuevo estado.
- Claves históricas: `designconia.micro.v2` y `designconia.micro.v1`.
- [estadoMicro.ts](lib/estadoMicro.ts), [estadoMacro.ts](lib/estadoMacro.ts) y [estadoMeso.ts](lib/estadoMeso.ts): adaptadores puros entre vista y agregado V3; protegen scopes, IDs y documentos/conversaciones hermanos.
- El vínculo Programa–Marco mantiene un marco principal activo por programa. El vínculo Asignatura–Programa actualiza solo `programaId`; desvincular conserva la asignatura.

## 4. Arquitectura actual

```text
app/
  page.tsx                       chat-first, enrutador, adjuntos PDF, guardado V3,
                                 espacios trabajo/proyecto (hub de gestión) y modo diseño
  api/chat/route.ts              proxy SSE, ramas inicio/Micro/Macro/Meso, evidencia PDF,
                                 estado de avance inyectado y clave BYOK por llamada
  api/salud/route.ts             GET valida la clave del servidor; POST prueba la del docente
components/
  Chat.tsx                       hilo y compositor con botón «+», menú y chips de PDF
  Proyecto.tsx                   espacio Proyecto: documento en trabajo, expediente,
                                 catálogo, respaldo, nube, asistente y empezar de cero
  BotonTema.tsx                  toggle claro/oscuro (compartido por trabajo y proyecto)
  Catalogo.tsx                   catálogo: buscar/abrir/duplicar/finalizar
  ClaveIA.tsx                    panel BYOK (guardar/probar/olvidar)
  Nube.tsx                       panel Supabase (enlace mágico, subir/bajar)
  Diseno.tsx                     Fase 2: estudio (estructura, vista previa, propiedades, marca)
  ficha/Indice.tsx               índice de secciones con estado (compartido, genérico)
  ficha/Microcurriculo.tsx       editor de la asignatura existente (índice + exclusiva)
  ficha/Marco.tsx                editor del marco institucional (índice + exclusiva)
  ficha/Meso.tsx                 editor del programa y vínculos (índice + exclusiva)
  ficha/Seccion.tsx              acordeón controlado del Micro (abierta/onAlternar)
  ficha/Campos.tsx               controles editables reutilizables
  ficha/Citas.tsx                editor compartido de citas y afirmaciones Macro/Meso
lib/
  schema.ts                      contrato Micro + carga horaria/trabajos independientes (106 pruebas)
  proyecto.ts                    agregado V3 (con brandKits/disenos), guardas y migración
  diseno.ts                      Fase 2: plantillas, kit de marca, bloques, refs (13 pruebas)
  exportarDisenoPdf.ts           PDF vectorial fiel al diseño (10 pruebas)
  catalogo.ts                    reutilización: buscar/duplicar/finalizar (5 pruebas)
  clave.ts                       BYOK: sesión + resolución de clave (3 pruebas)
  respaldo.ts                    respaldo JSON validado (4 pruebas)
  nube.ts                        Supabase: fila por docente, subir/bajar (3 pruebas)
  pdf.ts                         validación, año/antigüedad, extractos y worker local (8 pruebas)
  inicio.ts / promptInicio.ts    enrutador por intención + heurística de cambio (5 pruebas)
  macro.ts / meso.ts              lógica pura por nivel (31/24 pruebas) + fuentes por pedido
  exportar*.ts                   texto plano y Markdown por nivel + expediente conjunto
  estadoMicro/Macro/Meso.ts      puentes puros vista ↔ agregado V3
  persistencia.ts                migración/guardado local transaccional
  alineaciones.ts                definir/quitar/matriz de alineaciones
supabase/migraciones/001_proyectos.sql   tabla proyectos + RLS por propietario
docs/NUBE.md                     guía para activar la nube con cuenta propia
```

## 5. Verificación comprobada

Último checkpoint: commit `53312f5` (Fase 2: estudio de documento oficial) en la rama `feature/curricular-project-foundation`, **publicada en GitHub** (`Mattdm16/designconia`); el push llegó hasta ese commit y el árbol quedó limpio.

```text
npm test              → 324 pruebas (106 + 14 + 38 + 11 + 31 + 11 + 24 + 17 + 11 + 5 + 3 + 2 + 8 + 5 + 5 + 3 + 4 + 3 + 13 + 10)
impeccable detect     → 1 advisory (text-[17px] fuera de rampa en Proyecto.tsx) → corregido a 16px como los h1 de ficha
npx tsc --noEmit      → limpio
npm run build         → correcto
dev smoke             → GET / 200, compila 637 módulos sin errores
API real Macro/Meso   → turnos conversacionales probados por HTTP; cierre SSE stop/[DONE]
```

No hay pruebas automatizadas de UI/API de extremo a extremo. Los smoke tests de API fueron breves; no sustituyen probar una conversación completa en navegador.

## 6. Sistema visual y estado visual

La adición Macro/Meso **hereda** el mundo visual confirmado en [DESIGN.md](DESIGN.md) y la paleta definida en [tailwind.config.ts](tailwind.config.ts): Seedling/Sow, tarjetas crema, acento Terracotta para acciones, Mora para contenido sin confirmar y Rainfall para contenido confirmado. No se cambió la identidad visual.

**Drift documental resuelto:** [PRODUCT.md](PRODUCT.md) y [DESIGN.md](DESIGN.md) ya describen los tres niveles, la trazabilidad, las citas y el expediente, conservando el mundo visual. Mora identifica lo sin verificar (bibliografía y afirmaciones); Rainfall lo cumplido/contrastado; Sow marca el origen documento.

- Estado inicial: solo el chat con saludo neutro; la IA decide el nivel conversando y muestra una etiqueta pasiva de contexto. No aparece ficha hasta que hay contenido.
- Al existir un documento: chat a la izquierda y ficha a la derecha, sin selectores visibles; el botón «+» del compositor concentra adjuntar PDF, nuevo documento y la lista de documentos, sin tercer riel.
- Macro/Meso/Micro permiten varios documentos por proyecto: el menú «+» cambia el documento activo y «Nuevo documento» vuelve al inicio por chat, preservando lo anterior y sus hilos. Los PDF adjuntos viajan como evidencia citada por página; solo se integran PDFs de hasta 3 años.
- **Modo oscuro** con toggle Oscuro/Claro en ambos modos: `darkMode: "class"` con tokens estructurales por variables CSS (el mismo marcado se adapta sin variantes `dark:`), preferencia en `designconia.tema` y respeto inicial a `prefers-color-scheme`; anti-parpadeo en el layout. El display usa **Georgia/Times** (serif formal; antes Palatino).
- El encabezado queda en cinco controles (contexto, estado IA, Diseñar documento, Proyecto, tema); copiar/exportar/respaldo/clave/nube viven en el espacio Proyecto. El punto de salud es botón solo cuando la clave falta o falla. «Conversación nueva» vive en el hub como «Empezar de cero», con su confirmación.
- Cada ficha lleva **índice de secciones** (chips con estado ✓/•; la del foco IA con anillo Pebble) y **acordeón exclusivo** (una abierta a la vez; la IA la abre sola; la elección del docente se respeta hasta que cambia el foco). La trazabilidad Meso sigue siempre visible debajo.
- **La interfaz no se ha inspeccionado visualmente en navegador**, incluidos el estudio de diseño y los paneles nuevos. Revisar al menos 375/768/1024/1280/1920 px, teclado/foco, arrastre alternativo con flechas, estados vacíos, guardado y scopes no compatibles.

## 7. Alcance que sigue fuera

- **Despliegue a Vercel**: código y build listos; falta crear el proyecto en el plan Hobby, poner `DEEPSEEK_API_KEY` como secreto y activar protección de acceso. **Proyecto Supabase sin crear** (opcional; ver [docs/NUBE.md](docs/NUBE.md)).
- OCR de PDFs escaneados (solo se integran PDFs con texto seleccionable).
- Roles, colaboración multiusuario, multi-institución y login con contraseña (la nube actual es una cuenta por docente con enlace mágico).
- Cursos compartidos entre varios programas (relación N:M asignatura–programa).
- Exportación Word (.docx); el expediente conjunto dentro del diseñador de la Fase 2.
- Plantillas propias guardadas/reutilizables en el estudio (hoy hay 4 base fijas).
- Matriz RA→actividad como alineación editable (hoy vive en `mideIds` de cada actividad).

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
- Recuerda al docente que mensajes y extractos de PDF se procesan con su clave vía DeepSeek: sin datos personales de estudiantes durante las pruebas.

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
12. Alineación recursos↔evaluación (coincidencia flexible GeoGebra/Aula virtual, aviso doble con guía de corrección), carga horaria con tolerancia de 30 min y confirmación verde, y estado real de avance inyectado a la IA para no pedir avanzar sobre módulos terminados.
13. Trabajo independiente con esfuerzo propio (`trabajosIndependientes`, hasta 6000 min c/u): suma a las horas I sin tope de sesión; `horasPorTipo` suma minutos exactos y redondea una vez (24×45 min = 18 h); `reemplazoSecuencia` para reequilibrios globales; aviso con delta por tipo («faltan 50 h I») y estado neutral sin horas declaradas; la IA recibe minutos exactos y no declara TERMINADO con carga descuadrada.
14. Alta real de fuentes Macro pedidas por chat (deduplicadas; URL guardada como referencia sin verificar contenido) + check verde de Fuentes con conteo + colores explícitos de `option` en modo oscuro.
15. Piloto unipersonal sin Vercel: clave IA propia por sesión (nunca en copias/logs), respaldo/restauración JSON validado, catálogo local con búsqueda insensible a tildes, duplicado con ids propios y marca de finalizado, y capa Supabase opcional (una fila por docente, RLS, enlace mágico) con guía en `docs/NUBE.md`. Sin variables Supabase, todo sigue local.
16. Fase 2 de documento oficial: `lib/diseno.ts` (plantillas Carta/A4, kit de marca con validación y SVG sanitizado, bloques con ref al currículo, redacción local explícita, cuadrícula magnética por zona), estudio visual con vista previa paginada real, editor de propiedades e imágenes, y `lib/exportarDisenoPdf.ts` (PDF vectorial fiel: tamaños, negritas, colores, alineación, encabezado/pie con numeración, JPEG incrustado). Solo exportación PDF; expediente conjunto fuera del diseñador.
17. Reordenación de la recolección en dos espacios: `page.tsx` conmuta `trabajo ↔ proyecto`; `components/Proyecto.tsx` reúne documento en trabajo, expediente, catálogo, respaldo/restaurar, nube, asistente/clave, apariencia y «Empezar de cero» (la destructiva «Conversación nueva» sale de los encabezados); `components/BotonTema.tsx` extraído para compartir; `ficha/Indice.tsx` genérico con estado por sección; acordeones controlados (`Seccion`/`SeccionMarco`/`SeccionMeso` reciben `abierta`/`onAlternar`) con apertura exclusiva y scroll a la sección elegida; las fichas preservan la elección del docente hasta que la IA cambia de foco. tsc + 324 pruebas + build verdes; detector con 1 advisory corregido; smoke dev GET 200.

> Si cualquier sección histórica de este archivo o [PRODUCT.md](PRODUCT.md) aún describe un producto solo Micro, esta sección y el código reciente describen el estado actual; actualiza las discrepancias cuando corresponda.

---

*Handoff para continuar el proyecto: distinguir siempre entre lo que existe en el modelo, lo que está disponible en la interfaz y lo que todavía no se ha validado visualmente.*
