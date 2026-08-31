-- Clasificación nutricional y trazabilidad de recetas.
-- Las imágenes y vídeos siguen siendo URLs externas; no se almacenan en Supabase Storage.
alter table public.meals add column if not exists goal text default 'general';
alter table public.meals add column if not exists tips text;
alter table public.meals add column if not exists source_book text;
alter table public.meals add column if not exists source_key text;

update public.meals
set goal = 'general'
where goal is null or btrim(goal) = '';

alter table public.meals drop constraint if exists meals_goal_check;
alter table public.meals add constraint meals_goal_check
  check (goal in ('bajar', 'mantener', 'subir', 'general'));

create index if not exists meals_goal_idx on public.meals (goal);
drop index if exists public.meals_source_key_uidx;
create unique index if not exists meals_source_key_uidx on public.meals (source_key);
