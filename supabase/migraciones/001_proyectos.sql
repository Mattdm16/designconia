-- DesignConia — tabla de proyectos por docente (Supabase/Postgres).
--
-- Un solo docente, una sola fila: cada cuenta guarda su agregado V3 completo
-- en `datos` (JSONB). Las políticas RLS garantizan que nadie lea ni escriba
-- proyectos ajenos. Ejecutar una vez en el editor SQL del proyecto Supabase.

create table if not exists public.proyectos (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null,
  app_version text not null default 'desconocida',
  actualizado_en timestamptz not null default now()
);

alter table public.proyectos enable row level security;

drop policy if exists "El docente lee solo su proyecto" on public.proyectos;
create policy "El docente lee solo su proyecto"
  on public.proyectos for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "El docente crea su proyecto" on public.proyectos;
create policy "El docente crea su proyecto"
  on public.proyectos for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "El docente actualiza su proyecto" on public.proyectos;
create policy "El docente actualiza su proyecto"
  on public.proyectos for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
