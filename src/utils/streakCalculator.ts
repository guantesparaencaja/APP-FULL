import { differenceInDays, startOfDay, isYesterday, isToday, parseISO } from 'date-fns';

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  lastWorkoutDate: string | null;
}

/**
 * Calculates current and best streaks from a list of workout timestamps
 */
export function calculateStreak(workoutDates: Date[]): StreakInfo {
  if (workoutDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, lastWorkoutDate: null };
  }

  // Sort dates descending (newest first) and normalize to start of day
  const sortedDates = workoutDates
    .map((d) => startOfDay(d))
    .sort((a, b) => b.getTime() - a.getTime());

  // Remove duplicates (multiple workouts in one day)
  const uniqueDates = sortedDates.filter((date, index) => {
    return index === 0 || date.getTime() !== sortedDates[index - 1].getTime();
  });

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 1;

  const today = startOfDay(new Date());
  const latestWorkout = uniqueDates[0];

  // Calculate current streak
  if (isToday(latestWorkout) || isYesterday(latestWorkout)) {
    currentStreak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      if (differenceInDays(uniqueDates[i], uniqueDates[i + 1]) === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate best streak
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    if (differenceInDays(uniqueDates[i], uniqueDates[i + 1]) === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  return {
    currentStreak,
    bestStreak,
    lastWorkoutDate: latestWorkout.toISOString(),
  };
}
