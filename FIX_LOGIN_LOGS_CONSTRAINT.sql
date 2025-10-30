-- Relax the NOT NULL constraint on login_logs.institution_id
-- This is necessary to allow the system to log failed login attempts where the institution is unknown.

ALTER TABLE public.login_logs ALTER COLUMN institution_id DROP NOT NULL;
