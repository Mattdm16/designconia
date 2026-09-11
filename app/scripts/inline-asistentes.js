// Incrusta asistentes/*.md (fuente versionada en git) en el bundle de la
// Netlify Function. Se ejecuta como parte de `npm run build`, antes de vite.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (n) => readFileSync(join(repoRoot, "asistentes", `${n}.md`), "utf8");

const bundle = `// Generado por scripts/inline-asistentes.js — NO EDITAR A MANO.
// Fuente de verdad: asistentes/*.md en la raíz del repo.
export const BASE_COMUN = ${JSON.stringify(read("base-comun"))};
export const ASISTENTES = {
  "planeador-unidad": ${JSON.stringify(read("planeador-unidad"))},
  "secuencias-subcompetencia": ${JSON.stringify(read("secuencias-subcompetencia"))},
  "instrumentos-evaluacion": ${JSON.stringify(read("instrumentos-evaluacion"))}
};
`;

const outDir = join(repoRoot, "app", "netlify", "functions");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "asistentes.bundle.js"), bundle);
console.log("asistentes.bundle.js generado");
