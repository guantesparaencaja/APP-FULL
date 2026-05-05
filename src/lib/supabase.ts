/**
 * Supabase Client — GPTE Analytics (Hybrid Mode)
 * 
 * Uso: Tablas nuevas SOLO para analytics y estadísticas.
 * Firestore sigue siendo la fuente de verdad para auth + datos core.
 * 
 * Variables requeridas en .env.local:
 * VITE_SUPABASE_URL=https://xxxx.supabase.co
 * VITE_SUPABASE_ANON_KEY=eyJ...
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id?: string;
  user_id: string;
  action: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface UserStats {
  user_id: string;
  total_classes: number;
  classes_this_month: number;
  no_shows: number;
  last_class_date?: string;
  updated_at?: string;
}

export interface EmailQueueLog {
  id?: string;
  user_id: string;
  template: string;
  recipient_email: string;
  status: 'sent' | 'failed' | 'pending';
  n8n_execution_id?: string;
  sent_at?: string;
}

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'>;
        Update: Partial<ActivityLog>;
      };
      user_stats: {
        Row: UserStats;
        Insert: UserStats;
        Update: Partial<UserStats>;
      };
      email_queue_log: {
        Row: EmailQueueLog;
        Insert: Omit<EmailQueueLog, 'id' | 'sent_at'>;
        Update: Partial<EmailQueueLog>;
      };
    };
  };
}

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * Cliente Supabase. Solo se inicializa si las variables de entorno están presentes.
 * Esto evita crashes en entornos donde Supabase no está configurado aún.
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Verifica si Supabase está configurado en este entorno.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
};
