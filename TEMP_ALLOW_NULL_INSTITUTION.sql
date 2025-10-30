-- Temporarily relax the NOT NULL constraint on user_profiles.institution_id
-- This allows the auth trigger to create a user profile without an institution.

ALTER TABLE public.user_profiles ALTER COLUMN institution_id DROP NOT NULL;
