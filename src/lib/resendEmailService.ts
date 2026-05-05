/**
 * resendEmailService.ts — Cliente frontend para emails via Resend
 * 
 * Llama a /api/send-email (Vercel serverless) que usa Resend server-side.
 * Si el endpoint falla, encola en Firestore para reintento.
 * 
 * Reemplaza completamente a n8nEmailService.ts
 */

import { db } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type EmailType =
  | 'welcome'
  | 'booking-confirm'
  | 'class-cancel'
  | 'birthday'
  | 'late-cancel';

interface EmailPayload {
  type: EmailType;
  to: string;
  nombre: string;
  clase?: string;
  fecha?: string;
  hora?: string;
  tipo?: string;
  motivo?: string;
}

/** Fallback: guarda en Firestore si Resend falla */
async function queueEmail(payload: EmailPayload): Promise<void> {
  try {
    await addDoc(collection(db, 'email_queue'), {
      ...payload,
      status: 'pending',
      created_at: serverTimestamp(),
      retry_count: 0,
    });
    console.log('[Email] Encolado en Firestore para reintento:', payload.type);
  } catch (err) {
    console.warn('[Email] No se pudo encolar:', err);
  }
}

/** Envía via /api/send-email (Vercel serverless → Resend) */
async function send(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`[Email] API error ${res.status}:`, err);
      await queueEmail(payload);
      return false;
    }

    const data = await res.json();
    console.log(`[Email] ✅ Enviado: ${payload.type} → ${payload.to} (ID: ${data.id})`);
    return true;
  } catch (err) {
    console.warn('[Email] Error de red:', err);
    await queueEmail(payload);
    return false;
  }
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

export const emailService = {

  /**
   * ✉️ Bienvenida al registrarse
   */
  welcome: (nombre: string, to: string) =>
    send({ type: 'welcome', to, nombre }),

  /**
   * 📅 Confirmación de reserva de clase
   */
  bookingConfirm: (data: {
    nombre: string;
    to: string;
    clase: string;
    fecha: string;
    hora: string;
    tipo?: string;
  }) =>
    send({
      type: 'booking-confirm',
      to: data.to,
      nombre: data.nombre,
      clase: data.clase,
      fecha: data.fecha,
      hora: data.hora,
      tipo: data.tipo,
    }),

  /**
   * ❌ Cancelación de clase (admin cancela, notifica a inscritos)
   */
  classCancel: (data: {
    nombre: string;
    to: string;
    clase: string;
    fecha: string;
    hora: string;
    motivo?: string;
  }) =>
    send({
      type: 'class-cancel',
      to: data.to,
      nombre: data.nombre,
      clase: data.clase,
      fecha: data.fecha,
      hora: data.hora,
      motivo: data.motivo,
    }),

  /**
   * 🎂 Feliz cumpleaños
   */
  birthday: (nombre: string, to: string) =>
    send({ type: 'birthday', to, nombre }),

  /**
   * ⚠️ Cancelación tardía (menos de 2h antes)
   */
  lateCancel: (data: {
    nombre: string;
    to: string;
    clase: string;
    fecha: string;
    hora: string;
  }) =>
    send({
      type: 'late-cancel',
      to: data.to,
      nombre: data.nombre,
      clase: data.clase,
      fecha: data.fecha,
      hora: data.hora,
    }),
};
