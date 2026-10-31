import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        seedling: "#FAF5E9",
        sow: "#392525",
        redwood: "#6B3226",
        rainfall: "#728B83",
        sprout: "#E3EB90",
        mist: "#B6B7A5",
        foliage: "#3E4734",
        terracotta: "#B25D3E",
        pebble: "#7E7B62",
        crema: "#FFFDF8",
        tinta: "#211D19",
        /** Fondo de cabeceras de fase: separa Inicio / Desarrollo / Cierre sin competir con Terracotta. */
        arena: "#EFE7D6",
        /** Identifica el agente de evaluación activo. Nunca actúa. */
        mora: "#6B4A6E"
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        /** Voz de display: Palatino Linotype es un serif caligráfico instalado de serie en Windows y macOS. */
        display: ['"Palatino Linotype"', '"Book Antiqua"', "Cambria", "Georgia", "serif"],
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
