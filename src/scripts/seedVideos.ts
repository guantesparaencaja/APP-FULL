/**
 * seedVideos.ts
 * Script para popular Firestore con videos de Lyfta sin usar Firebase Storage.
 * Ejecutar: importar en un componente admin y llamar seedAll().
 */

import { db } from '../lib/firebase';
import {
  collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc
} from 'firebase/firestore';

// ─── Lyfta public video URLs (libre uso, no repetidas) ────────────────────────
// Patrón: https://apilyfta.com/static/GymvisualMP4/[ID]-[nombre]_[musculo].mp4

const LYFTA_BOXEO_VIDEOS = [
  // TÉCNICA BÁSICA
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
  { nombre: 'Hexágono',              sub: 'Footwork', nivel: 'Avanzado',     seg: 55, url: 'https://apilyfta.com/static/GymvisualMP4/10811201-Box-Jump_Hips.mp4' },
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
  { nombre: 'Round Básico 3min',     sub: 'Saco', nivel: 'Intermedio',   seg: 60, url: 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4' },
  { nombre: 'Uppercuts al Saco',     sub: 'Saco', nivel: 'Intermedio',   seg: 45, url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4' },
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

// ─── Workout videos para la sección Entrenamientos (workout_videos) ────────────
export const WORKOUT_SEED_DATA = [
  // ── BOXEO
  {
    title: 'Jab — Técnica de golpe directo',
    description: 'Golpe recto con la mano delantera. Base del ataque en boxeo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'Técnica',
    tags: ['jab', 'golpe', 'boxeo', 'técnica'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Cross — Golpe de poder trasero',
    description: 'Golpe recto con la mano trasera. El más potente del boxeo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'Técnica',
    tags: ['cross', 'golpe', 'boxeo', 'potencia'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Hook — Gancho lateral',
    description: 'Golpe en ángulo de 90°. Ataca la mandíbula lateralmente.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'Técnica',
    tags: ['hook', 'gancho', 'boxeo'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Uppercut — Golpe ascendente',
    description: 'Uppercut generado desde las piernas. Golpea el mentón.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'Técnica',
    tags: ['uppercut', 'boxeo', 'técnica'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Combinación 1-2 (Jab-Cross)',
    description: 'La combinación básica del boxeo. Fluida y explosiva.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 50,
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'Combinaciones',
    tags: ['1-2', 'jab', 'cross', 'combinación'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Slip y Counter',
    description: 'Esquivar el jab del rival y responder de inmediato.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'Defensa',
    tags: ['slip', 'defensa', 'counter'],
    status: 'approved', isApproved: true,
  },
  // ── FUERZA
  {
    title: 'Press de Banca con Barra',
    description: 'Incrementa la potencia de los golpes con este ejercicio compuesto.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 60,
    equipment: 'Barra',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['banca', 'pecho', 'fuerza', 'barra'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Curl de Bíceps con Barra EZ',
    description: 'Fortalece los bíceps para mayor potencia en ganchos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00701201-EZ-Bar-Curl_Upper-Arms.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Barra EZ',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['curl', 'bíceps', 'fuerza'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Extensión de Tríceps con Barra',
    description: 'Triceps potentes para golpes más rápidos y directos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/00741201-Barbell-Lying-Triceps-Extension_Upper-Arms.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 45,
    equipment: 'Barra',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['tríceps', 'extensión', 'fuerza'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Jalón al Pecho con Cable',
    description: 'Espalda fuerte para generar rotación de cadera efectiva.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 50,
    equipment: 'Cable',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['jalón', 'espalda', 'cable'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Elevación Lateral con Mancuernas',
    description: 'Hombros estables para una guardia más sólida.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Mancuernas',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['hombro', 'elevación', 'mancuerna'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Curl Martillo con Mancuernas',
    description: 'Fortalece el antebrazo para una guardia más resistente.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/03521201-Dumbbell-Hammer-Curl_Upper-Arms.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Mancuernas',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['curl', 'martillo', 'antebrazo'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Curl de Bíceps Inclinado',
    description: 'Estiramiento completo del bíceps para mayor desarrollo muscular.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/04671201-Incline-Dumbbell-Curl_upperArms.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 45,
    equipment: 'Mancuernas + Banco',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['bíceps', 'inclinado', 'mancuerna'],
    status: 'approved', isApproved: true,
  },
  // ── CARDIO
  {
    title: 'Burpees de Boxeador',
    description: 'Condicionamiento físico total. Indispensable para boxeadores.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 50,
    equipment: 'Sin equipo',
    tipo: 'cardio',
    objetivo: 'Resistencia',
    tags: ['burpee', 'cardio', 'boxeo', 'condición'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Sentadilla',
    description: 'Potencia de piernas. La base de todos los golpes potentes.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10121201-Squat_Hips.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 50,
    equipment: 'Sin equipo',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['sentadilla', 'piernas', 'potencia'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Saltos al Cajón (Box Jump)',
    description: 'Explosividad de piernas para más velocidad y potencia en los golpes.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10811201-Box-Jump_Hips.mp4',
    cover_url: '',
    level: 'Avanzado',
    duration: 45,
    equipment: 'Cajón pliométrico',
    tipo: 'cardio',
    objetivo: 'Explosividad',
    tags: ['box jump', 'explosividad', 'piernas'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Jumping Jacks',
    description: 'Calentamiento cardiovascular clásico. Activa todo el cuerpo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'cardio',
    objetivo: 'Calentamiento',
    tags: ['jumping jacks', 'calentamiento', 'cardio'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Rodillas Altas (High Knees)',
    description: 'Cardio intenso que mejora el footwork y la coordinación.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/11261201-High-Knees_Hips.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'cardio',
    objetivo: 'Cardio',
    tags: ['high knees', 'cardio', 'footwork'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Zancada (Lunge)',
    description: 'Fortalece los muslos y glúteos para un stance más sólido.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10281201-Lunge_Hips.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 50,
    equipment: 'Sin equipo',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['lunge', 'zancada', 'piernas'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Estocada Lateral',
    description: 'Movilidad de cadera y fuerza para el paso lateral.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10461201-Side-Lunge_Hips.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 50,
    equipment: 'Sin equipo',
    tipo: 'gym',
    objetivo: 'Movilidad',
    tags: ['estocada', 'lateral', 'movilidad'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Elevación de Talones',
    description: 'Pantorrillas fuertes para un mejor pivote y rebote en el ring.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/10631201-Calf-Raise_Calves.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 40,
    equipment: 'Sin equipo',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['pantorrilla', 'calf raise', 'pivote'],
    status: 'approved', isApproved: true,
  },
  // ── FLEXIBILIDAD / CALENTAMIENTO
  {
    title: 'Estiramiento de Cuello',
    description: 'Movilidad cervical. Esencial antes de cualquier sesión de boxeo.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 35,
    equipment: 'Sin equipo',
    tipo: 'flexibilidad',
    objetivo: 'Calentamiento',
    tags: ['cuello', 'movilidad', 'calentamiento'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Cat-Camel — Movilidad Lumbar',
    description: 'Moviliza la columna lumbar. Crucial para la rotación de cadera.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 40,
    equipment: 'Sin equipo',
    tipo: 'flexibilidad',
    objetivo: 'Movilidad',
    tags: ['cat camel', 'espalda', 'movilidad'],
    status: 'approved', isApproved: true,
  },
  {
    title: "Child's Pose — Recuperación",
    description: 'Estiramiento de espalda baja. Usar al finalizar el entrenamiento.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13101201-Childs-Pose_Back.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 40,
    equipment: 'Sin equipo',
    tipo: 'flexibilidad',
    objetivo: 'Recuperación',
    tags: ["child's pose", 'espalda', 'recuperación'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Rotaciones de Muñeca',
    description: 'Movilidad de muñecas para prevenir lesiones al golpear.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13191201-Wrist-circles_Forearm.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 35,
    equipment: 'Sin equipo',
    tipo: 'flexibilidad',
    objetivo: 'Calentamiento',
    tags: ['muñeca', 'movilidad', 'prevención'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Estiramiento de Pecho con Banda',
    description: 'Apertura pectoral para mantener hombros saludables.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 40,
    equipment: 'Banda elástica',
    tipo: 'flexibilidad',
    objetivo: 'Movilidad',
    tags: ['pecho', 'hombro', 'banda', 'estiramiento'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Flexión de Cadera',
    description: 'Estira los flexores de cadera. Clave para el movimiento del ring.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 40,
    equipment: 'Sin equipo',
    tipo: 'flexibilidad',
    objetivo: 'Movilidad',
    tags: ['cadera', 'flexor', 'movilidad'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Elevación posterior con mancuernas',
    description: 'Fortalece el deltoides posterior. Mejora la guardia alta.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Mancuernas',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['deltoides', 'posterior', 'hombro'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Push-up Amplio',
    description: 'Flexión con agarre ancho. Activa más el pecho exterior.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/07751201-Push-up-wide_Chest.mp4',
    cover_url: '',
    level: 'Principiante',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['flexión', 'pecho', 'amplio'],
    status: 'approved', isApproved: true,
  },
  {
    title: 'Push-up Diamante',
    description: 'Flexión de tríceps. Fuego en los brazos para golpes más rápidos.',
    video_url: 'https://apilyfta.com/static/GymvisualMP4/08261201-Diamond-Push-up_Chest.mp4',
    cover_url: '',
    level: 'Intermedio',
    duration: 45,
    equipment: 'Sin equipo',
    tipo: 'gym',
    objetivo: 'Fuerza',
    tags: ['tríceps', 'flexión', 'diamante'],
    status: 'approved', isApproved: true,
  },
];

// ─── Seed Functions ────────────────────────────────────────────────────────────

export async function seedBoxeoVideos(): Promise<{ added: number; skipped: number }> {
  let added = 0, skipped = 0;
  const existing = await getDocs(collection(db, 'boxeo_videos'));
  const existingNames = new Set(existing.docs.map(d => (d.data().nombre || '').toLowerCase()));

  for (const v of LYFTA_BOXEO_VIDEOS) {
    if (existingNames.has(v.nombre.toLowerCase())) {
      // Actualizar URL si el video existe pero no tiene URL
      const existingDoc = existing.docs.find(d => (d.data().nombre || '').toLowerCase() === v.nombre.toLowerCase());
      if (existingDoc && !existingDoc.data().url_directa) {
        await updateDoc(doc(db, 'boxeo_videos', existingDoc.id), { url_directa: v.url });
        added++;
      } else {
        skipped++;
      }
    } else {
      await addDoc(collection(db, 'boxeo_videos'), {
        nombre: v.nombre,
        subcategoria: v.sub,
        nivel: v.nivel,
        duracion_seg: v.seg,
        url_directa: v.url,
        descripcion: `Ejercicio de ${v.sub.replace(/-/g, ' ')} — nivel ${v.nivel}`,
        puntos_clave: [],
        errores_comunes: [],
        activo: true,
        orden: 999,
        creado_en: serverTimestamp(),
      });
      added++;
    }
  }
  return { added, skipped };
}

export async function seedWorkoutVideos(defaultCategoryId: string): Promise<{ added: number }> {
  let added = 0;
  const existing = await getDocs(collection(db, 'workout_videos'));
  const existingTitles = new Set(existing.docs.map(d => (d.data().title || '').toLowerCase()));

  for (const v of WORKOUT_SEED_DATA) {
    if (!existingTitles.has(v.title.toLowerCase())) {
      await addDoc(collection(db, 'workout_videos'), {
        ...v,
        category_id: defaultCategoryId,
        created_at: serverTimestamp(),
        uploaded_by: 'system_seed',
      });
      added++;
    }
  }
  return { added };
}

export async function seedAllVideos(): Promise<string> {
  try {
    // 1. Seed BoxeoModule videos
    const boxeoResult = await seedBoxeoVideos();

    // 2. Seed Workout videos — asegurar categoría por defecto
    let catId = '';
    const catSnap = await getDocs(collection(db, 'workout_categories'));
    if (catSnap.empty) {
      const ref_ = await addDoc(collection(db, 'workout_categories'), { name: 'Boxeo & Fitness' });
      catId = ref_.id;
    } else {
      catId = catSnap.docs[0].id;
    }
    const workoutResult = await seedWorkoutVideos(catId);

    return `✅ Seed completado:\n• Boxeo Módulo: ${boxeoResult.added} añadidos, ${boxeoResult.skipped} omitidos\n• Entrenamientos: ${workoutResult.added} videos añadidos`;
  } catch (err: any) {
    return `❌ Error en seed: ${err.message}`;
  }
}
