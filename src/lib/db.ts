/**
 * db.ts — Helpers de base de datos GPTE via Supabase PostgreSQL
 * Reemplaza todas las operaciones de Firestore.
 *
 * Patrón: funciones pequeñas, tipadas, que lanzan errores descriptivos.
 */

import { supabase } from './supabase';
import type {
  Profile, Availability, AvailabilityException,
  Booking, WorkoutVideo, WorkoutCategory,
  Payment, Plan, Notification,
} from './supabase';

// ─── PROFILES ────────────────────────────────────────────────────────────────

/** Obtiene el perfil completo de un usuario por su UUID */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[db] getProfile:', error.message);
  return data ?? null;
}

/** Upsert del perfil (crea si no existe, actualiza si existe) */
export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error('[db] upsertProfile: ' + error.message);
  return data;
}

/** Actualiza campos específicos del perfil */
export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error('[db] updateProfile: ' + error.message);
}

/** Obtiene todos los perfiles (solo admin) */
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error('[db] getAllProfiles: ' + error.message);
  return data ?? [];
}

// ─── AVAILABILITIES ──────────────────────────────────────────────────────────

/** Obtiene todos los horarios recurrentes */
export async function getAvailabilities(): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availabilities')
    .select('*')
    .order('day_of_week');
  if (error) throw new Error('[db] getAvailabilities: ' + error.message);
  return data ?? [];
}

/** Crea un nuevo horario recurrente */
export async function addAvailability(
  slot: Omit<Availability, 'id' | 'created_at'>
): Promise<Availability> {
  const { data, error } = await supabase
    .from('availabilities')
    .insert(slot)
    .select()
    .single();
  if (error) throw new Error('[db] addAvailability: ' + error.message);
  return data;
}

/** Actualiza un horario recurrente */
export async function updateAvailability(
  id: string,
  updates: Partial<Availability>
): Promise<void> {
  const { error } = await supabase
    .from('availabilities')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error('[db] updateAvailability: ' + error.message);
}

/** Elimina permanentemente un horario */
export async function deleteAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from('availabilities')
    .delete()
    .eq('id', id);
  if (error) throw new Error('[db] deleteAvailability: ' + error.message);
}

// ─── AVAILABILITY EXCEPTIONS ─────────────────────────────────────────────────

/** Obtiene excepciones de disponibilidad (días cancelados) */
export async function getAvailabilityExceptions(): Promise<AvailabilityException[]> {
  const { data, error } = await supabase
    .from('availability_exceptions')
    .select('*');
  if (error) throw new Error('[db] getAvailabilityExceptions: ' + error.message);
  return data ?? [];
}

/** Agrega una excepción (cancela un horario para un día específico) */
export async function addAvailabilityException(
  slotId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('availability_exceptions')
    .insert({ slot_id: slotId, date });
  if (error) throw new Error('[db] addAvailabilityException: ' + error.message);
}

/** Elimina una excepción (restaura un horario cancelado) */
export async function deleteAvailabilityException(id: string): Promise<void> {
  const { error } = await supabase
    .from('availability_exceptions')
    .delete()
    .eq('id', id);
  if (error) throw new Error('[db] deleteAvailabilityException: ' + error.message);
}

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

/** Obtiene reservas de un usuario */
export async function getUserBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw new Error('[db] getUserBookings: ' + error.message);
  return data ?? [];
}

/** Obtiene todas las reservas para una fecha específica */
export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .eq('status', 'active');
  if (error) throw new Error('[db] getBookingsByDate: ' + error.message);
  return data ?? [];
}

/** Obtiene todas las reservas (admin) */
export async function getAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw new Error('[db] getAllBookings: ' + error.message);
  return data ?? [];
}

/** Crea una nueva reserva */
export async function addBooking(
  booking: Omit<Booking, 'id' | 'created_at'>
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  if (error) throw new Error('[db] addBooking: ' + error.message);
  return data;
}

/** Cancela una reserva (cambia status a 'cancelled') */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  if (error) throw new Error('[db] cancelBooking: ' + error.message);
}

/** Actualiza una reserva */
export async function updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error('[db] updateBooking: ' + error.message);
}

// ─── WORKOUT VIDEOS ──────────────────────────────────────────────────────────

/** Obtiene todos los videos de entrenamiento */
export async function getWorkoutVideos(category?: string): Promise<WorkoutVideo[]> {
  let query = supabase.from('workout_videos').select('*').order('order_index');
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw new Error('[db] getWorkoutVideos: ' + error.message);
  return data ?? [];
}

/** Crea un video de entrenamiento */
export async function addWorkoutVideo(
  video: Omit<WorkoutVideo, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkoutVideo> {
  const { data, error } = await supabase
    .from('workout_videos')
    .insert(video)
    .select()
    .single();
  if (error) throw new Error('[db] addWorkoutVideo: ' + error.message);
  return data;
}

/** Actualiza un video de entrenamiento */
export async function updateWorkoutVideo(
  id: string,
  updates: Partial<WorkoutVideo>
): Promise<void> {
  const { error } = await supabase
    .from('workout_videos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error('[db] updateWorkoutVideo: ' + error.message);
}

/** Elimina un video de entrenamiento */
export async function deleteWorkoutVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_videos')
    .delete()
    .eq('id', id);
  if (error) throw new Error('[db] deleteWorkoutVideo: ' + error.message);
}

// ─── WORKOUT CATEGORIES ──────────────────────────────────────────────────────

/** Obtiene todas las categorías de entrenamiento */
export async function getWorkoutCategories(): Promise<WorkoutCategory[]> {
  const { data, error } = await supabase
    .from('workout_categories')
    .select('*')
    .order('order_index');
  if (error) throw new Error('[db] getWorkoutCategories: ' + error.message);
  return data ?? [];
}

/** Crea una categoría */
export async function addWorkoutCategory(
  cat: Omit<WorkoutCategory, 'id' | 'created_at'>
): Promise<WorkoutCategory> {
  const { data, error } = await supabase
    .from('workout_categories')
    .insert(cat)
    .select()
    .single();
  if (error) throw new Error('[db] addWorkoutCategory: ' + error.message);
  return data;
}

/** Elimina una categoría */
export async function deleteWorkoutCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_categories')
    .delete()
    .eq('id', id);
  if (error) throw new Error('[db] deleteWorkoutCategory: ' + error.message);
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

/** Obtiene los pagos de un usuario */
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('[db] getUserPayments: ' + error.message);
  return data ?? [];
}

/** Obtiene todos los pagos (admin) */
export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error('[db] getAllPayments: ' + error.message);
  return data ?? [];
}

/** Registra un pago nuevo */
export async function addPayment(
  payment: Omit<Payment, 'id' | 'created_at'>
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();
  if (error) throw new Error('[db] addPayment: ' + error.message);
  return data;
}

/** Actualiza el estado de un pago */
export async function updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error('[db] updatePayment: ' + error.message);
}

// ─── PLANES ──────────────────────────────────────────────────────────────────

/** Obtiene todos los planes activos */
export async function getPlanes(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('planes')
    .select('*')
    .eq('active', true)
    .order('price');
  if (error) throw new Error('[db] getPlanes: ' + error.message);
  return data ?? [];
}

/** Crea un plan */
export async function addPlan(plan: Omit<Plan, 'id' | 'created_at'>): Promise<Plan> {
  const { data, error } = await supabase
    .from('planes')
    .insert(plan)
    .select()
    .single();
  if (error) throw new Error('[db] addPlan: ' + error.message);
  return data;
}

/** Actualiza un plan */
export async function updatePlan(id: string, updates: Partial<Plan>): Promise<void> {
  const { error } = await supabase
    .from('planes')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error('[db] updatePlan: ' + error.message);
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

/** Obtiene notificaciones de un usuario */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('[db] getUserNotifications: ' + error.message);
  return data ?? [];
}

/** Marca una notificación como leída */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw new Error('[db] markNotificationRead: ' + error.message);
}

/** Crea una notificación */
export async function addNotification(
  notification: Omit<Notification, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert(notification);
  if (error) throw new Error('[db] addNotification: ' + error.message);
}
