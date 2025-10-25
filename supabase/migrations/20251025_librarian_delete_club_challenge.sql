-- Allow librarians to delete any book club and challenge
-- Date: 2025-10-25

-- 1. Book Clubs: Add ON DELETE CASCADE for created_by
ALTER TABLE book_clubs
DROP CONSTRAINT IF EXISTS book_clubs_created_by_fkey;
ALTER TABLE book_clubs
ADD CONSTRAINT book_clubs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- 2. Challenges: Add ON DELETE CASCADE for created_by
ALTER TABLE challenges
DROP CONSTRAINT IF EXISTS challenges_created_by_fkey;
ALTER TABLE challenges
ADD CONSTRAINT challenges_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- 3. (Optional) Add RLS policy to allow librarians to delete any row
--   (Assumes you have a 'role' column in user_profiles or session)
--   Adjust as needed for your RLS setup
-- Example for book_clubs:
-- CREATE POLICY "Librarians can delete any club" ON book_clubs
--   FOR DELETE TO authenticated
--   USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'librarian'));

-- Example for challenges:
-- CREATE POLICY "Librarians can delete any challenge" ON challenges
--   FOR DELETE TO authenticated
--   USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'librarian'));
