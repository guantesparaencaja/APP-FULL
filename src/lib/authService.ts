/**
 * authService.ts — Servicio de autenticación GPTE via Supabase Auth
 * Reemplaza Firebase Auth completamente.
 *
 * Funciones exportadas:
 *   signIn, signUp, signOut, signInWithGoogle,
 *   resetPassword, onAuthChange, getCurrentSession
 */

import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

const ADMIN_EMAILS = [
  'hernandezkevin001998@gmail.com',
  'guantesparaencajar@gmail.com',
];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | null;
  name?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Crea o actualiza el perfil del usuario en public.profiles después del login.
 */
async function ensureProfile(user: User): Promise<void> {
  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email);

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!existing) {
    // Crear perfil nuevo
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario',
      role: isAdmin ? 'admin' : 'student',
      lives: 3,
      streak: 0,
      license_level: 1,
      is_new_user: true,
      tutorial_completed: false,
      plan_status: 'none',
      classes_remaining: 0,
      xp: 0,
    });
  } else {
    // Sincronizar rol si es admin y no lo tiene aún
    if (isAdmin && existing.role !== 'admin') {
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    }
  }
}

// ─── Auth Functions ──────────────────────────────────────────────────────────

/**
 * Login con email y contraseña.
 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo obtener el usuario');

  await ensureProfile(data.user);
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Registro de nuevo usuario con email y contraseña.
 */
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name || 'Usuario' } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo crear el usuario');

  await ensureProfile(data.user);
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Login con Google OAuth (popup web).
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * Cierra sesión del usuario actual.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Envía email de reseteo de contraseña.
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
}

/**
 * Obtiene la sesión actual (null si no hay sesión activa).
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Listener de cambios de estado de autenticación.
 * Reemplaza onAuthStateChanged de Firebase.
 * @returns función de cleanup para cancelar el listener
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        await ensureProfile(session.user);
      }
      callback(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}
