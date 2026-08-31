-- Metadatos para retos diarios animados. Los GIF se sirven desde URLs externas.
alter table public.challenges add column if not exists gif_url text;
alter table public.challenges add column if not exists source_url text;
alter table public.challenges add column if not exists source_name text;
alter table public.challenges add column if not exists license text;
alter table public.challenges add column if not exists exercise_type text;
alter table public.challenges add column if not exists repetitions integer;
alter table public.challenges add column if not exists rounds integer;
alter table public.challenges add column if not exists work_seconds integer;
alter table public.challenges add column if not exists rest_seconds integer;
