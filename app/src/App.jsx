import { useState, useEffect, useRef, useCallback } from 'react'
import Markdown from 'react-markdown'
import {
  Building2,
  GraduationCap,
  RotateCcw,
  Cloud,
  Sparkles,
  Route,
  ClipboardCheck,
  FileText,
  Copy,
  Download,
  Upload,
  Info,
  ArrowRight,
  ArrowLeft,
  List,
  Code,
  ExternalLink,
  Paperclip,
  LayoutDashboard,
  Pen,
  Maximize2,
  Trash2
} from 'lucide-react'
import './App.css'

const APP_NAME = 'Diseño Curricular con IA'
const DEFAULT_ASSISTANT_KEY = 'planeador-unidad'

const TABS = [
  { key: 1, label: 'Básicos', tag: null },
  { key: 2, label: 'Prog. & Mapa', tag: { text: 'Núcleo Curricular', color: 'green' } },
  { key: 3, label: 'Secuencias', tag: { text: 'Sesiones de Clase', color: 'blue' } },
  { key: 4, label: 'Instrumentos', tag: { text: 'Evaluación', color: 'purple' } },
  { key: 5, label: 'Exportar', tag: { text: 'Listo', color: 'amber' } }
]

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8]

function App() {
  const [step, setStep] = useState(1)
  const [asistente, setAsistente] = useState(DEFAULT_ASSISTANT_KEY)
  const [nombreUnidad, setNombreUnidad] = useState('')
  const [carpeta, setCarpeta] = useState('')
  const [competencias, setCompetencias] = useState('')
  const [archivos, setArchivos] = useState([])
  const [resultados, setResultados] = useState({ programa: '', secuencias: '', instrumentos: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewAssistant, setPreviewAssistant] = useState(false)
  const fileInputRef = useRef(null)

  // Canvas state
  const [canvasContent, setCanvasContent] = useState(null)
  const [canvasZoom, setCanvasZoom] = useState(100)

  // Load saved project
  useEffect(() => {
    try {
      const saved = localStorage.getItem('proyecto_curricular')
      if (saved) {
        const data = JSON.parse(saved)
        setAsistente(data.asistente || DEFAULT_ASSISTANT_KEY)
        setNombreUnidad(data.nombreUnidad || '')
        setCarpeta(data.carpeta || '')
        setCompetencias(data.competencias || '')
        setResultados(data.resultados || { programa: '', secuencias: '', instrumentos: '' })
      }
    } catch { /* ignore */ }
  }, [])

  // Persist on change
  useEffect(() => {
    const data = { asistente, nombreUnidad, carpeta, competencias, resultados }
    localStorage.setItem('proyecto_curricular', JSON.stringify(data))
  }, [asistente, nombreUnidad, carpeta, competencias, resultados])

  const handleFiles = useCallback((e) => {
    const selected = Array.from(e.target.files || [])
    const valid = selected.filter(f => {
      if (f.size > 4 * 1024 * 1024) {
        setError(`${f.name}: excede 4 MB`)
        return false
      }
      const ext = f.name.split('.').pop().toLowerCase()
      return ['pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)
    })
    setArchivos(prev => [...prev, ...valid])
  }, [])

  const removeFile = useCallback((idx) => {
    setArchivos(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const saveProject = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      const data = { asistente, nombreUnidad, carpeta, competencias, resultados }
      localStorage.setItem('proyecto_curricular', JSON.stringify(data))
      await new Promise(r => setTimeout(r, 600))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [asistente, nombreUnidad, carpeta, competencias, resultados])

  const resetAll = useCallback(() => {
    if (!confirm('¿Estás seguro? Se borrarán todos los datos de la sesión actual.')) return
    setAsistente(DEFAULT_ASSISTANT_KEY)
    setNombreUnidad('')
    setCarpeta('')
    setCompetencias('')
    setResultados({ programa: '', secuencias: '', instrumentos: '' })
    setArchivos([])
    setError(null)
    setStep(1)
    setCanvasContent(null)
    setPreviewAssistant(false)
  }, [])

  const copyAll = useCallback(() => {
    const parts = []
    if (resultados.programa) parts.push(`# PROGRAMA DESCRIPTIVO\n\n${resultados.programa}`)
    if (resultados.secuencias) parts.push(`# SECUENCIAS DIDÁCTICAS\n\n${resultados.secuencias}`)
    if (resultados.instrumentos) parts.push(`# INSTRUMENTOS DE EVALUACIÓN\n\n${resultados.instrumentos}`)
    if (parts.length === 0) {
      alert('No hay contenido generado para copiar')
      return
    }
    navigator.clipboard.writeText(parts.join('\n\n---\n\n')).then(() => {
      alert('Todo el contenido curricular copiado al portapapeles')
    })
  }, [resultados])

  const downloadMarkdown = useCallback(() => {
    const parts = []
    if (resultados.programa) parts.push(`# PROGRAMA DESCRIPTIVO\n\n${resultados.programa}`)
    if (resultados.secuencias) parts.push(`# SECUENCIAS DIDÁCTICAS\n\n${resultados.secuencias}`)
    if (resultados.instrumentos) parts.push(`# INSTRUMENTOS DE EVALUACIÓN\n\n${resultados.instrumentos}`)
    if (parts.length === 0) {
      alert('No hay contenido generado para descargar')
      return
    }
    const blob = new Blob([parts.join('\n\n---\n\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombreUnidad || 'diseno_curricular'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [resultados, nombreUnidad])

  const printContent = useCallback(() => {
    window.print()
  }, [])

  const handleGenerate = useCallback(async (tipo) => {
    setGenerating(true)
    setError(null)
    try {
      const config = { asistente, nombreUnidad, carpeta, competencias, archivos, tipo, contenidoPrevio: resultados }
      const response = await fetch('/.netlify/functions/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Error del servidor: ${response.status}`)
      }
      const data = await response.json()
      const text = data.texto || 'No se recibió respuesta del asistente.'
      setResultados(prev => ({ ...prev, [tipo]: text }))
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor')
    } finally {
      setGenerating(false)
    }
  }, [asistente, nombreUnidad, carpeta, competencias, archivos, resultados])

  const showOnCanvas = useCallback((type, title, content) => {
    const titles = {
      programa: 'Programa y Mapa Curricular',
      secuencias: 'Secuencias Didácticas de Clase',
      instrumentos: 'Instrumentos de Evaluación y Rúbricas'
    }
    setCanvasContent({
      type: titles[type] || type,
      title: title || nombreUnidad || 'Sin nombre',
      body: content
    })
  }, [nombreUnidad])

  // If previewing assistant instructions
  if (previewAssistant && step === 6) {
    return (
      <div className="app-root">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-brand">
              <Building2 className="topbar-brand-icon" />
              <span className="topbar-brand-name">{APP_NAME}</span>
              <span className="topbar-version">v3.0</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn-back" onClick={() => { setPreviewAssistant(false); setStep(2) }}>
              <ArrowLeft size={14} /> Volver al wizard
            </button>
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Instrucciones del asistente: {asistente}
          </h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            Este es el contenido del archivo <code>.md</code> que se envía como instrucción del sistema a Gemini.
          </p>
          <pre style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            border: '1px solid #ddd'
          }}>
            {`[Contenido de asistentes/${asistente}.md]\n\nEste contenido se carga automáticamente desde el bundle generado en build time.`}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="app-root">
      {/* ===== TOP BAR ===== */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <Building2 className="topbar-brand-icon" />
            <span className="topbar-brand-name">{APP_NAME}</span>
            <span className="topbar-version">v3.0</span>
          </div>
          <div className="topbar-divider" />
          <div className="topbar-course">
            <GraduationCap size={14} />
            <span>Asignatura: <strong>{nombreUnidad || 'Nueva Asignatura'}</strong></span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className="topbar-status-dot" />
            <span>Motor de IA listo</span>
          </div>
          <button className="btn-icon" onClick={resetAll} title="Reiniciar sesión">
            <RotateCcw size={16} />
            <span>Reiniciar</span>
          </button>
          <button className="btn-primary" onClick={saveProject} disabled={saving}>
            <Cloud size={14} />
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar Proyecto'}
          </button>
        </div>
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="app-layout">
        {/* LEFT PANEL */}
        <aside className="left-panel">
          {/* Stepper Header */}
          <div className="stepper-header">
            <div>
              <h2>Flujo Curricular en 5 Pasos</h2>
              <p>Completa o edita cada fase para estructurar tu asignatura</p>
            </div>
            <span className="step-counter-badge">Paso {step} de 5</span>
          </div>

          {/* Tab Bar */}
          <div className="tab-bar">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab-btn${step === t.key ? ' active' : ''}`}
                onClick={() => setStep(t.key)}
              >
                <span className="tab-number">{t.key}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Step Content */}
          <div className="step-content custom-scrollbar">
            {/* ===== PASO 1: DATOS BÁSICOS ===== */}
            <div className={`step-panel${step !== 1 ? ' hidden' : ''}`}>
              <div className="step-header">
                <div className="step-header-left">
                  <span className="step-header-number">1</span>
                  <div>
                    <h3>Paso 1. Datos Básicos</h3>
                    <p>Configura los parámetros iniciales de la materia</p>
                  </div>
                </div>
                <span className="step-tag neutral">Sin generación IA en este paso</span>
              </div>

              <div className="form-group">
                <label className="form-label">Modo de inicio</label>
                <div className="radio-group">
                  <label className="radio-option selected">
                    <input type="radio" name="mode" defaultChecked />
                    <span>Desde cero</span>
                  </label>
                  <label className="radio-option">
                    <input type="radio" name="mode" />
                    <span>Partir de programa existente</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre de la asignatura</label>
                <input
                  className="form-input"
                  placeholder="Ej. Inteligencia Artificial, Cálculo II…"
                  value={nombreUnidad}
                  onChange={e => setNombreUnidad(e.target.value)}
                />
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Semestre</label>
                  <select className="form-select" defaultValue={5}>
                    {SEMESTRES.map(s => <option key={s} value={s}>Semestre {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Carpeta (opcional)</label>
                  <input
                    className="form-input"
                    placeholder="Ej. ISW-501"
                    value={carpeta}
                    onChange={e => setCarpeta(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Competencias</label>
                  <input
                    className="form-input"
                    placeholder="Ej. Competencias clave"
                    value={competencias}
                    onChange={e => setCompetencias(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Archivos de referencia <span className="form-label-sub">(PDF, DOCX, imagen; máx. 4 MB c/u)</span>
                </label>
                <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={24} className="dropzone-icon" />
                  <p className="dropzone-title">Haz clic o arrastra un archivo aquí</p>
                  <p className="dropzone-subtitle">Syllabus previo, programa analítico o normativas</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                  style={{ display: 'none' }}
                  onChange={handleFiles}
                />
                {archivos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {archivos.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '4px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                        <span>{f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
                        <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 14 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="info-banner">
                <Info size={16} />
                <p><strong>Nota:</strong> En este paso no se genera contenido. Los datos ingresados servirán como base estructural para los siguientes pasos.</p>
              </div>

              <div className="step-nav">
                <div />
                <button className="btn-next" onClick={() => setStep(2)}>
                  Continuar a Paso 2 <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* ===== PASO 2: PROGRAMA Y MAPA ===== */}
            <div className={`step-panel${step !== 2 ? ' hidden' : ''}`}>
              <div className="step-header">
                <div className="step-header-left">
                  <span className="step-header-number">2</span>
                  <div>
                    <h3>Paso 2. Programa y Mapa</h3>
                    <p>Generación descriptiva y malla de competencias</p>
                  </div>
                </div>
                <span className="step-tag green">Núcleo Curricular</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  ¿Qué se requiere en este programa? <span className="form-label-sub">(Prompt del docente)</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe el enfoque general, competencias clave deseadas y requisitos institucionales…"
                  rows={3}
                />
              </div>

              <button className="btn-generate" onClick={() => handleGenerate('programa')} disabled={generating}>
                <Sparkles size={16} />
                {generating ? 'Generando…' : 'Generar Programa y Mapa con IA'}
              </button>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="form-label">Resultado editable (Programa + Mapa)</label>
                </div>
                <div className="editor-container">
                  <div className="editor-toolbar">
                    <button title="Negrita"><strong>B</strong></button>
                    <button title="Cursiva"><em>I</em></button>
                    <span className="divider" />
                    <button title="Lista"><List size={14} /></button>
                    <button title="Código"><Code size={14} /></button>
                    <button
                      className="send-btn"
                      title="Enviar al pizarrón"
                      onClick={() => showOnCanvas('programa', nombreUnidad, resultados.programa)}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <textarea
                    className="editor-textarea"
                    rows={7}
                    placeholder="El programa descriptivo generado aparecerá aquí…"
                    value={resultados.programa}
                    onChange={e => setResultados(prev => ({ ...prev, programa: e.target.value }))}
                  />
                </div>
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={() => setStep(1)}>
                  <ArrowLeft size={14} /> Anterior
                </button>
                <button className="btn-next" onClick={() => setStep(3)}>
                  Continuar a Paso 3 <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* ===== PASO 3: SECUENCIAS ===== */}
            <div className={`step-panel${step !== 3 ? ' hidden' : ''}`}>
              <div className="step-header">
                <div className="step-header-left">
                  <span className="step-header-number">3</span>
                  <div>
                    <h3>Paso 3. Secuencias Didácticas</h3>
                    <p>Diseño de secuencia de clases y actividades</p>
                  </div>
                </div>
                <span className="step-tag blue">Sesiones de Clase</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Descripción de la subcompetencia o tema específico
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Especifica el resultado de aprendizaje o subcompetencia de la unidad…"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Material de apoyo / bibliografía <span className="form-label-sub">(opcional)</span>
                </label>
                <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={20} className="dropzone-icon" />
                  <p className="dropzone-title">Adjuntar lecturas, diapositivas o guías</p>
                  <p className="dropzone-subtitle">PDF, DOCX o URLs de referencia</p>
                </div>
              </div>

              <button className="btn-generate" onClick={() => handleGenerate('secuencias')} disabled={generating}>
                <Route size={16} />
                {generating ? 'Generando…' : 'Generar Secuencia Didáctica con IA'}
              </button>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="form-label">Secuencia de clases resultante (Editable)</label>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#002cb6' }}
                    onClick={() => showOnCanvas('secuencias', nombreUnidad, resultados.secuencias)}
                  >
                    Enviar al pizarrón
                  </button>
                </div>
                <div className="editor-container">
                  <div className="editor-toolbar">
                    <button title="Negrita"><strong>B</strong></button>
                    <button title="Cursiva"><em>I</em></button>
                    <span className="divider" />
                    <button title="Lista"><List size={14} /></button>
                    <button title="Código"><Code size={14} /></button>
                    <button
                      className="send-btn"
                      title="Enviar al pizarrón"
                      onClick={() => showOnCanvas('secuencias', nombreUnidad, resultados.secuencias)}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <textarea
                    className="editor-textarea"
                    rows={6}
                    placeholder="La secuencia didáctica generada aparecerá aquí…"
                    value={resultados.secuencias}
                    onChange={e => setResultados(prev => ({ ...prev, secuencias: e.target.value }))}
                  />
                </div>
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={() => setStep(2)}>
                  <ArrowLeft size={14} /> Anterior
                </button>
                <button className="btn-next" onClick={() => setStep(4)}>
                  Continuar a Paso 4 <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* ===== PASO 4: INSTRUMENTOS ===== */}
            <div className={`step-panel${step !== 4 ? ' hidden' : ''}`}>
              <div className="step-header">
                <div className="step-header-left">
                  <span className="step-header-number">4</span>
                  <div>
                    <h3>Paso 4. Instrumentos de Evaluación</h3>
                    <p>Rúbricas, listas de cotejo y pruebas objetivas</p>
                  </div>
                </div>
                <span className="step-tag purple">Evaluación</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Resultados de aprendizaje, evidencias y ponderaciones (%)
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Pega aquí los RACs, evidencias requeridas y porcentajes de ponderación…"
                  rows={3}
                />
              </div>

              <div className="checkbox-group">
                <span style={{ color: '#757686', fontSize: 11 }}>Tipo de instrumento:</span>
                <label className="checkbox-option">
                  <input type="checkbox" defaultChecked /> <span>Rúbrica analítica</span>
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" defaultChecked /> <span>Lista de cotejo</span>
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" /> <span>Prueba</span>
                </label>
              </div>

              <button className="btn-generate" onClick={() => handleGenerate('instrumentos')} disabled={generating}>
                <ClipboardCheck size={16} />
                {generating ? 'Generando…' : 'Generar Instrumentos de Evaluación'}
              </button>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="form-label">Rúbrica / Instrumento editable</label>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#002cb6' }}
                    onClick={() => showOnCanvas('instrumentos', nombreUnidad, resultados.instrumentos)}
                  >
                    Enviar al pizarrón
                  </button>
                </div>
                <div className="editor-container">
                  <div className="editor-toolbar">
                    <button title="Negrita"><strong>B</strong></button>
                    <button title="Cursiva"><em>I</em></button>
                    <span className="divider" />
                    <button title="Lista"><List size={14} /></button>
                    <button title="Código"><Code size={14} /></button>
                    <button
                      className="send-btn"
                      title="Enviar al pizarrón"
                      onClick={() => showOnCanvas('instrumentos', nombreUnidad, resultados.instrumentos)}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <textarea
                    className="editor-textarea"
                    rows={6}
                    placeholder="Los instrumentos de evaluación generados aparecerán aquí…"
                    value={resultados.instrumentos}
                    onChange={e => setResultados(prev => ({ ...prev, instrumentos: e.target.value }))}
                  />
                </div>
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={() => setStep(3)}>
                  <ArrowLeft size={14} /> Anterior
                </button>
                <button className="btn-next" onClick={() => setStep(5)}>
                  Continuar a Paso 5 <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* ===== PASO 5: EXPORTAR ===== */}
            <div className={`step-panel${step !== 5 ? ' hidden' : ''}`}>
              <div className="step-header">
                <div className="step-header-left">
                  <span className="step-header-number">5</span>
                  <div>
                    <h3>Paso 5. Exportar y Finalizar</h3>
                    <p>Descarga, comparte o exporta tu diseño curricular</p>
                  </div>
                </div>
                <span className="step-tag amber">Listo</span>
              </div>

              <div className="export-summary">
                <div className="export-summary-row">
                  <span className="label">Asignatura generada:</span>
                  <strong className="value">{nombreUnidad || 'Sin nombre'}</strong>
                </div>
                <div className="export-summary-row">
                  <span className="label">Componentes procesados:</span>
                  <span className="value green">
                    {[resultados.programa && 'Programa', resultados.secuencias && 'Secuencias', resultados.instrumentos && 'Rúbricas'].filter(Boolean).join(' · ') || 'Ninguno aún'}
                  </span>
                </div>
                <div className="export-summary-row">
                  <span className="label">Alineación pedagógica:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#757686' }}>CBL + ABET SO-1 & SO-2</span>
                </div>
              </div>

              <div className="export-actions">
                <label className="form-label">Opciones de exportación rápida</label>
                <button className="export-btn" onClick={printContent}>
                  <div className="export-btn-left">
                    <FileText size={20} />
                    <div>
                      <div className="export-btn-title">Imprimir / Guardar en PDF</div>
                      <div className="export-btn-subtitle">Formato institucional con encabezados oficiales</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="arrow" />
                </button>
                <button className="export-btn" onClick={copyAll}>
                  <div className="export-btn-left">
                    <Copy size={20} />
                    <div>
                      <div className="export-btn-title">Copiar al portapapeles</div>
                      <div className="export-btn-subtitle">Texto formateado para pegar en Word, Docs o LMS</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="arrow" />
                </button>
                <button className="export-btn" onClick={downloadMarkdown}>
                  <div className="export-btn-left">
                    <Download size={20} />
                    <div>
                      <div className="export-btn-title">Descargar como .md (Markdown)</div>
                      <div className="export-btn-subtitle">Archivo portable estructurado con todo el contenido</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="arrow" />
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 16 }}>
                <button className="btn-danger-outline" onClick={resetAll}>
                  <RotateCcw size={16} />
                  Empezar de nuevo
                </button>
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={() => setStep(4)}>
                  <ArrowLeft size={14} /> Volver a Instrumentos
                </button>
              </div>
            </div>
          </div>

          {/* Left Panel Footer */}
          <div className="left-panel-footer">
            <span>Curricular AI Core · v3.0</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--on-surface-variant)', fontWeight: 500 }}>
              <span className="status-dot" />
              Modo Modular
            </span>
          </div>
        </aside>

        {/* ===== RIGHT CANVAS ===== */}
        <main className="canvas-area">
          {/* Canvas Controls */}
          <div className="canvas-controls">
            <div className="canvas-controls-label">
              <Pen size={16} />
              <span>Pizarrón de Trabajo</span>
            </div>
            <div className="canvas-controls-divider" />
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => setCanvasZoom(z => Math.max(50, z - 10))}>-</button>
              <span className="zoom-value">{canvasZoom}%</span>
              <button className="zoom-btn" onClick={() => setCanvasZoom(z => Math.min(150, z + 10))}>+</button>
            </div>
            <div className="canvas-controls-divider" />
            <button className="canvas-action-btn" onClick={() => setCanvasZoom(100)} title="Centrar pizarra">
              <Maximize2 size={14} />
            </button>
            <button className="canvas-action-btn danger" onClick={() => setCanvasContent(null)} title="Limpiar pizarrón">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Empty State */}
          {!canvasContent && (
            <div className="canvas-empty">
              <div className="canvas-empty-icon">
                <LayoutDashboard size={32} />
              </div>
              <h3>Pizarrón listo para generar</h3>
              <p>
                El diseño curricular, el mapa descriptivo y las secuencias aparecerán aquí conforme utilices el panel de 5 pasos a la izquierda.
              </p>
              <div className="canvas-empty-badge">
                <span className="dot" />
                <span>Selecciona un paso del panel para comenzar</span>
              </div>
            </div>
          )}

          {/* Dynamic Canvas Content */}
          {canvasContent && (
            <div className="canvas-dynamic custom-scrollbar">
              <div
                className="canvas-card"
                style={{
                  transform: `scale(${canvasZoom / 100})`,
                  transformOrigin: 'center top'
                }}
              >
                <div className="canvas-card-header">
                  <div>
                    <div className="canvas-card-type">{canvasContent.type}</div>
                    <h2 className="canvas-card-title">{canvasContent.title}</h2>
                    <p className="canvas-card-subtitle">Generado y sincronizado desde {APP_NAME}</p>
                  </div>
                  <button
                    className="btn-back"
                    onClick={() => setCanvasContent(null)}
                    style={{ flexShrink: 0 }}
                  >
                    Limpiar lienzo
                  </button>
                </div>
                <div className="canvas-card-body">
                  {canvasContent.body ? (
                    <Markdown>{canvasContent.body}</Markdown>
                  ) : (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>Sin contenido generado aún</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: '#dc2626',
          color: 'white',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 13,
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 420
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default App
