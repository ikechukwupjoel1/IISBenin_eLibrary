-- Creates a public bucket for institution logos and sets access policies.

-- 1. Create the storage bucket if it doesn't exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('institution_logos', 'institution_logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Public read access for institution logos" ON storage.objects;
DROP POLICY IF EXISTS "Librarians can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Librarians and Admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Librarians can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Librarians and Admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Librarians can delete their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Librarians and Admins can delete logos" ON storage.objects;

-- 3. Set up new Row Level Security policies for the bucket.

-- Allow anyone to view the logos (SELECT).
CREATE POLICY "Public read access for institution logos" 
ON storage.objects FOR SELECT
USING ( bucket_id = 'institution_logos' );

-- Allow authenticated librarians and super admins to upload logos.
CREATE POLICY "Librarians and Admins can upload logos" 
ON storage.objects FOR INSERT
WITH CHECK ( 
  bucket_id = 'institution_logos' AND
  auth.role() = 'authenticated' AND
  (
    -- Condition for Librarians: can upload to their own institution's folder
    (
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'librarian' AND
      (storage.foldername(name))[1] = (SELECT institution_id::text FROM public.user_profiles WHERE id = auth.uid())
    )
    OR
    -- Condition for Super Admins: can upload to any folder
    (
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

-- Allow authenticated librarians and super admins to update logos.
CREATE POLICY "Librarians and Admins can update logos" 
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'institution_logos' AND
  auth.role() = 'authenticated' AND
  (
    -- Condition for Librarians: can update their own institution's folder
    (
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'librarian' AND
      (storage.foldername(name))[1] = (SELECT institution_id::text FROM public.user_profiles WHERE id = auth.uid())
    )
    OR
    -- Condition for Super Admins: can update any folder
    (
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

-- Allow authenticated librarians and super admins to delete logos.
CREATE POLICY "Librarians and Admins can delete logos" 
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'institution_logos' AND
  auth.role() = 'authenticated' AND
  (
    -- Condition for Librarians: can delete from their own institution's folder
    (
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'librarian' AND
      (storage.foldername(name))[1] = (SELECT institution_id::text FROM public.user_profiles WHERE id = auth.uid())
    )
    OR
    -- Condition for Super Admins: can delete from any folder
    (
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin'
    )
  )
);
