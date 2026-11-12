# DesignConia — nube opcional (Supabase, plan gratuito)

La nube guarda **una copia del proyecto del docente** para abrirla desde otro
navegador. Una cuenta, una fila: nadie más ve sus documentos. Sin configurar
esto, la app sigue funcionando 100% en local.

## 1. Crear el proyecto (5 minutos, gratis)

1. Crea una cuenta en [Supabase](https://supabase.com) y un proyecto nuevo
   (plan Free, región cercana al docente).
2. En el panel del proyecto: **SQL Editor → New query**, pega el contenido de
   [`supabase/migraciones/001_proyectos.sql`](../supabase/migraciones/001_proyectos.sql)
   y ejecútalo. Crea la tabla `proyectos` con políticas RLS por propietario.
3. En **Project Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave pública, diseñada
     para vivir en el cliente; el acceso real lo limitan las políticas RLS)

## 2. Configurar la app

Añade a `.env.local` (nunca al repositorio):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

Reinicia `npm run dev`. El botón **«Nube»** del encabezado ahora muestra el
panel: el docente entra con su correo (enlace mágico, sin contraseña) y puede
**Subir proyecto** / **Bajar proyecto**.

## 3. Reglas de uso para el piloto

- **Antes de bajar**, descarga una copia JSON con el botón **«Respaldo»** del
  encabezado: bajar reemplaza el proyecto actual.
- La primera subida crea la fila; las siguientes la reemplazan.
- El plan Free pausa proyectos sin actividad de base de datos durante 7 días;
  se reactivan desde el panel de Supabase (datos intactos). Para un docente que
  la use cada semana no debería pausarse.
- Los PDF adjuntos no se suben: la nube guarda el texto ya extraído y recortado
  que forma parte del proyecto, igual que el guardado local.

## 4. Autenticación

Solo se usa inicio por enlace mágico al correo; no hay registro abierto ni
roles. Para restringir a una persona concreta, crea su cuenta tú mismo
invitándola desde **Authentication → Users → Invite user**: nadie más podrá
entrar aunque adivine la URL.
