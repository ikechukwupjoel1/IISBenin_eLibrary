-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  message text NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  target_audience text NOT NULL CHECK (target_audience IN ('all', 'staff', 'students', 'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'))
);

-- Enable RLS for announcements table
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Helper function to get user grade
CREATE OR REPLACE FUNCTION get_user_grade(user_id uuid)
RETURNS text AS $$
DECLARE
  v_grade_level text;
BEGIN
  SELECT s.grade_level INTO v_grade_level
  FROM students s
  JOIN user_profiles up ON s.id = up.student_id
  WHERE up.id = user_id;
  RETURN v_grade_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS Policies for announcements
DROP POLICY IF EXISTS "announcements_select_for_targeted_users" ON announcements;
CREATE POLICY "announcements_select_for_targeted_users" ON announcements
FOR SELECT
USING (
  (target_audience = 'all') OR
  (target_audience = 'staff' AND get_user_role(auth.uid()) IN ('staff', 'librarian')) OR
  (target_audience = 'students' AND get_user_role(auth.uid()) = 'student') OR
  (target_audience LIKE 'grade_%' AND get_user_role(auth.uid()) = 'student' AND target_audience = 'grade_' || get_user_grade(auth.uid()))
);

DROP POLICY IF EXISTS "announcements_insert_librarian" ON announcements;
CREATE POLICY "announcements_insert_librarian" ON announcements
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'librarian' AND
  target_audience IN ('all', 'staff', 'students')
);

DROP POLICY IF EXISTS "announcements_insert_staff" ON announcements;
CREATE POLICY "announcements_insert_staff" ON announcements
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'staff' AND
  (
    target_audience = 'students' OR
    target_audience LIKE 'grade_%'
  )
);

DROP POLICY IF EXISTS "announcements_delete_own" ON announcements;
CREATE POLICY "announcements_delete_own" ON announcements
FOR DELETE
USING (
  created_by = auth.uid()
);
