-- Creates a public bucket for institution logos and sets access policies.

-- 1. Create the storage bucket if it doesn't exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('institution_logos', 'institution_logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Row Level Security policies for the bucket.
-- Allow anyone to view the logos (SELECT).
CREATE POLICY "Public read access for institution logos" 
ON storage.objects FOR SELECT
USING ( bucket_id = 'institution_logos' );

-- Allow authenticated librarians to upload their own institution's logo.
CREATE POLICY "Librarians can upload their own logo" 
ON storage.objects FOR INSERT
WITH CHECK ( 
  bucket_id = 'institution_logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = (SELECT institution_id::text FROM public.user_profiles WHERE id = auth.uid()) AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'librarian'
);

-- Allow authenticated librarians to update their own institution's logo.
CREATE POLICY "Librarians can update their own logo" 
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'institution_logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = (SELECT institution_id::text FROM public.user_profiles WHERE id = auth.uid()) AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'librarian'
);

-- Allow authenticated librarians to delete their own institution's logo.
CREATE POLICY "Librarians can delete their own logo" 
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'institution_logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = (SELECT institution_id::text FROM public.user_profiles WHERE id = auth.uid()) AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'librarian' -- This comparison was missing.
);