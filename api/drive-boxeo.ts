/**
 * Vercel Serverless Function — /api/drive-boxeo
 *
 * Lista los videos de la carpeta de Google Drive "Videos de box" (solo admin).
 * Los videos NO se almacenan en Supabase: viven en Drive y se reproducen
 * directo desde `drive.usercontent.google.com` (range requests + CORS *).
 *
 * - Exige sesión Supabase con rol admin.
 * - Usa el service account del proyecto para autenticarse con la API de Drive.
 * - Variables opcionales en Vercel: DRIVE_PRIVATE_KEY, DRIVE_CLIENT_EMAIL,
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ADMIN_EMAIL
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { importPKCS8, SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hernandezkevin001998@gmail.com';

// Carpeta compartida "Videos de box" (1qiJzBMvIZEVk0A3mw1qBDT2gZn5yViSQ)
const BOXEO_FOLDER_ID = '1qiJzBMvIZEVk0A3mw1qBDT2gZn5yViSQ';

const CLIENT_EMAIL = process.env.DRIVE_CLIENT_EMAIL || '';
const PRIVATE_KEY = (process.env.DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

async function getDriveToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const alg = 'RS256';
  const privateKey = await importPKCS8(PRIVATE_KEY, alg);
  const jwt = await new SignJWT({
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
  })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error('Drive auth error: ' + (await res.text()));
  return (await res.json()).access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Auth service not configured' });
  }
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return res.status(500).json({ error: 'Drive service not configured' });
  }

  // ── Verificar sesión Supabase + rol admin ──────────────────────────────────
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
  if (user.email === ADMIN_EMAIL) {
    // fallback directo por email admin
  } else {
    let isAdmin = false;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      isAdmin = profile?.role === 'admin';
    } catch {
      isAdmin = false;
    }
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo un admin puede listar los videos de boxeo' });
    }
  }

  try {
    const driveToken = await getDriveToken();
    const q =
      `'${BOXEO_FOLDER_ID}' in parents and trashed=false and mimeType='video/mp4'`;
    const qs = new URLSearchParams({
      q,
      fields: 'files(id,name,size,mimeType,modifiedTime)',
      pageSize: '500',
      orderBy: 'name_natural',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${driveToken}` },
    });
    if (!listRes.ok) {
      return res.status(502).json({ error: 'Drive error: ' + (await listRes.text()) });
    }
    const data = (await listRes.json()) as {
      files?: { id: string; name: string; size?: string; mimeType?: string; modifiedTime?: string }[];
    };
    const files = (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      size: Number(f.size || 0),
      modifiedTime: f.modifiedTime || '',
      url: `https://drive.usercontent.google.com/download?id=${f.id}&export=download`,
    }));
    return res.status(200).json({ files });
  } catch (err: any) {
    console.error('[drive-boxeo] Error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Error listando la carpeta de boxeo' });
  }
}
