/**
 * seedVideos.ts — GPTE Video Library
 * 
 * - BoxeoModule: auto-seed silencioso (sin botón)
 * - Entrenamientos: lotes rotativos, empieza por Peso Corporal
 * - Sin Firebase Storage: URLs externas de Lyfta (gratuitas)
 * - Aprobado → se queda (Drive o URL). Rechazado → hardDeleteVideo lo borra de todo.
 */

import { db } from '../lib/firebase';
import {
  collection, addDoc, getDocs, query, where, updateDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';

// ─── BIBLIOTECA COMPLETA LYFTA ────────────────────────────────────────────────
// Patrón: https://apilyfta.com/static/GymvisualMP4/[ID]-[Nombre]_[Músculo].mp4

export const LYFTA_LIBRARY: {
  title: string;
  description: string;
  video_url: string;
  level: string;
  duration: number;
  equipment: string;
  tipo: string;
  objetivo: string;
  categoria: string; // label para crear o mapear category
  tags: string[];
}[] = [

  // ══════════════════════════════════════════════════════
  // LOTE 1 — PESO CORPORAL (bodyweight) — primera carga
  // ══════════════════════════════════════════════════════
  {
    title: 'Flexión de Pecho (Push-up)',
    description: 'La flexión clásica. Activa pecho, tríceps y core.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['push-up', 'flexión', 'pecho', 'peso corporal'],
  },
  {
    title: 'Flexión Amplia (Wide Push-up)',
    description: 'Agarre ancho para mayor activación del pecho exterior.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/07751201-Push-up-wide_Chest.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['push-up', 'amplio', 'pecho', 'peso corporal'],
  },
  {
    title: 'Flexión Diamante',
    description: 'Brazos juntos, máxima activación de tríceps.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/08261201-Diamond-Push-up_Chest.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['flexión', 'tríceps', 'diamante', 'peso corporal'],
  },
  {
    title: 'Sentadilla (Bodyweight Squat)',
    description: 'Sentadilla libre sin peso. Base de toda la potencia de piernas.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10121201-Squat_Hips.mp4',
    level: 'Principiante', duration: 50, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['sentadilla', 'piernas', 'peso corporal'],
  },
  {
    title: 'Zancada (Lunge)',
    description: 'Zancada hacia adelante. Muslos y glúteos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10281201-Lunge_Hips.mp4',
    level: 'Principiante', duration: 50, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['lunge', 'zancada', 'piernas', 'peso corporal'],
  },
  {
    title: 'Estocada Lateral',
    description: 'Movilidad de cadera y fuerza de muslo interno.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10461201-Side-Lunge_Hips.mp4',
    level: 'Principiante', duration: 50, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Movilidad', categoria: 'Peso Corporal',
    tags: ['estocada', 'lateral', 'cadera', 'peso corporal'],
  },
  {
    title: 'Burpee',
    description: 'Cardio total de cuerpo completo. Explosión desde el suelo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4',
    level: 'Intermedio', duration: 50, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Resistencia', categoria: 'Peso Corporal',
    tags: ['burpee', 'cardio', 'peso corporal', 'total body'],
  },
  {
    title: 'Jumping Jacks',
    description: 'Cardio de bajo impacto para activar todo el sistema cardiovascular.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Cardio', categoria: 'Peso Corporal',
    tags: ['jumping jacks', 'cardio', 'calentamiento', 'peso corporal'],
  },
  {
    title: 'Rodillas Altas (High Knees)',
    description: 'Correr en el lugar levantando las rodillas al máximo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11261201-High-Knees_Hips.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Cardio', categoria: 'Peso Corporal',
    tags: ['high knees', 'rodillas altas', 'cardio', 'peso corporal'],
  },
  {
    title: 'Saltos al Cajón (Box Jump)',
    description: 'Explosividad máxima de piernas.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10811201-Box-Jump_Hips.mp4',
    level: 'Avanzado', duration: 45, equipment: 'Cajón pliométrico',
    tipo: 'casa', objetivo: 'Explosividad', categoria: 'Peso Corporal',
    tags: ['box jump', 'salto', 'explosividad', 'peso corporal'],
  },
  {
    title: 'Elevación de Talones',
    description: 'Pantorrillas fuertes para mejor rebote y pivote.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10631201-Calf-Raise_Calves.mp4',
    level: 'Principiante', duration: 40, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['pantorrilla', 'calf raise', 'peso corporal'],
  },
  {
    title: 'Mountain Climbers',
    description: 'Cardio + core. Simula escalar manteniendo posición de plancha.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10971201-Mountain-Climber_Hips.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Resistencia', categoria: 'Peso Corporal',
    tags: ['mountain climber', 'cardio', 'core', 'peso corporal'],
  },
  {
    title: 'Plancha (Plank)',
    description: 'Isométrico de core. Mantener 30-60 segundos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11501201-Plank_Waist.mp4',
    level: 'Principiante', duration: 60, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Core', categoria: 'Peso Corporal',
    tags: ['plancha', 'core', 'isométrico', 'peso corporal'],
  },
  {
    title: 'Superman',
    description: 'Lumbar y glúteos. Levantar brazos y piernas del suelo boca abajo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11611201-Superman_Back.mp4',
    level: 'Principiante', duration: 40, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Core', categoria: 'Peso Corporal',
    tags: ['superman', 'lumbar', 'espalda', 'peso corporal'],
  },
  {
    title: 'Abdominales (Crunch)',
    description: 'Abdominal básico. Contraer el core con la espalda en el suelo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11711201-Crunch_Waist.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Core', categoria: 'Peso Corporal',
    tags: ['crunch', 'abdomen', 'core', 'peso corporal'],
  },
  {
    title: 'Elevación de Piernas (Leg Raise)',
    description: 'Abdomen inferior y flexores de cadera.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11831201-Leg-Raise_Waist.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Core', categoria: 'Peso Corporal',
    tags: ['leg raise', 'abdomen', 'piernas', 'peso corporal'],
  },
  {
    title: 'Glute Bridge',
    description: 'Puente de glúteos. Activa glúteo mayor y lumbar.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10151201-Glute-Bridge_Hips.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Fuerza', categoria: 'Peso Corporal',
    tags: ['glute bridge', 'glúteos', 'cadera', 'peso corporal'],
  },
  {
    title: 'Skipping (Jump Rope Simulation)',
    description: 'Simular saltar cuerda. Ritmo y coordinación para boxeadores.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4',
    level: 'Principiante', duration: 55, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Cardio', categoria: 'Peso Corporal',
    tags: ['skipping', 'cuerda', 'cardio', 'boxeo', 'peso corporal'],
  },

  // ══════════════════════════════════════════════════════
  // LOTE 2 — BOXEO FUNCIONAL
  // ══════════════════════════════════════════════════════
  {
    title: 'Jab — Técnica de Golpe Recto',
    description: 'Golpe recto con mano delantera. La base del ataque en boxeo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Técnica', categoria: 'Boxeo',
    tags: ['jab', 'golpe', 'boxeo', 'técnica'],
  },
  {
    title: 'Cross — Golpe de Poder',
    description: 'Golpe recto con mano trasera. Máxima rotación de cadera.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4',
    level: 'Principiante', duration: 45, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Técnica', categoria: 'Boxeo',
    tags: ['cross', 'golpe', 'boxeo', 'potencia'],
  },
  {
    title: 'Hook — Gancho',
    description: 'Golpe en ángulo lateral. Codo a 90° durante el impacto.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Técnica', categoria: 'Boxeo',
    tags: ['hook', 'gancho', 'boxeo', 'técnica'],
  },
  {
    title: 'Uppercut',
    description: 'Golpe ascendente desde las piernas. Ataca el mentón.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Técnica', categoria: 'Boxeo',
    tags: ['uppercut', 'boxeo', 'golpe ascendente'],
  },
  {
    title: 'Combinación 1-2 (Jab-Cross)',
    description: 'La combinación más básica del boxeo. Fluidez y ritmo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4',
    level: 'Principiante', duration: 50, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Combinaciones', categoria: 'Boxeo',
    tags: ['1-2', 'jab', 'cross', 'combinación', 'boxeo'],
  },
  {
    title: 'Slip y Contraataque',
    description: 'Esquivar el jab del rival y responder de inmediato.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Defensa', categoria: 'Boxeo',
    tags: ['slip', 'defensa', 'counter', 'boxeo'],
  },
  {
    title: 'Shadow Boxing 3 Minutos',
    description: 'Boxeo sombra con movimiento continuo. El mejor entrenamiento sin equipo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4',
    level: 'Intermedio', duration: 180, equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'Cardio', categoria: 'Boxeo',
    tags: ['sombra', 'shadow boxing', 'cardio', 'boxeo'],
  },

  // ══════════════════════════════════════════════════════
  // LOTE 3 — FUERZA (GYM)
  // ══════════════════════════════════════════════════════
  {
    title: 'Press de Banca con Barra',
    description: 'El rey de los ejercicios de pecho. Fuerza de empuje máxima.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4',
    level: 'Intermedio', duration: 60, equipment: 'Barra + Banco',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['banca', 'pecho', 'barra', 'gym'],
  },
  {
    title: 'Curl de Bíceps con Barra EZ',
    description: 'Fortalece los bíceps para mayor potencia en ganchos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00701201-EZ-Bar-Curl_Upper-Arms.mp4',
    level: 'Principiante', duration: 45, equipment: 'Barra EZ',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['curl', 'bíceps', 'barra EZ', 'gym'],
  },
  {
    title: 'Extensión de Tríceps Tumbado',
    description: 'Skull crusher. Tríceps potentes para golpes más rápidos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00741201-Barbell-Lying-Triceps-Extension_Upper-Arms.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Barra',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['tríceps', 'skull crusher', 'gym'],
  },
  {
    title: 'Jalón al Pecho con Cable',
    description: 'Espalda fuerte para generar rotación de cadera en el golpeo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4',
    level: 'Principiante', duration: 50, equipment: 'Máquina de Cable',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['jalón', 'espalda', 'cable', 'gym'],
  },
  {
    title: 'Elevación Lateral Mancuernas',
    description: 'Hombros estables para una guardia más sólida.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4',
    level: 'Principiante', duration: 45, equipment: 'Mancuernas',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['hombro', 'elevación lateral', 'mancuernas', 'gym'],
  },
  {
    title: 'Curl Martillo',
    description: 'Antebrazo y bíceps braquial. Guardia más resistente.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/03521201-Dumbbell-Hammer-Curl_Upper-Arms.mp4',
    level: 'Principiante', duration: 45, equipment: 'Mancuernas',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['martillo', 'antebrazo', 'bíceps', 'gym'],
  },
  {
    title: 'Curl Inclinado en Banco',
    description: 'Mayor rango de movimiento para el bíceps.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/04671201-Incline-Dumbbell-Curl_upperArms.mp4',
    level: 'Intermedio', duration: 45, equipment: 'Mancuernas + Banco Inclinado',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['curl', 'inclinado', 'bíceps', 'gym'],
  },
  {
    title: 'Elevación Posterior (Rear Delt Raise)',
    description: 'Deltoides posterior. Mejora la postura de guardia.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4',
    level: 'Principiante', duration: 45, equipment: 'Mancuernas',
    tipo: 'gym', objetivo: 'Fuerza', categoria: 'Fuerza',
    tags: ['deltoides', 'posterior', 'hombro', 'gym'],
  },
  {
    title: 'Band Pull-Apart',
    description: 'Apertura con banda. Salud del manguito rotador.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4',
    level: 'Principiante', duration: 40, equipment: 'Banda elástica',
    tipo: 'gym', objetivo: 'Movilidad', categoria: 'Fuerza',
    tags: ['banda', 'hombro', 'manguito', 'gym'],
  },

  // ══════════════════════════════════════════════════════
  // LOTE 4 — MOVILIDAD & FLEXIBILIDAD
  // ══════════════════════════════════════════════════════
  {
    title: 'Estiramiento de Cuello',
    description: 'Movilidad cervical. Esencial antes de boxear.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4',
    level: 'Principiante', duration: 35, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Calentamiento', categoria: 'Movilidad',
    tags: ['cuello', 'movilidad', 'calentamiento'],
  },
  {
    title: 'Cat-Camel — Movilidad Lumbar',
    description: 'Columna lumbar móvil. Clave para la rotación al golpear.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4',
    level: 'Principiante', duration: 40, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Movilidad', categoria: 'Movilidad',
    tags: ['cat camel', 'lumbar', 'movilidad'],
  },
  {
    title: "Child's Pose — Recuperación",
    description: 'Estiramiento lumbar y hombros. Al terminar el entrenamiento.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13101201-Childs-Pose_Back.mp4',
    level: 'Principiante', duration: 40, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Recuperación', categoria: 'Movilidad',
    tags: ["child's pose", 'espalda', 'recuperación'],
  },
  {
    title: 'Rotaciones de Muñeca',
    description: 'Prevención de lesiones antes de golpear.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13191201-Wrist-circles_Forearm.mp4',
    level: 'Principiante', duration: 35, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Calentamiento', categoria: 'Movilidad',
    tags: ['muñeca', 'movilidad', 'prevención'],
  },
  {
    title: 'Estiramiento de Flexor de Cadera',
    description: 'Músculos de cadera abiertos para mejor footwork.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4',
    level: 'Principiante', duration: 40, equipment: 'Sin equipo',
    tipo: 'casa', objetivo: 'Movilidad', categoria: 'Movilidad',
    tags: ['cadera', 'flexor', 'movilidad'],
  },
];

// ─── Boxeo Module: Lyfta URLs por subcategoría ───────────────────────────────

export const LYFTA_BOXEO_VIDEOS = [
  { nombre: 'Guardia Correcta',      sub: 'Tecnica-Basica', nivel: 'Principiante', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4' },
  { nombre: 'Jab',                   sub: 'Tecnica-Basica', nivel: 'Principiante', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4' },
  { nombre: 'Cross',                 sub: 'Tecnica-Basica', nivel: 'Principiante', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4' },
  { nombre: 'Hook Izquierdo',        sub: 'Tecnica-Basica', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4' },
  { nombre: 'Hook Derecho',          sub: 'Tecnica-Basica', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/04671201-Incline-Dumbbell-Curl_upperArms.mp4' },
  { nombre: 'Uppercut Izquierdo',    sub: 'Tecnica-Basica', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4' },
  { nombre: 'Uppercut Derecho',      sub: 'Tecnica-Basica', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4' },
  { nombre: 'Combinación 1-2',       sub: 'Tecnica-Basica', nivel: 'Principiante', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4' },
  { nombre: 'Combinación 1-2-3',     sub: 'Tecnica-Basica', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/00701201-EZ-Bar-Curl_Upper-Arms.mp4' },
  { nombre: 'Combinación 1-2-3-4',   sub: 'Tecnica-Basica', nivel: 'Avanzado',     seg: 50, url: 'https://apilyfta.com/static/GymvisualMP4/00741201-Barbell-Lying-Triceps-Extension_Upper-Arms.mp4' },
  // FOOTWORK
  { nombre: 'Posición Base',         sub: 'Footwork', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/10121201-Squat_Hips.mp4' },
  { nombre: 'Paso Adelante y Atrás', sub: 'Footwork', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/10281201-Lunge_Hips.mp4' },
  { nombre: 'Paso Lateral',          sub: 'Footwork', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/10461201-Side-Lunge_Hips.mp4' },
  { nombre: 'Pivote Izquierdo',      sub: 'Footwork', nivel: 'Intermedio',   seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/10631201-Calf-Raise_Calves.mp4' },
  { nombre: 'Hexágono de Movimiento',sub: 'Footwork', nivel: 'Avanzado',     seg: 55, url: 'https://apilyfta.com/static/GymvisualMP4/10811201-Box-Jump_Hips.mp4' },
  // DEFENSA
  { nombre: 'Slip Izquierdo',        sub: 'Defensa', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4' },
  { nombre: 'Bob and Weave',         sub: 'Defensa', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4' },
  { nombre: 'Cover Up',              sub: 'Defensa', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/13101201-Childs-Pose_Back.mp4' },
  { nombre: 'Shoulder Roll',         sub: 'Defensa', nivel: 'Avanzado',     seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4' },
  // COMBINACIONES
  { nombre: '1-2 Cuerpo y Cabeza',   sub: 'Combinaciones', nivel: 'Intermedio', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/06761201-Push-up_Chest.mp4' },
  { nombre: 'Counter Jab',           sub: 'Combinaciones', nivel: 'Intermedio', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/07751201-Push-up-wide_Chest.mp4' },
  { nombre: '1-2-3-2',               sub: 'Combinaciones', nivel: 'Avanzado',   seg: 50, url: 'https://apilyfta.com/static/GymvisualMP4/08261201-Diamond-Push-up_Chest.mp4' },
  // SACO
  { nombre: 'Distancia al Saco',     sub: 'Saco', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4' },
  { nombre: 'Round Básico 3 min',    sub: 'Saco', nivel: 'Intermedio',   seg: 60, url: 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4' },
  { nombre: 'Uppercuts al Saco',     sub: 'Saco', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4' },
  // SOMBRA
  { nombre: 'Sombra Básica',         sub: 'Sombra', nivel: 'Principiante', seg: 50, url: 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4' },
  { nombre: 'Sombra Defensiva',      sub: 'Sombra', nivel: 'Intermedio',   seg: 50, url: 'https://apilyfta.com/static/GymvisualMP4/11261201-High-Knees_Hips.mp4' },
  { nombre: 'Sombra con Pesas',      sub: 'Sombra', nivel: 'Avanzado',     seg: 55, url: 'https://apilyfta.com/static/GymvisualMP4/03521201-Dumbbell-Hammer-Curl_Upper-Arms.mp4' },
  // FÍSICO
  { nombre: 'Saltar Cuerda',         sub: 'Fisico', nivel: 'Principiante', seg: 55, url: 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4' },
  { nombre: 'Flexiones para Boxeo',  sub: 'Fisico', nivel: 'Principiante', seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4' },
  { nombre: 'Burpees de Boxeador',   sub: 'Fisico', nivel: 'Intermedio',   seg: 50, url: 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4' },
  // CALENTAMIENTO
  { nombre: 'Movilidad de Muñecas',  sub: 'Calentamiento', nivel: 'Principiante', seg: 35, url: 'https://apilyfta.com/static/GymvisualMP4/13191201-Wrist-circles_Forearm.mp4' },
  { nombre: 'Activación de Caderas', sub: 'Calentamiento', nivel: 'Principiante', seg: 40, url: 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4' },
  { nombre: 'Estiramiento Post',     sub: 'Calentamiento', nivel: 'Principiante', seg: 55, url: 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4' },
];

// ─── Categorías ordenadas para rotación ──────────────────────────────────────
const CATEGORIA_ORDER = ['Peso Corporal', 'Boxeo', 'Fuerza', 'Movilidad'];

// ─── seedBoxeoVideos: actualiza URLs en BoxeoModule (silencioso) ──────────────
export async function seedBoxeoVideos(): Promise<{ added: number; skipped: number }> {
  let added = 0, skipped = 0;
  const existing = await getDocs(collection(db, 'boxeo_videos'));
  const byName = new Map(existing.docs.map(d => [(d.data().nombre || '').toLowerCase(), d]));

  for (const v of LYFTA_BOXEO_VIDEOS) {
    const key = v.nombre.toLowerCase();
    if (byName.has(key)) {
      const existingDoc = byName.get(key)!;
      if (!existingDoc.data().url_directa) {
        await updateDoc(doc(db, 'boxeo_videos', existingDoc.id), { url_directa: v.url });
        added++;
      } else {
        skipped++;
      }
    }
    // no crear nuevos aquí — BoxeoModule usa su propio SEED_VIDEOS con los datos completos
  }
  return { added, skipped };
}

// ─── syncWorkoutBatch: carga el siguiente lote rotativo para Entrenamientos ───
export async function syncWorkoutBatch(adminId = 'system'): Promise<{
  added: number;
  skipped: number;
  category: string;
  message: string;
}> {
  // 1. Obtener URLs ya en Firestore y en ban-list
  const [existingSnap, bannedSnap] = await Promise.all([
    getDocs(collection(db, 'workout_videos')),
    getDocs(collection(db, 'rejected_videos')),
  ]);
  const existingUrls = new Set(existingSnap.docs.map(d => d.data().video_url || d.data().sourceUrl || ''));
  const bannedUrls   = new Set(bannedSnap.docs.map(d => d.data().video_url || ''));

  // 2. Contar cuántos hay por categoría para determinar cuál viene
  const countByCategory: Record<string, number> = {};
  for (const cat of CATEGORIA_ORDER) countByCategory[cat] = 0;
  existingSnap.docs.forEach(d => {
    const cat = d.data().categoria || '';
    if (countByCategory[cat] !== undefined) countByCategory[cat]++;
  });

  // 3. Elegir la categoría con MENOS videos (rotación inteligente)
  const targetCategory = CATEGORIA_ORDER.reduce((prev, curr) =>
    (countByCategory[curr] ?? 0) <= (countByCategory[prev] ?? 0) ? curr : prev
  );

  // 4. Filtrar videos de esa categoría que no estén añadidos ni baneados
  const batch = LYFTA_LIBRARY.filter(v =>
    v.categoria === targetCategory &&
    !existingUrls.has(v.video_url) &&
    !bannedUrls.has(v.video_url)
  );

  if (batch.length === 0) {
    // Si la categoría objetivo está completa, tomar de cualquier categoría
    const fallback = LYFTA_LIBRARY.filter(v =>
      !existingUrls.has(v.video_url) && !bannedUrls.has(v.video_url)
    );
    if (fallback.length === 0) {
      return { added: 0, skipped: 0, category: '—', message: '✅ Toda la biblioteca ya está cargada.' };
    }
    // Tomar hasta 8 del fallback
    const toAdd = fallback.slice(0, 8);
    return addBatchToFirestore(toAdd, adminId, toAdd[0].categoria);
  }

  // 5. Añadir hasta 8 videos a la vez
  const toAdd = batch.slice(0, 8);
  return addBatchToFirestore(toAdd, adminId, targetCategory);
}

async function addBatchToFirestore(
  batch: typeof LYFTA_LIBRARY,
  adminId: string,
  category: string
): Promise<{ added: number; skipped: number; category: string; message: string }> {
  let added = 0, skipped = 0;

  // Asegurar categoría en workout_categories
  const catSnap = await getDocs(collection(db, 'workout_categories'));
  let catId = catSnap.docs.find(d => d.data().name === category)?.id;
  if (!catId) {
    const ref_ = await addDoc(collection(db, 'workout_categories'), { name: category });
    catId = ref_.id;
  }

  for (const v of batch) {
    // doble-check duplicado
    const dupQ = query(collection(db, 'workout_videos'), where('video_url', '==', v.video_url));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) { skipped++; continue; }

    await addDoc(collection(db, 'workout_videos'), {
      title:       v.title,
      description: v.description,
      video_url:   v.video_url,
      sourceUrl:   v.video_url,
      cover_url:   '',
      level:       v.level,
      duration:    v.duration,
      equipment:   v.equipment,
      tipo:        v.tipo,
      objetivo:    v.objetivo,
      categoria:   v.categoria,
      category_id: catId,
      tags:        v.tags,
      status:      'approved',  // admin lo carga ya aprobado
      isApproved:  true,
      created_at:  serverTimestamp(),
      uploaded_by: adminId,
      source:      'lyfta_seed',
    });
    added++;
  }

  const message = added > 0
    ? `✅ ${added} videos de "${category}" añadidos.${skipped > 0 ? ` (${skipped} omitidos)` : ''}`
    : `⚠️ No se añadieron videos nuevos de "${category}".`;

  return { added, skipped, category, message };
}
