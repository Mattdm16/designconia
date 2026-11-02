import type { SVGProps } from "react";

/**
 * Sistema de iconos: SVG dibujado a mano, un solo trazo de 1.7 y remates
 * redondeados, como el resto del mundo visual. Nada de emoji ni de glifos
 * de fuente haciéndose pasar por iconos.
 */

const RUTAS = {
  mas: "M12 5v14 M5 12h14",
  buscar: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M21 21l-4.3-4.3",
  enviar: "M5 12l14-6-4 14-3.5-5.5L5 12z M11.5 14.5L20 6",
  detener: "M8 8h8v8H8z",
  check: "M4 12.5l5 5L20 6.5",
  copiar: "M9 9h11v11H9z M5 15V4h11",
  descargar: "M12 4v11 M7 11l5 5 5-5 M4 20h16",
  papelera: "M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6",
  chispa: "M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z",
  alerta: "M12 8v5 M12 16.5h.01 M10.3 3.9L2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  reloj: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  carpeta: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  documento: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6",
  libro: "M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2z M17 3h1v18 M8 8h6 M8 12h6",
  monitor: "M4 5h16v10H4z M9 19h6 M12 15v4",
  matraz: "M9 3h6 M10 3v5L5.5 17a2.5 2.5 0 0 0 2.2 3.5h8.6A2.5 2.5 0 0 0 18.5 17L14 8V3 M7 14h10",
  usuarios: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M2 20a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M18 13.5a6 6 0 0 1 4 6.5",
  agenda: "M5 5h14v15H5z M5 9h14 M9 3v4 M15 3v4 M9 14h2 M13 14h2",
  ajustar: "M4 7h10 M18 7h2 M4 17h4 M12 17h8 M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
  chevron: "M9 6l6 6-6 6",
  flecha: "M5 12h14 M13 6l6 6-6 6",
  panel: "M4 5h16v14H4z M11 5v14",
  deshacer: "M4 9h11a5 5 0 0 1 0 10H8 M4 9l4-4 M4 9l4 4",
  sol: "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M19.1 4.9l-1.4 1.4 M6.3 17.7l-1.4 1.4",
  luna: "M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z"
} as const;

export type NombreIcono = keyof typeof RUTAS;

type Props = SVGProps<SVGSVGElement> & {
  nombre: NombreIcono;
  /** Clases de tamaño; por defecto 16px. */
  className?: string;
};

export function Icono({ nombre, className = "h-4 w-4", ...resto }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...resto}
    >
      <path d={RUTAS[nombre]} />
    </svg>
  );
}
