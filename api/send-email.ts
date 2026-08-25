/**
 * Vercel Serverless Function — /api/send-email
 *
 * Envío de emails vía Resend, protegido:
 *  - Exige sesión Supabase (Bearer token del usuario).
 *  - Solo permite enviar al propio email del usuario (o admin a cualquier destinatario).
 *  - Rate-limit por usuario.
 * La API key de Resend nunca queda expuesta en el frontend.
 *
 * Variables requeridas en Vercel:
 *   RESEND_API_KEY, RESEND_FROM_EMAIL (opcional), ADMIN_EMAIL (opcional),
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import {
  templateWelcome,
  templateBookingConfirm,
  templateClassCancel,
  templateBirthday,
  templateLateCancel,
} from '../src/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'GPTE <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hernandezkevin001998@gmail.com';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Rate-limit simple en memoria: 6 envíos por usuario cada 10 minutos
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
const rateBucket = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (rateBucket.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateBucket.set(userId, hits);
    return true;
  }
  hits.push(now);
  rateBucket.set(userId, hits);
  return false;
}

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
  clase?: string;
  fecha?: string;
  hora?: string;
  tipo?: string;
  motivo?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Auth service not configured' });
  }

  // ── Verificar sesión Supabase ──────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'No autorizado: falta token de sesión' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'No autorizado: sesión inválida o expirada' });
  }
  const user = authData.user;

  // ── Rate limit ─────────────────────────────────────────────────────────────
  if (rateLimited(user.id)) {
    return res.status(429).json({ error: 'Demasiados correos enviados. Intenta en unos minutos.' });
  }

  const body = req.body as EmailPayload;
  const { type, to, nombre, clase, fecha, hora, tipo, motivo } = body;

  if (!type || !to || !nombre) {
    return res.status(400).json({ error: 'Missing required fields: type, to, nombre' });
  }

  // ── Validar destinatario: solo admin puede enviar a terceros ──────────────
  let isAdmin = false;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin' || profile?.role === 'teacher';
  } catch {
    isAdmin = false;
  }
  if (user.email === ADMIN_EMAIL) isAdmin = true;

  const userEmail = (user.email || '').toLowerCase();
  const targetEmail = to.toLowerCase();
  if (!isAdmin && userEmail !== targetEmail) {
    return res.status(403).json({ error: 'Solo puedes enviar correos a tu propio email' });
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
        if (!clase || !fecha || !hora) return res.status(400).json({ error: 'Missing fields: clase, fecha, hora' });
        subject = `✅ Reserva confirmada — ${clase} el ${fecha}`;
        html = templateBookingConfirm({ nombre, clase, fecha, hora, tipo });
        break;
      case 'class-cancel':
        if (!clase || !fecha || !hora) return res.status(400).json({ error: 'Missing fields: clase, fecha, hora' });
        subject = `❌ Clase cancelada — ${clase} el ${fecha}`;
        html = templateClassCancel({ nombre, clase, fecha, hora, motivo });
        break;
      case 'birthday':
        subject = `🎂 ¡Feliz Cumpleaños, ${nombre}! — GPTE`;
        html = templateBirthday(nombre);
        break;
      case 'late-cancel':
        if (!clase || !fecha || !hora) return res.status(400).json({ error: 'Missing fields: clase, fecha, hora' });
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

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('[Resend] Error inesperado:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}