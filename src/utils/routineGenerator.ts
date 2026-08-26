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
  toolsRelaxed?: boolean;
  relaxedCount?: number;
}

// ─── Warmup pool: Movilidad entries from LYFTA_LIBRARY (categoria 'Movilidad') ──
// Selected for dynamic warmup suitability (objetivo Calentamiento/Movilidad, no Recuperación).
// Each video is ~35-45s; the warmup slot is 5-10 min so the user follows along cycling through.
const WARMUP_MOVILIDAD: { id: string; title: string; videoUrl: string; durationSec: number }[] = [
  { id: 'warmup_cat_camel', title: 'Cat-Camel — Movilidad Lumbar', videoUrl: 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4', durationSec: 40 },
  { id: 'warmup_neck', title: 'Estiramiento de Cuello', videoUrl: 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4', durationSec: 35 },
  { id: 'warmup_hip_flexor', title: 'Estiramiento de Flexor de Cadera', videoUrl: 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4', durationSec: 40 },
  { id: 'warmup_wrist', title: 'Rotaciones de Muñeca', videoUrl: 'https://apilyfta.com/static/GymvisualMP4/13191201-Wrist-circles_Forearm.mp4', durationSec: 35 },
];

/** Fisher-Yates (Knuth) unbiased shuffle. Mutates and returns the array. */
function fisherYates<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const generateAutomaticRoutine = (
  muscleGroup: string,
  selectedTools: string[]
): GeneratedRoutine => {
  const allExercises = getYoutubeExercises();
  const stretchingPool = getStretchingVideos();

  // Filter main exercises by muscleGroup + selectedTools
  let filteredMain = allExercises.filter(
    (ex) => !ex.isStretching && ex.muscleGroup === muscleGroup && selectedTools.includes(ex.tool)
  );

  // Fallback: if no exercises match (e.g. user has no compatible equipment for that muscle group),
  // relax the tool filter — "Sin equipo" exercises are always available.
  let toolsRelaxed = false;
  let relaxedCount = 0;
  if (filteredMain.length === 0) {
    const allForGroup = allExercises.filter(
      (ex) => !ex.isStretching && ex.muscleGroup === muscleGroup
    );
    relaxedCount = allForGroup.length;
    filteredMain = allForGroup;
    toolsRelaxed = true;
    console.warn(
      `[routineGenerator] filteredMain vacío para muscleGroup="${muscleGroup}" ` +
      `con tools=[${selectedTools.join(', ')}]. Relajando filtro de herramientas: ` +
      `${relaxedCount} ejercicios disponibles sin filtro de equipo.`
    );
  }

  // Fisher-Yates shuffle, then pick up to 6
  const selectedMain = fisherYates([...filteredMain]).slice(0, 6);

  const routineExercises: GeneratedExercise[] = [];

  // 1. Warm up (5-10 min) — pick one Movilidad entry as dynamic warmup
  const warmupDurationSec = 5 * 60; // 5 min base
  const warmup = WARMUP_MOVILIDAD[Math.floor(Math.random() * WARMUP_MOVILIDAD.length)];
  routineExercises.push({
    id: warmup.id,
    title: `Calentamiento: ${warmup.title}`,
    videoUrl: warmup.videoUrl,
    series: 1,
    reps: '5 min',
    estSec: warmupDurationSec,
    muscles: [muscleGroup],
  });

  // 2. Main Exercises (45-50 min)
  selectedMain.forEach((ex) => {
    routineExercises.push({
      id: ex.id,
      title: ex.title,
      videoUrl: ex.videoUrl,
      series: 4,
      reps: 12,
      estSec: 480,
      muscles: [ex.muscleGroup],
    });
  });

  // 3. Stretching (5-7 min)
  const selectedStretches = fisherYates([...stretchingPool]).slice(0, 2);
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
    toolsRelaxed,
    relaxedCount,
  };
};
