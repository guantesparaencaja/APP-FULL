-- ═══════════════════════════════════════════════════════════════════════════
-- FIX_ADMIN_PRODUCTS.sql — Arregla "no puedo borrar/editar productos" como admin
-- 100% seguro de re-ejecutar (idempotente). Ejecuta TODO el bloque.
-- Cómo usarlo: Supabase Dashboard → SQL Editor → New query → pega esto → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Asegurar que existe la función is_admin()
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
grant execute on function public.is_admin() to authenticated, anon;

-- 2) Reemplazar el trigger con la versión corregida.
--    Antes, el trigger revertía el rol 'admin' incluso para los emails dueños,
--    dejando al admin atrapado como 'student' para siempre (no podía escribir).
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

-- 3) Asegurar las políticas de la tabla products (idempotente)
alter table public.products enable row level security;
drop policy if exists "Products públicos" on public.products;
create policy "Products públicos" on public.products for select using (true);
drop policy if exists "Admin gestiona products" on public.products;
create policy "Admin gestiona products" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- 4) Forzar el rol admin en los perfiles de los dueños (por si quedaron 'student')
update public.profiles
set role = 'admin'
where email in ('hernandezkevin001998@gmail.com', 'guantesparaencajar@gmail.com');

-- 5) Verificación: cuántos perfiles quedan como admin
select id, email, role from public.profiles where role in ('admin','teacher') order by email;