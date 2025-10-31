-- Update the role check constraint to include the new 'super_admin' role.

-- First, drop the existing constraint if it exists.
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Then, add the new constraint with the updated list of roles.
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('librarian', 'staff', 'student', 'super_admin'));
