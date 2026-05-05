/**
 * email.ts — Servicio de Email GPTE (via Resend + Firestore fallback)
 * 
 * Reemplaza la integración con N8N. Ahora usa Resend via /api/send-email.
 * Las funciones exportadas mantienen la misma firma para compatibilidad total.
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { emailService } from './resendEmailService';

// ─── Fallback genérico a Firestore ────────────────────────────────────────────

/**
 * Envío genérico de email via Resend. Si falla, encola en Firestore.
 * Mantiene backward-compat con código antiguo que usa sendEmail() directo.
 */
export const sendEmail = async (to: string | string[], subject: string, html: string) => {
  const recipients = Array.isArray(to) ? to : [to];

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'generic',
        to: recipients[0],
        nombre: 'Usuario',
        _raw: { subject, html, to: recipients }, // Pasamos raw para uso genérico
      }),
    });
    if (res.ok) return;
  } catch {}

  // Fallback Firestore (Firebase Email Extension)
  try {
    await addDoc(collection(db, 'mail'), {
      to: recipients,
      from: '"GPTE" <guantesparaencajar@gmail.com>',
      replyTo: 'guantesparaencajar@gmail.com',
      message: { subject, html },
      queued_at: new Date().toISOString(),
    });
    console.log('[email] Encolado en Firestore para:', recipients);
  } catch (error) {
    console.error('[email] Error al encolar en Firestore:', error);
  }
};

// ─── Emails específicos (via Resend templates) ────────────────────────────────

/** ✉️ Bienvenida al completar el onboarding */
export const sendWelcomeEmail = async (opts: {
  nombre: string;
  email: string;
  userId?: string;
}) => {
  return emailService.welcome(opts.nombre, opts.email);
};

/** 🎂 Cumpleaños */
export const sendBirthdayEmail = async (opts: {
  nombre: string;
  email: string;
}) => {
  return emailService.birthday(opts.nombre, opts.email);
};

/** 📅 Confirmación de reserva */
export const sendBookingConfirmEmail = async (opts: {
  nombre: string;
  email: string;
  adminEmail?: string;
  clase: string;
  fecha: string;
  hora: string;
  tipo?: string;
}) => {
  return emailService.bookingConfirm({
    nombre: opts.nombre,
    to: opts.email,
    clase: opts.clase,
    fecha: opts.fecha,
    hora: opts.hora,
    tipo: opts.tipo,
  });
};

/** ❌ Cancelación de clase (admin cancela) */
export const sendClassCancelEmail = async (opts: {
  nombre: string;
  email: string;
  clase: string;
  fecha: string;
  hora: string;
  motivo?: string;
}) => {
  return emailService.classCancel({
    nombre: opts.nombre,
    to: opts.email,
    clase: opts.clase,
    fecha: opts.fecha,
    hora: opts.hora,
    motivo: opts.motivo,
  });
};

/** ⚠️ Cancelación fuera de plazo (menos de 2h) */
export const sendLateCancelRuleEmail = async (opts: {
  nombre: string;
  email: string;
  clase: string;
  fecha: string;
  hora: string;
}) => {
  return emailService.lateCancel({
    nombre: opts.nombre,
    to: opts.email,
    clase: opts.clase,
    fecha: opts.fecha,
    hora: opts.hora,
  });
};

/** 💪 Fidelización — No asistió a la clase */
export const sendLoyaltyNoShowEmail = async (opts: {
  nombre: string;
  email: string;
  clase: string;
  fecha: string;
}) => {
  // Reusamos lateCancel como aviso de no-show (misma estructura)
  return emailService.lateCancel({
    nombre: opts.nombre,
    to: opts.email,
    clase: opts.clase,
    fecha: opts.fecha,
    hora: '',
  });
};
