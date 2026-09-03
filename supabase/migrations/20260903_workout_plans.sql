-- Boxing plans: schema required by /boxing and /workout-plans.
-- Members can only read published public/assigned plans. Admins manage content.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  difficulty text default 'Principiante',
  estimated_minutes int default 30,
  is_published boolean default false,
  is_public boolean default false,
  cover_image_url text default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workout_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  title text not null,
  order_index int default 0,
  created_at timestamptz default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.workout_sections(id) on delete cascade,
  name text not null,
  description text default '',
  sets int default 1,
  reps text default '',
  rest_seconds int default 0,
  video_url text default '',
  notes text default '',
  equipment text default '',
  order_index int default 0,
  created_at timestamptz default now()
);

create table if not exists public.workout_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (plan_id, user_id)
);

create table if not exists public.workout_exercise_ratings (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (exercise_id, user_id)
);

create index if not exists workout_sections_plan_idx on public.workout_sections(plan_id, order_index);
create index if not exists workout_exercises_section_idx on public.workout_exercises(section_id, order_index);
create index if not exists workout_assignments_user_idx on public.workout_assignments(user_id);

alter table public.workout_plans enable row level security;
alter table public.workout_sections enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_assignments enable row level security;
alter table public.workout_exercise_ratings enable row level security;

drop policy if exists "Members read visible workout plans" on public.workout_plans;
create policy "Members read visible workout plans" on public.workout_plans for select using (
  public.is_admin()
  or (is_published = true and is_public = true)
  or exists (select 1 from public.workout_assignments a where a.plan_id = id and a.user_id = auth.uid())
);
drop policy if exists "Admins manage workout plans" on public.workout_plans;
create policy "Admins manage workout plans" on public.workout_plans for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Members read visible workout sections" on public.workout_sections;
create policy "Members read visible workout sections" on public.workout_sections for select using (
  public.is_admin()
  or exists (select 1 from public.workout_plans p where p.id = plan_id and (
    (p.is_published = true and p.is_public = true)
    or exists (select 1 from public.workout_assignments a where a.plan_id = p.id and a.user_id = auth.uid())
  ))
);
drop policy if exists "Admins manage workout sections" on public.workout_sections;
create policy "Admins manage workout sections" on public.workout_sections for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Members read visible workout exercises" on public.workout_exercises;
create policy "Members read visible workout exercises" on public.workout_exercises for select using (
  public.is_admin()
  or exists (select 1 from public.workout_sections s join public.workout_plans p on p.id = s.plan_id where s.id = section_id and (
    (p.is_published = true and p.is_public = true)
    or exists (select 1 from public.workout_assignments a where a.plan_id = p.id and a.user_id = auth.uid())
  ))
);
drop policy if exists "Admins manage workout exercises" on public.workout_exercises;
create policy "Admins manage workout exercises" on public.workout_exercises for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Members read own workout assignments" on public.workout_assignments;
create policy "Members read own workout assignments" on public.workout_assignments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins manage workout assignments" on public.workout_assignments;
create policy "Admins manage workout assignments" on public.workout_assignments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Members read own exercise ratings" on public.workout_exercise_ratings;
create policy "Members read own exercise ratings" on public.workout_exercise_ratings for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Members rate exercises" on public.workout_exercise_ratings;
create policy "Members rate exercises" on public.workout_exercise_ratings for insert with check (user_id = auth.uid());
drop policy if exists "Members update own exercise ratings" on public.workout_exercise_ratings;
create policy "Members update own exercise ratings" on public.workout_exercise_ratings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Admins manage exercise ratings" on public.workout_exercise_ratings;
create policy "Admins manage exercise ratings" on public.workout_exercise_ratings for all using (public.is_admin()) with check (public.is_admin());
