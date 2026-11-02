import type { Config } from "tailwindcss";

/**
 * Los cuatro tokens estructurales (seedling, crema, white, black) no llevan
 * un valor fijo: apuntan a variables CSS que cambian con el tema. Así el
 * modo oscuro no exige variantes `dark:` en cada componente: la misma clase
 * `bg-crema` o `text-black/70` se resuelve al valor claro u oscuro.
 * Los acentos (terracotta, sow, mora…) quedan fijos en ambos temas.
 */
function conAlfa(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Fondo de la sala. Claro: duna cálida; oscuro: café casi negro. */
        seedling: conAlfa("--fondo"),
        sow: "#392525",
        redwood: "#6B3226",
        rainfall: "#728B83",
        sprout: "#E3EB90",
        mist: "#B6B7A5",
        foliage: "#3E4734",
        terracotta: "#B25D3E",
        pebble: "#7E7B62",
        /** Tarjetas flotantes. Claro: crema; oscuro: café panel. */
        crema: conAlfa("--superficie"),
        /** Tinta principal. Claro: casi negro cálido; oscuro: papel. */
        black: conAlfa("--tinta"),
        /** Superficies internas (inputs, botones fantasma). */
        white: conAlfa("--superficie-2"),
        tinta: "#211D19",
        /** Texto claro sobre Sow/Terracotta/Mora: fijo en ambos temas. */
        papel: "#F6F1E5",
        /** Fondo de cabeceras de fase: separa Inicio / Desarrollo / Cierre sin competir con Terracotta. */
        arena: "#EFE7D6",
        /** Identifica el agente de evaluación activo. Nunca actúa. */
        mora: "#6B4A6E"
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
        /** Voz de display: Georgia es el serif formal de serie (Windows/macOS): sobrio y académico, sin el trazo caligráfico de Palatino. */
        display: ["Georgia", '"Times New Roman"', "Times", "serif"],
        mono: ['ui-monospace', '"SF Mono"', "Menlo", "Consolas", "monospace"]
      },
      boxShadow: {
        tarjeta: "0 18px 45px -22px rgba(107,50,38,0.45)",
        burbuja: "0 24px 55px -24px rgba(57,37,37,0.55)",
        lienzo: "0 24px 55px -26px rgba(107,50,38,0.5)"
      }
    }
  },
  plugins: []
};

export default config;
