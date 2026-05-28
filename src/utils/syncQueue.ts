/**
 * syncQueue.ts — Motor offline-first. Supabase (purga Firebase).
 * Regla de oro: Supabase = único backend.
 * Persiste acciones en localStorage, sincroniza al reconectar.
 */
import { supabase } from '../lib/supabase';

export interface SyncAction {
  id: string;
  type: 'cancel_booking' | 'mark_attendance' | 'complete_workout' | 'update_goal';
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

const STORAGE_KEY = 'gpte_sync_queue';
const MAX_RETRIES = 3;

class SyncQueue {
  private queue: SyncAction[] = [];
  private isSyncing = false;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { this.queue = JSON.parse(saved) as SyncAction[]; } catch { this.queue = []; }
    }
  }

  enqueue(action: Omit<SyncAction, 'id' | 'createdAt' | 'retries'>) {
    const item: SyncAction = { ...action, id: crypto.randomUUID(), createdAt: Date.now(), retries: 0 };
    this.queue.push(item);
    this.persist();
    this.attemptSync();
  }

  async attemptSync() {
    if (this.isSyncing || !navigator.onLine || this.queue.length === 0) return;
    this.isSyncing = true;

    for (const action of [...this.queue]) {
      try {
        await this.executeAction(action);
        this.queue = this.queue.filter((a) => a.id !== action.id);
        this.persist();
      } catch (err) {
        console.warn('[SyncQueue] Acción fallida:', action.type, err);
        if (action.retries >= MAX_RETRIES) {
          console.error('[SyncQueue] Descartando tras 3 fallos:', action);
          this.queue = this.queue.filter((a) => a.id !== action.id);
        } else {
          action.retries++;
        }
        this.persist();
      }
    }
    this.isSyncing = false;
  }

  get pendingCount(): number { return this.queue.length; }

  private persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue)); }

  private async executeAction(action: SyncAction) {
    switch (action.type) {
      case 'cancel_booking': {
        const webhookUrl = (import.meta as any).env?.VITE_N8N_CANCEL_WEBHOOK;
        if (!webhookUrl) throw new Error('VITE_N8N_CANCEL_WEBHOOK no configurado');
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        break;
      }

      case 'mark_attendance': {
        const { error } = await supabase
          .from('bookings')
          .update({ attended: true, attended_at: new Date().toISOString() })
          .eq('id', action.payload.bookingId as string);
        if (error) throw new Error(error.message);
        break;
      }

      case 'complete_workout': {
        const { error } = await supabase
          .from('user_workouts')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', action.payload.workoutId as string)
          .eq('user_id', action.payload.userId as string);
        if (error) throw new Error(error.message);
        break;
      }

      case 'update_goal': {
        const { error } = await supabase
          .from('community_goals')
          .update({ ...(action.payload.updates as object), updated_at: new Date().toISOString() })
          .eq('id', action.payload.goalId as string);
        if (error) throw new Error(error.message);
        break;
      }

      default:
        console.warn('[SyncQueue] Tipo desconocido:', (action as SyncAction).type);
    }
  }
}

export const syncQueue = new SyncQueue();

export function initSyncQueue() {
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Online → sincronizando...');
    syncQueue.attemptSync();
  });
  if (navigator.onLine && syncQueue.pendingCount > 0) syncQueue.attemptSync();
}
