-- Create library_settings table for categories and shelves
CREATE TABLE IF NOT EXISTS library_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL CHECK (key IN ('category', 'shelf')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, value)
);

-- Enable RLS
ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Librarians can manage settings" ON library_settings;
DROP POLICY IF EXISTS "Everyone can view settings" ON library_settings;

-- Allow everyone to view settings (for displaying in dropdowns)
CREATE POLICY "Everyone can view settings"
ON library_settings
FOR SELECT
USING (true);

-- Allow librarians to manage settings (INSERT, UPDATE, DELETE)
CREATE POLICY "Librarians can manage settings"
ON library_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Insert default categories
INSERT INTO library_settings (key, value) VALUES
  ('category', 'Fiction'),
  ('category', 'Non-Fiction'),
  ('category', 'Science'),
  ('category', 'Mathematics'),
  ('category', 'History'),
  ('category', 'Geography'),
  ('category', 'Literature'),
  ('category', 'English Language'),
  ('category', 'Biology'),
  ('category', 'Chemistry'),
  ('category', 'Physics'),
  ('category', 'Computer Science'),
  ('category', 'Reference'),
  ('category', 'eBook'),
  ('category', 'Electronic Material')
ON CONFLICT (key, value) DO NOTHING;

-- Insert default shelves
INSERT INTO library_settings (key, value) VALUES
  ('shelf', 'Shelf A1'),
  ('shelf', 'Shelf A2'),
  ('shelf', 'Shelf B1'),
  ('shelf', 'Shelf B2'),
  ('shelf', 'Section C'),
  ('shelf', 'Reference Section'),
  ('shelf', 'Digital Storage')
ON CONFLICT (key, value) DO NOTHING;

-- Verify
SELECT key, value FROM library_settings ORDER BY key, value;
