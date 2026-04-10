import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// This function sends a push notification via FCM HTTP v1 API or legacy API.
// Note: In a production app, this should be done from a secure backend (Cloud Functions).
// For this app, we'll implement it here, but it requires the FCM Server Key.
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    // 1. Get user's FCM token from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const fcmToken = userData.fcm_token;

    if (!fcmToken) {
      console.warn(`User ${userId} has no FCM token.`);
      return;
    }

    // 2. Save to in-app notification history
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message: body,
      type: data?.type || 'info',
      read: false,
      created_at: serverTimestamp(),
      data: data || {},
    });

    // 3. Send actual Push Notification via FCM (DISABLED PER USER REQUEST - NOT STABLE)
    // To re-enable, a secure backend with FCM HTTP v1 or a valid Server Key is required.
    console.log('Push notification logged in Firestore:', {title, body});
  } catch (err) {
    console.error('Error in notification service:', err);
  }
}

// Helper for specific notification types
export const notifyEvaluationApproved = (userId: string, type: string) =>
  sendPushNotification(userId, 'Evaluación Aprobada', `Tu evaluación de ${type} ha sido aprobada.`);

export const notifyPaymentApproved = (userId: string) =>
  sendPushNotification(userId, 'Pago Aprobado', 'Tu pago ha sido aprobado exitosamente.');

export const notifyClassReminder = (userId: string) =>
  sendPushNotification(userId, 'Recordatorio de Clase', 'Tienes una clase reservada hoy.');

export const notifyNewClassAvailable = (userId: string) =>
  sendPushNotification(userId, 'Nueva Clase Disponible', 'Se ha publicado una nueva clase.');
