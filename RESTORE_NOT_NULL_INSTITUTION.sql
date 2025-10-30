-- Restore the NOT NULL constraint on user_profiles.institution_id
-- This re-enforces the security rule after manually bootstrapping a user.

ALTER TABLE public.user_profiles ALTER COLUMN institution_id SET NOT NULL;
