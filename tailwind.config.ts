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
        pebble: "#7E7B62"
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ['ui-monospace', '"SF Mono"', "Menlo", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
