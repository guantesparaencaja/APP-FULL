/**
 * Analytics Service — GPTE
 *
 * Escribe logs de actividad y estadísticas a Supabase.
 * Opera de forma silenciosa: si Supabase no está configurado, simplemente no hace nada.
 * No bloquea ni interrumpe el flujo principal de la app.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ─── Tipos locales explícitos (evita inferencia `never` del cliente sin schema) ─

interface ActivityLogInsert {
  user_id: string;
  action: string;
  metadata?: Record<string, unknown>;
}

interface UserStatsRow {
  user_id: string;
  total_classes: number;
  classes_this_month: number;
  no_shows: number;
  last_class_date?: string | null;
  updated_at?: string;
}

interface EmailLogInsert {
  user_id: string;
  template: string;
  recipient_email: string;
  status: 'sent' | 'failed' | 'pending';
  n8n_execution_id?: string | null;
}

// ─── Activity Logging ─────────────────────────────────────────────────────────

/**
 * Registra una acción de usuario en Supabase activity_logs.
 * Uso: trackAction(user.uid, 'booking_created', { class_id: '...', date: '...' })
 */
export async function trackAction(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const payload: ActivityLogInsert = { user_id: userId, action, metadata };
    const { error } = await (supabase as any)
      .from('activity_logs')
      .insert(payload);

    if (error) console.warn('[Analytics] Error al registrar acción:', error.message);
  } catch (e) {
    console.warn('[Analytics] Error inesperado:', e);
  }
}

// ─── User Stats ───────────────────────────────────────────────────────────────

/**
 * Incrementa el contador de clases del usuario.
 * Se llama cuando una reserva es confirmada (no cancelada).
 */
export async function incrementUserClasses(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { data: existing } = await (supabase as any)
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single() as { data: UserStatsRow | null };

    const now = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const lastClassMonth = existing?.last_class_date
      ? new Date(existing.last_class_date).getMonth()
      : -1;

    const stats: UserStatsRow = {
      user_id: userId,
      total_classes: (existing?.total_classes ?? 0) + 1,
      classes_this_month: currentMonth === lastClassMonth
        ? (existing?.classes_this_month ?? 0) + 1
        : 1,
      no_shows: existing?.no_shows ?? 0,
      last_class_date: now,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('user_stats')
      .upsert(stats, { onConflict: 'user_id' });

    if (error) console.warn('[Analytics] Error al actualizar stats:', error.message);
  } catch (e) {
    console.warn('[Analytics] Error inesperado en stats:', e);
  }
}

/**
 * Registra un no-show (reserva que no fue cancelada y el usuario no asistió).
 */
export async function recordNoShow(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const { data: existing } = await (supabase as any)
      .from('user_stats')
      .select('no_shows, total_classes, classes_this_month')
      .eq('user_id', userId)
      .single() as { data: Partial<UserStatsRow> | null };

    const payload: UserStatsRow = {
      user_id: userId,
      total_classes: existing?.total_classes ?? 0,
      classes_this_month: existing?.classes_this_month ?? 0,
      no_shows: (existing?.no_shows ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('user_stats')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) console.warn('[Analytics] Error al registrar no-show:', error.message);
  } catch (e) {
    console.warn('[Analytics] Error inesperado en no-show:', e);
  }
}

/**
 * Obtiene las estadísticas de un usuario desde Supabase.
 * Retorna null si Supabase no está configurado o si no hay datos.
 */
export async function getUserStats(userId: string): Promise<UserStatsRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await (supabase as any)
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single() as { data: UserStatsRow | null; error: unknown };

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Email Log ────────────────────────────────────────────────────────────────

/**
 * Registra un email enviado por Resend / serverless function.
 */
export async function logEmailSent(
  userId: string,
  template: string,
  recipientEmail: string,
  n8nExecutionId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const payload: EmailLogInsert = {
      user_id: userId,
      template,
      recipient_email: recipientEmail,
      status: 'sent',
      n8n_execution_id: n8nExecutionId ?? null,
    };

    const { error } = await (supabase as any)
      .from('email_queue_log')
      .insert(payload);

    if (error) console.warn('[Analytics] Error al registrar email:', error.message);
  } catch (e) {
    console.warn('[Analytics] Error inesperado en email log:', e);
  }
}
