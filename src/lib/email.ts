import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// ── N8N Integration ────────────────────────────────────────────────────────────
// Set VITE_N8N_EMAIL_BASE in .env to activate N8N email delivery.
// Example: VITE_N8N_EMAIL_BASE=https://gpte.app.n8n.cloud/webhook
const N8N_BASE = (import.meta.env.VITE_N8N_EMAIL_BASE as string) || null;

async function tryN8N(endpoint: string, payload: object): Promise<boolean> {
  if (!N8N_BASE) return false;
  try {
    const res = await fetch(`${N8N_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, app: 'GPTE', sent_at: new Date().toISOString() }),
    });
    if (res.ok) {
      console.log(`[n8n] ${endpoint} OK`);
      return true;
    }
  } catch {}
  return false;
}

// ── Generic sendEmail (backward-compatible) ────────────────────────────────────
/**
 * Envía un correo: intenta N8N primero, luego Firestore mail queue.
 * Todos los archivos que ya usan sendEmail() siguen funcionando sin cambios.
 */
export const sendEmail = async (to: string | string[], subject: string, html: string) => {
  const recipients = Array.isArray(to) ? to : [to];

  // 1. Intento con N8N
  const sentViaN8N = await tryN8N('correo-generico', {
    to: recipients,
    subject,
    html,
  });

  // 2. Fallback: Firestore mail queue (Firebase Email Extension)
  if (!sentViaN8N) {
    try {
      await addDoc(collection(db, 'mail'), {
        to: recipients,
        from: '"GUANTES" <guantesparaencajar@gmail.com>',
        replyTo: 'guantesparaencajar@gmail.com',
        message: { subject, html },
        queued_at: new Date().toISOString(),
      });
      console.log('[email] Encolado en Firestore para:', recipients);
    } catch (error) {
      console.error('[email] Error al encolar:', error);
    }
  }
};

// ── Correos específicos via N8N ───────────────────────────────────────────────

/** ✉️ Bienvenida al completar el onboarding */
export const sendWelcomeEmail = async (opts: {
  nombre: string;
  email: string;
  userId?: string;
}) => {
  const sent = await tryN8N('bienvenida', opts);
  if (!sent) {
    await sendEmail(
      opts.email,
      '¡Bienvenido a Guantes Para Encajarte! 🥊',
      `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:16px;max-width:600px;margin:auto">
        <h1 style="color:#3f83f8;text-transform:uppercase">¡Hola ${opts.nombre}! 🥊</h1>
        <p>Tu perfil ha sido configurado con éxito. Ya puedes explorar Saberes, Entrenamientos y reservar tus clases.</p>
        <p style="color:#64748b;font-size:12px">Equipo GPTE — Guantes Para Encajarte</p>
      </div>`
    );
  }
};

/** 🎂 Cumpleaños — Se llama al detectar el día del cumpleaños */
export const sendBirthdayEmail = async (opts: {
  nombre: string;
  email: string;
}) => {
  const sent = await tryN8N('cumpleanos', opts);
  if (!sent) {
    await sendEmail(
      opts.email,
      '¡Feliz Cumpleaños desde Guantes Para Encajarte! 🎂🥊',
      `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:16px;max-width:600px;margin:auto">
        <h1 style="color:#facc15">¡Feliz Cumpleaños, ${opts.nombre}! 🎂</h1>
        <p>En este día especial, todo el equipo de GPTE te desea lo mejor. ¡Que este año esté lleno de golpes perfectos y metas cumplidas!</p>
        <p style="color:#64748b;font-size:12px">Equipo GPTE — Guantes Para Encajarte</p>
      </div>`
    );
  }
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
  const sent = await tryN8N('reserva-confirmada', opts);
  if (!sent) {
    const to = opts.adminEmail
      ? [opts.email, opts.adminEmail]
      : [opts.email];
    await sendEmail(
      to,
      '📅 Clase Confirmada — Guantes Para Encajarte',
      `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:16px;max-width:600px;margin:auto">
        <h2 style="color:#22c55e">✅ ¡Clase Confirmada, ${opts.nombre}!</h2>
        <p>Tu reserva para <strong>${opts.clase}</strong> el <strong>${opts.fecha}</strong> a las <strong>${opts.hora}</strong> está confirmada.</p>
        <hr style="border-color:#1e293b;margin:16px 0"/>
        <p style="font-size:12px;color:#64748b">⚠️ Recuerda: cancela con mínimo 2 horas de anticipación si no puedes asistir, de lo contrario la clase será descontada de tu plan.</p>
      </div>`
    );
  }
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
  const sent = await tryN8N('clase-cancelada', opts);
  if (!sent) {
    await sendEmail(
      opts.email,
      '❌ Clase Cancelada — Guantes Para Encajarte',
      `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:16px;max-width:600px;margin:auto">
        <h2 style="color:#ef4444">❌ Clase Cancelada</h2>
        <p>Hola <strong>${opts.nombre}</strong>, tu reserva para <strong>${opts.clase}</strong> el <strong>${opts.fecha}</strong> a las <strong>${opts.hora}</strong> ha sido cancelada.</p>
        ${opts.motivo ? `<p>Motivo: ${opts.motivo}</p>` : ''}
        <p>La clase ha sido devuelta a tu plan disponible.</p>
      </div>`
    );
  }
};

/** ⚠️ Regla: no canceló con 2h de anticipación */
export const sendLateCancelRuleEmail = async (opts: {
  nombre: string;
  email: string;
  clase: string;
  fecha: string;
  hora: string;
}) => {
  const sent = await tryN8N('cancelacion-tardia', opts);
  if (!sent) {
    await sendEmail(
      opts.email,
      '⚠️ Aviso: Cancelación Fuera de Plazo — Guantes Para Encajarte',
      `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:16px;max-width:600px;margin:auto">
        <h2 style="color:#f59e0b">⚠️ Aviso Importante</h2>
        <p>Hola <strong>${opts.nombre}</strong>,</p>
        <p>Detectamos que cancelaste tu clase de <strong>${opts.clase}</strong> del <strong>${opts.fecha}</strong> a las <strong>${opts.hora}</strong> con menos de 2 horas de anticipación.</p>
        <div style="background:#1e293b;border:1px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0">
          <p style="color:#f59e0b;font-weight:bold">📋 Regla de cancelación:</p>
          <p>Las clases deben cancelarse con mínimo <strong>2 horas</strong> de anticipación. Las clases no canceladas dentro de este tiempo serán descontadas automáticamente de tu plan.</p>
        </div>
        <p style="color:#64748b;font-size:12px">Si tienes dudas, contáctanos directamente.</p>
      </div>`
    );
  }
};

/** 💪 Fidelización — No asistió a la clase */
export const sendLoyaltyNoShowEmail = async (opts: {
  nombre: string;
  email: string;
  clase: string;
  fecha: string;
}) => {
  const sent = await tryN8N('fidelizacion-no-asistio', opts);
  if (!sent) {
    await sendEmail(
      opts.email,
      '💪 ¡Te echamos de menos! — Guantes Para Encajarte',
      `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:16px;max-width:600px;margin:auto">
        <h2 style="color:#3f83f8">💪 ¡Te echamos de menos, ${opts.nombre}!</h2>
        <p>Notamos que no pudiste asistir a tu clase de <strong>${opts.clase}</strong> el <strong>${opts.fecha}</strong>.</p>
        <p>Recuerda que la consistencia es la clave del campeón. ¡Te esperamos en la próxima sesión con toda la energía! 🥊</p>
        <p style="color:#64748b;font-size:12px">Equipo GPTE — Guantes Para Encajarte</p>
      </div>`
    );
  }
};

