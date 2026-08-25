/**
 * achievements.ts — Supabase (purga Firebase)
 * Regla de oro: Supabase = única fuente.
 */
import { supabase } from '../lib/supabase';

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
  { id: 'first_workout', title: 'Primer Round', description: 'Completa tu primer entrenamiento.', icon: 'Trophy', condition: (s) => s.totalWorkouts >= 1 },
  { id: 'workout_10', title: 'Constancia', description: 'Completa 10 entrenamientos.', icon: 'Flame', condition: (s) => s.totalWorkouts >= 10 },
  { id: 'rounds_100', title: 'Centurión', description: 'Completa 100 rounds totales.', icon: 'Target', condition: (s) => s.totalRounds >= 100 },
  { id: 'hours_10', title: 'Veterano', description: 'Entrena por más de 10 horas totales.', icon: 'Clock', condition: (s) => s.totalMinutes >= 600 },
];

export async function checkAndUnlockAchievements(userId: string, stats: UserStats) {
  try {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = new Set((existing ?? []).map((r: { achievement_id: string }) => r.achievement_id));
    const newUnlocks: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (!unlockedIds.has(achievement.id) && achievement.condition(stats)) {
        await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
          unlocked_at: new Date().toISOString(),
        });
        newUnlocks.push(achievement);
      }
    }

    return newUnlocks;
  } catch (error) {
    console.error('[achievements] Error:', error);
    return [];
  }
}
