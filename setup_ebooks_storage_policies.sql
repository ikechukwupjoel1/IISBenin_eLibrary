-- Create RLS policies for the ebooks storage bucket

-- Allow authenticated librarians to upload files
CREATE POLICY "Librarians can upload ebooks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ebooks' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Allow public read access to ebooks
CREATE POLICY "Public can read ebooks"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ebooks');

-- Allow librarians to update ebooks
CREATE POLICY "Librarians can update ebooks"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ebooks' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Allow librarians to delete ebooks
CREATE POLICY "Librarians can delete ebooks"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ebooks' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);
