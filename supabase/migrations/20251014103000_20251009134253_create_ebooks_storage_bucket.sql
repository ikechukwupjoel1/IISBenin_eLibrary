/*
  # Create Storage Bucket for eBooks and Materials

  1. New Storage Bucket
    - Creates `ebooks` bucket for PDF files and documents
    - Public read access for authenticated users
    - 50MB file size limit per file
    - Allowed file types: PDF, EPUB, DOC, DOCX
  
  2. Security
    - Only librarians and staff can upload
    - All authenticated users can read
    - Proper RLS policies
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ebooks',
  'ebooks',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/epub+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to read files
CREATE POLICY "Authenticated users can read ebooks"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ebooks');

-- Policy: Allow librarians and staff to upload files
CREATE POLICY "Librarians and staff can upload ebooks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ebooks' AND
  (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('librarian', 'staff')
  )
);

-- Policy: Allow librarians and staff to update files
CREATE POLICY "Librarians and staff can update ebooks"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ebooks' AND
  (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('librarian', 'staff')
  )
);

-- Policy: Allow librarians to delete files
CREATE POLICY "Librarians can delete ebooks"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ebooks' AND
  (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'librarian'
  )
);