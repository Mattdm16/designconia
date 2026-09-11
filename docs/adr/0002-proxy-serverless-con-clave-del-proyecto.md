# Proxy serverless con clave del proyecto en vez de clave por docente

Aunque cada docente pegue su propia key gratuita sería más simple, elegimos un proxy serverless con una clave del proyecto: el docente entra y usa sin crear cuentas en Google ni tocar API keys, a cambio de asumir cuota y facturación centralizadas bajo el proyecto.

**Considered Options**: Cada docente aporta su key de AI Studio guardada en su navegador (cero backend, fricción de onboarding y claves fuera de nuestro control); llamar a Gemini directo desde el frontend con clave embebida (descartado: la clave quedaría expuesta).
