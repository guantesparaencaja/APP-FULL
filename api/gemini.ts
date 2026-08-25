/**
 * Vercel Serverless Function — /api/gemini
 *
 * Proxy seguro hacia Google Gemini. La API key SOLO existe aquí (server-side),
 * nunca en el bundle del frontend.
 *
 * - Exige sesión Supabase (Bearer token) para evitar abuso de costos.
 * - Variables en Vercel: GEMINI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Rate-limit simple: 30 llamadas por usuario cada 10 minutos
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini no configurado (falta GEMINI_API_KEY)' });
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

  if (rateLimited(authData.user.id)) {
    return res.status(429).json({ error: 'Demasiadas llamadas. Intenta en unos minutos.' });
  }

  const { model, contents, generationConfig } = req.body || {};
  if (!model || !Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: 'Faltan campos: model, contents' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model,
      contents,
      config: generationConfig || undefined,
    });
    return res.status(200).json({ text: response.text || '' });
  } catch (err: any) {
    console.error('[Gemini] Error:', err?.message || err);
    return res.status(502).json({ error: err?.message || 'Error llamando a Gemini' });
  }
}