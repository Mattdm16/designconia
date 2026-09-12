import { useEffect, useState, useRef, useCallback } from "react";
import Markdown from "react-markdown";
import {
  Bold,
  Italic,
  List,
  Table,
  Heading2,
  Eye,
  Pencil,
  ChevronDown,
} from "lucide-react";
import "./App.css";

const LS_KEY = "diseno-curricular-ia-v1";
const LS_TEMA = "diseno-curricular-ia-tema";
const PASOS = [
  "Datos Básicos",
  "Programa y Mapa",
  "Secuencias",
  "Instrumentos",
  "Coherencia y Exportar",
];
const TIPS = [
  "Completa la ficha y anexa tu programa oficial si lo tienes. Todo se guarda en tu navegador.",
  "Genera el programa y edítalo: lo que valides aquí alimenta los siguientes pasos.",
  "Genera una subcompetencia por vez. Las horas de la secuencia deben sumar las del cuadro.",
  "Cada instrumento debe valorar las evidencias declaradas y cuadrar con el % del cuadro.",
  "Revisa horas y porcentajes antes de exportar. Imprimir genera un PDF limpio.",
];
const MAX_ANEXO_BYTES = 4 * 1024 * 1024;

const inicial = {
  unidad: "",
  semestre: "",
  hpc: "",
  hps: "",
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
      resolve({
        nombre: file.name,
        mime: file.type || "application/octet-stream",
        base64,
      });
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

/* ── Editor con toolbar ── */
function EditorMD({ value, onChange, placeholder }) {
  const [mode, setMode] = useState("edit");
  const ref = useRef(null);

  const wrap = useCallback(
    (before, after) => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = value.slice(start, end);
      const replacement = `${before}${sel || "texto"}${after}`;
      const next = value.slice(0, start) + replacement + value.slice(end);
      onChange({ target: { value: next } });
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + (sel || "texto").length;
      });
    },
    [value, onChange]
  );

  const insertar = useCallback(
    (text) => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const next = value.slice(0, start) + text + value.slice(start);
      onChange({ target: { value: next } });
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + text.length;
      });
    },
    [value, onChange]
  );

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => wrap("**", "**")}
          aria-label="Negrita"
          title="Negrita"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => wrap("*", "*")}
          aria-label="Cursiva"
          title="Cursiva"
        >
          <Italic size={15} />
        </button>
        <span className="sep" />
        <button
          type="button"
          onClick={() => insertar("\n- ")}
          aria-label="Lista"
          title="Lista"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertar("\n## ")}
          aria-label="Título"
          title="Título"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onClick={() =>
            insertar("\n| Columna 1 | Columna 2 |\n| --- | --- |\n| celda | celda |\n")
          }
          aria-label="Tabla"
          title="Tabla"
        >
          <Table size={15} />
        </button>
        <div className="editor-mode">
          <button
            type="button"
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            type="button"
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
          >
            <Eye size={13} /> Vista previa
          </button>
        </div>
      </div>
      {mode === "edit" ? (
        <textarea
          ref={ref}
          className="preview"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <div className="markdown-preview">
          {value ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p style={{ color: "var(--muted)" }}>Sin contenido aún.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── App ── */
export default function App() {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState(cargar);
  const [tema, setTema] = useState(
    () => localStorage.getItem(LS_TEMA) || "claro"
  );
  const [anexos, setAnexos] = useState([]);
  const [pedido, setPedido] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [llamadas, setLlamadas] = useState(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return Number(localStorage.getItem(`llamadas-${hoy}`) || 0);
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(datos));
  }, [datos]);

  useEffect(() => {
    localStorage.setItem(LS_TEMA, tema);
  }, [tema]);

  const set = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }));
  const totalHoras = (Number(datos.hpc) || 0) + (Number(datos.hps) || 0);

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
      const n =
        Number(localStorage.getItem(`llamadas-${hoy}`) || 0) + 1;
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

  const contextoBase =
    `Unidad de competencia: ${datos.unidad}\n` +
    `Semestre/ubicación: ${datos.semestre}\n` +
    `Horas con docente (HPC): ${datos.hpc || "—"}\n` +
    `Horas independientes (HPS): ${datos.hps || "—"}\n` +
    `Modo: ${datos.modo}`;

  const ir = (n) => {
    setPedido("");
    setAnexos([]);
    setError("");
    setPaso(n);
  };

  return (
    <div className="app" data-tema={tema}>
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>

      <header className="topbar" role="banner">
        <div className="brand">
          <span className="logo" aria-hidden="true">DC</span>
          <div>
            <strong>Diseño Curricular con IA</strong>
            <small>UNACH · LIDTS</small>
          </div>
        </div>
        <div className="meta">
          <span className="pill ok">
            <i aria-hidden="true" />
            Guardado local
          </span>
          <span className="pill">
            Llamadas hoy: <b>{llamadas}</b>
          </span>
          <button
            type="button"
            className="tema"
            onClick={() =>
              setTema((t) => (t === "claro" ? "oscuro" : "claro"))
            }
            aria-label={
              tema === "claro"
                ? "Cambiar a modo oscuro"
                : "Cambiar a modo claro"
            }
          >
            {tema === "claro" ? "☾" : "☀"}
          </button>
        </div>
      </header>

      <nav className="stepper" aria-label="Pasos del wizard">
        {PASOS.map((p, i) => (
          <div
            key={p}
            className={`stepper-item ${i === paso ? "active" : ""} ${i < paso ? "done" : ""}`}
          >
            <button
              type="button"
              className="stepper-btn"
              onClick={() => ir(i)}
              aria-current={i === paso ? "step" : undefined}
            >
              <span className="stepper-num" aria-hidden="true">
                {i < paso ? "✓" : i + 1}
              </span>
              <span className="stepper-lbl">{p}</span>
            </button>
            {i < PASOS.length - 1 && (
              <span className="stepper-line" aria-hidden="true" />
            )}
          </div>
        ))}
      </nav>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="layout" id="main-content">
        <main className="card">
          {paso === 0 && (
            <>
              <h2>Ficha Técnica de la Unidad</h2>
              <p className="desc">
                Datos institucionales para contextualizar las propuestas de la
                IA.
              </p>
              <label htmlFor="unidad">
                Nombre de la Unidad de Competencia (Asignatura) *
              </label>
              <input
                id="unidad"
                value={datos.unidad}
                onChange={set("unidad")}
                placeholder="Fundamentos de matemáticas"
                required
              />
              <div className="fila">
                <div>
                  <label htmlFor="semestre">Semestre / Nivel *</label>
                  <input
                    id="semestre"
                    value={datos.semestre}
                    onChange={set("semestre")}
                    placeholder="Primer semestre"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="hpc">Horas con Docente (HPC)</label>
                  <input
                    id="hpc"
                    type="number"
                    min="0"
                    value={datos.hpc}
                    onChange={set("hpc")}
                    placeholder="48"
                  />
                </div>
                <div>
                  <label htmlFor="hps">Horas Independientes (HPS)</label>
                  <input
                    id="hps"
                    type="number"
                    min="0"
                    value={datos.hps}
                    onChange={set("hps")}
                    placeholder="32"
                  />
                </div>
              </div>
              <span className="etiqueta">Modalidad de Creación Curricular</span>
              <div className="fila">
                <label
                  className={`opcion ${datos.modo === "desde-cero" ? "sel" : ""}`}
                >
                  <input
                    type="radio"
                    name="modo"
                    checked={datos.modo === "desde-cero"}
                    onChange={() =>
                      setDatos((d) => ({ ...d, modo: "desde-cero" }))
                    }
                  />
                  <div>
                    <b>Desde Cero con IA</b>
                    <small>
                      Generación completa. El resultado sale como borrador.
                    </small>
                  </div>
                </label>
                <label
                  className={`opcion ${datos.modo === "partir-de" ? "sel" : ""}`}
                >
                  <input
                    type="radio"
                    name="modo"
                    checked={datos.modo === "partir-de"}
                    onChange={() =>
                      setDatos((d) => ({ ...d, modo: "partir-de" }))
                    }
                  />
                  <div>
                    <b>Partir de Programa Oficial</b>
                    <small>
                      Respeta tu documento y completa lo faltante.
                    </small>
                  </div>
                </label>
              </div>
              <label className="drop">
                <b>Archivos o Documentos Base</b>
                <small>PDF, DOCX o imagen · máximo 4 MB por archivo</small>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={onArchivos}
                  aria-label="Subir archivos base"
                />
              </label>
              {anexos.length > 0 && (
                <ul className="files">
                  {anexos.map((a) => (
                    <li key={a.nombre}>{a.nombre}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          {paso === 1 && (
            <>
              <h2>Programa y Mapa</h2>
              <p className="desc">
                Genera el programa descriptivo y edítalo: lo validado alimenta
                los siguientes pasos.
              </p>
              <label htmlFor="pedido-programa">
                Pedido al planeador (opcional si anexaste programa)
              </label>
              <textarea
                id="pedido-programa"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                placeholder="Genera el programa descriptivo y el mapa de la unidad…"
              />
              <div className="acciones">
                <button
                  type="button"
                  className="primario"
                  disabled={cargando}
                  onClick={() =>
                    generar("planeador-unidad", contextoBase, "programa")
                  }
                >
                  {cargando ? "Generando…" : "Generar programa"}
                </button>
              </div>
              <span className="etiqueta">Programa (edítalo antes de continuar)</span>
              <EditorMD
                value={datos.programa}
                onChange={set("programa")}
                placeholder="El programa aparecerá aquí después de generarlo…"
              />
            </>
          )}

          {paso === 2 && (
            <>
              <h2>Secuencias</h2>
              <p className="desc">
                Genera una subcompetencia por vez; puedes acumular varias sin
                perder lo anterior.
              </p>
              <label htmlFor="pedido-seq">
                Subcompetencia a planear (número, propósito, resultados y horas)
              </label>
              <textarea
                id="pedido-seq"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                placeholder="Subcompetencia 1… Resultados 1.1 (5 h)…"
              />
              <label className="drop">
                <b>Material de apoyo para este paso (opcional)</b>
                <small>PDF, DOCX o imagen · máximo 4 MB por archivo</small>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={onArchivos}
                  aria-label="Subir material de apoyo"
                />
              </label>
              {anexos.length > 0 && (
                <ul className="files">
                  {anexos.map((a) => (
                    <li key={a.nombre}>{a.nombre}</li>
                  ))}
                </ul>
              )}
              <div className="acciones">
                <button
                  type="button"
                  className="primario"
                  disabled={cargando}
                  onClick={() =>
                    generar(
                      "secuencias-subcompetencia",
                      `${contextoBase}\n\nPrograma validado:\n${datos.programa}`,
                      "secuencias"
                    )
                  }
                >
                  {cargando ? "Generando…" : "Generar secuencia"}
                </button>
              </div>
              <span className="etiqueta">Secuencias acumuladas (edítalas)</span>
              <EditorMD
                value={datos.secuencias}
                onChange={set("secuencias")}
                placeholder="Las secuencias aparecerán aquí después de generarlas…"
              />
            </>
          )}

          {paso === 3 && (
            <>
              <h2>Instrumentos de Evaluación</h2>
              <p className="desc">
                Rúbricas, listas de cotejo o pruebas alineadas a tus evidencias
                y porcentajes.
              </p>
              <label htmlFor="pedido-inst">
                Resultado(s) a evaluar (actividades, evidencias y % del cuadro)
              </label>
              <textarea
                id="pedido-inst"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                placeholder="Resultado 1.3… Evidencias… %: 5…"
              />
              <div className="acciones">
                <button
                  type="button"
                  className="primario"
                  disabled={cargando}
                  onClick={() =>
                    generar(
                      "instrumentos-evaluacion",
                      `${contextoBase}\n\nPrograma validado:\n${datos.programa}\n\nSecuencias validadas:\n${datos.secuencias}`,
                      "instrumentos"
                    )
                  }
                >
                  {cargando ? "Generando…" : "Generar instrumento"}
                </button>
              </div>
              <span className="etiqueta">Instrumentos acumulados (edítalos)</span>
              <EditorMD
                value={datos.instrumentos}
                onChange={set("instrumentos")}
                placeholder="Los instrumentos aparecerán aquí después de generarlos…"
              />
            </>
          )}

          {paso === 4 && (
            <>
              <h2>Coherencia y Exportar</h2>
              <p className="desc">
                Verifica antes de entregar: ¿las horas suman? ¿los % cuadran? ¿toda
                evidencia tiene instrumento?
              </p>
              <div className="acciones">
                <button
                  type="button"
                  className="primario"
                  onClick={() => window.print()}
                >
                  Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `# ${datos.unidad}\n\n${datos.programa}\n\n${datos.secuencias}\n\n${datos.instrumentos}`
                    )
                  }
                >
                  Copiar todo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    descargar(
                      "paquete-curricular.md",
                      `# ${datos.unidad}\n\n${datos.programa}\n\n${datos.secuencias}\n\n${datos.instrumentos}`
                    )
                  }
                >
                  Descargar .md
                </button>
              </div>
              <div className="acciones">
                <button
                  type="button"
                  className="peligro"
                  onClick={() => {
                    if (
                      window.confirm(
                        "¿Empezar de nuevo? Se borra todo lo guardado."
                      )
                    ) {
                      localStorage.removeItem(LS_KEY);
                      setDatos({ ...inicial });
                      ir(0);
                    }
                  }}
                >
                  Empezar de nuevo
                </button>
              </div>
            </>
          )}

          <footer className="navpaso">
            <button
              type="button"
              disabled={paso === 0}
              onClick={() => ir(paso - 1)}
            >
              ← Atrás
            </button>
            <span>
              Paso {paso + 1} de {PASOS.length}
            </span>
            {paso < PASOS.length - 1 && (
              <button
                type="button"
                className="primario"
                onClick={() => ir(paso + 1)}
              >
                Continuar →
              </button>
            )}
          </footer>
        </main>

        <aside className="lateral">
          <button
            type="button"
            className={`sidebar-toggle ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-content"
          >
            Resumen y ayuda
            <ChevronDown size={16} className="arrow" aria-hidden="true" />
          </button>
          <div
            id="sidebar-content"
            className={sidebarOpen ? "open" : ""}
          >
            <div className="panel resumen">
              <h3>Resumen de carga horaria</h3>
              <dl>
                <div>
                  <dt>Horas con Docente (HPC)</dt>
                  <dd>{datos.hpc || "—"}</dd>
                </div>
                <div>
                  <dt>Horas Independientes (HPS)</dt>
                  <dd>{datos.hps || "—"}</dd>
                </div>
                <div className="total">
                  <dt>Total semestre</dt>
                  <dd>{totalHoras ? `${totalHoras} hrs` : "—"}</dd>
                </div>
              </dl>
            </div>
            <div className="panel ayuda">
              <h3>En este paso</h3>
              <p>{TIPS[paso]}</p>
              {datos.unidad && (
                <p className="ctx">
                  <b>Unidad:</b> {datos.unidad}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
