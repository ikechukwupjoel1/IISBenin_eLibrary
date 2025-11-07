-- Diagnostic script for avatar upload issues
-- Run this in Supabase SQL Editor

-- 1. Check if avatar_url column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'avatar_url';

-- 2. Check if avatars bucket exists
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'avatars';

-- 3. Check RLS policies on storage.objects for avatars
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname ILIKE '%avatar%';

-- 4. Check if there are any existing avatars
SELECT COUNT(*) as avatar_count, bucket_id
FROM storage.objects
WHERE bucket_id = 'avatars'
GROUP BY bucket_id;

-- 5. Test permissions - try to view storage policies
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- 6. Check for any users with avatar_url
SELECT id, email, avatar_url 
FROM user_profiles 
WHERE avatar_url IS NOT NULL 
LIMIT 5;

-- 7. Verify storage extension is enabled
SELECT * FROM pg_extension WHERE extname = 'storage';
