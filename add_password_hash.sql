-- Add password_hash column to user_profiles for student authentication
ALTER TABLE user_profiles ADD COLUMN password_hash text;

-- Add comment
COMMENT ON COLUMN user_profiles.password_hash IS 'Password hash for students (not using Supabase auth)';