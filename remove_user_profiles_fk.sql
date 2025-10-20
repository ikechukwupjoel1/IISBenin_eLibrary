-- Remove foreign key constraint on user_profiles.id to allow students without auth users
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add comment
COMMENT ON TABLE user_profiles IS 'User profiles for all roles. Students do not have corresponding auth.users entries.';