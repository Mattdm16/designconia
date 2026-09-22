"use client";

import Link from "next/link";
import { useState } from "react";

type Comp = {
  id: string;
  kicker: string;
  titulo: string;
  compo: string;
  tags: string[];
  risk: string;
};

const COMPS: Comp[] = [
  {
    id: "A",
    kicker: "COMP A",
    titulo: "Espejo de la referencia",
    compo: "Composición fiel a CodeEase: tres rieles flotantes sobre duna a pantalla completa — nav izquierda, chat centro con burbujas oscuras IA, biblioteca OA derecha. La ficha editable vive como tarjeta clara dentro del flujo del chat.",
    tags: ["3 RIELES", "BURBUJA OSCURA", "BIBLIOTECA LATERAL", "NARANJA ACCIÓN"],
    risk: "RISK: dos rieles laterales angostan el centro en pantallas medianas; exige colapso cuidadoso bajo 1280px."
  },
  {
    id: "B",
    kicker: "COMP B",
    titulo: "Columna centrada + ficha documento",
    compo: "Todo centrado en una columna (máx. 3xl): saludo, stream de chat y la ficha como documento ancho abajo del input. La biblioteca OA es una tira horizontal de chips. Sin rieles: calma total, foco en leer y editar.",
    tags: ["1 COLUMNA", "FICHA DOCUMENTO", "CHIPS OA", "FOCO LECTURA"],
    risk: "RISK: sin rieles se pierde el contexto persistente (nav + biblioteca); el trazo OA depende solo de los chips."
  },
  {
    id: "C",
    kicker: "COMP C",
    titulo: "Split técnico: chat → ficha",
    compo: "Dos paneles fijos: chat angosto a la izquierda (420px, fondo crema) y lienzo de ficha a la derecha ocupando el resto, con Desglose/Actividades/Rúbrica como tarjetas flotantes. Biblioteca OA como pestaña del lienzo. Dramatiza el mecanismo pedir → ver.",
    tags: ["SPLIT 420px", "LIENZO FICHA", "TARJETAS SECCIÓN", "MECANISMO VISIBLE"],
    risk: "RISK: el split fijo castiga pantallas angostas; bajo 1024px debe apilarse y el mecanismo pierde fuerza."
  }
];

function Schema({ id }: { id: string }) {
  const box = "rounded border border-black/15 bg-white/80";
  const dark = "rounded bg-[#211D19]";
  const acc = "rounded-full bg-[#E8A25C]";
  const line = "h-1.5 rounded-full bg-black/10";
  if (id === "A")
    return (
      <div className="flex h-44 gap-1.5 rounded-xl bg-[#E7E0D3] p-2" aria-hidden="true">
        <div className={`${box} w-[22%] p-1.5`}><div className={`${acc} h-4 w-full`} /><div className={`${line} mt-2 w-full`} /><div className={`${line} mt-1 w-4/5`} /><div className={`${line} mt-1 w-full`} /><div className={`${line} mt-1 w-3/5`} /></div>
        <div className="flex w-[56%] flex-col gap-1.5">
          <div className={`${box} h-5 w-full`} />
          <div className={`${box} ml-auto h-5 w-2/3`} />
          <div className={`${dark} h-10 w-5/6`} />
          <div className={`${box} h-12 w-full`} />
          <div className={`${box} mt-auto h-7 w-full`} />
        </div>
        <div className={`${box} w-[22%] p-1.5`}><div className={`${line} w-3/4`} /><div className="mt-2 space-y-1"><div className={`${acc} h-3 w-full opacity-60`} /><div className={`${line} w-full`} /><div className={`${line} w-5/6`} /></div></div>
      </div>
    );
  if (id === "B")
    return (
      <div className="flex h-44 flex-col items-center gap-1.5 rounded-xl bg-[#E7E0D3] p-2" aria-hidden="true">
        <div className={`${line} mt-1 w-1/3`} style={{ height: 10 }} />
        <div className={`${box} ml-auto mr-8 h-5 w-1/2`} />
        <div className={`${dark} mr-auto ml-8 h-8 w-2/3`} />
        <div className="w-4/5 rounded-xl border-2 border-[#E8A25C] bg-white p-1.5"><div className={`${line} w-2/5`} /><div className={`${line} mt-1 w-full`} /><div className={`${line} mt-1 w-5/6`} /></div>
        <div className={`${box} mt-auto h-7 w-4/5`} />
      </div>
    );
  return (
    <div className="flex h-44 gap-1.5 rounded-xl bg-[#E7E0D3] p-2" aria-hidden="true">
      <div className={`${box} flex w-[38%] flex-col gap-1.5 p-1.5`}>
        <div className={`${box} ml-auto h-4 w-3/4`} />
        <div className={`${dark} h-8 w-full`} />
        <div className={`${box} mt-auto h-6 w-full`} />
      </div>
      <div className="grid w-[62%] grid-cols-2 gap-1.5">
        <div className={`${box} p-1.5`}><div className={`${acc} h-2.5 w-2/5 opacity-70`} /><div className={`${line} mt-1 w-full`} /><div className={`${line} mt-1 w-4/5`} /></div>
        <div className={`${box} p-1.5`}><div className={`${acc} h-2.5 w-2/5 opacity-70`} /><div className={`${line} mt-1 w-full`} /><div className={`${line} mt-1 w-3/5`} /></div>
        <div className={`${box} col-span-2 p-1.5`}><div className={`${acc} h-2.5 w-1/5 opacity-70`} /><div className={`${line} mt-1 w-full`} /><div className={`${line} mt-1 w-5/6`} /></div>
      </div>
    </div>
  );
}

export default function Opciones() {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-[#141210] p-4 text-[#F3EEE3] sm:p-8">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8A25C]">Impeccable · Ronda de decisión</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Elige la composición de DesignConia</h1>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-white/60">
          Los tres comps comparten el mismo mundo visual (duna + crema + burbuja oscura + naranja, OA en corto, sin Macro/Meso/Micro).
          Varían solo la composición. ¿Cuál construyo? Puedes combinar o pedir revisión con una nota.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {COMPS.map((c) => (
            <article key={c.id} className={`flex flex-col overflow-hidden rounded-2xl border bg-[#211D19] transition-colors ${sel === c.id ? "border-[#E8A25C]" : "border-white/10"}`}>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="rounded bg-[#E8A25C] px-2 py-0.5 text-[11px] font-bold tracking-widest text-black">{c.kicker}</span>
                <Link href="/" className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 hover:text-white">Ver actual</Link>
              </div>
              <div className="px-4 pt-3"><Schema id={c.id} /></div>
              <h2 className="px-4 pt-3 text-base font-semibold">{c.titulo}</h2>
              <p className="px-4 pt-1.5 text-[13px] leading-relaxed text-white/60">{c.compo}</p>
              <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                {c.tags.map((t) => <span key={t} className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/55">{t}</span>)}
              </div>
              <p className="px-4 pt-3 text-xs leading-relaxed text-[#E8A25C]/90">{c.risk}</p>
              <div className="mt-auto p-4">
                <button onClick={() => setSel(c.id)} className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${sel === c.id ? "bg-[#E8A25C] text-black" : "bg-white/10 text-white hover:bg-white/15"}`}>
                  {sel === c.id ? "Elegido ✓" : "Build this"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#211D19] p-4 text-sm">
          {sel ? (
            <p>Elegiste <strong>COMP {sel}</strong> — escríbeme en el chat <strong>"construye {sel}"</strong> y lo implemento en la app. O dime cómo combinarlo ("A con el input de B").</p>
          ) : (
            <p className="text-white/60">Toca <em>Build this</em> en una opción, o pídeme re-roll ("otras 3, más sobrias / más audaces") con una nota de qué faltó.</p>
          )}
          <Link href="/" className="mt-2 inline-block text-[#E8A25C] underline">← Volver a la app</Link>
        </div>
      </div>
    </div>
  );
}
