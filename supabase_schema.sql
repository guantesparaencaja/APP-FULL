-- ═══════════════════════════════════════════════════════════════════════════
-- GPTE Analytics — Tablas Supabase (Modo Híbrido)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Orden: ejecutar de arriba hacia abajo (respeta dependencias)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Activity Logs ────────────────────────────────────────────────────────
-- Registra acciones de usuario para analytics. user_id = Firebase UID (text).
-- No usa FK a Supabase Auth porque seguimos con Firebase Auth.

create table if not exists public.activity_logs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     text        not null,
  action      text        not null,
  metadata    jsonb,
  created_at  timestamptz default now() not null
);

-- Índices para consultas frecuentes
create index if not exists activity_logs_user_id_idx     on public.activity_logs (user_id);
create index if not exists activity_logs_action_idx      on public.activity_logs (action);
create index if not exists activity_logs_created_at_idx  on public.activity_logs (created_at desc);

-- Seguridad: solo lectura pública, escritura autenticada
alter table public.activity_logs enable row level security;

create policy "Insertar logs propios" on public.activity_logs
  for insert with check (true); -- Permitir inserts desde la app (anon key)

create policy "Leer logs propios" on public.activity_logs
  for select using (true); -- En producción: restringir a admins


-- ─── 2. User Stats ───────────────────────────────────────────────────────────
-- Estadísticas pre-calculadas por usuario.
-- Más eficiente que calcular con COUNT() en cada consulta.

create table if not exists public.user_stats (
  user_id              text  primary key,
  total_classes        int   default 0 not null,
  classes_this_month   int   default 0 not null,
  no_shows             int   default 0 not null,
  last_class_date      date,
  updated_at           timestamptz default now() not null
);

-- Índices
create index if not exists user_stats_updated_at_idx on public.user_stats (updated_at desc);

-- RLS
alter table public.user_stats enable row level security;

create policy "Upsert stats propias" on public.user_stats
  for all using (true) with check (true);


-- ─── 3. Email Queue Log ──────────────────────────────────────────────────────
-- Registro de emails enviados por N8N.
-- Permite auditar qué se envió, cuándo y con qué resultado.

create table if not exists public.email_queue_log (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             text        not null,
  template            text        not null,
  recipient_email     text        not null,
  status              text        not null default 'pending'
                      check (status in ('sent', 'failed', 'pending')),
  n8n_execution_id    text,
  sent_at             timestamptz default now() not null
);

-- Índices
create index if not exists email_queue_log_user_id_idx  on public.email_queue_log (user_id);
create index if not exists email_queue_log_template_idx on public.email_queue_log (template);
create index if not exists email_queue_log_status_idx   on public.email_queue_log (status);

-- RLS
alter table public.email_queue_log enable row level security;

create policy "Insertar email logs" on public.email_queue_log
  for insert with check (true);

create policy "Leer email logs" on public.email_queue_log
  for select using (true);


-- ─── 4. Vistas útiles para Admin ─────────────────────────────────────────────

-- Top 10 acciones más frecuentes
create or replace view public.v_action_summary as
  select action, count(*) as total, max(created_at) as last_seen
  from public.activity_logs
  group by action
  order by total desc
  limit 10;

-- Usuarios más activos este mes
create or replace view public.v_top_users_month as
  select user_id, classes_this_month, total_classes, no_shows
  from public.user_stats
  order by classes_this_month desc
  limit 20;

-- Emails enviados por template
create or replace view public.v_email_stats as
  select template, status, count(*) as total
  from public.email_queue_log
  group by template, status
  order by template, status;
