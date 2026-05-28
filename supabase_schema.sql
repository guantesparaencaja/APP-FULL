-- ═══════════════════════════════════════════════════════════════════════════
-- GPTE — Schema Supabase COMPLETO (Fuente única de verdad)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Orden: ejecutar de arriba hacia abajo
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────
-- Extiende auth.users de Supabase. id = auth.users.id (UUID)

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  name                text,
  email               text,
  weight              numeric,
  dominant_hand       text,
  goal                text,
  lives               int         default 3,
  streak              int         default 0,
  role                text        default 'user',  -- 'user' | 'admin'
  license_level       int         default 0,
  age                 int,
  height              numeric,
  is_new_user         boolean     default true,
  tutorial_completed  boolean     default false,
  fitness_goal        text,
  mood                text,
  mood_updated_at     timestamptz,
  profile_pic         text,
  before_pic          text,
  after_pic           text,
  training_location   text,
  training_days       text[],
  plan                text,
  plan_id             text,
  plan_name           text,
  plan_status         text,
  plan_start_date     date,
  classes_per_month   int         default 0,
  classes_remaining   int         default 0,
  gender              text,
  last_workout        timestamptz,
  xp                  int         default 0,
  fcm_token           text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Perfil propio legible"   on public.profiles for select using (auth.uid() = id);
create policy "Perfil propio editable"  on public.profiles for update using (auth.uid() = id);
create policy "Perfil propio insertable" on public.profiles for insert with check (auth.uid() = id);
-- Admin puede leer todo (ajustar si se tiene tabla de roles)
create policy "Admin lee todos perfiles" on public.profiles for select using (true);

-- ─── 2. AVAILABILITIES (Horarios recurrentes) ─────────────────────────────────

create table if not exists public.availabilities (
  id                uuid        default gen_random_uuid() primary key,
  day_of_week       text        not null,  -- 'monday','tuesday'... o número '1'-'7'
  start_time        time        not null,
  end_time          time        not null,
  title             text,
  description       text,
  rules             text,
  materials         text,
  duration_minutes  int         default 60,
  max_students      int         default 10,
  created_at        timestamptz default now()
);

alter table public.availabilities enable row level security;
create policy "Disponibilidades públicas" on public.availabilities for select using (true);
create policy "Admin crea disponibilidades" on public.availabilities for all using (true);

-- ─── 3. AVAILABILITY_EXCEPTIONS (Clases canceladas) ──────────────────────────

create table if not exists public.availability_exceptions (
  id         uuid  default gen_random_uuid() primary key,
  slot_id    uuid  references public.availabilities(id) on delete cascade,
  date       date  not null,
  created_at timestamptz default now()
);

alter table public.availability_exceptions enable row level security;
create policy "Excepciones públicas" on public.availability_exceptions for select using (true);
create policy "Admin gestiona excepciones" on public.availability_exceptions for all using (true);

-- ─── 4. BOOKINGS (Reservas de clase) ─────────────────────────────────────────
-- REGLA DE ORO: Lunes a Viernes 7-9 PM. Domingo 5-7 PM.
-- Esta restricción se aplica en el frontend, pero se puede reforzar aquí.

create table if not exists public.bookings (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete set null,
  user_name   text,
  user_email  text,
  class_id    uuid        references public.availabilities(id) on delete set null,
  date        date        not null,
  time        time,
  status      text        default 'active' check (status in ('active','cancelled','attended','no_show')),
  attended    boolean     default false,
  attended_at timestamptz,
  rating      int         check (rating between 1 and 5),
  feedback    text,
  created_at  timestamptz default now()
);

create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_date_idx    on public.bookings(date);

alter table public.bookings enable row level security;
create policy "Usuario ve sus reservas" on public.bookings for select using (auth.uid() = user_id);
create policy "Usuario crea reservas"  on public.bookings for insert with check (auth.uid() = user_id);
create policy "Usuario cancela reservas" on public.bookings for update using (auth.uid() = user_id);
create policy "Admin ve todas reservas" on public.bookings for select using (true);
create policy "Admin gestiona reservas" on public.bookings for all using (true);

-- ─── 5. WORKOUT_CATEGORIES ────────────────────────────────────────────────────

create table if not exists public.workout_categories (
  id          uuid  default gen_random_uuid() primary key,
  name        text  not null,
  description text,
  icon        text,
  order_index int   default 0,
  created_at  timestamptz default now()
);

alter table public.workout_categories enable row level security;
create policy "Categorías públicas" on public.workout_categories for select using (true);
create policy "Admin gestiona categorías" on public.workout_categories for all using (true);

-- ─── 6. WORKOUT_VIDEOS ────────────────────────────────────────────────────────

create table if not exists public.workout_videos (
  id            uuid  default gen_random_uuid() primary key,
  title         text  not null,
  description   text,
  video_url     text,
  thumbnail_url text,
  category      text,
  category_id   uuid  references public.workout_categories(id) on delete set null,
  duration      int,
  difficulty    text,
  order_index   int   default 0,
  status        text  default 'approved' check (status in ('approved','pending','rejected')),
  tipo          text,   -- 'gym' | 'home' | etc.
  equipment     text,
  objetivo      text,
  muscle_groups text[],
  tags          text[],
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.workout_videos enable row level security;
create policy "Videos públicos" on public.workout_videos for select using (true);
create policy "Admin gestiona videos" on public.workout_videos for all using (true);

-- ─── 7. PAYMENTS ─────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    references auth.users(id) on delete set null,
  amount      numeric,
  currency    text    default 'COP',
  status      text    default 'pending' check (status in ('pending','approved','rejected')),
  plan_name   text,
  notes       text,
  receipt_url text,
  created_at  timestamptz default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);

alter table public.payments enable row level security;
create policy "Usuario ve sus pagos"    on public.payments for select using (auth.uid() = user_id);
create policy "Usuario registra pagos"  on public.payments for insert with check (auth.uid() = user_id);
create policy "Admin gestiona pagos"    on public.payments for all using (true);

-- ─── 8. PLANES ────────────────────────────────────────────────────────────────

create table if not exists public.planes (
  id               uuid    default gen_random_uuid() primary key,
  name             text    not null,
  description      text,
  price            numeric,
  classes_per_month int,
  duration_days    int,
  active           boolean default true,
  created_at       timestamptz default now()
);

alter table public.planes enable row level security;
create policy "Planes públicos" on public.planes for select using (true);
create policy "Admin gestiona planes" on public.planes for all using (true);

-- ─── 9. NOTIFICATIONS ────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references auth.users(id) on delete cascade,
  title      text,
  body       text,
  type       text    default 'info',
  read       boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);

alter table public.notifications enable row level security;
create policy "Usuario ve sus notifs"   on public.notifications for select using (auth.uid() = user_id);
create policy "App inserta notifs"      on public.notifications for insert with check (true);
create policy "Usuario marca leída"     on public.notifications for update using (auth.uid() = user_id);

-- ─── 10. WORKOUT_HISTORY ─────────────────────────────────────────────────────

create table if not exists public.workout_history (
  id                 uuid    default gen_random_uuid() primary key,
  user_id            uuid    references auth.users(id) on delete cascade,
  timestamp          timestamptz default now(),
  duration_seconds   int,
  exercises          jsonb,
  calories_estimate  int,
  created_at         timestamptz default now()
);

create index if not exists workout_history_user_id_idx on public.workout_history(user_id);

alter table public.workout_history enable row level security;
create policy "Usuario ve su historial"   on public.workout_history for select using (auth.uid() = user_id);
create policy "Usuario registra historial" on public.workout_history for insert with check (auth.uid() = user_id);

-- ─── 11. USER_ACHIEVEMENTS ───────────────────────────────────────────────────

create table if not exists public.user_achievements (
  id             uuid  default gen_random_uuid() primary key,
  user_id        uuid  references auth.users(id) on delete cascade,
  achievement_id text  not null,
  unlocked_at    timestamptz default now()
);

alter table public.user_achievements enable row level security;
create policy "Usuario ve sus logros" on public.user_achievements for select using (auth.uid() = user_id);
create policy "App inserta logros"    on public.user_achievements for insert with check (true);

-- ─── 12. FUNDAMENTOS_VIDEOS ──────────────────────────────────────────────────

create table if not exists public.fundamentos_videos (
  id          uuid  default gen_random_uuid() primary key,
  title       text  not null,
  description text,
  video_url   text,
  module_id   uuid,
  "order"     int   default 0,
  duration    int,
  created_at  timestamptz default now()
);

alter table public.fundamentos_videos enable row level security;
create policy "Fundamentos videos públicos" on public.fundamentos_videos for select using (true);
create policy "Admin gestiona fundamentos videos" on public.fundamentos_videos for all using (true);

-- ─── 13. FUNDAMENTOS_MODULES ─────────────────────────────────────────────────

create table if not exists public.fundamentos_modules (
  id          uuid  default gen_random_uuid() primary key,
  title       text  not null,
  description text,
  icon        text,
  "order"     int   default 0,
  created_at  timestamptz default now()
);

alter table public.fundamentos_modules enable row level security;
create policy "Módulos públicos" on public.fundamentos_modules for select using (true);
create policy "Admin gestiona módulos" on public.fundamentos_modules for all using (true);

-- ─── 14. MESSAGES (Chat comunidad) ───────────────────────────────────────────

create table if not exists public.messages (
  id         uuid  default gen_random_uuid() primary key,
  user_id    uuid  references auth.users(id) on delete set null,
  user_name  text,
  content    text  not null,
  created_at timestamptz default now()
);

create index if not exists messages_created_at_idx on public.messages(created_at desc);

alter table public.messages enable row level security;
create policy "Mensajes públicos"      on public.messages for select using (true);
create policy "Usuario envía mensajes" on public.messages for insert with check (auth.uid() = user_id);

-- ─── 15. COMMUNITY_GOALS ─────────────────────────────────────────────────────

create table if not exists public.community_goals (
  id          uuid  default gen_random_uuid() primary key,
  title       text,
  description text,
  target      int,
  progress    int   default 0,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

alter table public.community_goals enable row level security;
create policy "Goals públicos" on public.community_goals for select using (true);
create policy "App actualiza goals" on public.community_goals for update using (true);

-- ─── 16. SETTINGS ────────────────────────────────────────────────────────────
-- Para retos diarios y configuración global

create table if not exists public.settings (
  id         text  primary key,  -- ej: 'daily_challenge'
  title      text,
  data       jsonb,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;
create policy "Settings públicos" on public.settings for select using (true);
create policy "Admin gestiona settings" on public.settings for all using (true);

-- ─── 17. USER_WORKOUTS (para motivational check) ─────────────────────────────

create table if not exists public.user_workouts (
  id           uuid  default gen_random_uuid() primary key,
  user_id      uuid  references auth.users(id) on delete cascade,
  workout_id   text,
  completed    boolean default false,
  completed_at timestamptz,
  timestamp    timestamptz default now()
);

alter table public.user_workouts enable row level security;
create policy "Usuario ve sus workouts" on public.user_workouts for select using (auth.uid() = user_id);
create policy "Usuario registra workouts" on public.user_workouts for insert with check (auth.uid() = user_id);
create policy "Usuario actualiza workouts" on public.user_workouts for update using (auth.uid() = user_id);

-- ─── 18. ANALYTICS (preservado del schema anterior) ──────────────────────────

create table if not exists public.activity_logs (
  id         uuid  default gen_random_uuid() primary key,
  user_id    text  not null,
  action     text  not null,
  metadata   jsonb,
  created_at timestamptz default now()
);

alter table public.activity_logs enable row level security;
create policy "Insertar logs" on public.activity_logs for insert with check (true);
create policy "Leer logs" on public.activity_logs for select using (true);

create table if not exists public.user_stats (
  user_id             text  primary key,
  total_classes       int   default 0,
  classes_this_month  int   default 0,
  no_shows            int   default 0,
  last_class_date     date,
  updated_at          timestamptz default now()
);

alter table public.user_stats enable row level security;
create policy "Stats acceso" on public.user_stats for all using (true) with check (true);

create table if not exists public.email_queue_log (
  id                uuid  default gen_random_uuid() primary key,
  user_id           text  not null,
  template          text  not null,
  recipient_email   text  not null,
  status            text  default 'pending' check (status in ('sent','failed','pending')),
  n8n_execution_id  text,
  sent_at           timestamptz default now()
);

alter table public.email_queue_log enable row level security;
create policy "Insert email logs" on public.email_queue_log for insert with check (true);
create policy "Read email logs"   on public.email_queue_log for select using (true);

-- ─── Habilitar Realtime en tablas críticas ────────────────────────────────────
-- Ejecutar en el Dashboard → Database → Replication → Tables

-- alter publication supabase_realtime add table public.bookings;
-- alter publication supabase_realtime add table public.notifications;
-- alter publication supabase_realtime add table public.workout_videos;
-- alter publication supabase_realtime add table public.workout_categories;
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.settings;
-- alter publication supabase_realtime add table public.fundamentos_videos;
-- alter publication supabase_realtime add table public.fundamentos_modules;

-- NOTA: Descomentar las líneas anteriores para activar Realtime
-- O hacerlo desde: Dashboard → Database → Replication

-- ─── Vistas útiles ────────────────────────────────────────────────────────────

create or replace view public.v_action_summary as
  select action, count(*) as total, max(created_at) as last_seen
  from public.activity_logs
  group by action
  order by total desc
  limit 10;

create or replace view public.v_top_users_month as
  select user_id, classes_this_month, total_classes, no_shows
  from public.user_stats
  order by classes_this_month desc
  limit 20;

-- ─── 19. CONFIGURACIÓN DE STORAGE (BÚCKETS Y POLÍTICAS DE ACCESO) ──────────────
-- Ejecutar esto en el editor SQL de Supabase para crear el búcket y habilitar la subida y borrado de videos.
--
-- 1. Crear el bucket 'gpte-videos' como público si no existe
-- insert into storage.buckets (id, name, public)
-- values ('gpte-videos', 'gpte-videos', true)
-- on conflict (id) do nothing;
--
-- 2. Habilitar políticas de acceso para lectura, inserción y borrado
--
-- create policy "Acceso público de lectura a videos"
--   on storage.objects for select
--   using (bucket_id = 'gpte-videos');
--
-- create policy "Permitir a cualquiera subir videos"
--   on storage.objects for insert
--   with check (bucket_id = 'gpte-videos');
--
-- create policy "Permitir borrar videos"
--   on storage.objects for delete
--   using (bucket_id = 'gpte-videos');

