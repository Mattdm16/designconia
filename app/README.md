# App — Diseño curricular con IA

React + Vite (SPA) + Netlify Function `generar` (proxy a Gemini).

## Desarrollo local

```bash
npm install
npm run dev          # frontend solo (el proxy no corre aquí)
```

Para probar el flujo completo local, usa Netlify Dev:

```bash
npm install -g netlify-cli
netlify dev          # sirve frontend + functions con las env de Netlify
```

## Despliegue en Netlify

1. Conecta el repo; Netlify usa el `netlify.toml` de la raíz
   (base `app`, publish `dist`, functions `netlify/functions`).
2. En **Site settings → Environment variables** define:
   - `GEMINI_API_KEY` (obligatoria; de Google AI Studio)
   - `GEMINI_MODEL` (opcional; por defecto `gemini-3.6-flash`)
3. Deploy. La app llama a `/.netlify/functions/generar`.

## Notas

- Las instrucciones de los asistentes viven en `asistentes/*.md` (raíz del repo)
  y se incrustan en la Function durante `npm run build`. No editar el bundle a mano.
- Límite de anexos: PDF/DOCX/imágenes de hasta 4 MB por archivo.
- Sin cuentas ni base de datos: el estado vive en `localStorage` del navegador.
