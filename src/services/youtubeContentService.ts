/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassifiedExercise, classifyExercise } from '../utils/exerciseClassifier';

// Mocked YouTube data representing videos from @EresFitness and @MuscleWiki
const RAW_VIDEOS = [
  { id: 'X0_W_X0_W1', title: 'Dumbbell Bench Press - Chest Workout' },
  { id: 'X0_W_X0_W2', title: 'Barbell Squat - Leg Day' },
  { id: 'X0_W_X0_W3', title: 'Bodyweight Pushups - Home Chest' },
  { id: 'X0_W_X0_W4', title: 'Resistance Band Rows - Back' },
  { id: 'X0_W_X0_W5', title: 'Kettlebell Swing - Full Body' },
  { id: 'X0_W_X0_W6', title: 'Machine Shoulder Press' },
  { id: 'X0_W_X0_W7', title: 'Bicep Curls with Mancuernas' },
  { id: 'X0_W_X0_W8', title: 'Tricep Extensions - Barra' },
  { id: 'X0_W_X0_W9', title: 'Plank for Abs - Bodyweight' },
  { id: 'X0_W_X0_W10', title: 'Leg Extensions Machine' },
  { id: 'X0_W_X0_W11', title: 'Full Body Stretching - Mobility' },
  { id: 'X0_W_X0_W12', title: 'Hamstring Stretch - Estiramiento' },
  { id: 'X0_W_X0_W13', title: 'Dumbbell Shoulder Flys' },
  { id: 'X0_W_X0_W14', title: 'Barbell Deadlift - Back/Legs' },
  { id: 'X0_W_X0_W15', title: 'Chest Fly Machine' },
  { id: 'X0_W_X0_W16', title: 'Banda Elástica Bicep Curl' },
  { id: 'X0_W_X0_W17', title: 'Kettlebell Goblet Squat' },
  { id: 'X0_W_X0_W18', title: 'Abs Crunch - No Equipment' },
  { id: 'X0_W_X0_W19', title: 'Upper Body Mobility Stretch' },
  { id: 'X0_W_X0_W20', title: 'Lower Back Stretch' },
];

export const getYoutubeExercises = (): ClassifiedExercise[] => {
  return RAW_VIDEOS.map((v) => classifyExercise(v.title, v.id));
};

export const getStretchingVideos = (): ClassifiedExercise[] => {
  return getYoutubeExercises().filter((ex) => ex.isStretching);
};
