import { useEffect, useState } from "react";
import "./App.css";

const LS_KEY = "diseno-curricular-ia-v1";
const PASOS = ["Datos", "Programa y mapa", "Secuencias", "Instrumentos", "Exportar"];
const MAX_ANEXO_BYTES = 4 * 1024 * 1024;

const inicial = {
  unidad: "",
  semestre: "",
  horas: "",
  modo: "desde-cero",
  programa: "",
  secuencias: "",
  instrumentos: "",
};

function cargar() {
  try {
    return { ...inicial, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") };
  } catch {
    return { ...inicial };
  }
}

function leerArchivo(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ANEXO_BYTES) {
      reject(new Error(`${file.name} supera los 4 MB`));
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const [, base64] = String(r.result).split(",");
      resolve({ nombre: file.name, mime: file.type || "application/octet-stream", base64 });
    };
    r.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    r.readAsDataURL(file);
  });
}

function descargar(nombre, texto) {
  const blob = new Blob([texto], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function App() {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState(cargar);
  const [anexos, setAnexos] = useState([]);
  const [pedido, setPedido] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [llamadas, setLlamadas] = useState(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return Number(localStorage.getItem(`llamadas-${hoy}`) || 0);
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(datos));
  }, [datos]);

  const set = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }));

  async function generar(asistente, contexto, campoDestino) {
    setError("");
    if (!pedido.trim() && campoDestino !== "programa") {
      setError("Describe qué quieres generar antes de pedirlo.");
      return;
    }
    setCargando(true);
    try {
      const res = await fetch("/.netlify/functions/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asistente, pedido, contexto, anexos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setDatos((d) => ({ ...d, [campoDestino]: data.texto }));
      const hoy = new Date().toISOString().slice(0, 10);
      const n = Number(localStorage.getItem(`llamadas-${hoy}`) || 0) + 1;
      localStorage.setItem(`llamadas-${hoy}`, String(n));
      setLlamadas(n);
      setAnexos([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function onArchivos(e) {
    setError("");
    try {
      const files = await Promise.all([...e.target.files].map(leerArchivo));
      setAnexos((a) => [...a, ...files]);
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  }

  const contextoBase = `Unidad de competencia: ${datos.unidad}\nSemestre/ubicación: ${datos.semestre}\nHoras disponibles: ${datos.horas}\nModo: ${datos.modo}`;

  return (
    <main className="wizard">
      <header>
        <h1>Diseño curricular con IA</h1>
        <p>UNACH · LIDTS — programa → secuencias → instrumentos</p>
      </header>

      <nav className="pasos">
        {PASOS.map((p, i) => (
          <button
            key={p}
            type="button"
            className={i === paso ? "activo" : ""}
            onClick={() => setPaso(i)}
          >
            {i + 1}. {p}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}

      {paso === 0 && (
        <section>
          <h2>Paso 0 — Datos y punto de partida</h2>
          <label>Unidad de competencia
            <input value={datos.unidad} onChange={set("unidad")} placeholder="Fundamentos de matemáticas" />
          </label>
          <label>Semestre / ubicación
            <input value={datos.semestre} onChange={set("semestre")} placeholder="Primer semestre" />
          </label>
          <label>Horas disponibles
            <input value={datos.horas} onChange={set("horas")} placeholder="80 semestrales (3T + 2P)" />
          </label>
          <label>Modo
            <select value={datos.modo} onChange={set("modo")}>
              <option value="desde-cero">Desde cero (saldrá como borrador)</option>
              <option value="partir-de">Partir del programa oficial anexado</option>
            </select>
          </label>
          <label>Programa oficial o planeación anterior (PDF, DOCX, imagen ≤ 4 MB)
            <input type="file" multiple accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={onArchivos} />
          </label>
          {anexos.length > 0 && <ul>{anexos.map((a) => <li key={a.nombre}>{a.nombre}</li>)}</ul>}
          <div className="acciones">
            <button type="button" onClick={() => setPaso(1)}>Continuar →</button>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section>
          <h2>Paso 1 — Programa y mapa</h2>
          <label>Pedido al planeador (opcional si anexaste programa)
            <textarea
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              placeholder="Genera el programa descriptivo y el mapa de la unidad…"
            />
          </label>
          <div className="acciones">
            <button
              type="button"
              disabled={cargando}
              onClick={() => generar("planeador-unidad", contextoBase, "programa")}
            >
              {cargando ? "Generando…" : "Generar programa"}
            </button>
          </div>
          <label>Programa (edítalo antes de continuar)
            <textarea className="resultado" value={datos.programa} onChange={set("programa")} />
          </label>
          <div className="acciones">
            <button type="button" onClick={() => setPaso(0)}>← Atrás</button>
            <button type="button" onClick={() => { setPedido(""); setPaso(2); }}>Validar y continuar →</button>
          </div>
        </section>
      )}

      {paso === 2 && (
        <section>
          <h2>Paso 2 — Secuencias por subcompetencia</h2>
          <label>Subcompetencia a planear (pega número, propósito, resultados y horas)
            <textarea
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              placeholder="Subcompetencia 1. Comprende los conceptos… Resultados 1.1 (5 h)…"
            />
          </label>
          <label>Material de apoyo para este paso (opcional)
            <input type="file" multiple accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={onArchivos} />
          </label>
          {anexos.length > 0 && <ul>{anexos.map((a) => <li key={a.nombre}>{a.nombre}</li>)}</ul>}
          <div className="acciones">
            <button
              type="button"
              disabled={cargando}
              onClick={() => generar("secuencias-subcompetencia", `${contextoBase}\n\nPrograma validado:\n${datos.programa}`, "secuencias")}
            >
              {cargando ? "Generando…" : "Generar secuencia"}
            </button>
          </div>
          <label>Secuencias acumuladas (edítalas; puedes generar una subcompetencia por vez)
            <textarea className="resultado" value={datos.secuencias} onChange={set("secuencias")} />
          </label>
          <div className="acciones">
            <button type="button" onClick={() => setPaso(1)}>← Atrás</button>
            <button type="button" onClick={() => { setPedido(""); setPaso(3); }}>Validar y continuar →</button>
          </div>
        </section>
      )}

      {paso === 3 && (
        <section>
          <h2>Paso 3 — Instrumentos de evaluación</h2>
          <label>Resultado(s) a evaluar (pega actividades, evidencias y % del cuadro)
            <textarea
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              placeholder="Resultado 1.3… Evidencias: reporte…, examen… %: 5…"
            />
          </label>
          <div className="acciones">
            <button
              type="button"
              disabled={cargando}
              onClick={() => generar("instrumentos-evaluacion", `${contextoBase}\n\nPrograma validado:\n${datos.programa}\n\nSecuencias validadas:\n${datos.secuencias}`, "instrumentos")}
            >
              {cargando ? "Generando…" : "Generar instrumento"}
            </button>
          </div>
          <label>Instrumentos acumulados (edítalos)
            <textarea className="resultado" value={datos.instrumentos} onChange={set("instrumentos")} />
          </label>
          <div className="acciones">
            <button type="button" onClick={() => setPaso(2)}>← Atrás</button>
            <button type="button" onClick={() => setPaso(4)}>Validar y continuar →</button>
          </div>
        </section>
      )}

      {paso === 4 && (
        <section>
          <h2>Paso 4 — Revisión y exportación</h2>
          <p className="nota">
            Verifica: ¿las horas de los resultados suman las de cada subcompetencia? ¿los %
            cuadran? ¿toda evidencia tiene instrumento? Llamadas a la IA hoy: {llamadas}.
          </p>
          <div className="acciones">
            <button type="button" onClick={() => window.print()}>Imprimir / PDF</button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(
                `# ${datos.unidad}\n\n${datos.programa}\n\n${datos.secuencias}\n\n${datos.instrumentos}`
              )}
            >
              Copiar todo
            </button>
            <button
              type="button"
              onClick={() => descargar(
                "paquete-curricular.md",
                `# ${datos.unidad}\n\n${datos.programa}\n\n${datos.secuencias}\n\n${datos.instrumentos}`
              )}
            >
              Descargar .md
            </button>
          </div>
          <div className="acciones">
            <button type="button" onClick={() => setPaso(3)}>← Atrás</button>
            <button
              type="button"
              className="peligro"
              onClick={() => {
                if (window.confirm("¿Empezar de nuevo? Se borra todo lo guardado.")) {
                  localStorage.removeItem(LS_KEY);
                  setDatos({ ...inicial });
                  setPaso(0);
                }
              }}
            >
              Empezar de nuevo
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
