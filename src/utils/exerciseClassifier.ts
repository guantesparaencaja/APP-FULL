/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MuscleGroup =
  | 'PECHO'
  | 'ESPALDA'
  | 'HOMBROS'
  | 'PIERNAS'
  | 'ABDOMEN'
  | 'BICEPS'
  | 'TRICEPS';
export type Tool =
  | 'SIN EQUIPO'
  | 'MANCUERNAS'
  | 'BARRA'
  | 'BANDAS ELASTICAS'
  | 'KETTLEBELL'
  | 'MAQUINAS';

export interface ClassifiedExercise {
  id: string;
  title: string;
  videoUrl: string;
  muscleGroup: MuscleGroup;
  tool: Tool;
  isStretching: boolean;
}

export const classifyExercise = (title: string, videoId: string): ClassifiedExercise => {
  const lowerTitle = title.toLowerCase();

  // Detect Muscle Group
  let muscleGroup: MuscleGroup = 'PECHO'; // Default
  if (
    lowerTitle.includes('back') ||
    lowerTitle.includes('espalda') ||
    lowerTitle.includes('row') ||
    lowerTitle.includes('pull')
  )
    muscleGroup = 'ESPALDA';
  else if (
    lowerTitle.includes('shoulder') ||
    lowerTitle.includes('hombro') ||
    lowerTitle.includes('press')
  )
    muscleGroup = 'HOMBROS';
  else if (
    lowerTitle.includes('leg') ||
    lowerTitle.includes('pierna') ||
    lowerTitle.includes('squat') ||
    lowerTitle.includes('lunge') ||
    lowerTitle.includes('quad') ||
    lowerTitle.includes('hamstring')
  )
    muscleGroup = 'PIERNAS';
  else if (
    lowerTitle.includes('abs') ||
    lowerTitle.includes('abdomen') ||
    lowerTitle.includes('core') ||
    lowerTitle.includes('crunch') ||
    lowerTitle.includes('plank')
  )
    muscleGroup = 'ABDOMEN';
  else if (lowerTitle.includes('bicep') || lowerTitle.includes('curl')) muscleGroup = 'BICEPS';
  else if (lowerTitle.includes('tricep') || lowerTitle.includes('extension'))
    muscleGroup = 'TRICEPS';
  else if (
    lowerTitle.includes('chest') ||
    lowerTitle.includes('pecho') ||
    lowerTitle.includes('bench')
  )
    muscleGroup = 'PECHO';

  // Detect Tool
  let tool: Tool = 'SIN EQUIPO';
  if (lowerTitle.includes('dumbbell') || lowerTitle.includes('mancuerna')) tool = 'MANCUERNAS';
  else if (lowerTitle.includes('barbell') || lowerTitle.includes('barra')) tool = 'BARRA';
  else if (lowerTitle.includes('band') || lowerTitle.includes('banda')) tool = 'BANDAS ELASTICAS';
  else if (lowerTitle.includes('kettlebell') || lowerTitle.includes('pesa rusa'))
    tool = 'KETTLEBELL';
  else if (lowerTitle.includes('machine') || lowerTitle.includes('maquina')) tool = 'MAQUINAS';
  else if (
    lowerTitle.includes('bodyweight') ||
    lowerTitle.includes('home') ||
    lowerTitle.includes('sin equipo')
  )
    tool = 'SIN EQUIPO';

  // Detect Stretching
  const isStretching =
    lowerTitle.includes('stretch') ||
    lowerTitle.includes('stretching') ||
    lowerTitle.includes('mobility') ||
    lowerTitle.includes('estiramiento');

  return {
    id: videoId,
    title,
    videoUrl: `https://www.youtube.com/embed/${videoId}`,
    muscleGroup,
    tool,
    isStretching,
  };
};
