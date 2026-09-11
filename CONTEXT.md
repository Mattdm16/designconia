# Diseño curricular con IA

Herramienta web responsive para que un docente individual genere planeaciones de unidades de competencia, secuencias por subcompetencia e instrumentos de evaluación, con ayuda de un asistente de IA.

## Language

**Docente**:
La persona que diseña y enseña; único perfil de usuario del primer usable.
_Avoid_: Usuario, cliente

**Unidad de competencia**:
Asignatura semestral del plan de estudios, definida por su propósito, sus competencias y su mapa de subcompetencias.
_Avoid_: Materia (coloquial), unidad didáctica, módulo

**Subcompetencia**:
Bloque temático numerado dentro de una unidad de competencia, con propósito propio y horas asignadas.
_Avoid_: Tema, unidad, bloque

**Resultado de aprendizaje**:
Logro concreto y evaluable dentro de una subcompetencia, con horas, actividades, evidencias y contenidos asociados.
_Avoid_: Desempeño, objetivo, logro

**Actividad de evaluación**:
Acción que el estudiante realiza para generar una evidencia (resolver problemas, examen escrito, usar software matemático).
_Avoid_: Actividad (a secas, ambiguo con enseñar), examen

**Evidencia**:
Producto recopilable del estudiante (reporte, examen resuelto, diagrama) que demuestra un resultado de aprendizaje.
_Avoid_: Entregable, tarea

**Contenido**:
Tema del temario asociado a un resultado de aprendizaje.
_Avoid_: Unidad temática

**Secuencia de clase**:
Planeación de las clases de una subcompetencia, con apertura, desarrollo y cierre, alineada a sus resultados de aprendizaje.
_Avoid_: Sesión de clase, plan de clase

**Instrumento de evaluación**:
Rúbrica, lista de cotejo o prueba que valora las evidencias de un resultado de aprendizaje.
_Avoid_: Examen (es solo un tipo de instrumento)

**Programa descriptivo**:
Documento oficial que define una unidad de competencia: datos generales, propósito, competencias, mapa de la unidad y cuadros por subcompetencia.
_Avoid_: Temario (es solo una parte), sílabo

**Mapa de la unidad**:
Tabla que descompone la unidad de competencia en subcompetencias y resultados de aprendizaje.
_Avoid_: Temario, índice

**Asistente curricular**:
Instrucción de sistema versionada en este repo que replica el comportamiento de un Gem de Gemini, invocada vía la API de Gemini.
_Avoid_: Gem, bot, prompt

**Marco curricular**:
Sistema educativo oficial (país y nivel) que define las competencias, capacidades y desempeños que el asistente debe usar; se configura como parámetro, no se mezcla entre marcos. El marco por defecto es UNACH – LIDTS.
_Avoid_: Currículo (ambiguo), sílabo, plan de estudios
