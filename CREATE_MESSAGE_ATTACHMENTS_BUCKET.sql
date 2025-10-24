-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own message attachments" ON storage.objects;

-- Set up storage policies for message-attachments bucket

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Allow authenticated users to read all files
CREATE POLICY "Allow authenticated users to read message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update existing message attachments
CREATE POLICY "Allow users to update their own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
