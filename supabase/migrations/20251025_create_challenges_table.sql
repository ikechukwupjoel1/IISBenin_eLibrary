-- Create challenges table for reading competitions
-- Date: 2025-10-25

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('students', 'staff', 'all')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by);

-- RLS: Only staff can delete their own, librarian can delete all
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Librarian can delete any challenge" ON challenges
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'librarian')
  );

CREATE POLICY "Staff can delete their own challenge" ON challenges
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'staff')
    AND created_by = auth.uid()
  );

-- Policy: Only staff and librarian can insert
CREATE POLICY "Staff and librarian can create challenge" ON challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND (up.role = 'librarian' OR up.role = 'staff'))
  );

-- Policy: Only staff and librarian can select
CREATE POLICY "Staff and librarian can view challenge" ON challenges
  FOR SELECT TO authenticated
  USING (true);
