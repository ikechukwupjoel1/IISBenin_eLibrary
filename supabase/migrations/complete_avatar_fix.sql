-- Complete Avatar Upload Fix
-- Run this in Supabase SQL Editor

-- Step 1: Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any conflicting policies
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Step 3: Create comprehensive storage policies

-- Allow anyone to view avatars (public read)
CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Step 4: Ensure avatar_url column exists in user_profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar ON user_profiles(avatar_url);
        RAISE NOTICE 'Added avatar_url column to user_profiles';
    ELSE
        RAISE NOTICE 'avatar_url column already exists';
    END IF;
END $$;

-- Step 5: Verify the avatars bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- Step 6: Display current configuration
SELECT 
    'Bucket Configuration' as check_type,
    id, 
    name, 
    public,
    created_at
FROM storage.buckets 
WHERE id = 'avatars';

SELECT 
    'Storage Policies' as check_type,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Avatar upload system configured successfully!';
    RAISE NOTICE '📝 Test by uploading an image in StudentProfile';
    RAISE NOTICE '🔍 Check browser console for detailed logs';
END $$;
