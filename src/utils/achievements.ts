import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalWorkouts: number;
  totalMinutes: number;
  totalRounds: number;
  exercisesCompleted: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    title: 'Primer Round',
    description: 'Completa tu primer entrenamiento.',
    icon: 'Trophy',
    condition: (stats) => stats.totalWorkouts >= 1,
  },
  {
    id: 'workout_10',
    title: 'Constancia',
    description: 'Completa 10 entrenamientos.',
    icon: 'Flame',
    condition: (stats) => stats.totalWorkouts >= 10,
  },
  {
    id: 'rounds_100',
    title: 'Centurión',
    description: 'Completa 100 rounds totales.',
    icon: 'Target',
    condition: (stats) => stats.totalRounds >= 100,
  },
  {
    id: 'hours_10',
    title: 'Veterano',
    description: 'Entrena por más de 10 horas totales.',
    icon: 'Clock',
    condition: (stats) => stats.totalMinutes >= 600,
  },
];

export async function checkAndUnlockAchievements(userId: string, stats: UserStats) {
  try {
    // Get already unlocked achievements
    const q = query(collection(db, 'user_achievements'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const unlockedIds = new Set(querySnapshot.docs.map((doc) => doc.data().achievementId));

    const newUnlocks = [];

    for (const achievement of ACHIEVEMENTS) {
      if (!unlockedIds.has(achievement.id) && achievement.condition(stats)) {
        // Unlock!
        await addDoc(collection(db, 'user_achievements'), {
          userId,
          achievementId: achievement.id,
          unlockedAt: serverTimestamp(),
        });
        newUnlocks.push(achievement);
      }
    }

    return newUnlocks;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}
