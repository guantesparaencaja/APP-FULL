/**
 * supabaseHelpers.ts
 * Regla de oro: Supabase = única fuente. Offline-first con cola localStorage.
 */
import { supabase } from '../lib/supabase';

export interface WorkoutExercise {
  id: string;
  title: string;
  sets: number;
  reps: number | string;
  durationSeconds: number;
}

export interface WorkoutHistoryData {
  userId: string;
  durationSeconds: number;
  exercises: WorkoutExercise[];
  caloriesEstimate?: number;
}

const LOCAL_STORAGE_KEY = 'pending_workout_history';

export async function saveWorkoutHistory({
  userId,
  durationSeconds,
  exercises,
  caloriesEstimate,
}: WorkoutHistoryData) {
  const workoutData = {
    user_id: userId,
    timestamp: new Date().toISOString(),
    duration_seconds: durationSeconds,
    exercises: exercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      sets: ex.sets,
      reps: typeof ex.reps === 'string' ? parseInt(ex.reps) || 0 : ex.reps,
      duration_seconds: ex.durationSeconds,
    })),
    calories_estimate: caloriesEstimate || Math.floor(durationSeconds * 0.1),
  };

  try {
    const { error } = await supabase.from('workout_history').insert(workoutData);
    if (error) throw error;
    console.log('[saveWorkoutHistory] Guardado en Supabase.');
    return { success: true };
  } catch (error) {
    console.error('[saveWorkoutHistory] Error Supabase, guardando en localStorage:', error);
    try {
      const pending = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      pending.push({ ...workoutData, isPending: true });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pending));
    } catch (lsErr) {
      console.error('[saveWorkoutHistory] Error localStorage:', lsErr);
    }
    return { success: false, error };
  }
}

/** Sincroniza historial pendiente de localStorage → Supabase */
export async function syncPendingWorkouts() {
  const pending = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  if (pending.length === 0) return;

  console.log(`[syncPendingWorkouts] Sincronizando ${pending.length} entrenamientos...`);
  const remaining = [];

  for (const workout of pending) {
    const { isPending, ...data } = workout;
    void isPending; // suprimir lint
    const { error } = await supabase.from('workout_history').insert(data);
    if (error) {
      console.error('[syncPendingWorkouts] Fallo, preservando:', error.message);
      remaining.push(workout);
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remaining));
}
