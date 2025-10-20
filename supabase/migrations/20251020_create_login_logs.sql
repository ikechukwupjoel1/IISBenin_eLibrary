-- Create login_logs table and RLS policies
-- This table is used to record login attempts from the app

CREATE TABLE IF NOT EXISTS public.login_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NULL,
  enrollment_id text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  login_at timestamptz NOT NULL DEFAULT now(),
  ip inet NULL,
  user_agent text NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_login_logs_enrollment_id ON public.login_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON public.login_logs(login_at DESC);

-- Enable RLS
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to INSERT a login record
CREATE POLICY IF NOT EXISTS "Anyone can insert login logs"
  ON public.login_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow users to view their own login logs
CREATE POLICY IF NOT EXISTS "Users can view their own login logs"
  ON public.login_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow librarians to view all login logs
CREATE POLICY IF NOT EXISTS "Librarians can view all login logs"
  ON public.login_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'librarian'
    )
  );
