/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassifiedExercise } from './exerciseClassifier';
import { getYoutubeExercises, getStretchingVideos } from '../services/youtubeContentService';

export interface GeneratedExercise {
  id: string;
  title: string;
  videoUrl: string;
  series: number;
  reps: number | string;
  estSec: number;
  muscles: string[];
}

export interface GeneratedRoutine {
  id: string;
  title: string;
  exercises: GeneratedExercise[];
  totalEstimatedMinutes: number;
  toolsUsed: string[];
}

export const generateAutomaticRoutine = (
  muscleGroup: string,
  selectedTools: string[]
): GeneratedRoutine => {
  const allExercises = getYoutubeExercises();
  const stretchingPool = getStretchingVideos();

  // Filter main exercises
  const filteredMain = allExercises.filter(
    (ex) => !ex.isStretching && ex.muscleGroup === muscleGroup && selectedTools.includes(ex.tool)
  );

  // Select 4-6 exercises
  const selectedMain = filteredMain.sort(() => 0.5 - Math.random()).slice(0, 6);

  // If we don't have enough, maybe relax tool constraints or just take what we have
  // For this implementation, we'll stick to the filtered list.

  const routineExercises: GeneratedExercise[] = [];

  // 1. Warm up (5 min) - We'll add a generic entry or a mobility video
  routineExercises.push({
    id: 'warmup_generic',
    title: 'Calentamiento Dinámico',
    videoUrl: 'https://www.youtube.com/embed/1_f2_f3', // Placeholder
    series: 1,
    reps: '5 min',
    estSec: 300,
    muscles: [muscleGroup],
  });

  // 2. Main Exercises (45-50 min)
  // 4-6 exercises, 3-4 series each.
  // Let's say each set takes 60s + 60s rest = 120s per set.
  // 4 sets * 120s = 480s (8 min) per exercise.
  // 6 exercises * 8 min = 48 min. Perfect.
  selectedMain.forEach((ex) => {
    routineExercises.push({
      id: ex.id,
      title: ex.title,
      videoUrl: ex.videoUrl,
      series: 4,
      reps: 12,
      estSec: 480, // 8 minutes total for 4 sets with rest
      muscles: [ex.muscleGroup],
    });
  });

  // 3. Stretching (5-7 min)
  const selectedStretches = stretchingPool.sort(() => 0.5 - Math.random()).slice(0, 2);
  selectedStretches.forEach((ex) => {
    routineExercises.push({
      id: ex.id,
      title: `Estiramiento: ${ex.title}`,
      videoUrl: ex.videoUrl,
      series: 1,
      reps: '3 min',
      estSec: 180,
      muscles: [ex.muscleGroup],
    });
  });

  const totalSec = routineExercises.reduce((acc, ex) => acc + ex.estSec, 0);

  return {
    id: `auto_${Date.now()}`,
    title: `Rutina Automática: ${muscleGroup}`,
    exercises: routineExercises,
    totalEstimatedMinutes: Math.ceil(totalSec / 60),
    toolsUsed: selectedTools,
  };
};
