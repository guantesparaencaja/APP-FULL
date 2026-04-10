import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
    userId,
    timestamp: serverTimestamp(),
    durationSeconds,
    exercises: exercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      sets: ex.sets,
      reps: typeof ex.reps === 'string' ? parseInt(ex.reps) || 0 : ex.reps,
      durationSeconds: ex.durationSeconds,
    })),
    caloriesEstimate: caloriesEstimate || Math.floor(durationSeconds * 0.1), // Simple estimate
  };

  try {
    const docRef = await addDoc(collection(db, 'workout_history'), workoutData);
    console.log('Workout history saved to Firestore with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving workout history to Firestore:', error);

    // Fallback: Save to local storage
    try {
      const pendingWorkouts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      pendingWorkouts.push({
        ...workoutData,
        timestamp: new Date().toISOString(), // Use ISO string for local storage
        isPending: true,
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pendingWorkouts));
      console.log('Workout history saved to local storage for later retry.');
    } catch (lsError) {
      console.error('Error saving to local storage:', lsError);
    }

    return { success: false, error };
  }
}

/**
 * Attempts to sync pending workouts from local storage to Firestore
 */
export async function syncPendingWorkouts() {
  const pendingWorkouts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  if (pendingWorkouts.length === 0) return;

  console.log(`Attempting to sync ${pendingWorkouts.length} pending workouts...`);
  const remainingWorkouts = [];

  for (const workout of pendingWorkouts) {
    try {
      const { isPending, ...dataToSave } = workout;
      // Replace ISO string with serverTimestamp for Firestore
      await addDoc(collection(db, 'workout_history'), {
        ...dataToSave,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to sync workout, keeping in local storage:', error);
      remainingWorkouts.push(workout);
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remainingWorkouts));
}
