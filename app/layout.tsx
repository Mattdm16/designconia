import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignConia — Generador curricular",
  description:
    "De OA oficial a secuencia didáctica editable y trazable en minutos."
};

/**
 * Aplica el tema guardado (claro/oscuro) antes del primer pintado para que
 * la página no parpadee. Si no hay preferencia guardada, se respeta la del
 * sistema operativo.
 */
const SCRIPT_TEMA = `(function(){try{var g=localStorage.getItem("designconia.tema");var o=g==="oscuro"||(!g&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(o)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        {children}
      </body>
    </html>
  );
}
