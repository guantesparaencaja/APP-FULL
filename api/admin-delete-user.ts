import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminEmail = (process.env.ADMIN_EMAIL || 'hernandezkevin001998@gmail.com').toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.' });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
  if (!token || !userId) return res.status(400).json({ error: 'Sesión o usuario inválido.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const caller = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || serviceRoleKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await caller.auth.getUser(token);
  if (authError || !authData.user) return res.status(401).json({ error: 'Sesión de administrador inválida.' });

  const { data: profile, error: profileError } = await admin
    .from('profiles').select('id, role, email').eq('id', authData.user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin' || (authData.user.email || '').toLowerCase() === adminEmail;
  if (profileError || !isAdmin) return res.status(403).json({ error: 'Solo un administrador puede eliminar usuarios.' });
  if (userId === authData.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta desde este panel.' });

  // Los FK del esquema usan CASCADE/SET NULL. Auth.deleteUser elimina también profiles.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return res.status(502).json({ error: `Supabase Auth: ${error.message}` });

  return res.status(200).json({ success: true, userId });
}
