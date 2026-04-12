/**
 * n8nEmailService.ts — Servicio de correos via N8N
 * Todos los disparadores de correo de GPTE van aquí.
 * N8N recibe el webhook, compone y envía el correo via Gmail.
 *
 * URL base: configurar VITE_N8N_EMAIL_BASE en .env
 * Ejemplo: https://gpte.app.n8n.cloud/webhook
 *
 * Si N8N no está disponible, la llamada falla silenciosamente
 * y registra en Firestore para reintento.
 */

import { db } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const N8N_BASE = (import.meta.env.VITE_N8N_EMAIL_BASE as string) || null;

/** Encola en Firestore si N8N falla, para reintentos */
async function queueEmail(type: string, payload: Record<string, any>) {
  try {
    await addDoc(collection(db, 'email_queue'), {
      type,
      payload,
      status: 'pending',
      created_at: serverTimestamp(),
      retry_count: 0,
    });
  } catch (err) {
    console.warn('[emailQueue] No se pudo encolar el correo:', err);
  }
}

/** Dispatch genérico al webhook de N8N */
async function dispatch(
  endpoint: string,
  payload: Record<string, any>
): Promise<boolean> {
  if (!N8N_BASE) {
    console.warn(`[n8nEmail] VITE_N8N_EMAIL_BASE no configurado. Encolando: ${endpoint}`);
    await queueEmail(endpoint, payload);
    return false;
  }
  try {
    const res = await fetch(`${N8N_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, app: 'GPTE', sent_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      console.warn(`[n8nEmail] ${endpoint} respondió ${res.status}. Encolando...`);
      await queueEmail(endpoint, payload);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[n8nEmail] Error en ${endpoint}:`, err);
    await queueEmail(endpoint, payload);
    return false;
  }
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface EmailUser {
  name: string;
  email: string;
  id?: string;
}

export interface BookingPayload {
  studentName: string;
  studentEmail: string;
  adminEmail?: string;
  className: string;
  classDate: string;      // "Lunes 14 de Abril"
  classTime: string;      // "7:00 PM"
  classType?: string;
  bookingId?: string;
  cancelReason?: string;
}

// ─── CORREOS ──────────────────────────────────────────────────────────────────

export const n8nEmail = {

  /**
   * ✉️ 1. BIENVENIDA — Se envía cuando el estudiante completa el onboarding
   */
  welcome: async (user: EmailUser) => {
    return dispatch('bienvenida', {
      nombre: user.name,
      email: user.email,
      userId: user.id,
    });
  },

  /**
   * 🎂 2. CUMPLEAÑOS — Se envía el día del cumpleaños (CRON diario en N8N)
   * El front solo registra la fecha al guardar el perfil.
   * N8N hace el CRON y consulta Firestore directamente.
   * Esta función es para envío manual o prueba desde el front.
   */
  birthday: async (user: EmailUser) => {
    return dispatch('cumpleanos', {
      nombre: user.name,
      email: user.email,
      userId: user.id,
    });
  },

  /**
   * 📅 3. CONFIRMACIÓN DE RESERVA — Se envía al reservar una clase
   */
  bookingConfirm: async (payload: BookingPayload) => {
    return dispatch('reserva-confirmada', {
      nombre: payload.studentName,
      email: payload.studentEmail,
      adminEmail: payload.adminEmail || 'hernandezkevin001998@gmail.com',
      clase: payload.className,
      fecha: payload.classDate,
      hora: payload.classTime,
      tipo: payload.classType || 'Clase Grupal',
      bookingId: payload.bookingId,
    });
  },

  /**
   * ❌ 4. CANCELACIÓN DE CLASE (admin cancela la clase) — Se envía a todos los inscritos
   */
  classCancel: async (payload: BookingPayload) => {
    return dispatch('clase-cancelada', {
      nombre: payload.studentName,
      email: payload.studentEmail,
      clase: payload.className,
      fecha: payload.classDate,
      hora: payload.classTime,
      motivo: payload.cancelReason || 'Sin motivo especificado',
    });
  },

  /**
   * ⚠️ 5. REGLA DE CANCELACIÓN TARDÍA — No canceló con 2h de antelación
   * Se envía cuando el sistema detecta que la clase ya pasó y el estudiante no canceló a tiempo.
   */
  lateCancel: async (payload: BookingPayload) => {
    return dispatch('cancelacion-tardia', {
      nombre: payload.studentName,
      email: payload.studentEmail,
      clase: payload.className,
      fecha: payload.classDate,
      hora: payload.classTime,
      mensaje: `Recuerda que las clases deben cancelarse con mínimo 2 horas de anticipación. El valor de la clase será descontado de tu plan según nuestras reglas.`,
    });
  },

  /**
   * 💪 6. FIDELIZACIÓN — No asistió pero queremos recuperarlo
   * Se envía 24h después si el booking queda como 'no_show'
   */
  loyaltyNoShow: async (payload: BookingPayload) => {
    return dispatch('fidelizacion-no-asistio', {
      nombre: payload.studentName,
      email: payload.studentEmail,
      clase: payload.className,
      fecha: payload.classDate,
      mensaje: `Notamos que no pudiste asistir a tu clase. Te esperamos en la próxima sesión. ¡Recuerda que la consistencia es la clave del campeón! 🥊`,
    });
  },
};

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

/**
 * Verifica si un usuario cumple años HOY (para trigger local si es necesario)
 */
export function isBirthdayToday(birthdayISO?: string): boolean {
  if (!birthdayISO) return false;
  const today = new Date();
  const bday = new Date(birthdayISO);
  return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
}

/**
 * Verifica si una reserva ya no puede cancelarse (quedan < 2h para la clase)
 */
export function isLateToCancelClass(classDateISO: string): boolean {
  const classTime = new Date(classDateISO);
  const now = new Date();
  const diffMs = classTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < 2 && diffHours > 0;
}

/**
 * Verifica si una reserva fue no-show (la clase ya pasó y no se canceló)
 */
export function isNoShow(classDateISO: string, status: string): boolean {
  if (status === 'cancelled' || status === 'no_show') return false;
  const classTime = new Date(classDateISO);
  const now = new Date();
  return now.getTime() > classTime.getTime() + 60 * 60 * 1000; // 1h después de la clase
}
