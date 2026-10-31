/**
 * Runner autónomo para persistencia V1/V2/V3 con almacén en memoria.
 * Uso: node lib/persistencia.test.ts
 */

import {
  CLAVE_MICRO_V1,
  CLAVE_MICRO_V2,
  CLAVE_PROYECTO_V3,
  CLAVE_PROYECTO_V3_RECUPERACION,
  CLAVE_PROYECTO_V3_RESPALDO,
  CLAVE_PROYECTO_V3_TEMP,
  CLAVE_PROYECTO_V3_TEMP_RECUPERACION,
  cargarEstadoPersistido,
  guardarEstadoV3,
  type AlmacenPersistencia
} from "./persistencia.ts";
import { esEstadoGuardado, normalizarMicrocurriculo, type EstadoGuardado } from "./schema.ts";
import { esEstadoGuardadoV3, migrarEstadoV2, type EstadoGuardadoV3 } from "./proyecto.ts";

function assert(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function igual(actual: unknown, esperado: unknown, mensaje: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  assert(a === e, `${mensaje}\nEsperado: ${e}\nRecibido: ${a}`);
}

class AlmacenMemoria implements AlmacenPersistencia {
  readonly datos = new Map<string, string>();
  readonly eventos: string[] = [];
  readonly fallarGet = new Set<string>();
  readonly fallarSet = new Set<string>();
  readonly fallarRemove = new Set<string>();
  readonly quitarSilenciosamenteNo = new Set<string>();
  /** Simula una escritura que entrega una vez un valor distinto al solicitado. */
  readonly guardarComo = new Map<string, string>();

  sembrar(clave: string, valor: string) {
    this.datos.set(clave, valor);
  }

  getItem(clave: string): string | null {
    this.eventos.push(`get:${clave}`);
    if (this.fallarGet.has(clave)) throw new Error(`getItem inaccesible: ${clave}`);
    return this.datos.get(clave) ?? null;
  }

  setItem(clave: string, valor: string): void {
    this.eventos.push(`set:${clave}`);
    if (this.fallarSet.has(clave)) throw new Error(`setItem falló: ${clave}`);
    const alterado = this.guardarComo.get(clave);
    if (alterado !== undefined) this.guardarComo.delete(clave);
    this.datos.set(clave, alterado ?? valor);
  }

  removeItem(clave: string): void {
    this.eventos.push(`remove:${clave}`);
    if (this.fallarRemove.has(clave)) throw new Error(`removeItem falló: ${clave}`);
    if (this.quitarSilenciosamenteNo.has(clave)) return;
    this.datos.delete(clave);
  }
}

function crearMicro() {
  return normalizarMicrocurriculo({
    folio: "DCN-PERSISTENCIA-01",
    ident: {
      asignatura: "Fundamentos de Software",
      codigo: "ISW-101",
      programa: "Ingeniería de Software",
      creditos: 4,
      horas: { teoricas: 32, practicas: 32, independientes: 64 },
      prerrequisitos: ["Pensamiento lógico"],
      semestre: "Primero"
    },
    justificacion: "La asignatura introduce fundamentos para construir soluciones de software.",
    objetivos: { generales: ["Diseñar soluciones"], especificas: ["Modelar problemas"] },
    contenido: {
      unidades: [
        {
          numero: 1,
          titulo: "Fundamentos",
          resultadosAprendizaje: ["Explica conceptos fundamentales"],
          temas: [{ nombre: "Conceptos", subtemas: ["Abstracción"] }]
        }
      ]
    },
    secuencia: { sesiones: [] },
    metodologia: { estrategias: [] },
    evaluacion: { cortes: [] },
    bibliografia: {
      obligatorias: [
        {
          autor: "Autora Ejemplo",
          titulo: "Diseño de software",
          dato: "Editorial de prueba",
          anio: "2024",
          edicion: "1.ª",
          isbn: "",
          confirmada: true
        }
      ],
      complementarias: [],
      recursos: []
    }
  });
}

function crearV2(micro: ReturnType<typeof crearMicro> | null = null): EstadoGuardado {
  return {
    version: 2,
    microcurriculo: micro,
    mensajes: [
      { id: "u-1", role: "usuario", texto: "Continuemos el diseño." },
      { id: "a-1", role: "asistente", texto: "¿Qué quieres revisar?" }
    ],
    sugerencias: ["Seguir con objetivos"],
    intencion: "crear",
    seccionActiva: "justificacion",
    crudo: "{\"mensaje\":\"respuesta V2\",\"borrador\":{}}"
  };
}

function crearV1(): Record<string, unknown> {
  return {
    version: 1,
    microcurriculo: null,
    mensajes: [{ id: "u-v1", role: "usuario", texto: "Conversación V1" }],
    sugerencias: ["Continuar"],
    intencion: "entender",
    seccionActiva: null,
    crudo: "{\"legacy\":true}"
  };
}

function crearV3(nombre = "Proyecto curricular"): EstadoGuardadoV3 {
  const resultado = migrarEstadoV2(crearV2());
  assert(resultado !== null, "el fixture V2 debe migrar a V3");
  resultado.proyecto.nombre = nombre;
  return resultado;
}

let fallos = 0;
let total = 0;
function caso(nombre: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`✓ ${nombre}`);
  } catch (error) {
    fallos++;
    console.error(`✗ ${nombre}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

caso("almacén vacío se distingue de datos no migrables", () => {
  const vacio = cargarEstadoPersistido(new AlmacenMemoria());
  assert(!vacio.ok && vacio.estadoCarga === "sin_datos", "un almacén vacío debe declararse sin datos");
  assert(vacio.clavesConflictivas.length === 0, "el vacío no debe inventar conflictos");

  const corrupto = new AlmacenMemoria();
  corrupto.sembrar(CLAVE_PROYECTO_V3, "{no-json");
  const resultado = cargarEstadoPersistido(corrupto);
  assert(!resultado.ok && resultado.estadoCarga === "datos_no_migrables", "un V3 corrupto debe diferenciarse del vacío");
  assert(resultado.clavesConflictivas.includes(CLAVE_PROYECTO_V3), "debe identificar la clave conflictiva");
  assert(corrupto.datos.get(CLAVE_PROYECTO_V3) === "{no-json", "la clave corrupta se conserva");
});

caso("almacén inaccesible se distingue y enumera claves", () => {
  const almacen = new AlmacenMemoria();
  for (const clave of [
    CLAVE_PROYECTO_V3,
    CLAVE_PROYECTO_V3_RESPALDO,
    CLAVE_PROYECTO_V3_TEMP,
    CLAVE_MICRO_V2,
    CLAVE_MICRO_V1,
    CLAVE_PROYECTO_V3_RECUPERACION
  ]) {
    almacen.fallarGet.add(clave);
  }
  const resultado = cargarEstadoPersistido(almacen);
  assert(!resultado.ok && resultado.estadoCarga === "almacen_inaccesible", "debe informar el almacén inaccesible");
  assert(resultado.clavesInaccesibles.includes(CLAVE_PROYECTO_V3), "debe indicar la clave cuya lectura falló");
  assert(resultado.clavesConflictivas.length > 0, "debe identificar los conflictos de lectura");
});

caso("lee V3 válido sin reescribir y reintenta limpiar legados válidos", () => {
  const almacen = new AlmacenMemoria();
  const v3 = crearV3();
  almacen.sembrar(CLAVE_PROYECTO_V3, JSON.stringify(v3));
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));
  almacen.sembrar(CLAVE_MICRO_V1, "contenido V1 corrupto");

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok, "debe cargar el estado válido");
  assert(resultado.origen === "v3" && !resultado.migrado && resultado.guardado, "debe identificar origen V3 existente");
  igual(resultado.estado, v3, "el estado cargado debe coincidir con el V3 guardado");
  assert(!almacen.eventos.some((evento) => evento.startsWith("set:")), "no debe reescribir V3 válido");
  assert(!almacen.datos.has(CLAVE_MICRO_V2), "debe retirar el V2 válido supersedido");
  assert(almacen.datos.has(CLAVE_MICRO_V1), "debe preservar el V1 corrupto");
  assert(resultado.clavesLegadasEliminadas.includes(CLAVE_MICRO_V2), "debe reportar el legado retirado");
  assert(resultado.clavesConflictivas.includes(CLAVE_MICRO_V1), "debe reportar el legado corrupto preservado");
});

caso("migra V2 y retira todas las claves legadas reconocidas tras el commit", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2(crearMicro())));
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV1()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok, "V2 debe migrar");
  assert(resultado.origen === "v2" && resultado.migrado && resultado.guardado, "debe priorizar la migración V2 confirmada");
  const canonico = almacen.datos.get(CLAVE_PROYECTO_V3);
  assert(esEstadoGuardadoV3(canonico ? JSON.parse(canonico) : null), "V3 debe quedar validado en el almacén");

  const indiceSetCanonico = almacen.eventos.indexOf(`set:${CLAVE_PROYECTO_V3}`);
  const indiceVerificacion = almacen.eventos.indexOf(`get:${CLAVE_PROYECTO_V3}`, indiceSetCanonico + 1);
  const indiceRemoveV2 = almacen.eventos.indexOf(`remove:${CLAVE_MICRO_V2}`);
  const indiceRemoveV1 = almacen.eventos.indexOf(`remove:${CLAVE_MICRO_V1}`);
  assert(indiceSetCanonico >= 0 && indiceVerificacion > indiceSetCanonico, "debe verificarse V3 tras escribir");
  assert(indiceRemoveV2 > indiceVerificacion && indiceRemoveV1 > indiceVerificacion, "ambos legados válidos se limpian solo tras commit");
  assert(!almacen.datos.has(CLAVE_MICRO_V2) && !almacen.datos.has(CLAVE_MICRO_V1), "ambos legados supersedidos se eliminan");
});

caso("detecta una carga V1 guardada bajo la clave V2 por su versión", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV1()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v1" && resultado.migrado && resultado.guardado, "el payload V1 debe migrarse aunque use la clave V2");
  assert(!almacen.datos.has(CLAVE_MICRO_V2), "la clave V2 usada por el V1 se retira tras el commit");
  assert(almacen.datos.has(CLAVE_PROYECTO_V3), "se persiste el V3 resultante");
});

caso("migra V1→V2→V3 y retira V1 después del commit", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV1()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v1" && resultado.migrado && resultado.guardado, "V1 debe encadenarse a V2 y V3");
  assert(!almacen.datos.has(CLAVE_MICRO_V1), "V1 solo se elimina luego de confirmar V3");
  assert(almacen.datos.has(CLAVE_PROYECTO_V3), "el estado V3 debe quedar persistido");
  assert(!almacen.datos.has(CLAVE_MICRO_V2), "V2 intermedio no debe escribirse como clave legada");
});

caso("si falla setItem devuelve estado migrado en memoria y conserva legados", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV1()));
  almacen.fallarSet.add(CLAVE_PROYECTO_V3);

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v2" && resultado.migrado, "la migración en memoria sigue siendo utilizable");
  assert(!resultado.guardado, "debe reportar no guardado");
  assert(esEstadoGuardadoV3(resultado.estado), "el estado temporal debe tener forma V3 válida");
  assert(almacen.datos.has(CLAVE_MICRO_V2) && almacen.datos.has(CLAVE_MICRO_V1), "ambos legados deben conservarse");
  assert(resultado.clavesLegadasPendientes.includes(CLAVE_MICRO_V2), "debe reportar el V2 válido pendiente");
  assert(resultado.clavesLegadasPendientes.includes(CLAVE_MICRO_V1), "debe reportar el V1 válido pendiente");
  assert(!almacen.eventos.some((evento) => evento.startsWith("remove:")), "no debe quitar claves si falla setItem");
});

caso("si readback del V3 nuevo falla conserva el estado anterior y legados", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));
  almacen.sembrar(CLAVE_PROYECTO_V3, "V3 corrupto");
  almacen.fallarGet.add(CLAVE_PROYECTO_V3);

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && !resultado.guardado, "debe devolver V3 migrado solo en memoria");
  assert(resultado.estadoCarga === "migrado", "la carga en memoria no es estado vacío");
  assert(almacen.datos.has(CLAVE_MICRO_V2), "V2 permanece recuperable");
});

caso("readback corrupto no causa limpieza del legado y conserva respaldo V3", () => {
  const almacen = new AlmacenMemoria();
  const v2 = crearV2();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(v2));
  almacen.sembrar(CLAVE_PROYECTO_V3, "{json anterior corrupto");
  // Simula un V3 canónico que queda corrupto al promover el staging.
  almacen.guardarComo.set(CLAVE_PROYECTO_V3, "{json truncado");

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && !resultado.guardado, "debe retornar la migración en memoria");
  assert(resultado.error === "lectura_verificacion", "el fallo debe reportarse como verificación");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === "{json anterior corrupto", "al fallar readback se restaura el raw anterior");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RECUPERACION) === "{json anterior corrupto", "el raw corrupto se conserva en recuperación");
  assert(almacen.datos.has(CLAVE_MICRO_V2), "el V2 original permanece recuperable");
  assert(!almacen.eventos.some((evento) => evento.startsWith("remove:")), "no se limpia ningún legado");
});

caso("V3 corrupto se respalda antes de migrar V2 y la recuperación no se borra", () => {
  const almacen = new AlmacenMemoria();
  const corrupto = "{V3 corrupto";
  almacen.sembrar(CLAVE_PROYECTO_V3, corrupto);
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v2" && resultado.guardado, "V2 debe recuperarse y persistirse");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RECUPERACION) === corrupto, "el raw inválido debe verificarse en recuperación");
  assert(esEstadoGuardadoV3(JSON.parse(almacen.datos.get(CLAVE_PROYECTO_V3) ?? "null")), "el V3 canónico nuevo debe ser válido");
  assert(!almacen.datos.has(CLAVE_MICRO_V2), "el V2 solo se retira tras confirmar V3");
  assert(almacen.datos.has(CLAVE_PROYECTO_V3_RECUPERACION), "la recuperación no se limpia automáticamente");
  const eventos = almacen.eventos;
  const setRecovery = eventos.indexOf(`set:${CLAVE_PROYECTO_V3_RECUPERACION}`);
  const verifyRecovery = eventos.indexOf(`get:${CLAVE_PROYECTO_V3_RECUPERACION}`, setRecovery + 1);
  const setCanonical = eventos.indexOf(`set:${CLAVE_PROYECTO_V3}`, verifyRecovery + 1);
  assert(setRecovery >= 0 && verifyRecovery > setRecovery && setCanonical > verifyRecovery, "el raw corrupto debe respaldarse y verificarse antes de reemplazar V3");
});

caso("no sobrescribe V3 corrupto si la recuperación tiene otro raw", () => {
  const almacen = new AlmacenMemoria();
  const v3Original = "{V3 corrupto original";
  const recuperacionExistente = "raw de otra recuperación";
  almacen.sembrar(CLAVE_PROYECTO_V3, v3Original);
  almacen.sembrar(CLAVE_PROYECTO_V3_RECUPERACION, recuperacionExistente);
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && !resultado.guardado, "la migración queda utilizable solo en memoria");
  assert(resultado.error === "recuperacion_conflictiva", "debe reportar conflicto de recuperación");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === v3Original, "el V3 corrupto no se sobrescribe");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RECUPERACION) === recuperacionExistente, "el respaldo previo no se toca");
  assert(almacen.datos.has(CLAVE_MICRO_V2), "V2 se conserva mientras no se confirme V3");
  assert(resultado.clavesLegadasPendientes.includes(CLAVE_MICRO_V2), "se informa el legado válido pendiente");
});

caso("si no se puede escribir el respaldo rotativo, conserva V3 canónico", () => {
  const almacen = new AlmacenMemoria();
  const anterior = crearV3("V3 anterior bueno");
  const nuevo = crearV3("V3 nuevo");
  const rawAnterior = JSON.stringify(anterior);
  almacen.sembrar(CLAVE_PROYECTO_V3, rawAnterior);
  almacen.fallarSet.add(CLAVE_PROYECTO_V3_RESPALDO);

  const resultado = guardarEstadoV3(almacen, nuevo);
  assert(!resultado.ok && !resultado.guardado && resultado.error === "respaldo_no_verificable", "el fallo de backup debe detener el reemplazo");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === rawAnterior, "el último V3 bueno permanece canónico");
  assert(!almacen.eventos.some((evento) => evento === `set:${CLAVE_PROYECTO_V3_TEMP}`), "no debe iniciar staging sin respaldo confirmado");
});

caso("guarda el V3 anterior en respaldo rotativo y promueve staging verificado", () => {
  const almacen = new AlmacenMemoria();
  const anterior = crearV3("V3 anterior");
  const nuevo = crearV3("V3 nuevo");
  const rawAnterior = JSON.stringify(anterior);
  almacen.sembrar(CLAVE_PROYECTO_V3, rawAnterior);

  const resultado = guardarEstadoV3(almacen, nuevo);
  assert(resultado.ok && resultado.guardado, "el nuevo estado debe guardarse");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RESPALDO) === rawAnterior, "el último V3 bueno previo queda en respaldo");
  assert(esEstadoGuardadoV3(JSON.parse(almacen.datos.get(CLAVE_PROYECTO_V3) ?? "null")), "el V3 promovido debe ser válido");
  assert(!almacen.datos.has(CLAVE_PROYECTO_V3_TEMP), "el staging se elimina y verifica tras commit");
});

caso("un fallo de readback al promover restaura el último V3 bueno", () => {
  const almacen = new AlmacenMemoria();
  const anterior = crearV3("V3 anterior protegido");
  const nuevo = crearV3("V3 nuevo");
  const rawAnterior = JSON.stringify(anterior);
  almacen.sembrar(CLAVE_PROYECTO_V3, rawAnterior);
  almacen.guardarComo.set(CLAVE_PROYECTO_V3, "{readback falso");

  const resultado = guardarEstadoV3(almacen, nuevo);
  assert(!resultado.ok && resultado.error === "lectura_verificacion", "el intento no se declara guardado");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === rawAnterior, "se restaura el V3 anterior canónico");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RESPALDO) === rawAnterior, "el respaldo conserva el último V3 válido");
});

caso("si el respaldo contiene basura no se reemplaza ni se pisa el V3 bueno", () => {
  const almacen = new AlmacenMemoria();
  const anterior = crearV3("V3 canónico");
  const rawAnterior = JSON.stringify(anterior);
  almacen.sembrar(CLAVE_PROYECTO_V3, rawAnterior);
  almacen.sembrar(CLAVE_PROYECTO_V3_RESPALDO, "respaldo corrupto que debe preservarse");

  const resultado = guardarEstadoV3(almacen, crearV3("nuevo"));
  assert(!resultado.ok, "sin respaldo verificable no debe reemplazarse el canónico");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === rawAnterior, "el V3 canónico queda intacto");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RESPALDO) === "respaldo corrupto que debe preservarse", "el backup corrupto no se borra");
});

caso("una clave V3 corrupta con recuperación inaccesible no se sobrescribe", () => {
  const almacen = new AlmacenMemoria();
  const raw = "{V3 dañado";
  almacen.sembrar(CLAVE_PROYECTO_V3, raw);
  almacen.fallarGet.add(CLAVE_PROYECTO_V3_RECUPERACION);
  const resultado = guardarEstadoV3(almacen, crearV3());
  assert(!resultado.ok && resultado.error === "recuperacion_conflictiva", "sin verificar recuperación se aborta");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === raw, "la clave V3 corrupta no se toca");
});

caso("un respaldo V3 válido permite recuperar el canónico corrupto", () => {
  const almacen = new AlmacenMemoria();
  const backup = crearV3("Último V3 comprometido");
  const rawBackup = JSON.stringify(backup);
  almacen.sembrar(CLAVE_PROYECTO_V3, "{canónico corrupto");
  almacen.sembrar(CLAVE_PROYECTO_V3_RESPALDO, rawBackup);

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "respaldo_v3" && resultado.guardado, "el respaldo válido debe restaurarse");
  igual(resultado.estado, backup, "se carga el último estado comprometido");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === rawBackup, "el canónico se reconstruye desde el respaldo");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RECUPERACION) === "{canónico corrupto", "el canónico corrupto queda en recuperación");
});

caso("si canonical A y temp B son válidos, carga/promueve B y respalda A", () => {
  const almacen = new AlmacenMemoria();
  const a = crearV3("Proyecto A");
  const b = crearV3("Proyecto B");
  const rawA = JSON.stringify(a);
  const rawB = JSON.stringify(b);
  almacen.sembrar(CLAVE_PROYECTO_V3, rawA);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, rawB);

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "temporal_v3" && resultado.guardado, "el staging distinto se trata como promoción pendiente");
  igual(resultado.estado, b, "se carga el documento temporal más nuevo");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === rawB, "B queda en el canónico");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RESPALDO) === rawA, "A se respalda antes de la promoción");
  assert(!almacen.datos.has(CLAVE_PROYECTO_V3_TEMP), "el staging promovido se limpia con readback");
});

caso("si respaldo corrupto bloquea promoción, carga temporal en memoria e identifica la clave", () => {
  const almacen = new AlmacenMemoria();
  const a = JSON.stringify(crearV3("Canónico A"));
  const b = crearV3("Temporal B");
  const rawB = JSON.stringify(b);
  almacen.sembrar(CLAVE_PROYECTO_V3, a);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, rawB);
  almacen.sembrar(CLAVE_PROYECTO_V3_RESPALDO, "respaldo corrupto");

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && !resultado.guardado && resultado.origen === "temporal_v3", "B sigue disponible en memoria aunque no se promueva");
  igual(resultado.estado, b, "se devuelve el candidato temporal, no el documento vacío");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === a, "el canónico bueno permanece intacto");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP) === rawB, "el staging pendiente se preserva");
  assert(resultado.clavesConflictivas.includes(CLAVE_PROYECTO_V3_RESPALDO), "se identifica el respaldo que impidió promover");
  assert(resultado.clavesTemporalesPendientes.includes(CLAVE_PROYECTO_V3_TEMP), "se reporta el staging pendiente");
});

caso("con canonical corrupto, temp válido tiene prioridad sobre backup", () => {
  const almacen = new AlmacenMemoria();
  const b = crearV3("Temp más reciente");
  const a = crearV3("Backup anterior");
  const rawB = JSON.stringify(b);
  const rawA = JSON.stringify(a);
  almacen.sembrar(CLAVE_PROYECTO_V3, "{canónico corrupto");
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, rawB);
  almacen.sembrar(CLAVE_PROYECTO_V3_RESPALDO, rawA);

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "temporal_v3" && resultado.guardado, "temp debe preceder al respaldo rotativo");
  igual(resultado.estado, b, "se restaura el V3 del staging");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === rawB, "temp se promueve al canónico");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RESPALDO) === rawA, "el backup anterior no se altera");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_RECUPERACION) === "{canónico corrupto", "el canónico dañado queda en recovery");
});

caso("temp corrupto junto a canonical válido se conserva y reporta", () => {
  const almacen = new AlmacenMemoria();
  const v3 = crearV3();
  almacen.sembrar(CLAVE_PROYECTO_V3, JSON.stringify(v3));
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, "{temp corrupto");

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v3", "el canónico válido sigue siendo utilizable");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP) === "{temp corrupto", "temp corrupto no se sobreescribe ni elimina");
  assert(resultado.clavesTemporalesPendientes.includes(CLAVE_PROYECTO_V3_TEMP), "temp residual se reporta");
  assert(resultado.clavesConflictivas.includes(CLAVE_PROYECTO_V3_TEMP), "la clave temporal corrupta se identifica");
});

caso("detecta una carga V2 bajo la clave V1 por su versión", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV2()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v2" && resultado.guardado, "el payload V2 debe migrarse aunque use la clave V1");
  assert(!almacen.datos.has(CLAVE_MICRO_V1), "la clave V1 se retira solo después del commit verificado");
  assert(almacen.datos.has(CLAVE_PROYECTO_V3), "se persiste el V3 resultante");
});

caso("elige globalmente V2 sobre V1 aunque V1 esté bajo la clave actual", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV1()));
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV2(crearMicro())));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v2" && resultado.guardado, "el payload V2 más nuevo debe ganar aunque esté en la clave V1");
  assert(resultado.estado.proyecto.asignaturas[0]?.microcurriculo.ident.asignatura === "Fundamentos de Software", "se elige el Micro del payload V2");
  assert(!almacen.datos.has(CLAVE_MICRO_V2) && !almacen.datos.has(CLAVE_MICRO_V1), "tras el commit se limpian las dos copias válidas");
});

caso("en empate de versión legacy gana la clave micro.v2", () => {
  const almacen = new AlmacenMemoria();
  const desdeClaveV2 = crearMicro();
  const desdeClaveV1 = crearMicro();
  desdeClaveV2.ident.asignatura = "Asignatura en clave actual";
  desdeClaveV1.ident.asignatura = "Asignatura en clave anterior";
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2(desdeClaveV2)));
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV2(desdeClaveV1)));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v2" && resultado.guardado, "el desempate también produce V2");
  assert(resultado.estado.proyecto.asignaturas[0]?.microcurriculo.ident.asignatura === "Asignatura en clave actual", "micro.v2 tiene prioridad en empate");
  assert(!almacen.datos.has(CLAVE_MICRO_V2) && !almacen.datos.has(CLAVE_MICRO_V1), "ambas copias se retiran tras commit");
});

caso("V2 inválido permite usar V1 válido y conserva la clave desconocida", () => {
  const almacen = new AlmacenMemoria();
  const desconocido = JSON.stringify({ version: 99, datos: "desconocidos" });
  almacen.sembrar(CLAVE_MICRO_V2, desconocido);
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV1()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v1" && resultado.guardado, "debe intentar V1 al no migrar V2");
  assert(almacen.datos.get(CLAVE_MICRO_V2) === desconocido, "datos desconocidos nunca se borran");
  assert(!almacen.datos.has(CLAVE_MICRO_V1), "V1 se retira tras commit verificado");
  assert(resultado.clavesConflictivas.includes(CLAVE_MICRO_V2), "se identifica la clave desconocida preservada");
});

caso("V3 corrupto no bloquea recuperar V2 cuando no hay backup utilizable", () => {
  const almacen = new AlmacenMemoria();
  almacen.sembrar(CLAVE_PROYECTO_V3, "{V3 corrupto");
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v2" && resultado.guardado, "debe recuperar V2 y guardar V3");
  assert(resultado.clavesConflictivas.includes(CLAVE_PROYECTO_V3), "se identifica el V3 previo corrupto");
  assert(almacen.datos.has(CLAVE_PROYECTO_V3_RECUPERACION), "el raw V3 anterior queda respaldado");
  assert(!almacen.datos.has(CLAVE_MICRO_V2), "la clave V2 se retira después del commit verificado");
});

caso("elimina un legado solo si removeItem y readback confirman null", () => {
  const almacen = new AlmacenMemoria();
  const v3 = crearV3();
  const v2 = JSON.stringify(crearV2());
  almacen.sembrar(CLAVE_PROYECTO_V3, JSON.stringify(v3));
  almacen.sembrar(CLAVE_MICRO_V2, v2);
  almacen.quitarSilenciosamenteNo.add(CLAVE_MICRO_V2);

  const resultado = cargarEstadoPersistido(almacen);
  assert(resultado.ok && resultado.origen === "v3", "el V3 canónico sigue utilizable");
  assert(almacen.datos.get(CLAVE_MICRO_V2) === v2, "el almacén simula eliminación silenciosa fallida");
  assert(resultado.clavesLegadasPendientes.includes(CLAVE_MICRO_V2), "el residuo se reporta como pendiente");
  assert(!resultado.clavesLegadasEliminadas.includes(CLAVE_MICRO_V2), "no se reporta borrado sin readback null");
});

caso("readback de V3 válido reintenta limpieza de legados previamente pendientes", () => {
  const almacen = new AlmacenMemoria();
  const v3 = crearV3();
  almacen.sembrar(CLAVE_PROYECTO_V3, JSON.stringify(v3));
  almacen.sembrar(CLAVE_MICRO_V1, JSON.stringify(crearV1()));
  almacen.quitarSilenciosamenteNo.add(CLAVE_MICRO_V1);
  const primera = cargarEstadoPersistido(almacen);
  assert(primera.ok && primera.clavesLegadasPendientes.includes(CLAVE_MICRO_V1), "primer intento deja residuo informado");

  almacen.quitarSilenciosamenteNo.delete(CLAVE_MICRO_V1);
  const segunda = cargarEstadoPersistido(almacen);
  assert(segunda.ok && !segunda.clavesLegadasPendientes.includes(CLAVE_MICRO_V1), "la carga siguiente reintenta la limpieza");
  assert(!almacen.datos.has(CLAVE_MICRO_V1), "el legado se elimina al confirmar readback null");
});

caso("guardarEstadoV3 rechaza un estado inválido antes de tocar el almacén", () => {
  const almacen = new AlmacenMemoria();
  const resultado = guardarEstadoV3(almacen, { version: 3, proyecto: {}, seleccion: {}, conversaciones: {} });
  assert(!resultado.ok && !resultado.guardado && resultado.estado === null, "debe reportar no guardado");
  assert(resultado.error === "estado_invalido", "debe señalar que el shape es inválido");
  assert(almacen.eventos.length === 0, "no debe leer ni escribir para un estado inválido");
});

caso("guardar V3 válido usa staging/readback y no limpia legados", () => {
  const almacen = new AlmacenMemoria();
  const v3 = crearV3();
  almacen.sembrar(CLAVE_MICRO_V2, JSON.stringify(crearV2()));

  const resultado = guardarEstadoV3(almacen, v3);
  assert(resultado.ok && resultado.guardado, "el estado válido debe guardarse");
  igual(resultado.estado, v3, "devuelve el V3 verificado");
  assert(almacen.datos.has(CLAVE_MICRO_V2), "guardar V3 por sí solo no limpia claves anteriores");
  assert(!almacen.datos.has(CLAVE_PROYECTO_V3_TEMP), "staging se elimina tras confirmar el canónico");
  assert(almacen.eventos.indexOf(`set:${CLAVE_PROYECTO_V3_TEMP}`) < almacen.eventos.indexOf(`set:${CLAVE_PROYECTO_V3}`), "staging precede a promoción");
});

caso("no sobrescribe temp válido distinto si el slot de recuperación temporal está ocupado", () => {
  const almacen = new AlmacenMemoria();
  const canonico = JSON.stringify(crearV3("Canónico"));
  const temp = JSON.stringify(crearV3("Temporal pendiente"));
  const recovery = "otro raw temporal previamente preservado";
  almacen.sembrar(CLAVE_PROYECTO_V3, canonico);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, temp);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP_RECUPERACION, recovery);

  const resultado = guardarEstadoV3(almacen, crearV3("Nuevo solicitado"));
  assert(!resultado.ok && resultado.error === "temporal_conflictiva", "sin respaldo temporal verificable se aborta");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === canonico, "el canónico no se modifica");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP) === temp, "el staging válido distinto se conserva");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP_RECUPERACION) === recovery, "el slot de recuperación ocupado se preserva");
});

caso("no sobrescribe temp corrupto si su slot de recuperación tiene otro raw", () => {
  const almacen = new AlmacenMemoria();
  const canonico = JSON.stringify(crearV3("Canónico"));
  const tempCorrupto = "{temp corrupto original";
  const recovery = "otro raw temporal";
  almacen.sembrar(CLAVE_PROYECTO_V3, canonico);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, tempCorrupto);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP_RECUPERACION, recovery);

  const resultado = guardarEstadoV3(almacen, crearV3("Nuevo estado"));
  assert(!resultado.ok && resultado.error === "temporal_conflictiva", "sin rescate temporal verificado se aborta");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === canonico, "el canónico bueno permanece intacto");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP) === tempCorrupto, "el temp corrupto se conserva");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP_RECUPERACION) === recovery, "no se pisa el raw de recovery existente");
});

caso("preserva temp corrupto antes de reutilizarlo como staging", () => {
  const almacen = new AlmacenMemoria();
  const canonico = JSON.stringify(crearV3("Canónico"));
  const tempCorrupto = "{temp corrupto";
  almacen.sembrar(CLAVE_PROYECTO_V3, canonico);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, tempCorrupto);

  const resultado = guardarEstadoV3(almacen, crearV3("Nuevo estado"));
  assert(resultado.ok && resultado.guardado, "tras rescatar temp puede guardarse el nuevo V3");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP_RECUPERACION) === tempCorrupto, "el raw corrupto se conserva en recovery temporal");
  assert(!almacen.datos.has(CLAVE_PROYECTO_V3_TEMP), "staging nuevo se limpia después del commit");
});

caso("si canonical ya coincide, reporta temp válido diferente sin destruirlo", () => {
  const almacen = new AlmacenMemoria();
  const canonico = crearV3("Canónico existente");
  const temp = JSON.stringify(crearV3("Temp diferente"));
  almacen.sembrar(CLAVE_PROYECTO_V3, JSON.stringify(canonico));
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, temp);

  const resultado = guardarEstadoV3(almacen, canonico);
  assert(resultado.ok && resultado.guardado, "el canónico ya satisface la solicitud");
  assert(resultado.clavesTemporalesPendientes.includes(CLAVE_PROYECTO_V3_TEMP), "el temp distinto se reporta pendiente");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3_TEMP) === temp, "el fast path no pisa un candidato temporal diferente");
  assert(!almacen.eventos.some((evento) => evento === `set:${CLAVE_PROYECTO_V3}`), "no reescribe el canónico idéntico");
});

caso("reintentar carga limpia la deuda temporal tras promoción parcial", () => {
  const almacen = new AlmacenMemoria();
  const a = JSON.stringify(crearV3("Canónico A"));
  const b = JSON.stringify(crearV3("Staging B"));
  almacen.sembrar(CLAVE_PROYECTO_V3, a);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, b);
  almacen.quitarSilenciosamenteNo.add(CLAVE_PROYECTO_V3_TEMP);

  const primera = cargarEstadoPersistido(almacen);
  assert(primera.ok && primera.origen === "temporal_v3", "se promueve B aunque quede residuo temporal");
  assert(primera.clavesTemporalesPendientes.includes(CLAVE_PROYECTO_V3_TEMP), "se informa la limpieza pendiente");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === b, "B queda como canónico");

  almacen.quitarSilenciosamenteNo.delete(CLAVE_PROYECTO_V3_TEMP);
  const segunda = cargarEstadoPersistido(almacen);
  assert(segunda.ok && segunda.origen === "v3", "la carga posterior reconoce el canónico ya actualizado");
  assert(!segunda.clavesTemporalesPendientes.includes(CLAVE_PROYECTO_V3_TEMP), "la deuda se limpia y deja de reportarse");
  assert(!almacen.datos.has(CLAVE_PROYECTO_V3_TEMP), "el staging igual al canónico se elimina con readback");
});

caso("si falla setItem en staging, no se pisa el V3 canónico", () => {
  const almacen = new AlmacenMemoria();
  const anterior = JSON.stringify(crearV3("V3 persistido"));
  almacen.sembrar(CLAVE_PROYECTO_V3, anterior);
  almacen.fallarSet.add(CLAVE_PROYECTO_V3_TEMP);

  const resultado = guardarEstadoV3(almacen, crearV3("V3 siguiente"));
  assert(!resultado.ok && resultado.error === "escritura_temporal", "debe fallar antes de promover");
  assert(almacen.datos.get(CLAVE_PROYECTO_V3) === anterior, "el canónico queda sin cambios");
});

caso("si removeItem de staging falla en silencio, se reporta el temporal pendiente", () => {
  const almacen = new AlmacenMemoria();
  almacen.quitarSilenciosamenteNo.add(CLAVE_PROYECTO_V3_TEMP);
  const resultado = guardarEstadoV3(almacen, crearV3());
  assert(resultado.ok && resultado.guardado, "el V3 canónico quedó confirmado");
  assert(resultado.clavesTemporalesPendientes.includes(CLAVE_PROYECTO_V3_TEMP), "se reporta el temporal residual");
});

caso("V3 idéntico evita reescritura y limpia staging igual con readback", () => {
  const almacen = new AlmacenMemoria();
  const v3 = crearV3();
  const raw = JSON.stringify(v3);
  almacen.sembrar(CLAVE_PROYECTO_V3, raw);
  almacen.sembrar(CLAVE_PROYECTO_V3_TEMP, raw);
  const resultado = guardarEstadoV3(almacen, v3);
  assert(resultado.ok && resultado.guardado, "el estado ya guardado se acepta");
  assert(!almacen.eventos.some((evento) => evento.startsWith("set:")), "no debe escribir de nuevo V3 ni staging");
  assert(!almacen.datos.has(CLAVE_PROYECTO_V3_TEMP), "un staging igual se elimina con readback null");
  assert(resultado.clavesTemporalesPendientes.length === 0, "no quedan residuos temporales");
});

if (fallos > 0) {
  console.error(`\n${fallos}/${total} pruebas fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\n${total} pruebas pasaron.`);
}
