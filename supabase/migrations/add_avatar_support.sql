-- Add avatar_url column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
-- Allow anyone to view avatars (public bucket)
CREATE POLICY IF NOT EXISTS "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
CREATE POLICY IF NOT EXISTS "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own avatar
CREATE POLICY IF NOT EXISTS "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatar
CREATE POLICY IF NOT EXISTS "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create index on avatar_url for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_url 
  ON user_profiles(avatar_url) 
  WHERE avatar_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_profiles.avatar_url IS 'URL to user profile picture stored in Supabase Storage';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Avatar support added successfully!';
  RAISE NOTICE '📸 Storage bucket "avatars" created';
  RAISE NOTICE '🔒 RLS policies configured';
  RAISE NOTICE '📊 avatar_url column added to user_profiles';
END $$;
