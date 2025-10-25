-- RLS policies: Allow only librarians to delete any book club or challenge
-- Date: 2025-10-25

-- Book Clubs: Librarians can delete any club
CREATE POLICY "Librarians can delete any club" ON book_clubs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'librarian'
    )
  );
