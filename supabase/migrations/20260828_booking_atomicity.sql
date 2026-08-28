-- Reserva y cancelacion atomicas: evita carreras de cupos y dobles devoluciones.
create or replace function public.book_class(
  p_class_id uuid,
  p_date date,
  p_time text,
  p_user_id uuid default auth.uid(),
  p_status text default 'active'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.availabilities%rowtype;
  v_profile public.profiles%rowtype;
  v_booking public.bookings%rowtype;
  v_booked integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Not authorized to book for another user';
  end if;
  if p_status not in ('active', 'pending_payment') then
    raise exception 'Invalid booking status';
  end if;
  if p_status = 'pending_payment' and not public.is_admin() then
    raise exception 'Only admins can create pending-payment bookings';
  end if;

  select * into v_slot from public.availabilities where id = p_class_id for update;
  if not found then raise exception 'Class availability not found'; end if;

  select count(*) into v_booked
    from public.bookings
   where class_id = p_class_id
     and date = p_date
     and status in ('active', 'pending', 'pending_payment');
  if v_booked >= coalesce(v_slot.max_students, 4) then
    raise exception 'Class is full';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'User profile not found'; end if;
  if p_status = 'active' and coalesce(v_profile.classes_remaining, 0) <= 0 then
    raise exception 'No classes remaining';
  end if;

  insert into public.bookings (user_id, user_name, user_email, class_id, date, time, status, created_at)
  values (p_user_id, v_profile.name, coalesce(v_profile.email, ''), p_class_id, p_date,
          split_part(coalesce(p_time, ''), ' - ', 1)::time, p_status, now())
  returning * into v_booking;

  if p_status = 'active' then
    update public.profiles
       set classes_remaining = classes_remaining - 1
     where id = p_user_id;
  end if;
  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_previous_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Not authorized to cancel this booking';
  end if;
  if v_booking.status = 'cancelled' then return v_booking; end if;

  v_previous_status := v_booking.status;
  update public.bookings set status = 'cancelled' where id = p_booking_id returning * into v_booking;
  if v_previous_status = 'active' then
    update public.profiles
       set classes_remaining = classes_remaining + 1
     where id = v_booking.user_id
       and exists (
         select 1 from public.bookings b
          where b.id = p_booking_id and b.status = 'cancelled'
       );
  end if;
  return v_booking;
end;
$$;

grant execute on function public.book_class(uuid, date, text, uuid, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
