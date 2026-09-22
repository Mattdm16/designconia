"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "vacio" | "generando" | "editando";
type Msg = { role: "user" | "ai"; text: string };

const OAS = [
  { codigo: "OA-07", corto: "Fracciones en contexto", eje: "Números" },
  { codigo: "OA-11", corto: "Clasificar triángulos", eje: "Geometría" },
  { codigo: "OA-14", corto: "Gráficos de barras", eje: "Datos" }
];

function Icono({ d, cls }: { d: string; cls?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cls ?? "h-4 w-4"}><path d={d} /></svg>;
}
const P = {
  plus: "M12 5v14 M5 12h14",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M21 21l-4.3-4.3",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  wrench: "M14.5 6.5a4 4 0 0 0-5.6 5L4 16.4V20h3.6l4.9-4.9a4 4 0 0 0 5-5.6l-2.8 2.8-2.4-2.4 2.2-3.4z",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21a8 8 0 0 1 16 0",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  share: "M12 3v12 M8 7l4-4 4 4 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7",
  dots: "M12 5.5h.01 M12 12h.01 M12 18.5h.01",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  send: "M5 12l14-6-4 14-3.5-5.5L5 12z M11.5 14.5L20 6",
  attach: "M21 11.5a5 5 0 0 1-5 5H8a3 3 0 0 1 0-6h10",
  check: "M4 12.5l5 5L20 6.5",
  copy: "M9 9h11v11H9z M5 15V4h11",
  down: "M12 4v11 M7 11l5 5 5-5 M4 20h16",
  spark: "M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z"
};

export default function Page() {
  const [phase, setPhase] = useState<Phase>("vacio");
  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [nav, setNav] = useState("Nuevo chat");
  const [activeOA, setActiveOA] = useState<string | null>(null);
  const [lista, setLista] = useState(false);
  const [tema, setTema] = useState("Fracciones 5° básico");
  const folio = useRef(`DCN-2026-${String(Math.floor(1000 + Math.random() * 9000))}`);
  const [desglose, setDesglose] = useState(OAS.map((o) => ({ ...o, hecho: false })));
  const [acts, setActs] = useState([
    { oa: "OA-07", texto: "Mercado de fracciones con recta numérica", tiempo: "90'" },
    { oa: "OA-11", texto: "Detectives de triángulos en plenaria", tiempo: "90'" },
    { oa: "OA-14", texto: "Encuesta del curso y gráfico de barras", tiempo: "45'" }
  ]);
  const [rubrica, setRubrica] = useState([
    { criterio: "Estrategia", nivel: "La explica con vocabulario del OA" },
    { criterio: "Precisión", nivel: "3 de 4 correctas" },
    { criterio: "Cierre", nivel: "Ticket de salida completo" }
  ]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, phase]);

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || phase === "generando") return;
    setPrompt("");
    setMsgs((m) => [...m, { role: "user", text: t }]);
    if (phase === "vacio") {
      setTema(t.slice(0, 42));
      setPhase("generando");
      timer.current = setTimeout(() => {
        setPhase("editando");
        setMsgs((m) => [...m, { role: "ai", text: "Listo — ficha generada y editable abajo. Toca un OA del panel para ver su trazo." }]);
      }, 1300);
    } else {
      timer.current = setTimeout(() => {
        setMsgs((m) => [...m, { role: "ai", text: "Aplicado a la ficha. Todo sigue ligado a su OA." }]);
      }, 700);
    }
  }

  function markdown(): string {
    return `# ${tema}\n${folio.current} · ${lista ? "LISTA AULA" : "BORRADOR"}\n\n## Desglose\n${desglose.map((d) => `- [${d.hecho ? "x" : " "}] ${d.codigo} — ${d.corto}`).join("\n")}\n\n## Actividades\n${acts.map((a, i) => `${i + 1}. [${a.oa}] ${a.texto} (${a.tiempo})`).join("\n")}\n\n## Rúbrica\n${rubrica.map((r) => `- ${r.criterio}: ${r.nivel}`).join("\n")}`;
  }
  async function copiar() { try { await navigator.clipboard.writeText(markdown()); } catch { /* portapapeles no disponible */ } }
  function descargar() { const b = new Blob([markdown()], { type: "text/markdown;charset=utf-8" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${folio.current}.md`; a.click(); URL.revokeObjectURL(u); }
  function trazo(c: string) { return activeOA === c ? "bg-[#E3EB90]/60 ring-1 ring-[#7E7B62]/60" : ""; }

  const NAV = [
    { n: "Descubrir", icon: P.search }, { n: "Mis fichas", icon: P.grid }, { n: "Biblioteca OA", icon: P.wrench },
    { n: "Sistema", icon: P.gear }, { n: "Perfil", icon: P.user }
  ];

  return (
    <div className="relative flex h-screen flex-col gap-3 overflow-hidden bg-[#FAF5E9] p-3 sm:p-4 lg:flex-row">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <path d="M-40 620 C 240 540, 420 700, 720 640 S 1180 560, 1500 640 L1500 940 L-40 940 Z" fill="#B6B7A5" opacity="0.55" />
        <path d="M-40 700 C 260 630, 480 770, 780 710 S 1200 650, 1500 720 L1500 940 L-40 940 Z" fill="#7E7B62" opacity="0.45" />
      </svg>

      {/* rail izquierda */}
      <aside className="relative z-10 hidden w-[228px] shrink-0 flex-col gap-3 lg:flex">
        <div className="rounded-[18px] border border-white/60 bg-[#FFFDF8]/95 p-3 shadow-[0_18px_45px_-22px_rgba(107,50,38,0.45)]">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white"><Icono d={P.spark} cls="h-3.5 w-3.5" /></span>
            <span className="text-sm font-semibold tracking-tight">DesignConia</span>
          </div>
          <button onClick={() => { setNav("Nuevo chat"); setPhase("vacio"); setMsgs([]); setLista(false); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#B25D3E] px-3 py-2 text-sm font-medium text-white hover:bg-[#6B3226]">
            <Icono d={P.plus} /> New chat
          </button>
        </div>
        <nav aria-label="Principal" className="rounded-[18px] border border-white/60 bg-[#FFFDF8]/95 p-2 shadow-[0_18px_45px_-22px_rgba(107,50,38,0.45)]">
          {NAV.map((x) => (
            <button key={x.n} onClick={() => setNav(x.n)} aria-pressed={nav === x.n} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${nav === x.n ? "bg-black/[0.05] font-medium" : "text-black/70 hover:bg-black/[0.04]"}`}>
              <Icono d={x.icon} /> {x.n}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <div className="rounded-[18px] bg-[#B25D3E] p-4 text-white shadow-[0_18px_45px_-22px_rgba(160,100,40,0.7)]">
            <p className="text-sm font-semibold">OA oficiales</p>
            <p className="mt-1 text-xs leading-relaxed text-white/85">Usas datos sintéticos. Conecta el currículum oficial y sal del modo demo.</p>
            <button onClick={() => setMsgs((m) => [...m, { role: "ai", text: "Para salir del modo demo necesito tu fuente OA: un JSON o CSV con código, nivel, asignatura y descripción. Pégalo aquí o dime dónde vive y lo integro." }])} className="mt-3 w-full rounded-lg bg-black/85 px-3 py-2 text-xs font-medium hover:bg-black">
              Ver cómo ↑
            </button>
          </div>
          <button onClick={() => setNav("Salir")} className="flex items-center gap-3 rounded-[18px] border border-white/60 bg-[#FFFDF8]/95 px-5 py-3 text-sm text-black/70 shadow-[0_18px_45px_-22px_rgba(107,50,38,0.45)] hover:bg-white">
            <Icono d={P.logout} /> Log out
          </button>
        </div>
      </aside>

      {/* columna central */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-center gap-2 rounded-[18px] border border-white/60 bg-[#FFFDF8]/95 px-4 py-2.5 shadow-[0_18px_45px_-22px_rgba(107,50,38,0.45)]">
          <button onClick={() => { setPhase("vacio"); setMsgs([]); }} className="rounded-full bg-[#B25D3E] px-3 py-1.5 text-xs font-medium text-white lg:hidden">Nuevo</button>
          <input value={tema} onChange={(e) => setTema(e.target.value)} aria-label="Título de la ficha" className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold tracking-tight hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none" />
          <span className={`hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline ${lista ? "border-red-200 bg-red-50 text-red-600" : "border-black/10 text-black/50"}`}>{lista ? "Lista aula" : "Borrador"}</span>
          <button onClick={descargar} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/25"><Icono d={P.down} cls="h-3.5 w-3.5" /> Exportar</button>
          <button onClick={copiar} aria-label="Copiar" className="rounded-full border border-black/10 bg-white p-1.5 hover:border-black/25"><Icono d={P.copy} /></button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5" aria-live="polite">
          {phase === "vacio" && (
            <div className="flex flex-col items-center px-2 pt-8 sm:pt-14">
              <div className="flex items-start gap-2 self-end rounded-2xl rounded-br-sm border border-white/60 bg-[#FFFDF8]/95 px-4 py-2.5 text-sm shadow-[0_14px_35px_-20px_rgba(107,50,38,0.5)]">
                ¿Me ayudas a planificar mi clase de mañana?
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6B3226] text-[11px] font-semibold text-white">D</span>
              </div>
              <div className="mt-3 w-full max-w-[640px] rounded-2xl bg-[#392525] px-5 py-4 text-[13.5px] leading-relaxed text-[#FAF5E9] shadow-[0_24px_55px_-24px_rgba(57,37,37,0.65)]">
                Claro — dime nivel, asignatura y OA y te armo la ficha editable aquí mismo, con actividades trazables. Prueba con un ejemplo de abajo.
              </div>
              <div className="mt-3 flex w-full max-w-[640px] flex-wrap gap-1.5">
                {["Clase de fracciones 5° básico", "Unidad de triángulos, 3 sesiones", "Rúbrica de gráficos de barras"].map((ej) => (
                  <button key={ej} onClick={() => enviar(ej)} className="rounded-full border border-black/10 bg-[#FFFDF8]/95 px-3 py-1.5 text-xs hover:border-black/25">{ej} ›</button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            m.role === "user" ? (
              <div key={i} className="flex items-start justify-end gap-2">
                <div className="max-w-[75%] rounded-2xl rounded-br-sm border border-white/60 bg-[#FFFDF8]/95 px-4 py-2.5 text-sm shadow-[0_14px_35px_-20px_rgba(107,50,38,0.5)]">{m.text}</div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6B3226] text-[11px] font-semibold text-white">D</span>
              </div>
            ) : (
              <div key={i} className="max-w-[85%] rounded-2xl bg-[#392525] px-5 py-3.5 text-[13.5px] leading-relaxed text-[#FAF5E9] shadow-[0_24px_55px_-24px_rgba(57,37,37,0.65)]">{m.text}</div>
            )
          ))}
          {phase === "generando" && <div className="max-w-[60%] rounded-2xl bg-[#392525] px-5 py-3.5 text-sm text-[#FAF5E9]/70">Armando tu ficha…</div>}

          {phase === "editando" && (
            <div className="anim-canvas overflow-hidden rounded-[18px] border border-white/60 bg-[#FFFDF8] shadow-[0_24px_55px_-26px_rgba(107,50,38,0.5)]">
              <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.07] px-4 py-2.5">
                <span className="font-mono text-xs text-black/40">{folio.current}</span>
                <div className="ml-auto flex gap-1.5">
                  {OAS.map((o) => (
                    <button key={o.codigo} onClick={() => setActiveOA(activeOA === o.codigo ? null : o.codigo)} aria-pressed={activeOA === o.codigo} className={`rounded-full px-2.5 py-1 font-mono text-xs ${activeOA === o.codigo ? "bg-black text-white" : "bg-black/[0.05] text-black/70 hover:bg-black/[0.09]"}`}>{o.codigo}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <section aria-label="Desglose">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-black/45">Desglose</h2>
                  <ul className="mt-2 space-y-1.5">
                    {desglose.map((d, k) => (
                      <li key={d.codigo} className={`flex items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-3 py-2 ${trazo(d.codigo)}`}>
                        <button onClick={() => setDesglose((p) => p.map((x, j) => (j === k ? { ...x, hecho: !x.hecho } : x)))} aria-label={`${d.codigo} listo`} className={`flex h-4 w-4 items-center justify-center rounded-full border ${d.hecho ? "border-black bg-black text-white" : "border-black/25 text-transparent"}`}><Icono d={P.check} cls="h-2.5 w-2.5" /></button>
                        <span className="font-mono text-xs text-black/50">{d.codigo}</span>
                        <input value={d.corto} onChange={(e) => setDesglose((p) => p.map((x, j) => (j === k ? { ...x, corto: e.target.value } : x)))} aria-label={`OA ${d.codigo}`} className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-label="Actividades">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-black/45">Actividades</h2>
                  <ul className="mt-2 space-y-1.5">
                    {acts.map((a, k) => (
                      <li key={k} className={`flex items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-3 py-2 ${trazo(a.oa)}`}>
                        <span className="rounded-full bg-black/[0.06] px-2 py-0.5 font-mono text-[11px]">{a.oa}</span>
                        <input value={a.texto} onChange={(e) => setActs((p) => p.map((x, j) => (j === k ? { ...x, texto: e.target.value } : x)))} aria-label={`Actividad ${k + 1}`} className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
                        <input value={a.tiempo} onChange={(e) => setActs((p) => p.map((x, j) => (j === k ? { ...x, tiempo: e.target.value } : x)))} aria-label="Tiempo" className="w-10 rounded bg-black/[0.05] px-1 py-0.5 text-center text-xs" />
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <div className="border-t border-black/[0.07] p-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-black/45">Rúbrica</h2>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  {rubrica.map((r, k) => (
                    <li key={k} className="rounded-xl border border-black/[0.07] bg-white px-3 py-2">
                      <input value={r.criterio} onChange={(e) => setRubrica((p) => p.map((x, j) => (j === k ? { ...x, criterio: e.target.value } : x)))} aria-label="Criterio" className="w-full bg-transparent text-xs font-semibold uppercase tracking-wide focus:outline-none" />
                      <input value={r.nivel} onChange={(e) => setRubrica((p) => p.map((x, j) => (j === k ? { ...x, nivel: e.target.value } : x)))} aria-label="Nivel logrado" className="mt-0.5 w-full bg-transparent text-sm focus:outline-none" />
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-black/45">Datos sintéticos</span>
                  <button onClick={() => setLista(!lista)} className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${lista ? "bg-black text-white" : "bg-[#B25D3E] text-white hover:bg-[#6B3226]"}`}>
                    <Icono d={P.check} cls="h-3 w-3" /> {lista ? "Lista aula ✓" : "Marcar lista aula"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); enviar(prompt); }} className="rounded-[18px] border border-white/60 bg-[#FFFDF8]/95 p-2.5 shadow-[0_18px_45px_-22px_rgba(107,50,38,0.45)]">
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-xs"><Icono d={P.spark} cls="h-3 w-3 text-[#6B3226]" /> DesignConia AI</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="chat" className="sr-only">Pide o ajusta tu planificación</label>
            <input id="chat" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Pide tu planificación…" disabled={phase === "generando"} className="min-w-0 flex-1 rounded-full bg-transparent px-3 py-2 text-sm placeholder:text-black/35 focus:outline-none disabled:opacity-50" />
            <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-black/[0.05] text-black/50 sm:inline-flex"><Icono d={P.attach} /></span>
            <button type="submit" aria-label="Enviar" disabled={phase === "generando"} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B25D3E] text-white hover:bg-[#6B3226] disabled:opacity-50"><Icono d={P.send} cls="h-4 w-4" /></button>
          </div>
        </form>
      </div>

      {/* panel derecho */}
      <aside className="relative z-10 hidden w-[232px] shrink-0 xl:block" aria-label="Biblioteca OA">
        <div className="flex h-full flex-col rounded-[18px] border border-white/60 bg-[#FFFDF8]/95 p-3 shadow-[0_18px_45px_-22px_rgba(107,50,38,0.45)]">
          <p className="px-2 text-xs font-semibold uppercase tracking-widest text-black/45">Biblioteca OA</p>
          <div className="mt-2 space-y-3 overflow-y-auto">
            {["Números", "Geometría", "Datos"].map((eje) => (
              <div key={eje}>
                <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-black/60"><Icono d={P.folder} cls="h-3.5 w-3.5 text-[#6B3226]" /> {eje.toLowerCase()}</p>
                {OAS.filter((o) => o.eje === eje).map((o) => (
                  <button key={o.codigo} onClick={() => setActiveOA(activeOA === o.codigo ? null : o.codigo)} aria-pressed={activeOA === o.codigo} className={`ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${activeOA === o.codigo ? "bg-black text-white" : "hover:bg-black/[0.05]"}`}>
                    <span className="font-mono">{o.codigo}</span>
                    <span className={activeOA === o.codigo ? "text-white/80" : "text-black/55"}>{o.corto}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-auto px-2 pt-3 text-[11px] leading-relaxed text-black/40">Toca un OA para ver su trazo en la ficha.</p>
        </div>
      </aside>
    </div>
  );
}
