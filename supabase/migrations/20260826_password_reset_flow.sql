-- C9: Password Reset Flow
-- Adds must_change_password flag to profiles and a password_reset_requests table

-- 1. Add must_change_password flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- 2. Create password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | completed | cancelled
  requested_at timestamptz NOT NULL DEFAULT now(),
  admin_id uuid REFERENCES public.profiles(id),
  admin_notes text DEFAULT '',
  temp_password_visible text DEFAULT '', -- visible only to admin, cleared after user changes
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on password_reset_requests"
  ON public.password_reset_requests
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can see their own requests
CREATE POLICY "Users see own password_reset_requests"
  ON public.password_reset_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own requests
CREATE POLICY "Users insert own password_reset_requests"
  ON public.password_reset_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 4. Index for admin panel queries
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status
  ON public.password_reset_requests (status, created_at DESC);
