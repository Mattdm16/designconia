# INFORME FINAL DE ACTIVIDADES

**UNIVERSIDAD AUTÓNOMA DE CHIAPAS**
Facultad de Negocios, Campus IV — Licenciatura en Ingeniería en Desarrollo y Tecnologías de Software

**UNIDAD ACADÉMICA:** Escuela de Tecnologías Digitales Aplicadas, Campus IV
**ESTUDIANTE:** José Matías Domínguez Rodas
**MATRÍCULA:** 100017201
**SEMESTRE:** Séptimo
**NOMBRE DEL PROYECTO:** Diseño Curricular con IA
**PERIODO REPORTADO:** Semanas 7 y 8 (05 al 16 de octubre de 2026) y cierre del proyecto
**AVANCE FINAL:** 100 %

---

## Objetivo

Consolidar la plataforma de diseño curricular asistida por inteligencia artificial como una herramienta terminada y utilizable en aula, garantizando que el docente universitario pueda pasar de una conversación a un microcurrículo completo, trazable y exportable, sin retrabajo manual y sin datos inventados por el modelo.

---

## Resumen del proyecto

Desarrollé una aplicación web que asiste al docente de educación superior en la construcción del microcurrículo de su asignatura. El flujo parte de una conversación con un asistente de inteligencia artificial: el docente describe su asignatura y su propósito, el asistente pregunta lo que falta y, a un lado, la ficha del microcurrículo crece por secciones hasta quedar completa. El documento resultante es editable en pantalla, trazable a los resultados de aprendizaje, exportable a PDF y persistente en el navegador.

A diferencia de un generador de texto, el sistema mantiene un contrato estructurado con el modelo: cada respuesta regresa como un objeto validado contra un esquema, de modo que la interfaz nunca presenta información que el docente no pueda auditar, corregir o rechazar.

---

## Actividades realizadas

### 1. Consolidación del microcurrículo en ocho secciones (Eight-Section Syllabus Model)

Completé el modelo de datos y la interfaz del microcurrículo, ampliando la ficha hasta cubrir las ocho secciones que exige un programa analítico universitario.

- **Estructura documental definitiva:**
  - Integré las secciones de datos de identificación, justificación, objetivos generales y específicos, contenido temático, secuencia didáctica, metodología, sistema de evaluación y bibliografía, en el orden del documento oficial y no en el orden de la conversación.
  - Añadí la sección de **secuencia didáctica**, que traduce la carga horaria declarada (HT, HP y HTI) en sesiones concretas con duración, tipo y sus tres momentos: inicio, desarrollo y cierre.
  - Implementé un contador de avance de ocho marcas (`n/8`) que muestra, sin abrir cada sección, cuáles están cerradas y cuáles pendientes.
- **Obligatoriedad de los resultados de aprendizaje:**
  - Establecí que una unidad del contenido temático no se considera completa hasta declarar al menos un resultado de aprendizaje redactado con verbo medible, y el asistente quedó instruido para redactarlos como desempeños observables y no como temas.
  - Vinculé cada entregable de evaluación con el resultado de aprendizaje que mide, mediante un campo explícito que la interfaz muestra como referencia.
- **Instrumentos y herramientas en la evaluación:**
  - Incorporé la declaración obligatoria del instrumento de calificación por entregable (rúbrica analítica, lista de cotejo, guía de observación, escala de valoración), señalando en pantalla la actividad que aún no lo tiene.
  - Añadí el registro de herramientas exigidas por cada entregable y una verificación de alineación que advierte cuando una herramienta declarada en los recursos no se usa en ninguna actividad ni sesión.

### 2. Módulo de secuencia didáctica con navegación por unidades

Reorganicé la planificación de sesiones para que deje de ser una lista continua y se lea como un plan de curso.

- **Navegación en dos niveles:**
  - Diseñé la sección para que abra con la lista de unidades del contenido temático, cada una con su número de sesiones y sus horas acumuladas, y muestre la leyenda «sin sesiones» cuando todavía no se ha planificado nada.
  - Al seleccionar una unidad, la sección se transforma en las sesiones de esa unidad exclusivamente, con un control de regreso a la lista de unidades que permite alternar entre unidades sin recargar la página.
  - Mantuve el estado de navegación en memoria, de modo que al cerrar y reabrir la sección se vuelve siempre al panorama general de unidades.
- **Integridad de la numeración:**
  - Implementé una renumeración global que ordena las sesiones por unidad y las enumera de forma consecutiva en todo el documento, evitando huecos y repeticiones al agregar, eliminar o mover una sesión entre unidades.
  - Añadí un grupo residual para las sesiones cuya unidad fue eliminada, de manera que ningún trabajo planificado se pierda y pueda reasignarse.
- **Acumulación modular:**
  - Hice que las sesiones se generen por unidad y se acumulen al fusionar, de forma que solicitar las sesiones de una unidad no sobrescriba las de las demás.

### 3. Verificación del sistema de ponderaciones y cierre del módulo de evaluación

Concluí el módulo de evaluación asegurando consistencia numérica y trazabilidad pedagógica.

- **Validación de integridad al 100 %:**
  - Implementé un reparto proporcional por el método del resto mayor que garantiza que los porcentajes de los cortes sumen exactamente 100 %, corrigiendo las diferencias de 99 % o 101 % que produce el redondeo individual.
  - Añadí el control **«Ajustar a 100»**, que redistribuye los pesos conservando la proporción original, y una alerta permanente en pantalla mientras la suma no cuadre.
- **Trazabilidad de la evaluación:**
  - Cada corte presenta sus actividades con instrumento, herramientas y resultado de aprendizaje asociado, permitiendo auditar la alineación entre lo planificado y lo calificado.

### 4. Exportación documental: PDF de texto plano y portapapeles en Markdown

Resolví la entrega del documento final con dos salidas complementarias.

- **Exportación a PDF sin dependencias externas:**
  - Construí un generador propio de documentos PDF 1.4 con fuente Helvetica y codificación WinAnsi, que compone el microcurrículo en texto plano, con ajuste de línea, paginación y numeración de secciones.
  - Separé la composición del contenido de la emisión del archivo, de modo que el texto pueda reutilizarse o migrarse a otro motor de maquetación sin reescribir la lógica del documento.
  - Corregí los defectos detectados en la revisión: pérdida de sangría en líneas envueltas, encabezados huérfanos al pie de página y duplicación de abreviaturas en las referencias bibliográficas.
- **Copia para pegar en Markdown:**
  - Mantuve una salida en Markdown, actualizada con las ocho secciones, para que el docente pueda integrar el contenido en correo, gestor de documentos o plataforma institucional.
- **Verificación visual del documento:**
  - Audité el PDF generado página por página mediante renderizado a imagen con LibreOffice Kit, confirmando acentos, jerarquía tipográfica, indentación y ausencia de fuentes faltantes.

### 5. Endurecimiento del asistente y corrección de defectos críticos

Estabilicé la comunicación con el modelo de lenguaje y eliminé las fallas que interrumpían el trabajo del docente.

- **Contrato con el modelo y streaming:**
  - Consolidé un contrato de respuesta con borrador opcional: el asistente puede conversar y preguntar sin generar documento, y solo produce la ficha cuando corresponde, evitando que un turno conversacional sobrescriba el trabajo previo.
  - Implementé la extracción incremental del mensaje desde el JSON en formación, de modo que el docente lee la respuesta en streaming mientras el resto del objeto todavía se está recibiendo.
- **Recuperación ante respuestas defectuosas:**
  - Desarrollé un reparador de JSON que cierra de forma determinista las estructuras abiertas al final del flujo, y lo dejé inerte cuando el daño es interno para no fabricar contenido.
  - Configuré un reintento automático y silencioso cuando el proveedor devuelve un turno vacío, además del diagnóstico del motivo de corte reportado por la API.
  - Añadí validación de la clave de acceso antes de que el docente escriba, con mensajes de error accionables en lugar de fallos silenciosos.
- **Defectos corregidos:**
  - Corregí la pérdida de la ficha por respuestas sin borrador, el truncamiento del documento por límite de tokens insuficiente, el conflicto de artefactos de compilación entre instancias de desarrollo y el fallo de renderizado por uso de una propiedad reservada de React.
  - Corregí también la numeración duplicada de sesiones y la conservación de las confirmaciones bibliográficas del docente al fusionar y al migrar el estado guardado.

### 6. Persistencia versionada y migración del trabajo previo

Aseguré la continuidad del trabajo docente entre sesiones y entre versiones del producto.

- **Almacenamiento local versionado:**
  - Conservé el guardado en el navegador con clave versionada y escritura diferida de 400 ms, e incorporé validación estructural del estado antes de hidratarlo.
  - Implementé una migración que actualiza los documentos guardados en la versión anterior al nuevo esquema, incorporando la secuencia didáctica y los campos de evaluación y bibliografía sin descartar el contenido ni las confirmaciones del docente.

### 7. Verificación, pruebas automatizadas y documentación de entrega

Cerré el proyecto con verificación técnica y documentación de traspaso.

- **Suite de pruebas:**
  - Estandaricé 95 pruebas automatizadas sobre las funciones puras del esquema, cubriendo normalización, fusión de documentos, reparación de JSON, agrupación de la secuencia, validación de ponderaciones, migración de estado y composición del PDF.
  - Verifiqué la compilación de tipos, la construcción de producción y el análisis estático de calidad visual sin hallazgos.
- **Verificación funcional:**
  - Comprobé el flujo completo contra el proveedor real de inteligencia artificial: turno conversacional, generación del borrador, iteración por secciones, generación de la secuencia por unidad y exportación del documento.
- **Documentación:**
  - Actualicé la documentación de producto, el sistema de diseño y la guía de traspaso técnico, incluyendo variables de entorno, comandos de operación y el criterio de revisión visual pendiente de la interfaz.

---

## Resultados obtenidos

- Microcurrículo completo en **ocho secciones**, con resultados de aprendizaje obligatorios y evaluación trazable.
- **95 pruebas automatizadas** aprobadas y verificación de tipos sin errores.
- Documento exportable a **PDF de texto plano** de cinco páginas, revisado visualmente y sin fuentes faltantes.
- Persistencia con **migración automática** del trabajo previo, sin pérdida de contenido.
- Eliminación de los defectos que interrumpían la sesión de trabajo del docente.

---

## Conclusión

El proyecto quedó concluido. La plataforma permite que un docente universitario describa su asignatura en una conversación y obtenga, en la misma sesión, un microcurrículo completo, editable, trazable a sus resultados de aprendizaje y exportable como documento formal. Los defectos detectados durante el desarrollo fueron corregidos y verificados, la persistencia protege el trabajo previo y la documentación deja el sistema listo para su mantenimiento.

El resultado cumple el objetivo planteado: reducir el tiempo de elaboración del diseño curricular sin sacrificar el criterio pedagógico del docente, que conserva la última palabra sobre cada sección del documento.

---

**Alguna problemática con la entidad receptora:** No

**Avance en %:** 100 %

ELABORÓ: José Matías Domínguez Rodas

AUTORIZÓ: Dr. Aaron de la Cruz Vázquez
