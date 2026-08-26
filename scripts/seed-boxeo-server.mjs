/**
 * seed-boxeo-server.mjs — Script de seed server-side para boxeo_videos.
 *
 * Ejecutar con: node scripts/seed-boxeo-server.mjs
 *
 * Requiere variables de entorno:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (la key con permisos para insertar sin RLS)
 *
 * Alternativa: importar como módulo y llamar seedBoxeoVideosServer()
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Auto-load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envText = readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch (_) {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local o como variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── SEED_VIDEOS (de BoxeoModule.tsx) ────────────────────────────────────────
const SEED_VIDEOS = [
  { nombre: 'Guardia Correcta', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, orden: 1 },
  { nombre: 'Jab', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, orden: 2 },
  { nombre: 'Cross', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, orden: 3 },
  { nombre: 'Hook Izquierdo', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, orden: 4 },
  { nombre: 'Hook Derecho', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, orden: 5 },
  { nombre: 'Uppercut Izquierdo', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, orden: 6 },
  { nombre: 'Uppercut Derecho', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, orden: 7 },
  { nombre: 'Combinación 1-2 (Jab-Cross)', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, orden: 8 },
  { nombre: 'Combinación 1-2-3', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, orden: 9 },
  { nombre: 'Combinación 1-2-3-4', subcategoria: 'Tecnica-Basica', nivel: 'Avanzado', duracion_seg: 50, orden: 10 },
  { nombre: 'Posición Base', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, orden: 1 },
  { nombre: 'Paso Adelante y Atrás', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, orden: 2 },
  { nombre: 'Paso Lateral', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, orden: 3 },
  { nombre: 'Pivote Izquierdo', subcategoria: 'Footwork', nivel: 'Intermedio', duracion_seg: 40, orden: 4 },
  { nombre: 'Hexágono de Movimiento', subcategoria: 'Footwork', nivel: 'Avanzado', duracion_seg: 55, orden: 5 },
  { nombre: 'Slip Izquierdo', subcategoria: 'Defensa', nivel: 'Principiante', duracion_seg: 40, orden: 1 },
  { nombre: 'Bob and Weave', subcategoria: 'Defensa', nivel: 'Intermedio', duracion_seg: 45, orden: 2 },
  { nombre: 'Cover Up', subcategoria: 'Defensa', nivel: 'Principiante', duracion_seg: 40, orden: 3 },
  { nombre: 'Shoulder Roll', subcategoria: 'Defensa', nivel: 'Avanzado', duracion_seg: 45, orden: 4 },
  { nombre: '1-2 al Cuerpo y Cabeza', subcategoria: 'Combinaciones', nivel: 'Intermedio', duracion_seg: 45, orden: 1 },
  { nombre: 'Counter Jab', subcategoria: 'Combinaciones', nivel: 'Intermedio', duracion_seg: 45, orden: 2 },
  { nombre: '1-2-3-2 (Jab-Cross-Hook-Cross)', subcategoria: 'Combinaciones', nivel: 'Avanzado', duracion_seg: 50, orden: 3 },
  { nombre: 'Distancia Correcta al Saco', subcategoria: 'Saco', nivel: 'Principiante', duracion_seg: 40, orden: 1 },
  { nombre: 'Round Básico de 3 Minutos', subcategoria: 'Saco', nivel: 'Intermedio', duracion_seg: 60, orden: 2 },
  { nombre: 'Uppercuts al Saco', subcategoria: 'Saco', nivel: 'Intermedio', duracion_seg: 45, orden: 3 },
  { nombre: 'Sombra Básica', subcategoria: 'Sombra', nivel: 'Principiante', duracion_seg: 50, orden: 1 },
  { nombre: 'Sombra Defensiva', subcategoria: 'Sombra', nivel: 'Intermedio', duracion_seg: 50, orden: 2 },
  { nombre: 'Sombra con Pesas Ligeras', subcategoria: 'Sombra', nivel: 'Avanzado', duracion_seg: 55, orden: 3 },
  { nombre: 'Saltar Cuerda Básico', subcategoria: 'Fisico', nivel: 'Principiante', duracion_seg: 55, orden: 1 },
  { nombre: 'Flexiones para Boxeo', subcategoria: 'Fisico', nivel: 'Principiante', duracion_seg: 45, orden: 2 },
  { nombre: 'Burpees de Boxeador', subcategoria: 'Fisico', nivel: 'Intermedio', duracion_seg: 50, orden: 3 },
  { nombre: 'Movilidad de Muñecas', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 35, orden: 1 },
  { nombre: 'Activación de Caderas para Footwork', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 40, orden: 2 },
  { nombre: 'Estiramiento Post-Entrenamiento', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 55, orden: 3 },
];

// ─── LYFTA URLs (de seedVideos.ts) ──────────────────────────────────────────
const LYFTA_URLS = {
  'Guardia Correcta': 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4',
  'Jab': 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4',
  'Cross': 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4',
  'Hook Izquierdo': 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4',
  'Hook Derecho': 'https://apilyfta.com/static/GymvisualMP4/04671201-Incline-Dumbbell-Curl_upperArms.mp4',
  'Uppercut Izquierdo': 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4',
  'Uppercut Derecho': 'https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4',
  'Combinación 1-2 (Jab-Cross)': 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4',
  'Combinación 1-2-3': 'https://apilyfta.com/static/GymvisualMP4/00701201-EZ-Bar-Curl_Upper-Arms.mp4',
  'Combinación 1-2-3-4': 'https://apilyfta.com/static/GymvisualMP4/00741201-Barbell-Lying-Triceps-Extension_Upper-Arms.mp4',
  'Posición Base': 'https://apilyfta.com/static/GymvisualMP4/10121201-Squat_Hips.mp4',
  'Paso Adelante y Atrás': 'https://apilyfta.com/static/GymvisualMP4/10281201-Lunge_Hips.mp4',
  'Paso Lateral': 'https://apilyfta.com/static/GymvisualMP4/10461201-Side-Lunge_Hips.mp4',
  'Pivote Izquierdo': 'https://apilyfta.com/static/GymvisualMP4/10631201-Calf-Raise_Calves.mp4',
  'Hexágono de Movimiento': 'https://apilyfta.com/static/GymvisualMP4/10811201-Box-Jump_Hips.mp4',
  'Slip Izquierdo': 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4',
  'Bob and Weave': 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4',
  'Cover Up': 'https://apilyfta.com/static/GymvisualMP4/13101201-Childs-Pose_Back.mp4',
  'Shoulder Roll': 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4',
  '1-2 al Cuerpo y Cabeza': 'https://apilyfta.com/static/GymvisualMP4/06761201-Push-up_Chest.mp4',
  'Counter Jab': 'https://apilyfta.com/static/GymvisualMP4/07751201-Push-up-wide_Chest.mp4',
  '1-2-3-2 (Jab-Cross-Hook-Cross)': 'https://apilyfta.com/static/GymvisualMP4/08261201-Diamond-Push-up_Chest.mp4',
  'Distancia Correcta al Saco': 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4',
  'Round Básico de 3 Minutos': 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4',
  'Uppercuts al Saco': 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4',
  'Sombra Básica': 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4',
  'Sombra Defensiva': 'https://apilyfta.com/static/GymvisualMP4/11261201-High-Knees_Hips.mp4',
  'Sombra con Pesas Ligeras': 'https://apilyfta.com/static/GymvisualMP4/03521201-Dumbbell-Hammer-Curl_Upper-Arms.mp4',
  'Saltar Cuerda Básico': 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4',
  'Flexiones para Boxeo': 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4',
  'Burpees de Boxeador': 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4',
  'Movilidad de Muñecas': 'https://apilyfta.com/static/GymvisualMP4/13191201-Wrist-circles_Forearm.mp4',
  'Activación de Caderas para Footwork': 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4',
  'Estiramiento Post-Entrenamiento': 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4',
};

export async function seedBoxeoVideosServer() {
  const { data: existing } = await supabase.from('boxeo_videos').select('id, nombre');
  const existingNames = new Set((existing || []).map((d) => d.nombre));

  let inserted = 0, urlUpdated = 0, skipped = 0;

  // Phase 1: Insert missing videos
  for (const v of SEED_VIDEOS) {
    if (existingNames.has(v.nombre)) { skipped++; continue; }
    const url = LYFTA_URLS[v.nombre] || '';
    await supabase.from('boxeo_videos').insert({ ...v, url_directa: url, activo: true });
    inserted++;
  }

  // Phase 2: Update URLs on rows missing them
  const { data: allRows } = await supabase.from('boxeo_videos').select('id, nombre, url_directa');
  for (const row of allRows || []) {
    if (!row.url_directa && LYFTA_URLS[row.nombre]) {
      await supabase.from('boxeo_videos').update({ url_directa: LYFTA_URLS[row.nombre] }).eq('id', row.id);
      urlUpdated++;
    }
  }

  const result = { inserted, urlUpdated, skipped, total: inserted + urlUpdated + skipped };
  console.log('[seedBoxeoVideosServer]', result);
  return result;
}

// Ejecutar directamente si se llama desde CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  seedBoxeoVideosServer().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
