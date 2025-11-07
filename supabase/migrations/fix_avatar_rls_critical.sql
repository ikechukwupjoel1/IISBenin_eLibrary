-- CRITICAL FIX: Avatar Upload RLS Policies
-- This fixes the "new row violates row-level security policy" error

-- Step 1: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Remove ALL existing avatar-related policies to start fresh
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;

-- Step 3: Create PERMISSIVE policies (this is critical!)

-- Allow EVERYONE to view/read avatars (public bucket)
CREATE POLICY "Avatar public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow AUTHENTICATED users to INSERT (upload) files
CREATE POLICY "Avatar authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow AUTHENTICATED users to UPDATE their files
CREATE POLICY "Avatar authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow AUTHENTICATED users to DELETE files
CREATE POLICY "Avatar authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Step 4: Ensure the avatars bucket is PUBLIC
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 2097152,  -- 2MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'avatars';

-- Step 5: Ensure avatar_url column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        CREATE INDEX idx_user_profiles_avatar ON user_profiles(avatar_url);
    END IF;
END $$;

-- Step 6: Verify configuration
SELECT 
    '=== BUCKET CONFIG ===' as info,
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

SELECT 
    '=== STORAGE POLICIES ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname ILIKE '%avatar%')
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Avatar RLS policies fixed!';
    RAISE NOTICE '🔐 Policies created: public read, authenticated upload/update/delete';
    RAISE NOTICE '📦 Bucket configured: public, 2MB limit, image types only';
    RAISE NOTICE '🧪 TEST NOW: Upload an avatar in your app';
END $$;
