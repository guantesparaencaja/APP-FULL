-- FIX_WORKOUT_PLANS.sql
-- Workout Plans: professional structured training sessions with embedded social media videos
-- Run via Supabase Management API or SQL Editor

-- ─── Table: workout_plans ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'Principiante',
  estimated_minutes INT DEFAULT 60,
  is_published BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Table: workout_sections ────────────────────────────────────────────────
-- e.g. "Calentamiento", "Técnica", "Condicionamiento", "Enfriamiento"
CREATE TABLE IF NOT EXISTS workout_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Table: workout_exercises ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES workout_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sets INT DEFAULT 3,
  reps TEXT DEFAULT '10',
  rest_seconds INT DEFAULT 60,
  video_url TEXT,
  video_platform TEXT,
  order_index INT NOT NULL DEFAULT 0,
  notes TEXT,
  equipment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_sections_plan ON workout_sections(plan_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_section ON workout_exercises(section_id, order_index);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Published plans visible to everyone
CREATE POLICY "workout_plans_select" ON workout_plans
  FOR SELECT USING (is_published = true OR created_by = auth.uid());

-- Only admins can insert/update/delete plans
CREATE POLICY "workout_plans_admin_all" ON workout_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Sections: visible if parent plan is visible
CREATE POLICY "workout_sections_select" ON workout_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_sections.plan_id
        AND (workout_plans.is_published = true OR workout_plans.created_by = auth.uid())
    )
  );

CREATE POLICY "workout_sections_admin_all" ON workout_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Exercises: visible if parent section's plan is visible
CREATE POLICY "workout_exercises_select" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sections
      JOIN workout_plans ON workout_plans.id = workout_sections.plan_id
      WHERE workout_sections.id = workout_exercises.section_id
        AND (workout_plans.is_published = true OR workout_plans.created_by = auth.uid())
    )
  );

CREATE POLICY "workout_exercises_admin_all" ON workout_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ─── Realtime ───────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE workout_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE workout_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE workout_exercises;
