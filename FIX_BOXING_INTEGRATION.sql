-- FIX_BOXING_INTEGRATION.sql
-- 1) Tabla de asignación de planes a estudiantes
-- 2) is_public en workout_plans (público o solo asignados)
-- 3) Fix RLS para que estudiantes vean solo planes asignados/públicos
-- 4) Fix settings global (desbloquear secciones)
-- 5) Seed de planes demo con videos reales

-- ─── 1. workout_assignments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_assign_plan ON workout_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_assign_user ON workout_assignments(user_id);

ALTER TABLE workout_assignments ENABLE ROW LEVEL SECURITY;

-- Estudiantes solo ven sus propias asignaciones
CREATE POLICY "workout_assign_select" ON workout_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Admin gestiona todas las asignaciones
CREATE POLICY "workout_assign_admin_all" ON workout_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ─── 2. is_public en workout_plans ─────────────────────────────────────────
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ─── 3. Fix RLS: estudiantes ven planes públicos o asignados ──────────────
DROP POLICY IF EXISTS "workout_plans_select" ON workout_plans;
CREATE POLICY "workout_plans_select" ON workout_plans
  FOR SELECT USING (
    is_published = true
    AND (
      is_public = true
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workout_assignments wa
        WHERE wa.plan_id = workout_plans.id AND wa.user_id = auth.uid()
      )
    )
  );

-- ─── 4. Fix settings global (desbloquear secciones) ───────────────────────
INSERT INTO settings (id, title, data, updated_at)
VALUES (
  'global',
  'Configuración global GPTE',
  jsonb_build_object(
    'workouts_unlocked', true,
    'nutrition_unlocked', true,
    'technique_unlocked', true,
    'challenge_unlocked', true
  ),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  data = settings.data || jsonb_build_object(
    'workouts_unlocked', true,
    'nutrition_unlocked', true,
    'technique_unlocked', true,
    'challenge_unlocked', true
  ),
  updated_at = now();

-- ─── 5. Seed de planes demo con videos reales ─────────────────────────────
-- Limpiar demo anterior si existe (para re-ejecutar idempotente)
DELETE FROM workout_plans WHERE title IN (
  'Boxeo Fundamentos — Clase 1',
  'Acondicionamiento — Circuito',
  'Boxeo Avanzado — Combinaciones'
);

-- Plan 1: Boxeo Fundamentos (con videos reales de la biblioteca)
WITH p AS (
  INSERT INTO workout_plans (title, description, difficulty, estimated_minutes, is_published, is_public, cover_image_url, created_by)
  VALUES (
    'Boxeo Fundamentos — Clase 1',
    'Aprende la base del boxeo: postura, jab, cross y desplazamientos. Ideal para principiantes.',
    'Principiante', 45, true, true,
    'https://img.youtube.com/vi/maxresdefault.jpg',
    (SELECT id FROM profiles WHERE email = 'hernandezkevin001998@gmail.com' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO workout_sections (plan_id, title, order_index)
SELECT p.id, 'Calentamiento', 0 FROM p;
WITH p AS (
  SELECT id FROM workout_plans WHERE title = 'Boxeo Fundamentos — Clase 1'
),
s AS (
  INSERT INTO workout_sections (plan_id, title, order_index)
  SELECT p.id, 'Técnica de Golpes', 1 FROM p RETURNING id
),
exercises AS (
  INSERT INTO workout_exercises (section_id, name, description, sets, reps, rest_seconds, video_url, video_platform, order_index, notes, equipment)
  VALUES
    ((SELECT id FROM s), 'Postura y guardia', 'Mantén la guardia alta, pies paralelos y peso distribuido.', 3, '2 min', 60, 'https://www.youtube.com/embed/CGF64JhVcD0', 'youtube', 0, 'No dejes caer las manos.', 'Guantes'),
    ((SELECT id FROM s), 'Alterno Hamstring Curl + Punches', 'Curl femoral alterno con golpes. Calienta piernas y brazos.', 3, '12 cada lado', 45, 'https://apilyfta.com/static/GymvisualMP4/44371201-Alternating-Hamstring-Curl-with-Punche_Plyometrics.mp4', 'direct', 1, 'Ritmo suave al inicio.', 'Peso corporal'),
    ((SELECT id FROM s), 'Side Paso Front Punches', 'Pasos laterales con golpes frontales. Coordinación de pies.', 3, '15', 45, 'https://apilyfta.com/static/GymvisualMP4/77951201-Spine-Imbalance-and-Forward-Head-Posture-Hold-(fem.mp4', 'direct', 2, 'Mueve los pies rápido.', 'Peso corporal')
  RETURNING id
)
SELECT count(*) FROM exercises;

-- Plan 2: Acondicionamiento (usa videos reales de la biblioteca)
WITH p AS (
  INSERT INTO workout_plans (title, description, difficulty, estimated_minutes, is_published, is_public, cover_image_url, created_by)
  VALUES (
    'Acondicionamiento — Circuito',
    'Circuito de cuerpo completo con material de la biblioteca GPTE. Quema calorías y gana resistencia.',
    'Intermedio', 40, true, true,
    'https://img.youtube.com/vi/hqdefault.jpg',
    (SELECT id FROM profiles WHERE email = 'hernandezkevin001998@gmail.com' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO workout_sections (plan_id, title, order_index)
SELECT p.id, 'Calentamiento', 0 FROM p;
WITH p AS (
  SELECT id FROM workout_plans WHERE title = 'Acondicionamiento — Circuito'
),
s AS (
  INSERT INTO workout_sections (plan_id, title, order_index)
  SELECT p.id, 'Circuito Principal', 1 FROM p RETURNING id
),
exercises AS (
  INSERT INTO workout_exercises (section_id, name, description, sets, reps, rest_seconds, video_url, video_platform, order_index, notes, equipment)
  VALUES
    ((SELECT id FROM s), 'Air Bike', 'Abdominales en bicicleta, rápido y controlado.', 3, '30 reps', 30, 'https://apilyfta.com/static/GymvisualMP4/23951201-Air-Bike-(VERSION-2)-(female)_Waist.mp4', 'direct', 0, 'Mantén el core firme.', 'Colchoneta'),
    ((SELECT id FROM s), 'Reverso Zancada + Side Taps', 'Combina zancada reversa con toques laterales.', 3, '12 cada lado', 30, 'https://apilyfta.com/static/GymvisualMP4/61341201-4-Reverse-Lunge-and-4-Side-Taps-(female)_Plyometri.mp4', 'direct', 1, 'Rodilla alineada con el pie.', 'Peso corporal'),
    ((SELECT id FROM s), 'Ab Roller Crunch', 'Crunch con rueda abdominal, activa todo el core.', 3, '12', 30, 'https://apilyfta.com/static/GymvisualMP4/22691201-Ab-Roller-Crunch_Waist.mp4', 'direct', 2, 'Espalda recta.', 'Rueda abdominal')
  RETURNING id
)
SELECT count(*) FROM exercises;

-- Plan 3: Boxeo Avanzado (asignado SOLO a estudiantes seleccionados como demo)
WITH p AS (
  INSERT INTO workout_plans (title, description, difficulty, estimated_minutes, is_published, is_public, cover_image_url, created_by)
  VALUES (
    'Boxeo Avanzado — Combinaciones',
    'Combinaciones rápidas y trabajo de piernas para boxeadores con experiencia.',
    'Avanzado', 50, true, false,
    'https://img.youtube.com/vi/hqdefault.jpg',
    (SELECT id FROM profiles WHERE email = 'hernandezkevin001998@gmail.com' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO workout_sections (plan_id, title, order_index)
SELECT p.id, 'Calentamiento', 0 FROM p;
WITH p AS (
  SELECT id FROM workout_plans WHERE title = 'Boxeo Avanzado — Combinaciones'
),
s AS (
  INSERT INTO workout_sections (plan_id, title, order_index)
  SELECT p.id, 'Combinaciones', 1 FROM p RETURNING id
),
exercises AS (
  INSERT INTO workout_exercises (section_id, name, description, sets, reps, rest_seconds, video_url, video_platform, order_index, notes, equipment)
  VALUES
    ((SELECT id FROM s), 'Alterno Hamstring Curl + Punches', 'Curl femoral alterno con golpes. Trabaja piernas y brazos a la vez.', 4, '15 cada lado', 45, 'https://apilyfta.com/static/GymvisualMP4/44371201-Alternating-Hamstring-Curl-with-Punche_Plyometrics.mp4', 'direct', 0, 'Ritmo constante.', 'Mancuernas'),
    ((SELECT id FROM s), 'Side Paso Front Punches', 'Pasos laterales con golpes frontales. Velocidad y agilidad.', 4, '20', 45, 'https://apilyfta.com/static/GymvisualMP4/77951201-Spine-Imbalance-and-Forward-Head-Posture-Hold-(fem.mp4', 'direct', 1, 'Mantén la guardia alta.', 'Peso corporal')
  RETURNING id
)
SELECT count(*) FROM exercises;

-- Asignación demo: plan avanzado para el estudiante Kevin
INSERT INTO workout_assignments (plan_id, user_id, assigned_by)
SELECT p.id, u.id, (SELECT id FROM profiles WHERE email = 'hernandezkevin001998@gmail.com')
FROM workout_plans p, profiles u
WHERE p.title = 'Boxeo Avanzado — Combinaciones'
  AND u.email = 'elcast1g4dor009@gmail.com'
ON CONFLICT DO NOTHING;

-- ─── 6. Realtime ───────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE workout_assignments;

-- Verificación
SELECT 'workout_plans' as tabla, count(*) FROM workout_plans
UNION ALL SELECT 'workout_sections', count(*) FROM workout_sections
UNION ALL SELECT 'workout_exercises', count(*) FROM workout_exercises
UNION ALL SELECT 'workout_assignments', count(*) FROM workout_assignments;