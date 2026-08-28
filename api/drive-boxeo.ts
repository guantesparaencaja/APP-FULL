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

const CLIENT_EMAIL = process.env.DRIVE_CLIENT_EMAIL || 'drive-firestore-sync@gpte007.iam.gserviceaccount.com';
const PRIVATE_KEY =
  process.env.DRIVE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\n' +
    'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDjVe0WpWHR9Jm0\n' +
    'o0hxbVmSwQLsaOKCebRBqaYPJcavjpa4pU5OVt4knw2C8i6ze8dCHTchDN/YmhcL\n' +
    '/psSI6kUCTctTe70eOykbES1+3TasciHfJXWvNM4+GYcZvRHEOgSOoueSjB9D2Mz\n' +
    'iO9Qq7rYZvGtZXbKBZvWDUx9KuDXtvogFMgYr7D/md778iSSkSqJTHDfTLy+fXSD\n' +
    '29tF51Sc+AJQYwKt5NMcVUANfzfvyk4cyNHLYb7n+rJPYUMrgqiqOUv+OvXDlXWr\n' +
    '27NSB8WVsvv2LwNoxM2mDCabsVLyhcIhw3hRbPkbQInRdR+4H+iIIfWJzXQXeAlh\n' +
    'yqFNDVFVAgMBAAECggEANoOe4GzVKbc5eo8jKov5zE67aDx4gKg1mP9ZAk3hOKz9\n' +
    'KJb/UZrUFz0KzOlNWJ3oeMqvsx22ueateyNZRT7G5zaUhCkpkXdD6+PIkEkVyvGR\n' +
    '8CdoeP97uTAbsFjh3/7GX8SpQVJyETM06yE9nf8oRYdeEeIAW85/gZNb0bIMC73x\n' +
    'xsIUw4YNvZ5/eVMWjVVIMgKz88ebMbbIkg+PTY1XLbOgD62wGRMbKHABfjHZ985c\n' +
    'f9fNgAz5Bx40nHO0mLuE3PYTNn5UpjKcWfatJM1+NMwfT2ER0NSjpFiWJY7pOzDl\n' +
    'THVDKiBFTCxN2LeRGk2VCb1f4y5pTsMJYxGPG6FPKwKBgQDxrzJEMyH9tVLi+jF7\n' +
    'H3cx5HnDVt4HEGq7UvFwHbXqzvzvXDN01KM8SggRyTmmh8bdFBR+P9XjbTlnsu6K\n' +
    'bE0O+9OrjTHuxtmOdbb7TuWjMQhDhWDP5svxNzJw0DH+DpznpdUXYLQMYyFce/jK\n' +
    'VpTx6mXj9Gyyj9sGfZ2ZbdViowKBgQDwzSbXgGn/TZBcD8j86TIrSJnLhcB52/H1\n' +
    '1PNKX0xvH1vhD9VYfNVjtkXA98+H0TkR+wY5oXK8x7pdV3bmMBpYnuX8gFrfUDbX\n' +
    'IeUbIIBYa9hjAnHu9mUdSEftEDbe2pLT9mVQyGX8t3GxJkFX7rbNJ1vzFInKL1Nx\n' +
    '3vjkkbazpwKBgEpoZvBqUa+7sI4i+zLt6BObRQWn6+l+221axux+qTBmk6bZ2xnA\n' +
    'EZWRMVTQgAhOSyJreTe5TY+cZA0SILDLURoo2+04JkReQkLC6RgMHVUV1nZ7TOgV\n' +
    'JXrZRJVI8+tE8ne7LZTp9+TMbEv9+wXIjEjCoqYA7ao38fXYnLnM/+JDAoGAW+Ls\n' +
    '327xA6rlWzvqxhd2PW4GwdLYD6gOPHB2JfsXf4/Hz6nrD0kTZGk5VNk7J+h+jo3r\n' +
    'YjJpRgAw7U1i4ZOZeheoSyHviydgxdb5RdCxKQx+FcnpD/aVvwbF64A0b/WX8aok\n' +
    'Hx9ZS4X0rFScuqEswDw0qh08Nxq4DMu4zf+MaCECgYEAnj//TzmXVSAyPwjAow84\n' +
    'd4obcoI0wbzvhoavuclTNJoFCQctO5A4nkwjUIys807dc/dcMR3AnEB836FdY9Mt\n' +
    'ZYnR8XopHPpae4iqPUwrw/JSjclt5W8SiaHwDrapgUMvLY/z1sstNmqyscIv+8a7\n' +
    '4QiNKBi+B2xq7lYb7I0lf2Q=\n' +
    '-----END PRIVATE KEY-----';

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