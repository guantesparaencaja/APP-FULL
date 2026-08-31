-- Retirada del Reto del Día.
-- Las tablas solo se eliminan si existen y no pertenecen a reservas ni entrenamientos.
drop table if exists public.challenge_completions cascade;
drop table if exists public.challenges cascade;

-- Limpieza de la bandera global que habilitaba el módulo.
update public.settings
set data = data - 'challenge_unlocked'
where id = 'global' and data ? 'challenge_unlocked';
