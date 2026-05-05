/**
 * supabase.ts — Cliente Supabase GPTE (Fuente de verdad principal)
 * Migración completa desde Firebase a Supabase.
 * Variables requeridas:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Database Types ─────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name?: string;
  email?: string;
  weight?: number;
  dominant_hand?: string;
  goal?: string;
  lives?: number;
  streak?: number;
  role?: string;
  license_level?: number;
  age?: number;
  height?: number;
  is_new_user?: boolean;
  tutorial_completed?: boolean;
  fitness_goal?: string;
  mood?: string;
  mood_updated_at?: string;
  profile_pic?: string;
  before_pic?: string;
  after_pic?: string;
  training_location?: string;
  training_days?: string[];
  plan?: string;
  plan_id?: string;
  plan_name?: string;
  plan_status?: string;
  plan_start_date?: string;
  classes_per_month?: number;
  classes_remaining?: number;
  gender?: string;
  last_workout?: string;
  xp?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Availability {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  title?: string;
  description?: string;
  rules?: string;
  materials?: string;
  duration_minutes?: number;
  max_students?: number;
  created_at?: string;
}

export interface AvailabilityException {
  id: string;
  slot_id: string;
  date: string;
  created_at?: string;
}

export interface Booking {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  class_id?: string;
  date: string;
  time?: string;
  status?: string;
  rating?: number;
  feedback?: string;
  created_at?: string;
}

export interface WorkoutVideo {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  thumbnail_url?: string;
  category?: string;
  duration?: number;
  difficulty?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order_index?: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  user_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  plan_name?: string;
  notes?: string;
  receipt_url?: string;
  created_at?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price?: number;
  classes_per_month?: number;
  duration_days?: number;
  active?: boolean;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title?: string;
  body?: string;
  type?: string;
  read?: boolean;
  created_at?: string;
}

// Legacy analytics types (kept for analyticsService.ts compatibility)
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
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Profile>;
      };
      availabilities: {
        Row: Availability;
        Insert: Omit<Availability, 'id' | 'created_at'>;
        Update: Partial<Availability>;
      };
      availability_exceptions: {
        Row: AvailabilityException;
        Insert: Omit<AvailabilityException, 'id' | 'created_at'>;
        Update: Partial<AvailabilityException>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at'>;
        Update: Partial<Booking>;
      };
      workout_videos: {
        Row: WorkoutVideo;
        Insert: Omit<WorkoutVideo, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<WorkoutVideo>;
      };
      workout_categories: {
        Row: WorkoutCategory;
        Insert: Omit<WorkoutCategory, 'id' | 'created_at'>;
        Update: Partial<WorkoutCategory>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Payment>;
      };
      planes: {
        Row: Plan;
        Insert: Omit<Plan, 'id' | 'created_at'>;
        Update: Partial<Plan>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Notification>;
      };
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

// ─── Client ─────────────────────────────────────────────────────────────────

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no configurados.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = (): boolean =>
  Boolean(supabaseUrl && supabaseAnonKey);
