-- seed-boxeo.sql — Seed boxeo_videos + RLSE policies para inserción
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- ─── 1. Insertar videos si la tabla está vacía ─────────────────────────────
INSERT INTO boxeo_videos (nombre, subcategoria, nivel, duracion_seg, url_directa, activo, orden)
SELECT v.nombre, v.subcategoria, v.nivel, v.duracion_seg, v.url_directa, true, v.orden
FROM (VALUES
  ('Guardia Correcta', 'Tecnica-Basica', 'Principiante', 45, 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4', 1),
  ('Jab', 'Tecnica-Basica', 'Principiante', 45, 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4', 2),
  ('Cross', 'Tecnica-Basica', 'Principiante', 45, 'https://apilyfta.com/static/GymvisualMP4/06111201-Dumbbell-Rear-Lateral-Raise_Shoulder.mp4', 3),
  ('Hook Izquierdo', 'Tecnica-Basica', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4', 4),
  ('Hook Derecho', 'Tecnica-Basica', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/04671201-Incline-Dumbbell-Curl_upperArms.mp4', 5),
  ('Uppercut Izquierdo', 'Tecnica-Basica', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4', 6),
  ('Uppercut Derecho', 'Tecnica-Basica', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4', 7),
  ('Combinación 1-2 (Jab-Cross)', 'Tecnica-Basica', 'Principiante', 45, 'https://apilyfta.com/static/GymvisualMP4/00501201-Barbell-Bench-Press_Chest.mp4', 8),
  ('Combinación 1-2-3', 'Tecnica-Basica', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/00701201-EZ-Bar-Curl_Upper-Arms.mp4', 9),
  ('Combinación 1-2-3-4', 'Tecnica-Basica', 'Avanzado', 50, 'https://apilyfta.com/static/GymvisualMP4/00741201-Barbell-Lying-Triceps-Extension_Upper-Arms.mp4', 10),
  ('Posición Base', 'Footwork', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/10121201-Squat_Hips.mp4', 1),
  ('Paso Adelante y Atrás', 'Footwork', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/10281201-Lunge_Hips.mp4', 2),
  ('Paso Lateral', 'Footwork', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/10461201-Side-Lunge_Hips.mp4', 3),
  ('Pivote Izquierdo', 'Footwork', 'Intermedio', 40, 'https://apilyfta.com/static/GymvisualMP4/10631201-Calf-Raise_Calves.mp4', 4),
  ('Hexágono de Movimiento', 'Footwork', 'Avanzado', 55, 'https://apilyfta.com/static/GymvisualMP4/10811201-Box-Jump_Hips.mp4', 5),
  ('Slip Izquierdo', 'Defensa', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/12711201-Neck-Side-Stretch_Neck.mp4', 1),
  ('Bob and Weave', 'Defensa', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4', 2),
  ('Cover Up', 'Defensa', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/13101201-Childs-Pose_Back.mp4', 3),
  ('Shoulder Roll', 'Defensa', 'Avanzado', 45, 'https://apilyfta.com/static/GymvisualMP4/13271201-Band-Pull-Apart_Shoulder.mp4', 4),
  ('1-2 al Cuerpo y Cabeza', 'Combinaciones', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/06761201-Push-up_Chest.mp4', 1),
  ('Counter Jab', 'Combinaciones', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/07751201-Push-up-wide_Chest.mp4', 2),
  ('1-2-3-2 (Jab-Cross-Hook-Cross)', 'Combinaciones', 'Avanzado', 50, 'https://apilyfta.com/static/GymvisualMP4/08261201-Diamond-Push-up_Chest.mp4', 3),
  ('Distancia Correcta al Saco', 'Saco', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4', 1),
  ('Round Básico de 3 Minutos', 'Saco', 'Intermedio', 60, 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4', 2),
  ('Uppercuts al Saco', 'Saco', 'Intermedio', 45, 'https://apilyfta.com/static/GymvisualMP4/00691201-Barbell-Curl_Upper-Arms.mp4', 3),
  ('Sombra Básica', 'Sombra', 'Principiante', 50, 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4', 1),
  ('Sombra Defensiva', 'Sombra', 'Intermedio', 50, 'https://apilyfta.com/static/GymvisualMP4/11261201-High-Knees_Hips.mp4', 2),
  ('Sombra con Pesas Ligeras', 'Sombra', 'Avanzado', 55, 'https://apilyfta.com/static/GymvisualMP4/03521201-Dumbbell-Hammer-Curl_Upper-Arms.mp4', 3),
  ('Saltar Cuerda Básico', 'Fisico', 'Principiante', 55, 'https://apilyfta.com/static/GymvisualMP4/11131201-Jumping-Jacks_Hips.mp4', 1),
  ('Flexiones para Boxeo', 'Fisico', 'Principiante', 45, 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4', 2),
  ('Burpees de Boxeador', 'Fisico', 'Intermedio', 50, 'https://apilyfta.com/static/GymvisualMP4/10921201-Burpee_Hips.mp4', 3),
  ('Movilidad de Muñecas', 'Calentamiento', 'Principiante', 35, 'https://apilyfta.com/static/GymvisualMP4/13191201-Wrist-circles_Forearm.mp4', 1),
  ('Activación de Caderas para Footwork', 'Calentamiento', 'Principiante', 40, 'https://apilyfta.com/static/GymvisualMP4/13541201-Hip-Flexion-Stretch_Hips.mp4', 2),
  ('Estiramiento Post-Entrenamiento', 'Calentamiento', 'Principiante', 55, 'https://apilyfta.com/static/GymvisualMP4/12891201-Cat-Camel-Stretch_Back.mp4', 3)
) AS v(nombre, subcategoria, nivel, duracion_seg, url_directa, orden)
WHERE NOT EXISTS (SELECT 1 FROM boxeo_videos LIMIT 1);
