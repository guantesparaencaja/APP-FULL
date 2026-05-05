/**
 * Vercel Serverless Function — /api/send-email
 * 
 * Maneja el envío de emails via Resend de forma segura (server-side).
 * La API key nunca queda expuesta en el frontend.
 * 
 * Variable requerida en Vercel: RESEND_API_KEY
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import {
  templateWelcome,
  templateBookingConfirm,
  templateClassCancel,
  templateBirthday,
  templateLateCancel,
} from '../src/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email remitente — una vez verificado tu dominio en Resend, usa algo como:
// 'GPTE <noreply@tudominio.com>'
// Mientras tanto, usa el onboarding de Resend:
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'GPTE <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hernandezkevin001998@gmail.com';

export type EmailType =
  | 'welcome'
  | 'booking-confirm'
  | 'class-cancel'
  | 'birthday'
  | 'late-cancel';

export interface EmailPayload {
  type: EmailType;
  to: string;
  nombre: string;
  // booking-confirm & class-cancel & late-cancel
  clase?: string;
  fecha?: string;
  hora?: string;
  tipo?: string;
  motivo?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar que la API key existe
  if (!process.env.RESEND_API_KEY) {
    console.error('[Resend] RESEND_API_KEY no configurada');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const body = req.body as EmailPayload;
  const { type, to, nombre, clase, fecha, hora, tipo, motivo } = body;

  if (!type || !to || !nombre) {
    return res.status(400).json({ error: 'Missing required fields: type, to, nombre' });
  }

  try {
    let subject = '';
    let html = '';

    switch (type) {
      case 'welcome':
        subject = `¡Bienvenido a GPTE, ${nombre}! 🥊`;
        html = templateWelcome(nombre);
        break;

      case 'booking-confirm':
        if (!clase || !fecha || !hora) {
          return res.status(400).json({ error: 'Missing fields: clase, fecha, hora' });
        }
        subject = `✅ Reserva confirmada — ${clase} el ${fecha}`;
        html = templateBookingConfirm({ nombre, clase, fecha, hora, tipo });
        break;

      case 'class-cancel':
        if (!clase || !fecha || !hora) {
          return res.status(400).json({ error: 'Missing fields: clase, fecha, hora' });
        }
        subject = `❌ Clase cancelada — ${clase} el ${fecha}`;
        html = templateClassCancel({ nombre, clase, fecha, hora, motivo });
        break;

      case 'birthday':
        subject = `🎂 ¡Feliz Cumpleaños, ${nombre}! — GPTE`;
        html = templateBirthday(nombre);
        break;

      case 'late-cancel':
        if (!clase || !fecha || !hora) {
          return res.status(400).json({ error: 'Missing fields: clase, fecha, hora' });
        }
        subject = `⚠️ Cancelación fuera de tiempo — ${clase}`;
        html = templateLateCancel({ nombre, clase, fecha, hora });
        break;

      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('[Resend] Error al enviar:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Resend] Email "${type}" enviado a ${to}. ID: ${data?.id}`);
    return res.status(200).json({ success: true, id: data?.id });

  } catch (err: any) {
    console.error('[Resend] Error inesperado:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
