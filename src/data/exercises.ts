export interface Exercise {
  id: string;
  name: string;
  muscles: string[];
  videoPath: string;
  series: number;
  reps: number | string;
  durationSec: number;
  license: string;
  thumbnail?: string;
}

export const EXERCISES: Exercise[] = [
  {
    id: 'pushups_standard',
    name: 'Flexiones Estándar',
    muscles: ['chest', 'triceps', 'shoulders'],
    videoPath: 'chest/pushups.mp4',
    series: 3,
    reps: 12,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/pushup/300/200'
  },
  {
    id: 'shoulder_press',
    name: 'Press de Hombros',
    muscles: ['shoulders', 'triceps'],
    videoPath: 'shoulders/press.mp4',
    series: 3,
    reps: 10,
    durationSec: 8,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/shoulder/300/200'
  },
  {
    id: 'bicep_curls',
    name: 'Curl de Bíceps',
    muscles: ['biceps'],
    videoPath: 'arms/curls.mp4',
    series: 3,
    reps: 15,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/arm/300/200'
  },
  {
    id: 'plank_abs',
    name: 'Plancha Abdominal',
    muscles: ['abs'],
    videoPath: 'abs/plank.mp4',
    series: 3,
    reps: '30s',
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/abs/300/200'
  },
  {
    id: 'squats_legs',
    name: 'Sentadillas',
    muscles: ['quads', 'glutes'],
    videoPath: 'legs/squats.mp4',
    series: 3,
    reps: 20,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/legs/300/200'
  },
  {
    id: 'lunges_legs',
    name: 'Zancadas',
    muscles: ['quads', 'glutes', 'hamstrings'],
    videoPath: 'legs/lunges.mp4',
    series: 3,
    reps: 12,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/lunge/300/200'
  },
  {
    id: 'rows_back',
    name: 'Remo con Mancuerna',
    muscles: ['lats', 'biceps', 'traps'],
    videoPath: 'back/rows.mp4',
    series: 3,
    reps: 12,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/back/300/200'
  },
  {
    id: 'tricep_extension',
    name: 'Extensión de Tríceps',
    muscles: ['triceps'],
    videoPath: 'arms/triceps.mp4',
    series: 3,
    reps: 12,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/tricep/300/200'
  },
  {
    id: 'calf_raises',
    name: 'Elevación de Talones',
    muscles: ['calves'],
    videoPath: 'legs/calves.mp4',
    series: 3,
    reps: 20,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/calves/300/200'
  },
  {
    id: 'deadlift_hamstrings',
    name: 'Peso Muerto Rumano',
    muscles: ['hamstrings', 'glutes', 'lats'],
    videoPath: 'legs/deadlift.mp4',
    series: 3,
    reps: 10,
    durationSec: 10,
    license: 'CC-BY-4.0',
    thumbnail: 'https://picsum.photos/seed/deadlift/300/200'
  }
];

// Compatibility alias for geminiService
export const EXERCISE_CATALOG = EXERCISES.map(ex => ({
  name: ex.name,
  muscle_group: ex.muscles.join(', '),
  description: ex.name,
  instructions: ex.name,
  muscles_worked: ex.muscles.join(', '),
  video_url: ex.videoPath
}));
