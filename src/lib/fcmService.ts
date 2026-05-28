/**
 * fcmService.ts — Push notifications via Supabase (purga Firebase)
 * Regla de oro: Supabase = único backend.
 * FCM nativo deshabilitado (requiere backend seguro). Se loguea en tabla notifications.
 */
import { supabase } from './supabase';

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    // 1. Verificar que el usuario existe y tiene fcm_token
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, fcm_token')
      .eq('id', userId)
      .single();

    if (!profile) return;

    const fcmToken = (profile as { id: string; fcm_token?: string }).fcm_token;
    if (!fcmToken) {
      console.warn(`[fcmService] Usuario ${userId} sin FCM token.`);
    }

    // 2. Guardar notificación en tabla notifications (historial in-app)
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type: (data?.type as string) || 'info',
      read: false,
      created_at: new Date().toISOString(),
    });

    console.log('[fcmService] Notificación registrada en Supabase:', { title, body });
  } catch (err) {
    console.error('[fcmService] Error:', err);
  }
}

export const notifyEvaluationApproved = (userId: string, type: string) =>
  sendPushNotification(userId, 'Evaluación Aprobada', `Tu evaluación de ${type} ha sido aprobada.`);

export const notifyPaymentApproved = (userId: string) =>
  sendPushNotification(userId, 'Pago Aprobado', 'Tu pago ha sido aprobado exitosamente.');

export const notifyClassReminder = (userId: string) =>
  sendPushNotification(userId, 'Recordatorio de Clase', 'Tienes una clase reservada hoy.');

export const notifyNewClassAvailable = (userId: string) =>
  sendPushNotification(userId, 'Nueva Clase Disponible', 'Se ha publicado una nueva clase.');
