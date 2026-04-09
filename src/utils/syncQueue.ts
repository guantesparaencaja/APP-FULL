/**
 * GPTE SyncQueue — Motor de sincronización offline-first
 * Persiste acciones críticas en localStorage y las reintenta cuando hay conexión.
 * NO usar para datos de sesión. USO EXCLUSIVO: acciones de negocio no críticas pendientes.
 */
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
    // Cargar cola persistida al iniciar
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.queue = JSON.parse(saved) as SyncAction[];
      } catch {
        this.queue = [];
      }
    }
  }

  /** Encola una acción. Funciona aunque el dispositivo esté offline. */
  enqueue(action: Omit<SyncAction, 'id' | 'createdAt' | 'retries'>) {
    const item: SyncAction = {
      ...action,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retries: 0,
    };
    this.queue.push(item);
    this.persist();
    this.attemptSync();
  }

  /** Intenta sincronizar toda la cola pendiente */
  async attemptSync() {
    if (this.isSyncing || !navigator.onLine || this.queue.length === 0) return;
    this.isSyncing = true;

    for (const action of [...this.queue]) {
      try {
        await this.executeAction(action);
        // Éxito: remover de la cola
        this.queue = this.queue.filter(a => a.id !== action.id);
        this.persist();
      } catch (err) {
        console.warn('[GPTE SyncQueue] Acción fallida, reintento:', action.type, err);
        if (action.retries >= MAX_RETRIES) {
          // Descartar tras MAX_RETRIES intentos fallidos
          console.error('[GPTE SyncQueue] Descartando acción tras 3 fallos:', action);
          this.queue = this.queue.filter(a => a.id !== action.id);
          this.persist();
        } else {
          action.retries++;
          this.persist();
        }
      }
    }

    this.isSyncing = false;
  }

  /** Tamaño actual de la cola (para badges informativos) */
  get pendingCount(): number {
    return this.queue.length;
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
  }

  private async executeAction(action: SyncAction) {
    switch (action.type) {
      case 'cancel_booking': {
        const webhookUrl = (import.meta as any).env?.VITE_N8N_CANCEL_WEBHOOK as string;
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
        const bookingId = action.payload.bookingId as string;
        await updateDoc(doc(db, 'bookings', bookingId), {
          attended: true,
          attendedAt: serverTimestamp(),
        });
        break;
      }

      case 'complete_workout': {
        const userId = action.payload.userId as string;
        const workoutId = action.payload.workoutId as string;
        await updateDoc(doc(db, 'users', userId, 'workouts', workoutId), {
          completed: true,
          completedAt: serverTimestamp(),
        });
        break;
      }

      case 'update_goal': {
        const goalId = action.payload.goalId as string;
        const updates = action.payload.updates as Record<string, unknown>;
        await updateDoc(doc(db, 'community_goals', goalId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        break;
      }

      default:
        console.warn('[GPTE SyncQueue] Tipo de acción desconocido:', (action as any).type);
    }
  }
}

/** Singleton exportado — úsalo en toda la app: syncQueue.enqueue(...) */
export const syncQueue = new SyncQueue();

/** Inicializar en App.tsx — registra los listeners de conectividad */
export function initSyncQueue() {
  window.addEventListener('online', () => {
    console.log('[GPTE SyncQueue] Conectado — sincronizando cola pendiente...');
    syncQueue.attemptSync();
  });
  // Intento inicial por si el navegador cargó con cola pendiente y hay conexión
  if (navigator.onLine && syncQueue.pendingCount > 0) {
    syncQueue.attemptSync();
  }
}
