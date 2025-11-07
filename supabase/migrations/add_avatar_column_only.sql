-- Simple migration to add avatar_url column
-- Run this in Supabase SQL Editor

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
        RAISE NOTICE '✅ Added avatar_url column to user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️ avatar_url column already exists';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'avatar_url';
