-- Endurece las colas y el registro de errores sin abrir escrituras anonimas.
drop policy if exists "Insertar errores público" on public.system_errors;
drop policy if exists "Insertar errores" on public.system_errors;
drop policy if exists "Insertar errores publico" on public.system_errors;
drop policy if exists "Insertar errores autenticado" on public.system_errors;
drop policy if exists "Admin lee errores" on public.system_errors;
create policy "Insertar errores autenticado" on public.system_errors
  for insert to authenticated with check (auth.uid() is not null);
create policy "Admin lee errores" on public.system_errors
  for select to authenticated using (public.is_admin());

drop policy if exists "Insert email logs" on public.email_queue_log;
drop policy if exists "Read email logs" on public.email_queue_log;
drop policy if exists "Admin lee email logs" on public.email_queue_log;
drop policy if exists "insert_email_logs" on public.email_queue_log;
drop policy if exists "read_email_logs" on public.email_queue_log;
drop policy if exists "Insert email logs autenticado" on public.email_queue_log;
create policy "Insert email logs autenticado" on public.email_queue_log
  for insert to authenticated with check (auth.uid() is not null);
create policy "Admin lee email logs" on public.email_queue_log
  for select to authenticated using (public.is_admin());
