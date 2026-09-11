# Flujo del wizard (v1)

Wizard por pasos con edición obligatoria entre pasos: cada artefacto se genera a partir del anterior **ya validado** por el docente.

## Paso 0 — Datos y punto de partida

- El docente ingresa: nombre de la unidad de competencia, semestre, horas disponibles.
- Anexos (PDF, DOCX, imágenes, ≤4 MB por archivo):
  - Modo **partir-de**: programa oficial o planeación anterior. Viaja con el paso 1 y define los datos oficiales.
  - Modo **apoyo**: material de consulta de un paso concreto. Viaja solo con ese paso.
- Sin anexos ni datos oficiales → modo **desde-cero** (todo sale como borrador, regla 1 de la base común).

## Paso 1 — Programa y mapa (asistente: planeador-unidad)

- Genera el programa descriptivo + mapa de la unidad.
- El docente **edita** (texto libre por sección) y valida antes de avanzar. Sin validación no hay paso 2.

## Paso 2 — Secuencias (asistente: secuencias-subcompetencia, una corrida por subcompetencia)

- Por cada subcompetencia validada: genera su secuencia de clase.
- El docente edita y valida subcompetencia por subcompetencia; puede regenerar una sin tocar las demás.

## Paso 3 — Instrumentos (asistente: instrumentos-evaluacion, una corrida por resultado o grupo de resultados)

- Genera rúbricas, listas de cotejo o pruebas con solucionario.
- El docente edita y valida.

## Paso 4 — Revisión y exportación

- Vista global del paquete (programa + secuencias + instrumentos) con chequeo de coherencia numérica visible (horas y %).
- Exportación v1: **imprimir/PDF del navegador, copiar al portapapeles, descargar .md** (un archivo por artefacto o paquete completo).

## Reglas transversales

- **Persistencia**: todo el estado del wizard en `localStorage` (sin cuentas). Botón "empezar de nuevo" con confirmación.
- **Anexos**: nunca se guardan en claro más allá de la sesión; se envían al proxy solo con el paso donde se anexaron.
- **Errores**: cada llamada al proxy muestra estado (generando / error / reintentar por paso). Timeout orientativo 55 s (límite Netlify: 60 s).
- **Costos**: el proxy registra conteo de llamadas por día en el propio navegador para que el docente vea su consumo; el tope global se configura en el servidor.
- **Build**: las instrucciones de `asistentes/*.md` se incrustan en el bundle de la Netlify Function en tiempo de construcción (import como texto), para que lo versionado en git sea exactamente lo que se ejecuta.
