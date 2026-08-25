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
  username            text,
  boxing_goal         text,
  goal_timeframe      text,
  activity_level      text,
  experience_level    text,
  injuries            text,
  dietary_restrictions text,
  assessment_completed boolean     default false,
  assessment_updated_at timestamptz,
  vendaje_progreso    int         default 0,
  water_intake        jsonb,
  custom_routines     jsonb,
  weekly_workout_plan jsonb,
  weekly_meal_plan    jsonb,
  has_seen_vendaje    boolean     default false,
  punches_today       int         default 0,
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
  status      text        default 'active' check (status in ('active','cancelled','attended','no_show','pending','waitlist','pending_payment')),
  attended    boolean     default false,
  attended_at timestamptz,
  receipt_url text,
  payment_proof_url    text,
  payment_status       text,
  payment_submitted_at timestamptz,
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
  id                    uuid    default gen_random_uuid() primary key,
  user_id               uuid    references auth.users(id) on delete set null,
  amount                numeric,
  currency              text    default 'COP',
  status                text    default 'pending' check (status in ('pending','submitted','approved','rejected')),
  plan_name             text,
  plan_id               text,
  booking_id            uuid,
  classes_per_month     int,
  notes                 text,
  receipt_url           text,
  payment_proof_url     text,
  payment_status        text,
  payment_submitted_at  timestamptz,
  final_price           numeric,
  discount_reason       text,
  verified_by           uuid,
  verified_at           timestamptz,
  created_at            timestamptz default now()
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


-- ─── 20. TABLAS ADICIONALES REQUERIDAS POR EL FRONTEND ─────────────────────────

-- ─── A. TABLAS DE RETOS Y COMUNIDAD ───

-- 1. challenges
create table if not exists public.challenges (
  id            uuid          default gen_random_uuid() primary key,
  title         text          not null,
  text          text,
  text_bajar_peso text,
  text_mantener text,
  text_aumentar text,
  url           text,
  categoria     text          default 'Boxeo',
  dificultad    text          default 'intermedio',
  objetivo      text          default 'general',
  tasks         text[],
  period        text          default 'dia',
  created_at    timestamptz   default now(),
  created_by    uuid          references auth.users(id) on delete set null
);

alter table public.challenges enable row level security;
create policy "Desafíos públicos" on public.challenges for select using (true);
create policy "Admin gestiona desafíos" on public.challenges for all using (true);

-- 2. challenge_completions
create table if not exists public.challenge_completions (
  id            text          primary key, -- user_id + "_" + date
  challenge_id  uuid          references public.challenges(id) on delete cascade,
  user_id       uuid          references auth.users(id) on delete cascade,
  date          date          not null,
  checked_tasks int[],
  completed_at  timestamptz,
  created_at    timestamptz   default now()
);

alter table public.challenge_completions enable row level security;
create policy "Completados públicos" on public.challenge_completions for select using (true);
create policy "Cualquiera gestiona completados" on public.challenge_completions for all using (true);

-- 3. activity_feed
create table if not exists public.activity_feed (
  id            uuid          default gen_random_uuid() primary key,
  type          text          not null,
  user_id       uuid          references auth.users(id) on delete cascade,
  user_name     text,
  message       text,
  created_at    timestamptz   default now()
);

alter table public.activity_feed enable row level security;
create policy "Activity feed público" on public.activity_feed for select using (true);
create policy "Cualquiera inserta activity feed" on public.activity_feed for insert with check (true);

-- 4. user_challenges (Meta Mensual)
create table if not exists public.user_challenges (
  id            uuid          primary key references auth.users(id) on delete cascade,
  "selectedDays" int[],       -- array de días seleccionados (0-6)
  completions   text[],       -- array de fechas completadas ("YYYY-MM-DD")
  streak        int           default 0,
  "createdAt"   timestamptz   default now(),
  "updatedAt"   timestamptz   default now()
);

alter table public.user_challenges enable row level security;
create policy "User challenges público" on public.user_challenges for select using (true);
create policy "Cualquiera gestiona user challenges" on public.user_challenges for all using (true);


-- ─── B. TABLAS DE VIDEOS COMPLEMENTARIOS Y ERRORES ───

-- 5. vendaje_videos
create table if not exists public.vendaje_videos (
  id            uuid          default gen_random_uuid() primary key,
  title         text          not null,
  description   text,
  video_url     text          not null,
  created_at    timestamptz   default now()
);

alter table public.vendaje_videos enable row level security;
create policy "Vendaje videos público" on public.vendaje_videos for select using (true);
create policy "Admin gestiona vendaje videos" on public.vendaje_videos for all using (true);

-- 6. system_errors
create table if not exists public.system_errors (
  id            uuid          default gen_random_uuid() primary key,
  error         text,
  stack         text,
  "componentStack" text,
  url           text,
  timestamp     timestamptz   default now(),
  "userAgent"   text
);

alter table public.system_errors enable row level security;
create policy "Insertar errores público" on public.system_errors for insert with check (true);
create policy "Admin lee errores" on public.system_errors for select using (true);


-- ─── C. TABLAS DE SABERES Y COMBOS TÉCNICOS ───

-- 7. combos
create table if not exists public.combos (
  id                uuid          default gen_random_uuid() primary key,
  name              text          not null,
  level             int           not null,
  video_approved    boolean       default false,
  manillas_approved boolean       default false,
  contacto_approved boolean       default false,
  desarrollo_approved boolean     default false,
  video_url         text,
  created_at        timestamptz   default now()
);

alter table public.combos enable row level security;
create policy "Combos públicos" on public.combos for select using (true);
create policy "Admin gestiona combos" on public.combos for all using (true);

-- 8. tutorials
create table if not exists public.tutorials (
  id            uuid          default gen_random_uuid() primary key,
  title         text          not null,
  description   text,
  duration      int           default 60,
  level         int           default 1,
  category      text          default 'técnica',
  video_url     text,
  created_at    timestamptz   default now()
);

alter table public.tutorials enable row level security;
create policy "Tutoriales públicos" on public.tutorials for select using (true);
create policy "Admin gestiona tutoriales" on public.tutorials for all using (true);

-- 9. combo_progress
create table if not exists public.combo_progress (
  id                uuid          default gen_random_uuid() primary key,
  combo_id          uuid          references public.combos(id) on delete cascade,
  user_id           uuid          references auth.users(id) on delete cascade,
  user_name         text,
  video_url         text          not null,
  status            text          default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at        timestamptz   default now(),
  video_approved    boolean       default false,
  manillas_approved boolean       default false,
  contacto_approved boolean       default false,
  desarrollo_approved boolean     default false
);

alter table public.combo_progress enable row level security;
create policy "Combo progress público" on public.combo_progress for select using (true);
create policy "Cualquiera gestiona combo progress" on public.combo_progress for all using (true);


-- ─── D. TABLAS DEL MÓDULO DE BOXEO ───

-- 10. boxeo_videos
create table if not exists public.boxeo_videos (
  id              uuid          default gen_random_uuid() primary key,
  nombre          text          not null,
  subcategoria    text          not null,
  nivel           text          default 'Principiante' check (nivel in ('Principiante', 'Intermedio', 'Avanzado')),
  duracion_seg    int           default 45,
  descripcion     text,
  puntos_clave    text[],
  errores_comunes text[],
  url_directa     text          not null,
  miniatura_url   text,
  activo          boolean       default true,
  orden           int           default 999,
  drive_file_id   text,
  creado_en       timestamptz   default now()
);

alter table public.boxeo_videos enable row level security;
create policy "Videos de boxeo públicos" on public.boxeo_videos for select using (true);
create policy "Admin gestiona videos de boxeo" on public.boxeo_videos for all using (true);

-- 11. boxeo_ocultos
create table if not exists public.boxeo_ocultos (
  id            uuid          default gen_random_uuid() primary key,
  user_id       uuid          references auth.users(id) on delete cascade,
  video_id      uuid          references public.boxeo_videos(id) on delete cascade,
  created_at    timestamptz   default now()
);

alter table public.boxeo_ocultos enable row level security;
create policy "Videos ocultos públicos" on public.boxeo_ocultos for select using (true);
create policy "Cualquiera gestiona sus videos ocultos" on public.boxeo_ocultos for all using (true);


-- ─── E. HABILITAR REPLICACIÓN EN TIEMPO REAL ───

alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.challenge_completions;
alter publication supabase_realtime add table public.activity_feed;
alter publication supabase_realtime add table public.user_challenges;
alter publication supabase_realtime add table public.vendaje_videos;
alter publication supabase_realtime add table public.combos;
alter publication supabase_realtime add table public.tutorials;
alter publication supabase_realtime add table public.combo_progress;
alter publication supabase_realtime add table public.boxeo_videos;

-- =============================================================================
-- FIX DE SEGURIDAD Y COMPLETITUD (v2) — Ejecutar todo en Supabase → SQL Editor
-- Corrige: RLS abiertas, escalada de privilegios, tablas/columnas faltantes.
-- =============================================================================

-- ── 1) Helper de administración (todos los "for all using (true)" se corrigen) ──

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher')
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ── 2) Trigger: el rol SOLO lo define el backend (previene auto-admin) ──

create or replace function public.profiles_handle_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if new.email in ('hernandezkevin001998@gmail.com', 'guantesparaencajar@gmail.com') then
      new.role := 'admin';
    else
      new.role := 'student';
    end if;
    return new;
  end if;
if new.role is distinct from old.role
     and not public.is_admin()
     and new.email not in ('hernandezkevin001998@gmail.com', 'guantesparaencajar@gmail.com') then
    new.role := old.role; -- ignora intentos de escalación de usuarios que NO son admin
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role on public.profiles;
create trigger trg_profiles_role
before insert or update on public.profiles
for each row execute function public.profiles_handle_role();

-- ── 3) Columnas faltantes detectadas en la auditoría ──

alter table public.bookings add column if not exists payment_proof_url text;
alter table public.bookings add column if not exists payment_status text;
alter table public.bookings add column if not exists payment_submitted_at timestamptz;

alter table public.payments add column if not exists plan_id text;
alter table public.payments add column if not exists booking_id uuid;
alter table public.payments add column if not exists classes_per_month int;
alter table public.payments add column if not exists payment_proof_url text;
alter table public.payments add column if not exists payment_status text;
alter table public.payments add column if not exists payment_submitted_at timestamptz;
alter table public.payments add column if not exists final_price numeric;
alter table public.payments add column if not exists original_price numeric;
alter table public.payments add column if not exists discount_percent numeric;
alter table public.payments add column if not exists discount_amount numeric;
alter table public.payments add column if not exists discount_reason text;
alter table public.payments add column if not exists verified_by uuid;
alter table public.payments add column if not exists verified_at timestamptz;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending','submitted','approved','rejected'));

alter table public.bookings add column if not exists receipt_url text;
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('active','cancelled','attended','no_show','pending','waitlist','pending_payment'));

alter table public.profiles add column if not exists receipt_url text;
alter table public.profiles add column if not exists punches_today int default 0;

-- notifications.user_id debe aceptar 'admin' (la app lo usa para avisos)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id' and data_type = 'uuid') then
    alter table public.notifications drop constraint if exists notifications_user_id_fkey;
    alter table public.notifications alter column user_id type text using user_id::text;
  end if;
end $$;

-- ── 4) Reescribir políticas: RLS seguras con rol real ──

-- PROFILES (rol inmutable por trigger; lectura solo propia o admin)
drop policy if exists "Perfil propio legible" on public.profiles;
drop policy if exists "Perfil propio editable" on public.profiles;
drop policy if exists "Perfil propio insertable" on public.profiles;
drop policy if exists "Admin lee todos perfiles" on public.profiles;
create policy "Perfil propio legible"  on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "Perfil propio editable" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Perfil propio insertable" on public.profiles for insert with check (auth.uid() = id);
create policy "Admin gestiona perfiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- BOOKINGS (usuario solo sus reservas y solo para cancelar; admin todo)
drop policy if exists "Usuario ve sus reservas" on public.bookings;
drop policy if exists "Usuario crea reservas" on public.bookings;
drop policy if exists "Usuario cancela reservas" on public.bookings;
drop policy if exists "Admin ve todas reservas" on public.bookings;
drop policy if exists "Admin gestiona reservas" on public.bookings;
create policy "Usuario ve sus reservas" on public.bookings for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario/admin crean reservas" on public.bookings for insert with check (auth.uid() = user_id or public.is_admin());
create policy "Usuario cancela reservas" on public.bookings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id and new.status = 'cancelled');
create policy "Admin gestiona reservas" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

-- PAYMENTS (el usuario inserta; SOLO admin aprueba/cambia)
drop policy if exists "Usuario ve sus pagos" on public.payments;
drop policy if exists "Usuario registra pagos" on public.payments;
drop policy if exists "Admin gestiona pagos" on public.payments;
create policy "Usuario ve sus pagos" on public.payments for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario registra pagos" on public.payments for insert
  with check (auth.uid() = user_id and new.status in ('pending','submitted'));
create policy "Admin gestiona pagos" on public.payments for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin borra pagos" on public.payments for delete using (public.is_admin());

-- NOTIFICATIONS (propias + aviso al canal admin + admin inserta para cualquiera)
drop policy if exists "Usuario ve sus notifs" on public.notifications;
drop policy if exists "App inserta notifs" on public.notifications;
drop policy if exists "Usuario marca leída" on public.notifications;
create policy "Usuario ve sus notifs" on public.notifications for select
  using (auth.uid() = user_id or user_id = 'admin' or public.is_admin());
create policy "Usuario/admin insertan notifs" on public.notifications for insert
  with check (public.is_admin() or auth.uid() = user_id or new.user_id = 'admin');
create policy "Usuario marca leída" on public.notifications for update
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- WORKOUT_HISTORY (propio)
drop policy if exists "Usuario ve su historial" on public.workout_history;
drop policy if exists "Usuario registra historial" on public.workout_history;
create policy "Usuario ve su historial" on public.workout_history for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario registra historial" on public.workout_history for insert with check (auth.uid() = user_id);

-- USER_ACHIEVEMENTS (propio)
drop policy if exists "Usuario ve sus logros" on public.user_achievements;
drop policy if exists "App inserta logros" on public.user_achievements;
create policy "Usuario ve sus logros" on public.user_achievements for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario inserta logros" on public.user_achievements for insert with check (auth.uid() = user_id or public.is_admin());

-- COMMUNITY_GOALS (solo admin escribe)
drop policy if exists "Goals públicos" on public.community_goals;
drop policy if exists "App actualiza goals" on public.community_goals;
create policy "Goals públicos" on public.community_goals for select using (true);
create policy "Admin actualiza goals" on public.community_goals for update using (public.is_admin()) with check (public.is_admin());

-- USER_WORKOUTS (propio)
drop policy if exists "Usuario ve sus workouts" on public.user_workouts;
drop policy if exists "Usuario registra workouts" on public.user_workouts;
drop policy if exists "Usuario actualiza workouts" on public.user_workouts;
create policy "Usuario ve sus workouts" on public.user_workouts for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario registra workouts" on public.user_workouts for insert with check (auth.uid() = user_id);
create policy "Usuario actualiza workouts" on public.user_workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ACTIVITY_LOGS (solo admin lee; insert con user_id propio)
drop policy if exists "Insertar logs" on public.activity_logs;
drop policy if exists "Leer logs" on public.activity_logs;
create policy "Insertar logs" on public.activity_logs for insert with check (auth.uid()::text = user_id or public.is_admin());
create policy "Admin lee logs" on public.activity_logs for select using (public.is_admin());

-- USER_STATS (propio o admin)
drop policy if exists "Stats acceso" on public.user_stats;
create policy "Stats propio" on public.user_stats for select using (auth.uid()::text = user_id or public.is_admin());
create policy "Admin stats" on public.user_stats for all using (public.is_admin()) with check (public.is_admin());

-- EMAIL_QUEUE_LOG (solo admin lee)
drop policy if exists "Insert email logs" on public.email_queue_log;
drop policy if exists "Read email logs" on public.email_queue_log;
create policy "Insert email logs" on public.email_queue_log for insert with check (true);
create policy "Admin lee email logs" on public.email_queue_log for select using (public.is_admin());

-- ACTIVITY_FEED (feed de comunidad: todos leen; insert propio o admin)
drop policy if exists "Activity feed público" on public.activity_feed;
drop policy if exists "Cualquiera inserta activity feed" on public.activity_feed;
create policy "Activity feed público" on public.activity_feed for select using (true);
create policy "Usuario/admin insertan feed" on public.activity_feed for insert
  with check (public.is_admin() or auth.uid() = user_id);

-- MESSAGES (chat comunidad)
drop policy if exists "Mensajes públicos" on public.messages;
drop policy if exists "Usuario envía mensajes" on public.messages;
create policy "Mensajes públicos" on public.messages for select using (true);
create policy "Usuario envía mensajes" on public.messages for insert with check (auth.uid() = user_id);

-- CHALLENGE_COMPLETIONS / USER_CHALLENGES / COMBO_PROGRESS / BOXEO_OCULTOS (propio o admin)
drop policy if exists "Completados públicos" on public.challenge_completions;
drop policy if exists "Cualquiera gestiona completados" on public.challenge_completions;
create policy "Completados propio" on public.challenge_completions for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario inserta completados" on public.challenge_completions for insert with check (auth.uid() = user_id);
create policy "Usuario/admin gestionan completados" on public.challenge_completions for update
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "User challenges público" on public.user_challenges;
drop policy if exists "Cualquiera gestiona user challenges" on public.user_challenges;
create policy "User challenges propio" on public.user_challenges for select using (auth.uid() = id or public.is_admin());
create policy "Usuario gestiona user challenges" on public.user_challenges for all
  using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

drop policy if exists "Combo progress público" on public.combo_progress;
drop policy if exists "Cualquiera gestiona combo progress" on public.combo_progress;
create policy "Combo progress propio" on public.combo_progress for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario inserta combo progress" on public.combo_progress for insert with check (auth.uid() = user_id or public.is_admin());
create policy "Usuario/admin gestionan combo progress" on public.combo_progress for update
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Videos ocultos públicos" on public.boxeo_ocultos;
drop policy if exists "Cualquiera gestiona sus videos ocultos" on public.boxeo_ocultos;
create policy "Videos ocultos propio" on public.boxeo_ocultos for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario gestiona videos ocultos" on public.boxeo_ocultos for all
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- CONTENIDO (todos leen; SOLO admin escribe) — elimina CUALQUIER política antigua abierta
do $$
declare
  t text; rec record;
begin
  foreach t in array array['availabilities','availability_exceptions','workout_categories','workout_videos',
                         'planes','fundamentos_videos','fundamentos_modules','settings','challenges','combos',
                         'tutorials','vendaje_videos','boxeo_videos'] loop
    for rec in select polname from pg_policy where polrelid = format('public.%I', t)::regclass loop
      execute format('drop policy if exists %I on public.%I', rec.polname, t);
    end loop;
    execute format('create policy %L on public.%I for select using (true)', 'Lectura publica ' || t, t);
    execute format('create policy %L on public.%I for all using (public.is_admin()) with check (public.is_admin())',
                   'Admin gestiona ' || t, t);
  end loop;
end $$;

-- SYSTEM_ERRORS (insert autenticado; solo admin lee)
drop policy if exists "Insertar errores público" on public.system_errors;
drop policy if exists "Admin lee errores" on public.system_errors;
create policy "Insertar errores" on public.system_errors for insert with check (true);
create policy "Admin lee errores" on public.system_errors for select using (public.is_admin());

-- ── 5) TABLAS FALTANTES detectadas en la auditoría (Tienda, Comidas, Chat, etc.) ──

-- CHATS (Coach)
create table if not exists public.chats (
  id          uuid default gen_random_uuid() primary key,
  chat_id     text not null,
  text        text not null,
  sender_id   uuid,
  sender_name text,
  role        text default 'student',
  created_at  timestamptz default now()
);
create index if not exists chats_chat_id_idx on public.chats(chat_id, created_at);
alter table public.chats enable row level security;
create policy "Chats visible para admin o remitente" on public.chats for select
  using (public.is_admin() or sender_id = auth.uid());
create policy "Usuario/admin envían mensajes" on public.chats for insert
  with check (public.is_admin() or sender_id = auth.uid());

-- MEALS (Comidas)
create table if not exists public.meals (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  category     text default 'desayuno',
  ingredients  text,
  instructions text,
  image_url    text,
  video_url    text,
  calories     numeric,
  carbs        numeric,
  protein      numeric,
  fats         numeric,
  tags         text[],
  created_by   uuid,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.meals enable row level security;
create policy "Meals públicos" on public.meals for select using (true);
create policy "Admin gestiona meals" on public.meals for all using (public.is_admin()) with check (public.is_admin());

-- PRODUCTS (Tienda)
create table if not exists public.products (
  id                uuid default gen_random_uuid() primary key,
  name              text not null,
  price             numeric default 0,
  delivery_time     text,
  image_url         text,
  description       text,
  care_instructions text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table public.products enable row level security;
drop policy if exists "Products públicos" on public.products;
create policy "Products públicos" on public.products for select using (true);
drop policy if exists "Admin gestiona products" on public.products;
create policy "Admin gestiona products" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- ORDERS (Tienda)
create table if not exists public.orders (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid,
  user_name        text,
  user_email       text,
  items            jsonb,
  total            numeric default 0,
  status           text default 'pending' check (status in ('pending','approved','rejected','shipped')),
  receipt_url      text,
  receipt_filename text,
  created_at       timestamptz default now()
);
create index if not exists orders_user_id_idx on public.orders(user_id);
alter table public.orders enable row level security;
create policy "Usuario ve sus pedidos" on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario crea pedidos" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admin gestiona pedidos" on public.orders for all using (public.is_admin()) with check (public.is_admin());

-- CONFIGURACION (video de calentamiento)
create table if not exists public.configuracion (
  id         text primary key,
  tipo       text,
  videoUrl   text,
  titulo     text,
  descripcion text,
  duracion   int default 60,
  updated_at timestamptz default now(),
  updated_by text
);
alter table public.configuracion enable row level security;
create policy "Config públicos" on public.configuracion for select using (true);
create policy "Admin gestiona config" on public.configuracion for all using (public.is_admin()) with check (public.is_admin());

-- CUSTOM_ROUTINES (Entrenos)
create table if not exists public.custom_routines (
  id        uuid default gen_random_uuid() primary key,
  user_id   uuid not null,
  name      text not null,
  exercises jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists custom_routines_user_idx on public.custom_routines(user_id);
alter table public.custom_routines enable row level security;
create policy "Rutinas propio" on public.custom_routines for select using (auth.uid() = user_id or public.is_admin());
create policy "Usuario crea rutinas" on public.custom_routines for insert with check (auth.uid() = user_id);
create policy "Usuario/admin gestionan rutinas" on public.custom_routines for all
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- WEEKLY_PLANS (Dashboard)
create table if not exists public.weekly_plans (
  user_id    uuid primary key,
  combos     jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.weekly_plans enable row level security;
create policy "Plan semanal propio" on public.weekly_plans for select using (auth.uid() = user_id or public.is_admin());
create policy "Admin gestiona planes semanales" on public.weekly_plans for all using (public.is_admin()) with check (public.is_admin());

-- STUDENT_APPROVALS (Licencias paso a paso)
create table if not exists public.student_approvals (
  id text primary key,
  step1_status text default 'pending',
  step2_status text default 'pending',
  step3_status text default 'pending',
  step4_status text default 'pending',
  step1_video_url text,
  step2_video_url text,
  step3_video_url text,
  step4_video_url text,
  step1_approved_at timestamptz,
  step2_approved_at timestamptz,
  step3_approved_at timestamptz,
  step4_approved_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.student_approvals enable row level security;
create policy "Aprobaciones propio" on public.student_approvals for select using (auth.uid()::text = id or public.is_admin());
create policy "Admin gestiona aprobaciones" on public.student_approvals for all using (public.is_admin()) with check (public.is_admin());

-- COMBO_EVALUATIONS (Saberes/Perfil admin)
create table if not exists public.combo_evaluations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  user_name text,
  combo_id uuid,
  combo_name text,
  manillas_status text default 'pending',
  combo_status  text default 'pending',
  contacto_status text default 'pending',
  manillas_feedback text,
  combo_feedback  text,
  contacto_feedback text,
  combo_video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.combo_evaluations enable row level security;
create policy "Evaluaciones propio" on public.combo_evaluations for select using (auth.uid() = user_id or public.is_admin());
create policy "Admin gestiona evaluaciones" on public.combo_evaluations for all using (public.is_admin()) with check (public.is_admin());

-- REJECTED_VIDEOS (ban-list de videos)
create table if not exists public.rejected_videos (
  id          uuid default gen_random_uuid() primary key,
  original_id text,
  video_url   text,
  title       text,
  rejected_by uuid,
  rejected_at timestamptz default now()
);
alter table public.rejected_videos enable row level security;
create policy "Admin ve ban-list" on public.rejected_videos for select using (public.is_admin());
create policy "Admin inserta ban-list" on public.rejected_videos for insert with check (public.is_admin());

-- MAIL (cola de correos)
create table if not exists public.mail (
  id        uuid default gen_random_uuid() primary key,
  "to"      text[],
  "from"    text,
  reply_to  text,
  message   jsonb,
  status    text default 'pending' check (status in ('pending','sent','failed')),
  queued_at timestamptz default now()
);
alter table public.mail enable row level security;
create policy "App inserta mail" on public.mail for insert with check (true);
create policy "Admin gestiona mail" on public.mail for all using (public.is_admin()) with check (public.is_admin());

-- EMAIL_QUEUE (fallback de Resend)
create table if not exists public.email_queue (
  id           uuid default gen_random_uuid() primary key,
  type         text,
  "to"         text,
  nombre       text,
  clase        text,
  fecha        text,
  hora         text,
  tipo         text,
  motivo       text,
  _raw         jsonb,
  status       text default 'pending' check (status in ('pending','sent','failed')),
  retry_count  int default 0,
  created_at   timestamptz default now()
);
alter table public.email_queue enable row level security;
create policy "App inserta email_queue" on public.email_queue for insert with check (true);
create policy "Admin gestiona email_queue" on public.email_queue for all using (public.is_admin()) with check (public.is_admin());

-- ── 6) STORAGE: políticas del bucket gpte-videos ──
-- (primero crear el bucket público desde el dashboard si no existe)

drop policy if exists "Acceso público lectura videos" on storage.objects;
drop policy if exists "Usuarios suben a su carpeta" on storage.objects;
drop policy if exists "Admin gestiona videos" on storage.objects;
drop policy if exists "Propietario borra su carpeta" on storage.objects;

create policy "Acceso público lectura videos" on storage.objects
  for select using (bucket_id = 'gpte-videos');

create policy "Usuarios suben a su carpeta" on storage.objects
  for insert with check (bucket_id = 'gpte-videos' and auth.role() = 'authenticated');

create policy "Admin gestiona videos" on storage.objects
  for update using (bucket_id = 'gpte-videos' and public.is_admin()) with check (bucket_id = 'gpte-videos' and public.is_admin());

create policy "Admin borra videos" on storage.objects
  for delete using (bucket_id = 'gpte-videos' and public.is_admin());

create policy "Propietario borra su carpeta" on storage.objects
  for delete using (
    bucket_id = 'gpte-videos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 7) Realtime adicional para tablas nuevas ──

alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.meals;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.custom_routines;


-- =============================================================
-- 8) BUCKET STORAGE: RECEIPTS (comprobantes de pago - tienda)
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Usuario sube su comprobante" on storage.objects;
drop policy if exists "Usuario lee su comprobante" on storage.objects;
drop policy if exists "Admin gestiona comprobantes" on storage.objects;

create policy "Usuario sube su comprobante" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Usuario lee su comprobante" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "Admin gestiona comprobantes" on storage.objects
  for all using (bucket_id = 'receipts' and public.is_admin()) with check (bucket_id = 'receipts' and public.is_admin());
