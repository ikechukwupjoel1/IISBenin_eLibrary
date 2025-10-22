-- Fix RLS policies for books table to allow librarians to manage books

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view books" ON books;
DROP POLICY IF EXISTS "Librarians can insert books" ON books;
DROP POLICY IF EXISTS "Librarians can update books" ON books;
DROP POLICY IF EXISTS "Librarians can delete books" ON books;

-- Enable RLS on books table
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow everyone to view books (SELECT)
CREATE POLICY "Anyone can view books"
ON books
FOR SELECT
USING (true);

-- Policy 2: Allow librarians to insert books (INSERT)
CREATE POLICY "Librarians can insert books"
ON books
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Policy 3: Allow librarians to update books (UPDATE)
CREATE POLICY "Librarians can update books"
ON books
FOR UPDATE
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

-- Policy 4: Allow librarians to delete books (DELETE)
CREATE POLICY "Librarians can delete books"
ON books
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'books'
ORDER BY cmd;
