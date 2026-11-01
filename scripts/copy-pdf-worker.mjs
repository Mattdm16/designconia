// Copia el worker de pdfjs-dist a public/ para la extracción local en el navegador.
// Se ejecuta con `npm run postinstall` y no requiere red.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destinoDir = join(raiz, "public");
const destino = join(destinoDir, "pdf.worker.min.mjs");

if (!existsSync(origen)) {
  console.error(`[postinstall] No se encontró el worker en ${origen}`);
  process.exit(1);
}
mkdirSync(destinoDir, { recursive: true });
copyFileSync(origen, destino);
console.log(`[postinstall] Worker PDF copiado a public/pdf.worker.min.mjs`);
