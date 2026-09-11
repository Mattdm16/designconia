# Replicar los Gems con system instructions versionadas en vez de invocar Gems

Los Gems viven dentro de la app de Gemini y no exponen una API pública para invocarlos por ID, así que la web llama a la API de Gemini con instrucciones de sistema guardadas y versionadas en este repo ("asistentes curriculares como código"). Así la experiencia queda dentro de la página y cada cambio de comportamiento es revisable en git.

**Considered Options**: Redirigir a un Gem existente en la app de Gemini (sin costo ni API, pero saca al usuario de la página); backend propio que haga scraping/automatización sobre Gemini (frágil y contra términos de uso).
